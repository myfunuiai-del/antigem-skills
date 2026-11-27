import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

// Resolve @remotion/bundler & @remotion/renderer even under strict pnpm hoisting (via @remotion/cli)
const require = createRequire(import.meta.url);
function loadRemotionPkg(pkg) {
  try {
    return require(pkg);
  } catch {
    const cliEntry = require.resolve('@remotion/cli/package.json');
    return createRequire(cliEntry)(pkg);
  }
}
const { bundle } = loadRemotionPkg('@remotion/bundler');
const { renderMedia, selectComposition } = loadRemotionPkg('@remotion/renderer');

const prefix = process.env.PREFIX || '/data/user/0/ai.antigem/files/usr';
const compositionId = process.argv[2] || 'TestVideo';
const outputLocation = path.resolve(process.argv[3] || 'out/remotion-output.mp4');
const prebundledDir = process.env.REMOTION_SERVE_URL || '';

class TermuxWebpackCacheFixPlugin {
  apply(compiler) {
    const patchFsObj = (fso) => {
      if (!fso || fso.__termuxEaccesPatched) return;
      fso.__termuxEaccesPatched = true;
      if (typeof fso.readFile === 'function') {
        const origRead = fso.readFile;
        fso.readFile = function (p, ...args) {
          const cbIdx = args.length - 1;
          const cb = args[cbIdx];
          if (typeof cb === 'function') {
            args[cbIdx] = (err, data) => {
              if (err && err.code === 'EACCES') {
                const e = new Error(`EISDIR: illegal operation on a directory, read '${p}'`);
                e.code = 'EISDIR';
                return cb(e);
              }
              return cb(err, data);
            };
          }
          return origRead.call(this, p, ...args);
        };
      }
      if (fso.fileSystem) patchFsObj(fso.fileSystem);
    };
    const hookFn = () => {
      patchFsObj(compiler.inputFileSystem);
      patchFsObj(compiler.intermediateFileSystem);
    };
    compiler.hooks.afterEnvironment.tap('TermuxWebpackCacheFixPlugin', hookFn);
    compiler.hooks.afterPlugins.tap('TermuxWebpackCacheFixPlugin', hookFn);
    compiler.hooks.beforeCompile.tap('TermuxWebpackCacheFixPlugin', hookFn);
    hookFn();
  }
}

const termuxRemotionOpts = {
  browserExecutable: path.join(prefix, 'bin', 'chromium-browser'),
  chromeMode: 'chrome-for-testing',
  binariesDirectory: path.join(os.homedir(), 'remotion-studio', 'binaries'),
  chromiumOptions: {
    gl: 'swangle',
  },
};

const serveUrl =
  prebundledDir && fs.existsSync(prebundledDir)
    ? prebundledDir
    : await bundle({
        entryPoint: path.resolve('src/index.ts'),
        webpackOverride: (current) => ({
          ...current,
          devtool: false,
          plugins: [...(current.plugins ?? []), new TermuxWebpackCacheFixPlugin()],
        }),
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
  imageFormat: 'jpeg',
  jpegQuality: 90,
  x264Preset: 'veryfast',
  concurrency: 4,
  outputLocation,
  ...termuxRemotionOpts,
  onProgress: ({ progress }) => {
    process.stdout.write(`\rRendering ${compositionId}: ${Math.round(progress * 100)}%`);
  },
});

console.log(`\nRENDERED: ${outputLocation}`);
