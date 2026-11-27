import os from 'node:os';
import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';

const prefix = process.env.PREFIX || '/data/user/0/ai.antigem/files/usr';
const compositionId = process.argv[2] || 'TestVideo';
const outputLocation = path.resolve(process.argv[3] || 'out/remotion-output.mp4');

const termuxRemotionOpts = {
  browserExecutable: path.join(prefix, 'bin', 'chromium-browser'),
  chromeMode: 'chrome-for-testing',
  binariesDirectory: path.join(os.homedir(), 'remotion-studio', 'binaries'),
  chromiumOptions: {
    gl: 'swangle',
  },
};

const serveUrl = await bundle({
  entryPoint: path.resolve('src/index.ts'),
});

const composition = await selectComposition({
  serveUrl,
  id: compositionId,
  ...termuxRemotionOpts,
});

await renderMedia({
  composition,
  serveUrl,
  codec: 'h264',
  outputLocation,
  ...termuxRemotionOpts,
  onProgress: ({ progress }) => {
    process.stdout.write(`\rRendering ${compositionId}: ${Math.round(progress * 100)}%`);
  },
});

console.log(`\nRENDERED: ${outputLocation}`);
