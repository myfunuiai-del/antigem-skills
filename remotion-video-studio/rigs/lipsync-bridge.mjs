#!/usr/bin/env node
/**
 * Audio RMS -> Rev2D Lip-Sync & Expression Bridge
 *
 * Extracts mono 16kHz PCM via ffmpeg (zero extra npm deps), computes per-frame
 * noise-gated & smoothed RMS amplitude, and injects an animation track into
 * a .r2d.json rig. Automatically adapts for Eye-Only rigs (no MouthOpen param).
 *
 * Usage:
 *   node lipsync-bridge.mjs --model in.r2d.json --audio voice.mp3 --out synced.r2d.json [--anim speech] [--fps 30] [--step 2] [--head-bob]
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

function parseArgs(argv) {
  const args = { anim: 'speech', param: 'MouthOpen', step: 2, headBob: false };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--model') args.model = argv[++i];
    else if (k === '--audio') args.audio = argv[++i];
    else if (k === '--out') args.out = argv[++i];
    else if (k === '--anim') args.anim = argv[++i];
    else if (k === '--param') args.param = argv[++i];
    else if (k === '--fps') args.fps = Number(argv[++i]);
    else if (k === '--step') args.step = Math.max(1, Number(argv[++i]) || 2);
    else if (k === '--head-bob') args.headBob = true;
  }
  if (!args.model || !args.audio || !args.out) {
    console.error('Usage: node lipsync-bridge.mjs --model <in.r2d.json> --audio <file> --out <out.r2d.json> [--anim speech] [--fps 30] [--step 2] [--head-bob]');
    process.exit(2);
  }
  return args;
}

function decodePcm16k(audioPath) {
  const buf = execFileSync('ffmpeg', [
    '-v', 'error',
    '-i', audioPath,
    '-ac', '1',
    '-ar', '16000',
    '-f', 's16le',
    'pipe:1'
  ], { maxBuffer: 64 * 1024 * 1024 });
  return new Int16Array(buf.buffer, buf.byteOffset, Math.floor(buf.byteLength / 2));
}

function computeFrameRms(samples, sampleRate, fps) {
  const samplesPerFrame = Math.max(1, Math.round(sampleRate / fps));
  const totalFrames = Math.max(1, Math.ceil(samples.length / samplesPerFrame));
  const raw = new Float64Array(totalFrames);

  for (let f = 0; f < totalFrames; f++) {
    const start = f * samplesPerFrame;
    const end = Math.min(samples.length, start + samplesPerFrame);
    let sumSq = 0;
    for (let i = start; i < end; i++) {
      const s = samples[i] / 32768;
      sumSq += s * s;
    }
    raw[f] = Math.sqrt(sumSq / Math.max(1, end - start));
  }

  // Adaptive normalization using 95th percentile so isolated pops don't crush speech
  const sorted = Array.from(raw).sort((a, b) => a - b);
  const p95 = Math.max(0.02, sorted[Math.floor(sorted.length * 0.95)] || 0.1);
  const noiseFloor = Math.min(0.06, p95 * 0.08);

  const out = new Array(totalFrames);
  let env = 0;
  for (let f = 0; f < totalFrames; f++) {
    const gated = Math.max(0, raw[f] - noiseFloor) / Math.max(1e-4, p95 - noiseFloor);
    const clamped = Math.min(1, Math.pow(Math.min(1.2, gated), 0.78));
    // Fast attack, smooth release for crisp syllable separation
    const coef = clamped > env ? 0.65 : 0.42;
    env = env + (clamped - env) * coef;
    out[f] = env < 0.03 ? 0 : Number(env.toFixed(3));
  }
  return { rms: out, duration: Number((samples.length / sampleRate).toFixed(3)) };
}

function buildTrackKeys(values, fps, step, duration, mapFn = (v) => v, ease = 'linear') {
  const keys = [];
  for (let f = 0; f < values.length; f += step) {
    const t = Math.min(duration, Number((f / fps).toFixed(3)));
    if (keys.length === 0 || t > keys[keys.length - 1].t) {
      keys.push({ t, v: mapFn(values[f]), ease });
    }
  }
  const lastIdx = values.length - 1;
  if (keys.length === 0 || keys[keys.length - 1].t < duration) {
    keys.push({ t: duration, v: mapFn(values[lastIdx] ?? 0) });
  }
  return keys;
}

const args = parseArgs(process.argv.slice(2));
const model = JSON.parse(readFileSync(args.model, 'utf8'));
const fps = args.fps || model.meta?.fps || 30;
const samples = decodePcm16k(args.audio);
const { rms, duration } = computeFrameRms(samples, 16000, fps);

const paramIds = new Set((model.parameters || []).map((p) => p.id));
const hasMouth = paramIds.has(args.param);
const tracks = [];

if (hasMouth) {
  tracks.push({
    target: `param:${args.param}`,
    keys: buildTrackKeys(rms, fps, args.step, duration, (v) => v, 'linear')
  });
}

// Optional subtle head/expression reactions driven by speech energy
if (args.headBob && paramIds.has('AngleZ')) {
  const headKeys = [];
  const beatStep = Math.max(6, Math.round(fps * 0.3));
  for (let f = 0; f < rms.length; f += beatStep) {
    const t = Math.min(duration, Number((f / fps).toFixed(3)));
    const energy = rms[f];
    const dir = (Math.floor(f / beatStep) % 2 === 0) ? 1 : -1;
    const angle = Number((dir * (2 + energy * 8)).toFixed(2));
    if (headKeys.length === 0 || t > headKeys[headKeys.length - 1].t) {
      headKeys.push({ t, v: angle, ease: 'smooth' });
    }
  }
  if (headKeys[headKeys.length - 1].t < duration) {
    headKeys.push({ t: duration, v: 0 });
  }
  tracks.push({ target: 'param:AngleZ', keys: headKeys });
}

if (!hasMouth && paramIds.has('BrowMood')) {
  // Eye-only character reacts to narration intensity with brow & gaze accents
  tracks.push({
    target: 'param:BrowMood',
    keys: buildTrackKeys(rms, fps, Math.max(4, args.step * 2), duration, (v) => Number((v * 0.7 - 0.15).toFixed(3)), 'smooth')
  });
}

if (paramIds.has('EyeLOpen') || paramIds.has('EyeROpen')) {
  const blinkKeys = [{ t: 0, v: 1 }];
  for (let bt = 1.4; bt < duration - 0.25; bt += 2.2) {
    blinkKeys.push({ t: Number(bt.toFixed(3)), v: 1 });
    blinkKeys.push({ t: Number((bt + 0.08).toFixed(3)), v: 0 });
    blinkKeys.push({ t: Number((bt + 0.18).toFixed(3)), v: 1 });
  }
  blinkKeys.push({ t: duration, v: 1 });
  if (paramIds.has('EyeLOpen')) tracks.push({ target: 'param:EyeLOpen', keys: blinkKeys });
  if (paramIds.has('EyeROpen')) tracks.push({ target: 'param:EyeROpen', keys: blinkKeys });
}

model.animations = (model.animations || []).filter((a) => a.id !== args.anim);
model.animations.push({
  id: args.anim,
  duration,
  loop: false,
  tracks
});

mkdirSync(dirname(args.out), { recursive: true });
writeFileSync(args.out, JSON.stringify(model, null, 2));

const speakingFrames = rms.filter((v) => v > 0.08).length;
console.log(JSON.stringify({
  ok: true,
  model: args.model,
  out: args.out,
  anim: args.anim,
  mode: hasMouth ? `lipsync:${args.param}` : 'eye-only-expression',
  fps,
  duration,
  frames: rms.length,
  speakingFrames,
  peakRms: Math.max(...rms),
  tracks: tracks.map((t) => ({ target: t.target, keys: t.keys.length }))
}, null, 2));
