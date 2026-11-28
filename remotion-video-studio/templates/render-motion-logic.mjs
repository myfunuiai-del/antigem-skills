import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import puppeteer from 'puppeteer-core';

const WIDTH = 1280;
const HEIGHT = 720;
const FPS = 30;
const TOTAL_FRAMES = 60; // 2 seconds test render

const OUT_DIR = path.resolve('out');
const FRAMES_DIR = path.join(OUT_DIR, 'motion-logic-frames');
const OUTPUT_MP4 = path.join(OUT_DIR, 'test-motion-logic.mp4');
const SCENE_PATH = 'file://' + path.resolve('src/TestMotionLogic.html');

async function render() {
  const startTime = Date.now();
  console.log('===> Starting Termux Headless Render Test (TestMotionLogic)...');
  
  if (fs.existsSync(FRAMES_DIR)) fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
  fs.mkdirSync(FRAMES_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: '/data/user/0/ai.antigem/files/usr/bin/chromium-browser',
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--headless=new',
      '--disable-gpu',
      '--use-gl=angle',
      '--use-angle=gl-egl'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });
  await page.goto(SCENE_PATH, { waitUntil: 'load' });
  await page.evaluate(() => window.readyPromise || Promise.resolve());

  console.log(`[1/2] Capturing ${TOTAL_FRAMES} frames via Headless Chromium...`);
  for (let f = 0; f < TOTAL_FRAMES; f++) {
    await page.evaluate((frame) => {
      if (typeof window.setFrame === 'function') window.setFrame(frame);
    }, f);

    const frameFile = path.join(FRAMES_DIR, `frame-${String(f).padStart(5, '0')}.png`);
    await page.screenshot({ path: frameFile, type: 'png' });
    if ((f + 1) % 15 === 0) {
      console.log(`      Rendered frame ${f + 1} / ${TOTAL_FRAMES} (${Math.round((f + 1) / TOTAL_FRAMES * 100)}%)`);
    }
  }

  await browser.close();
  const captureTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`      Frames captured in ${captureTime}s.`);

  console.log('[2/2] Encoding MP4 with FFmpeg...');
  await new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-y',
      '-framerate', String(FPS),
      '-i', path.join(FRAMES_DIR, 'frame-%05d.png'),
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', '18',
      '-pix_fmt', 'yuv420p',
      OUTPUT_MP4
    ], { stdio: 'inherit' });

    ffmpeg.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg exited with code ${code}`));
    });
  });

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  const stat = fs.statSync(OUTPUT_MP4);
  console.log(`\n✓ SUCCESS! Rendered ${OUTPUT_MP4} (${(stat.size / 1024).toFixed(1)} KB) in ${totalTime}s!`);
}

render().catch(err => {
  console.error('Render error:', err);
  process.exit(1);
});
