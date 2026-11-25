"""SVG style processor for the /draw pipeline.

Claude writes clean SVG shapes with semantic classes. This module adds all style,
entirely in SVG markup — no rasterization:
  1. Fill scan lines  — angled looping scribble strokes (45°, self-crossing, per-stroke jitter)
  2. Stroke wobble    — Ornstein-Uhlenbeck random walk on class="stroke-sil"/"stroke-int"
  3. Grain            — feTurbulence filter overlay blended over the whole canvas
"""

import math
import random
import re
import xml.etree.ElementTree as ET

# --- Fill style ---
FILL_ANGLE       = 45.0    # scan line angle in degrees from horizontal
FILL_VARIATION   = 0.40    # per-stroke randomness spread (controls n_loops ±40%)
FILL_STEP        = 0.019   # row spacing perpendicular to scan direction (~20px — matches scribble)
FILL_STEP_JITTER = 0.18    # ± fraction of FILL_STEP per row
FILL_BLEED       = 0.014   # scan range expansion past shape boundary (~15px)
FILL_SEGMENTS    = 100     # waypoints per fill stroke
FILL_LOOPS       = 2.5     # avg oscillation cycles per stroke
FILL_LOOP_AMP    = 0.050   # forward-oscillation amplitude
FILL_WAVE_AMP    = 0.026   # perpendicular-oscillation amplitude
FILL_GRAIN       = 0.06    # per-stroke brightness jitter (±6%)
FILL_STROKE_W    = 0.035   # fill stroke-width (normalized)
FILL_SCALE_REF   = 0.15    # shape "radius" the fill constants above were tuned for
FILL_MIN_SCALE   = 0.30    # floor on the size-based fill scale — small shapes keep some
                            # visible scribble texture rather than losing it entirely

# --- Stroke wobble ---
WOBBLE_STRENGTH  = 0.012
MIN_STROKE_SIL_WIDTH = 0.020  # floor for stroke-sil widths — bolder silhouettes
MIN_STROKE_INT_WIDTH = 0.014  # floor for stroke-int widths — bolder interior lines
WOBBLE_SIZE_FRAC = 0.15    # effective_strength = min(WOBBLE_STRENGTH, shape_size * WOBBLE_SIZE_FRAC)
WOBBLE_POINTS    = 60
SMOOTH_WINDOW    = 3
OU_DECAY         = 0.88

# --- Grain ---
GRAIN_STRENGTH   = 0.13   # target overlay opacity for the feTurbulence grain filter
GRAIN_BASE_FREQ  = 0.9    # feTurbulence baseFrequency — higher = finer grain

SVG_NS = "http://www.w3.org/2000/svg"
ET.register_namespace("", SVG_NS)
ET.register_namespace("xlink", "http://www.w3.org/1999/xlink")

def _tag(local): return f"{{{SVG_NS}}}{local}"
def _local(tag):  return tag.split("}")[-1] if "}" in tag else tag

# Pre-compute rotation constants
_COS_A = math.cos(math.radians(FILL_ANGLE))
_SIN_A = math.sin(math.radians(FILL_ANGLE))

def _to_scan(x, y):
    """Original → scan-frame (u along scan direction, v along row-advance direction)."""
    return x*_COS_A + y*_SIN_A, -x*_SIN_A + y*_COS_A

def _to_orig(u, v):
    """Scan-frame → original coordinates."""
    return u*_COS_A - v*_SIN_A, u*_SIN_A + v*_COS_A


# ---------------------------------------------------------------------------
# Color helpers
# ---------------------------------------------------------------------------

def _jitter_color(color_str):
    m = re.match(r'rgb\((\d+),\s*(\d+),\s*(\d+)\)', color_str)
    if not m:
        return color_str
    j = 1.0 + random.uniform(-FILL_GRAIN, FILL_GRAIN)
    return "rgb({},{},{})".format(
        min(255, max(0, round(int(m.group(1)) * j))),
        min(255, max(0, round(int(m.group(2)) * j))),
        min(255, max(0, round(int(m.group(3)) * j))),
    )


# ---------------------------------------------------------------------------
# Geometry helpers
# ---------------------------------------------------------------------------

def _ellipse_pts(cx, cy, rx, ry, n=WOBBLE_POINTS):
    return [(cx + rx*math.cos(2*math.pi*i/n),
             cy + ry*math.sin(2*math.pi*i/n)) for i in range(n)]

def _parse_points_str(points_str):
    raw = []
    for tok in points_str.split():
        xy = tok.split(",")
        if len(xy) == 2:
            raw.append((float(xy[0]), float(xy[1])))
    return raw

def _resample_points(raw, n_target=WOBBLE_POINTS, closed=True):
    """Resample a point list to ~n_target points spaced evenly by arc length."""
    if not raw:
        return []
    n = len(raw)
    if closed:
        segs = [(raw[i], raw[(i+1) % n]) for i in range(n)]
    else:
        segs = [(raw[i], raw[i+1]) for i in range(n - 1)]
    perim = sum(math.hypot(b[0]-a[0], b[1]-a[1]) for a, b in segs)
    if perim == 0:
        return raw
    pts = []
    for a, b in segs:
        seg = math.hypot(b[0]-a[0], b[1]-a[1])
        steps = max(2, round(n_target * seg / perim))
        for s in range(steps):
            t = s / steps
            pts.append((a[0]+t*(b[0]-a[0]), a[1]+t*(b[1]-a[1])))
    if not closed:
        pts.append(raw[-1])
    return pts

def _polygon_dense(points_str, n_target=WOBBLE_POINTS):
    return _resample_points(_parse_points_str(points_str), n_target, closed=True)

def _bbox_short_axis(pts):
    """Short axis (min of width, height) of a point list's bounding box."""
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return min(max(xs) - min(xs), max(ys) - min(ys))


# ---------------------------------------------------------------------------
# Path 'd' attribute parsing — M/L/C/Q/Z, absolute or relative
# ---------------------------------------------------------------------------

_PATH_TOKEN_RE = re.compile(r'[MmLlCcQqZz]|-?\d*\.\d+(?:[eE][-+]?\d+)?|-?\d+(?:[eE][-+]?\d+)?')
_PATH_CMD_NARGS = {"M": 2, "L": 2, "C": 6, "Q": 4, "Z": 0}

def _flatten_cubic(p0, p1, p2, p3, n=8):
    pts = []
    for i in range(1, n + 1):
        t = i / n
        mt = 1 - t
        x = mt**3*p0[0] + 3*mt**2*t*p1[0] + 3*mt*t**2*p2[0] + t**3*p3[0]
        y = mt**3*p0[1] + 3*mt**2*t*p1[1] + 3*mt*t**2*p2[1] + t**3*p3[1]
        pts.append((x, y))
    return pts

def _flatten_quad(p0, p1, p2, n=8):
    pts = []
    for i in range(1, n + 1):
        t = i / n
        mt = 1 - t
        x = mt**2*p0[0] + 2*mt*t*p1[0] + t**2*p2[0]
        y = mt**2*p0[1] + 2*mt*t*p1[1] + t**2*p2[1]
        pts.append((x, y))
    return pts

def _path_to_points(d):
    """Flatten an SVG path 'd' string (M/L/C/Q/Z, absolute or relative) into a
    polyline of (x,y) points, sampling beziers at fixed resolution. Multiple
    subpaths are concatenated (callers treat the result as a single contour)."""
    tokens = _PATH_TOKEN_RE.findall(d)
    pts = []
    cur = (0.0, 0.0)
    start = (0.0, 0.0)
    cmd = None
    i = 0
    while i < len(tokens):
        tok = tokens[i]
        if tok.isalpha():
            cmd = tok
            i += 1
        if cmd is None:
            break
        base = cmd.upper()
        if base == "Z":
            pts.append(start)
            cur = start
            continue
        nargs = _PATH_CMD_NARGS.get(base, 0)
        if i + nargs > len(tokens):
            break
        args = [float(x) for x in tokens[i:i + nargs]]
        i += nargs
        rel = cmd.islower()
        if base == "M":
            x, y = args
            if rel: x, y = cur[0] + x, cur[1] + y
            cur = (x, y); start = cur
            pts.append(cur)
            cmd = "l" if rel else "L"  # subsequent bare coordinate pairs are implicit linetos
        elif base == "L":
            x, y = args
            if rel: x, y = cur[0] + x, cur[1] + y
            cur = (x, y)
            pts.append(cur)
        elif base == "C":
            x1, y1, x2, y2, x, y = args
            if rel:
                x1, y1 = cur[0] + x1, cur[1] + y1
                x2, y2 = cur[0] + x2, cur[1] + y2
                x, y = cur[0] + x, cur[1] + y
            pts.extend(_flatten_cubic(cur, (x1, y1), (x2, y2), (x, y)))
            cur = (x, y)
        elif base == "Q":
            x1, y1, x, y = args
            if rel:
                x1, y1 = cur[0] + x1, cur[1] + y1
                x, y = cur[0] + x, cur[1] + y
            pts.extend(_flatten_quad(cur, (x1, y1), (x, y)))
            cur = (x, y)
    return pts

def _path_is_closed(d, raw):
    if re.search(r'[Zz]\s*$', d.strip()):
        return True
    if len(raw) >= 2 and math.hypot(raw[0][0]-raw[-1][0], raw[0][1]-raw[-1][1]) < 1e-6:
        return True
    return False


# ---------------------------------------------------------------------------
# Ornstein-Uhlenbeck wobble
# ---------------------------------------------------------------------------

def _wobble_pts(pts, strength=WOBBLE_STRENGTH):
    n = len(pts)
    noise_scale = strength * math.sqrt(1.0 - OU_DECAY**2)
    ou = 0.0
    wobbly = []
    for i, (x, y) in enumerate(pts):
        if i == 0:       dx, dy = pts[min(1,n-1)][0]-x, pts[min(1,n-1)][1]-y
        elif i == n-1:   dx, dy = x-pts[-2][0], y-pts[-2][1]
        else:            dx, dy = pts[i+1][0]-pts[i-1][0], pts[i+1][1]-pts[i-1][1]
        dist = math.hypot(dx, dy) or 1.0
        px, py = -dy/dist, dx/dist
        ou = ou*OU_DECAY + random.gauss(0, noise_scale)
        wobbly.append((x+px*ou, y+py*ou))
    smoothed = []
    for i in range(n):
        lo, hi = max(0, i-SMOOTH_WINDOW//2), min(n, i+SMOOTH_WINDOW//2+1)
        smoothed.append((
            sum(wobbly[j][0] for j in range(lo, hi)) / (hi-lo),
            sum(wobbly[j][1] for j in range(lo, hi)) / (hi-lo),
        ))
    return smoothed

def _pts_to_d(pts, close=False):
    parts = [f"M {pts[0][0]:.4f},{pts[0][1]:.4f}"]
    for x, y in pts[1:]:
        parts.append(f"L {x:.4f},{y:.4f}")
    if close:
        parts.append("Z")
    return " ".join(parts)


# ---------------------------------------------------------------------------
# Angled fill stroke generation
# ---------------------------------------------------------------------------

def _fill_stroke_d(x0, y0, x1, y1, loop_amp_max=FILL_LOOP_AMP, wave_amp=FILL_WAVE_AMP):
    """
    Looping scribble stroke from (x0,y0) to (x1,y1).
    Oscillation runs along/perpendicular to the stroke direction —
    so 45° scan lines get 45° loops. FILL_VARIATION controls ±spread in n_loops.

    loop_amp_max/wave_amp are scaled down by the caller for small shapes (see
    _process_fills) so oscillation stays proportionate to shape size instead of
    always using the constants this style was tuned for at torso/head scale.
    """
    dx, dy = x1-x0, y1-y0
    length = math.hypot(dx, dy) or 1.0
    fx, fy = dx/length, dy/length       # forward unit vector (along scan angle)
    px, py = -fy, fx                    # perpendicular unit vector

    loop_amp = min(loop_amp_max, length * 0.40)
    n_loops = FILL_LOOPS * random.uniform(1-FILL_VARIATION, 1+FILL_VARIATION)
    phase = random.uniform(0, 2*math.pi)
    pts = []
    for i in range(FILL_SEGMENTS):
        t = i / (FILL_SEGMENTS - 1)
        fwd_osc  = loop_amp   * math.cos(2*math.pi*n_loops*t + phase)
        perp_osc = wave_amp * math.sin(2*math.pi*n_loops*t + phase)
        pts.append((
            x0 + t*dx + fwd_osc*fx + perp_osc*px,
            y0 + t*dy + fwd_osc*fy + perp_osc*py,
        ))
    return _pts_to_d(pts)


# ---------------------------------------------------------------------------
# Angled scan-line geometry (yields original-space endpoints)
# ---------------------------------------------------------------------------

def _scan_ellipse(cx, cy, rx, ry, step=FILL_STEP, bleed=FILL_BLEED):
    """Angled scan segments through an ellipse, expanded by bleed."""
    rx, ry = rx + bleed, ry + bleed
    uc, vc = _to_scan(cx, cy)
    # In scan frame, ellipse boundary: -rx*sin_a*cos(t) + ry*cos_a*sin(t) = v - vc
    # A*cos(t) + B*sin(t) = C  →  R = sqrt(A²+B²)
    A, B = -rx*_SIN_A, ry*_COS_A
    R = math.sqrt(A*A + B*B)
    v = vc - R + step/2
    while v < vc + R:
        C = max(-R*0.9999, min(R*0.9999, v - vc))
        phi = math.atan2(B, A)
        delta = math.acos(C / R)
        t1, t2 = phi+delta, phi-delta
        u1 = uc + rx*math.cos(t1)*_COS_A + ry*math.sin(t1)*_SIN_A
        u2 = uc + rx*math.cos(t2)*_COS_A + ry*math.sin(t2)*_SIN_A
        u_lo, u_hi = min(u1,u2), max(u1,u2)
        yield _to_orig(u_lo, v), _to_orig(u_hi, v)
        v += step * (1 + random.uniform(-FILL_STEP_JITTER, FILL_STEP_JITTER))

def _scan_rect(x0, y0, w, h, step=FILL_STEP, bleed=FILL_BLEED):
    x0 -= bleed; y0 -= bleed
    x1, y1 = x0+w+2*bleed, y0+h+2*bleed
    corners = [(x0,y0),(x1,y0),(x1,y1),(x0,y1)]
    edges = [(corners[i], corners[(i+1)%4]) for i in range(4)]
    rot = [_to_scan(*c) for c in corners]
    v_min = min(r[1] for r in rot); v_max = max(r[1] for r in rot)
    v = v_min + step/2
    while v < v_max:
        us = []
        for (ax,ay),(bx,by) in edges:
            av,bv = _to_scan(ax,ay)[1], _to_scan(bx,by)[1]
            if (av<=v<bv) or (bv<=v<av):
                t = (v-av)/(bv-av)
                us.append(_to_scan(ax,ay)[0] + t*(_to_scan(bx,by)[0]-_to_scan(ax,ay)[0]))
        us.sort()
        if len(us) >= 2:
            yield _to_orig(us[0], v), _to_orig(us[-1], v)
        v += step * (1 + random.uniform(-FILL_STEP_JITTER, FILL_STEP_JITTER))

def _scan_points(raw, step=FILL_STEP, bleed=FILL_BLEED):
    """Angled scan segments through the closed polygon defined by raw points."""
    if not raw:
        return
    n = len(raw)
    rot = [_to_scan(x, y) for x, y in raw]
    v_min = min(r[1] for r in rot)-bleed; v_max = max(r[1] for r in rot)+bleed
    v = v_min + step/2
    while v < v_max:
        us = []
        for i in range(n):
            av, bv = rot[i][1], rot[(i+1)%n][1]
            if (av<=v<bv) or (bv<=v<av):
                t = (v-av)/(bv-av)
                us.append(rot[i][0] + t*(rot[(i+1)%n][0]-rot[i][0]))
        us.sort()
        for j in range(0, len(us)-1, 2):
            yield _to_orig(us[j]-bleed, v), _to_orig(us[j+1]+bleed, v)
        v += step * (1 + random.uniform(-FILL_STEP_JITTER, FILL_STEP_JITTER))

def _scan_polygon(points_str, step=FILL_STEP, bleed=FILL_BLEED):
    yield from _scan_points(_parse_points_str(points_str), step, bleed)

def _scan_path(d, step=FILL_STEP, bleed=FILL_BLEED):
    """Sample a <path> 'd' string at ~50 points and scan-fill the resulting bounding polygon."""
    raw = _resample_points(_path_to_points(d), n_target=50, closed=True)
    yield from _scan_points(raw, step, bleed)

def _fill_shape_size(shape_el):
    """Approximate 'radius' of a fill shape, for size-scaling the scribble geometry."""
    t = _local(shape_el.tag)
    if t == "ellipse":
        return min(float(shape_el.get("rx", 0)), float(shape_el.get("ry", 0)))
    if t == "circle":
        return float(shape_el.get("r", 0))
    if t == "rect":
        return min(float(shape_el.get("width", 0)), float(shape_el.get("height", 0))) / 2
    if t == "polygon":
        return _bbox_short_axis(_polygon_dense(shape_el.get("points", ""))) / 2
    if t == "path":
        return _bbox_short_axis(_path_to_points(shape_el.get("d", ""))) / 2
    return FILL_SCALE_REF  # unknown tag: no scaling


def _scan_lines(shape_el, step=FILL_STEP, bleed=FILL_BLEED):
    """Yield ((x0,y0),(x1,y1)) angled scan endpoints for a shape."""
    t = _local(shape_el.tag)
    if t == "ellipse":
        yield from _scan_ellipse(float(shape_el.get("cx",0)), float(shape_el.get("cy",0)),
                                 float(shape_el.get("rx",0)), float(shape_el.get("ry",0)), step, bleed)
    elif t == "circle":
        r = float(shape_el.get("r", 0))
        yield from _scan_ellipse(float(shape_el.get("cx",0)), float(shape_el.get("cy",0)), r, r, step, bleed)
    elif t == "rect":
        yield from _scan_rect(float(shape_el.get("x",0)), float(shape_el.get("y",0)),
                              float(shape_el.get("width",0)), float(shape_el.get("height",0)), step, bleed)
    elif t == "polygon":
        yield from _scan_polygon(shape_el.get("points",""), step, bleed)
    elif t == "path":
        yield from _scan_path(shape_el.get("d",""), step, bleed)


# ---------------------------------------------------------------------------
# Fill processing
# ---------------------------------------------------------------------------

def _process_fills(root):
    to_replace = []
    for parent in root.iter():
        for i, child in enumerate(parent):
            if "fill" not in child.get("class","").split():
                continue
            color = child.get("data-color","rgb(128,128,128)")

            # Scale the scribble geometry down for small shapes (eyes, pupils, etc.) so
            # oscillation/bleed/stroke-width stay proportionate to the shape instead of
            # always using the constants this style was tuned for at torso/head scale —
            # without this, a shape smaller than FILL_LOOP_AMP or FILL_STROKE_W just
            # dissolves into an unrecognizable blob. FILL_MIN_SCALE floors it so even
            # tiny shapes keep real, visible hand-drawn texture rather than none at all.
            shape_size = _fill_shape_size(child)
            scale = max(FILL_MIN_SCALE, min(1.0, shape_size / FILL_SCALE_REF))
            step = FILL_STEP * scale
            bleed = FILL_BLEED * scale
            loop_amp = FILL_LOOP_AMP * scale
            wave_amp = FILL_WAVE_AMP * scale
            stroke_w = FILL_STROKE_W * scale

            g = ET.Element(_tag("g"))
            for (x0,y0),(x1,y1) in _scan_lines(child, step, bleed):
                p = ET.SubElement(g, _tag("path"))
                p.set("d", _fill_stroke_d(x0, y0, x1, y1, loop_amp, wave_amp))
                p.set("stroke", _jitter_color(color))
                p.set("stroke-width", str(stroke_w))
                p.set("fill", "none")
                p.set("stroke-linecap", "round")
            if len(g):
                to_replace.append((parent, i, g))
    to_replace.sort(key=lambda t: (id(t[0]), -t[1]))
    for parent, i, new_el in to_replace:
        del parent[i]; parent.insert(i, new_el)
    return root


# ---------------------------------------------------------------------------
# Stroke wobble
# ---------------------------------------------------------------------------

def _wobble_strokes(root):
    to_replace = []
    for parent in root.iter():
        for i, child in enumerate(parent):
            cls = child.get("class","")
            if   "stroke-sil" in cls: base_strength = WOBBLE_STRENGTH; min_width = MIN_STROKE_SIL_WIDTH
            elif "stroke-int" in cls: base_strength = WOBBLE_STRENGTH * 0.65; min_width = MIN_STROKE_INT_WIDTH
            else: continue
            t = _local(child.tag)
            closed = True
            if t == "ellipse":
                rx, ry = float(child.get("rx",0)), float(child.get("ry",0))
                shape_size = min(rx, ry)
                pts = _ellipse_pts(float(child.get("cx",0)), float(child.get("cy",0)), rx, ry)
            elif t == "circle":
                r = float(child.get("r",0))
                shape_size = r
                pts = _ellipse_pts(float(child.get("cx",0)), float(child.get("cy",0)), r, r)
            elif t == "polygon":
                pts = _polygon_dense(child.get("points",""))
                shape_size = _bbox_short_axis(pts) if pts else 0.0
            elif t == "path":
                d_attr = child.get("d","")
                raw = _path_to_points(d_attr)
                closed = _path_is_closed(d_attr, raw)
                pts = _resample_points(raw, WOBBLE_POINTS, closed=closed)
                shape_size = _bbox_short_axis(raw) if raw else 0.0
            else:
                continue
            if not pts:
                continue
            strength = min(base_strength, shape_size * WOBBLE_SIZE_FRAC)
            wobbly = _wobble_pts(pts + [pts[0]] if closed else pts, strength)
            path_el = ET.Element(_tag("path"))
            path_el.set("d", _pts_to_d(wobbly, close=closed))
            path_el.set("fill", child.get("fill","none"))
            # Scale the width floor down for small shapes too -- an unconditional
            # MIN_STROKE_*_WIDTH would otherwise make a tiny pupil's outline thicker
            # than the pupil itself. Same size-scale logic as fill (_process_fills).
            width_scale = max(FILL_MIN_SCALE, min(1.0, shape_size / FILL_SCALE_REF))
            scaled_min_width = min_width * width_scale
            for attr in ("stroke","stroke-width","stroke-linecap","stroke-linejoin","opacity"):
                if child.get(attr) is not None:
                    if attr == "stroke-width":
                        try:
                            path_el.set(attr, str(max(float(child.get(attr)), scaled_min_width)))
                        except (TypeError, ValueError):
                            path_el.set(attr, child.get(attr))
                    else:
                        path_el.set(attr, child.get(attr))
            to_replace.append((parent, i, path_el))
    to_replace.sort(key=lambda t: (id(t[0]), -t[1]))
    for parent, i, new_el in to_replace:
        del parent[i]; parent.insert(i, new_el)
    return root


# ---------------------------------------------------------------------------
# Grain — feTurbulence filter overlay (replaces raster per-pixel jitter)
# ---------------------------------------------------------------------------

def _add_grain_filter(root):
    """Approximate per-pixel multiplicative grain as an SVG filter overlay.

    The raster version jittered each pixel by `pixel * (1 + uniform(-s, s))`.
    feTurbulence makes grayscale noise; a full-canvas rect filtered with it and
    composited via `mix-blend-mode: overlay` lightens where the noise is bright
    and darkens where it's dark, the same zero-mean jitter intent without
    rasterizing the canvas. See progress.txt Story 5a: Grain Decision.
    """
    defs = ET.SubElement(root, _tag("defs"))
    filt = ET.SubElement(defs, _tag("filter"))
    filt.set("id", "grain")
    filt.set("x", "0%"); filt.set("y", "0%")
    filt.set("width", "100%"); filt.set("height", "100%")
    turb = ET.SubElement(filt, _tag("feTurbulence"))
    turb.set("type", "fractalNoise")
    turb.set("baseFrequency", str(GRAIN_BASE_FREQ))
    turb.set("numOctaves", "2")
    turb.set("stitchTiles", "stitch")
    turb.set("result", "noise")
    cm = ET.SubElement(filt, _tag("feColorMatrix"))
    cm.set("in", "noise")
    cm.set("type", "matrix")
    cm.set("values", "0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.33 0.33 0.33 0 0")

    vb = root.get("viewBox", "0 0 1 1").split()
    x0, y0, w, h = (float(v) for v in vb) if len(vb) == 4 else (0.0, 0.0, 1.0, 1.0)
    overlay = ET.SubElement(root, _tag("rect"))
    overlay.set("x", str(x0)); overlay.set("y", str(y0))
    overlay.set("width", str(w)); overlay.set("height", str(h))
    overlay.set("filter", "url(#grain)")
    overlay.set("style", f"mix-blend-mode:overlay;opacity:{GRAIN_STRENGTH * 4:.3f}")
    overlay.set("pointer-events", "none")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def svg_to_svg(svg_string: str, output_path: str) -> str:
    """45° angled fills + OU wobble + grain filter → styled SVG file (no rasterization)."""
    root = ET.fromstring(svg_string)
    _process_fills(root)
    _wobble_strokes(root)
    _add_grain_filter(root)
    processed = ET.tostring(root, encoding="unicode")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(processed)
    return output_path
