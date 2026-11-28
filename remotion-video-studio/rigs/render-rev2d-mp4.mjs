#!/usr/bin/env node
/**
 * Rev2D -> PNG Frames -> FFmpeg MP4 Export Pipeline
 *
 * Renders any .r2d.json rig (single animation or layered animations e.g. fly + speech,add)
 * into a frame-exact H.264 MP4 (with optional voiceover muxing) and writes preview metadata.
 *
 * Usage:
 *   node render-rev2d-mp4.mjs --model <rig.r2d.json> --out <out.mp4> \
 *     [--anim fly] [--layer "speech,add"] [--audio voice.mp3] \
 *     [--fps 30] [--from 0] [--to 4.5] [--warmup 1.0] [--scale 2] \
 *     [--overlay bones] [--keep-frames]
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, statSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REV2D_BIN = resolve(__dirname, '../engines/rev2d/bin/rev2d.js');

function parseArgs(argv) {
  const args = { layers: [], scale: 2, fps: null, from: null, to: null, warmup: null, overlay: '', keepFrames: false };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--model') args.model = resolve(argv[++i]);
    else if (k === '--out') args.out = resolve(argv[++i]);
    else if (k === '--anim') args.anim = argv[++i];
    else if (k === '--layer') args.layers.push(argv[++i]);
    else if (k === '--audio') args.audio = resolve(argv[++i]);
    else if (k === '--fps') args.fps = Number(argv[++i]);
    else if (k === '--from') args.from = Number(argv[++i]);
    else if (k === '--to') args.to = Number(argv[++i]);
    else if (k === '--warmup') args.warmup = Number(argv[++i]);
    else if (k === '--scale') args.scale = Number(argv[++i]) || 2;
    else if (k === '--overlay') args.overlay = argv[++i];
    else if (k === '--keep-frames') args.keepFrames = true;
  }
  if (!args.model || !args.out) {
    console.error('Usage: node render-rev2d-mp4.mjs --model <in.r2d.json> --out <out.mp4> [--anim id] [--layer id,add] [--audio file] [--fps 30] [--to sec] [--scale 2]');
    process.exit(2);
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const model = JSON.parse(readFileSync(args.model, 'utf8'));
const fps = args.fps || model.meta?.fps || 30;
const anims = model.animations || [];
const primaryAnim = args.anim || anims[0]?.id;
if (!primaryAnim) {
  console.error('No animations found in model:', args.model);
  process.exit(1);
}

const outDir = dirname(args.out);
const jobStem = basename(args.out, '.mp4');
const framesDir = join(outDir, `.frames_${jobStem}`);
mkdirSync(outDir, { recursive: true });
mkdirSync(framesDir, { recursive: true });

// Auto-resolve render end time from audio duration or longest layered anim when --to is omitted
let resolvedTo = args.to;
if (resolvedTo == null && args.audio && existsSync(args.audio)) {
  try {
    const durStr = execFileSync('ffprobe', [
      '-v', 'error', '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1', args.audio,
    ], { encoding: 'utf8' }).trim();
    const d = parseFloat(durStr);
    if (Number.isFinite(d) && d > 0) resolvedTo = Number(d.toFixed(3));
  } catch {}
}
if (resolvedTo == null && args.layers.length > 0) {
  let maxDur = anims.find(a => a.id === primaryAnim)?.duration || 0;
  for (const l of args.layers) {
    const lid = l.split('@')[0].split(',')[0];
    const ld = anims.find(a => a.id === lid)?.duration || 0;
    if (ld > maxDur) maxDur = ld;
  }
  if (maxDur > 0) resolvedTo = maxDur;
}

// 1. Render PNG sequence via Rev2D headless renderer
const revArgs = [
  REV2D_BIN, 'frames', args.model,
  '-o', framesDir,
  '--anim', primaryAnim,
  '--fps', String(fps),
  '--scale', String(args.scale),
  '--json',
];
for (const l of args.layers) revArgs.push('--anim', l);
if (args.from != null) revArgs.push('--from', String(args.from));
if (resolvedTo != null) revArgs.push('--to', String(resolvedTo));
if (args.warmup != null) revArgs.push('--warmup', String(args.warmup));
if (args.overlay) revArgs.push('--overlay', args.overlay);

const framesOut = execFileSync('node', revArgs, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
const manifest = JSON.parse(readFileSync(join(framesDir, 'manifest.json'), 'utf8'));

// 2. Render poster frame at t=0.4s (or middle)
const posterPath = join(outDir, `${jobStem}.png`);
const midIdx = Math.min(manifest.files.length - 1, Math.floor(manifest.files.length / 3));
const posterSrc = join(framesDir, manifest.files[midIdx] || manifest.files[0]);

// 3. Encode H.264 MP4 via ffmpeg (even dimensions required by yuv420p)
const ffArgs = [
  '-y',
  '-framerate', String(fps),
  '-i', join(framesDir, 'frame_%04d.png'),
];
if (args.audio && existsSync(args.audio)) {
  ffArgs.push('-i', args.audio);
}
ffArgs.push(
  '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2',
  '-c:v', 'libx264',
  '-pix_fmt', 'yuv420p',
  '-preset', 'fast',
  '-crf', '18',
  '-movflags', '+faststart',
);
if (args.audio && existsSync(args.audio)) {
  ffArgs.push('-c:a', 'aac', '-b:a', '128k', '-shortest');
}
ffArgs.push(args.out);

execFileSync('ffmpeg', ffArgs, { stdio: 'pipe' });

// Save poster PNG from mid frame before cleanup
writeFileSync(posterPath, readFileSync(posterSrc));
if (!args.keepFrames) {
  rmSync(framesDir, { recursive: true, force: true });
}

const metaOut = {
  ok: true,
  model: args.model,
  modelName: model.meta?.name || basename(args.model, '.r2d.json'),
  mp4: args.out,
  poster: posterPath,
  fps,
  frames: manifest.files.length,
  duration: Number((manifest.files.length / fps).toFixed(2)),
  width: manifest.width,
  height: manifest.height,
  layers: [primaryAnim, ...args.layers],
  hasAudio: Boolean(args.audio && existsSync(args.audio)),
  sizeKB: Math.round(statSync(args.out).size / 1024),
  createdAt: new Date().toISOString(),
  framesSummaryBytes: framesOut.length,
};
writeFileSync(join(outDir, `${jobStem}.meta.json`), JSON.stringify(metaOut, null, 2));
console.log(JSON.stringify(metaOut, null, 2));
