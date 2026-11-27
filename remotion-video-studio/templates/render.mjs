import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.resolve('out');
fs.mkdirSync(OUT_DIR, { recursive: true });
const OUT_FILE = path.join(OUT_DIR, 'output.mp4');

const FPS = 30;
const TOTAL_FRAMES = 60;
const WIDTH = 720;
const HEIGHT = 720;

const browser = await puppeteer.launch({
  executablePath: process.env.CHROMIUM_PATH || '/data/user/0/ai.antigem/files/usr/bin/chromium-browser',
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
});

const page = await browser.newPage();
await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });
await page.goto(`file://${path.resolve('src/scene.html')}`, { waitUntil: 'networkidle0' });

const ffmpeg = spawn('ffmpeg', [
  '-y',
  '-f', 'image2pipe',
  '-vcodec', 'png',
  '-r', String(FPS),
  '-i', '-',
  '-c:v', 'libx264',
  '-pix_fmt', 'yuv420p',
  '-crf', '18',
  OUT_FILE,
]);

ffmpeg.stderr.on('data', () => {});

for (let f = 0; f < TOTAL_FRAMES; f++) {
  await page.evaluate((frame) => window.setFrame(frame), f);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const buf = await page.screenshot({ type: 'png' });
  ffmpeg.stdin.write(buf);
}

ffmpeg.stdin.end();
await new Promise((resolve, reject) => {
  ffmpeg.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`))));
});

await browser.close();
console.log('RENDERED:', OUT_FILE);
