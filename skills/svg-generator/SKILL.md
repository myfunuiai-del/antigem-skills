---
name: svg-generator
description: Zero-API hand-drawn scribble-art SVG generator. Draw any subject from imagination or trace a photo into a pure SVG with 45-degree angled fill strokes, hand-wobbled ink outlines, and grain texture. Use when the user asks to generate an SVG, draw, sketch, trace a subject, or create an illustration (e.g., "একটা বিড়ালের ছবি বানাও", "draw a cat", "generate an SVG").
---

Classify → load sub-instructions → generate SVG → `draw.py` adds fills, wobble, grain automatically.

## Palette (exact RGB only — no hex, no named colors, no gradients)

Every `data-color` value and every `stroke`/`fill` color that is an `rgb(...)` value MUST
exactly match one of the 21 RGB triples in the table below, **byte-for-byte** (same three
integers, in the `rgb(r,g,b)` form shown). No hex (`#rrggbb`), no CSS named colors, no
`<linearGradient>`/`<radialGradient>`, and no other RGB values anywhere in the file.

| color       | rgb                  |
|-------------|----------------------|
| red         | rgb(215,50,50)       |
| maroon      | rgb(140,40,40)       |
| orange      | rgb(240,150,40)      |
| yellow      | rgb(245,220,50)      |
| cream       | rgb(245,235,200)     |
| green       | rgb(60,175,65)       |
| dark green  | rgb(35,110,55)       |
| teal        | rgb(50,160,160)      |
| blue        | rgb(50,115,215)      |
| light blue  | rgb(140,190,230)     |
| purple      | rgb(130,60,200)      |
| pink        | rgb(215,100,155)     |
| brown       | rgb(120,80,50)       |
| white       | rgb(255,255,255)     |
| light grey  | rgb(180,180,180)     |
| dark grey   | rgb(75,75,75)        |
| black       | rgb(30,30,30)        |
| skin/peach  | rgb(240,185,140)     |
| sandy/tan   | rgb(205,170,115)     |
| bg stone    | rgb(195,188,175)     |
| ink         | rgb(13,13,13)        |

## SVG rules

- The root `<svg>` element MUST have `viewBox="0 0 1 1"` (exactly this string), plus `width="1080" height="1080"` — normalized coords
- Usable zone: x/y ∈ [0.08, 0.92]
- Total line count of the SVG file MUST be `<= 200` lines. The number of `class="fill"` elements MUST be `<= 15`.

## Element classes

- `class="fill"` + `data-color="rgb(...)"` — canvas.py replaces with 45° angled scribble fill strokes. Use a curved `<path>`, `<circle>`, or `<ellipse>` (see **Line rules** below — `<polygon>`/`<rect>` are not permitted for classed shapes).
- `class="stroke-sil"` — canvas.py wobbles the outline (Ornstein-Uhlenbeck); use for any outline. Use a curved `<path>`, `<circle>`, or `<ellipse>` (see **Line rules** below).
- `class="stroke-int"` — same wobble, slightly softer; use for interior/boundary lines. Use a curved `<path>`, `<circle>`, or `<ellipse>` (see **Line rules** below).
- No class — passed through as-is, completely unprocessed (no wobble, no scribble fill). Reserve this for elements that genuinely aren't part of the drawn silhouette/fill geometry — thin accent strokes, tiny structural marks. These may be any element, including `<polygon>`/`<rect>`.

> Small shapes (eyes, pupils, and similar detail-scale fills/outlines) should be classed normally (`fill`/`stroke-sil`/`stroke-int`) like everything else — canvas.py automatically scales the scribble fill and wobble/width-floor proportionately down for shapes smaller than ~0.15 normalized radius, so they get real, visible hand-drawn texture at their own scale instead of either a flat unprocessed look or ballooning into an unrecognizable blob. Leaving detail shapes unclassed "for crispness" is no longer necessary or recommended.

## Line rules — wobbly organic lines only (mandatory)

Every drawn shape carrying `class="fill"`, `class="stroke-sil"`, or `class="stroke-int"` MUST be one of:

- a `<path>` whose `d` attribute uses **at least one curve command** (`Q` or `C`), or
- a `<circle>`, or
- an `<ellipse>`.

`<polygon>` and `<rect>` are **NOT permitted** for these three classes, and a `<path>` built only
from straight segments (`M`/`L`/`Z` with no `Q`/`C`) is equally forbidden. There must be **no straight
lines and no sharp corners anywhere** in the drawn silhouette or fill geometry — wobbly organic curves
are what produce the hand-drawn feel, and they are **mandatory on every image**, not an optional
per-image style choice.

This holds even when the real-world subject has straight edges: buildings, fences, bicycles, mechanical
panels, triangles, boxes, signage, and any other geometric subject must still be authored as curved
`<path>`s (or `<circle>`/`<ellipse>`), **never** as `<polygon>`/`<rect>`. Eyes, pupils, and other small
detail shapes are NOT an exception — class them normally (per the small-shapes note above) rather than
leaving them unclassed to sidestep this rule. Only elements that are genuinely not part of the drawn
silhouette/fill geometry at all (thin accent strokes, tiny structural marks) may stay unclassed and use
straight-edged `<polygon>`/`<rect>`, since unclassed shapes pass through un-wobbled.

## Style notes

- Fill strokes run at 45° angle, looping blobs that bleed slightly past shape boundary
- Stroke wobble: organic hand-drawn jitter on all outlined shapes
- Grain applied via an SVG `<feTurbulence>` filter, not a raster post-process
- Fill stroke width: ~0.035 normalized (thick, blobby)
- No default background — author the background to match the source scene (sky, floor, walls, props, or plain white), using palette colors as `class="fill"` regions like any other part of the composition

## Steps

> **No input image? Prompt-only drawing path.** If the request is just a text description
> with no reference image (e.g. "draw a frog", "draw a mountain sunset"), do **not**
> fabricate or hallucinate an image to classify. Instead:
> 1. Read all five `instructions/*.md` category descriptions (`portrait`, `landscape`,
>    `object`, `abstract`, `other`).
> 2. Pick the single best-fit category by reasoning about the prompt text alone —
>    e.g. "a frog" → `object`, "a mountain sunset" → `landscape`, "a colorful swirl" →
>    `abstract`, "a portrait of a girl" → `portrait`.
> 3. Skip Step 0 entirely and go straight to Step 1, writing the SVG from imagination
>    following the chosen category's sub-instructions plus the palette/class/viewBox rules above.
>
> This is a **distinct path from image-tracing**: there is no `reference/`, no `refs/`, no
> target to match, and no likeness requirement. You are inventing the composition, not
> reproducing a source. The output is judged only against the chosen category's own
> instructions and this SKILL.md's style/budget rules — never against a reference image.
>
> When an input image **is** provided, ignore this branch and follow Step 0 onward as usual.

0. **Classify the input image, then load its sub-instructions.**
   View the input image directly and classify its subject into exactly one of:
   `portrait` (a person's or animal's face/head/upper body is the primary subject),
   `landscape` (an outdoor scene or environment where no single subject dominates),
   `object` (a single subject — item, product, animal, figure — isolated or with
   minimal background), `abstract` (non-representational shapes/patterns or
   text/meme-style compositions), or `other` (anything that doesn't clearly fit).
   Read the matching file in `instructions/<category>.md` and apply its tracing hints
   before writing the SVG in the next step.

1. Decide the output path. Use whatever path the caller specified. For ad-hoc one-off
   use with no path given, default to a flat `./<slug>.svg` in the current directory
   (e.g. `./frog.svg`), picking a short kebab-case `<slug>` from the subject.

2. Write SVG to `$TMPDIR/claude_draw_input.svg`, following the category's sub-instructions
   on top of the palette/class/viewBox rules above.

3. Render (using `draw.py` inside this skill directory):
   ```bash
   python3 /data/user/0/ai.antigem/files/home/.gemini/config/skills/svg-generator/draw.py "$TMPDIR/claude_draw_input.svg" <output_path>
   ```

3a. **Image-tracing path only — mandatory one-pass self-verification.** (Skip this step
    entirely on the prompt-only path from the branch above — there's no source photo to
    compare against.) Direct likeness accuracy has repeatedly been the weakest part of a
    trace even when style/budget/palette rules all pass:
    1. View the rendered `<output_path>` side by side with the original source image
       (view the SVG directly if the environment renders it; otherwise convert to PNG
       with whatever SVG rasterizer is available, e.g. cairosvg).
    2. Explicitly compare expression, proportions, and any complex gesture/pose against
       the source — not just overall composition/color, which is easy to get right while
       still missing the thing that actually reads as "that specific photo."
    3. Identify the single biggest mismatch (e.g. "eyes read as happy, source is
       unimpressed" or "hand shape is unclear") and make one corrective revision to
       `/tmp/claude_draw_input.svg` addressing it specifically, then re-render to
       `<output_path>`.
    4. This is **one bounded revision pass, not an open-ended loop** — after this single
       correction, the trace is done. Do not keep re-comparing and re-revising.

4. Tell the user what you drew and the output path, then display the image inline on completion.
