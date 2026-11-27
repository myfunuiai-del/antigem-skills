import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Config } from '@remotion/cli/config';

const prefix = process.env.PREFIX || '/data/user/0/ai.antigem/files/usr';
const localBins = path.resolve('binaries');
const defaultBins = path.join(os.homedir(), 'remotion-studio', 'binaries');
const binariesDir = fs.existsSync(localBins) ? localBins : defaultBins;

// Fixes Webpack PackFileCacheStrategy on Android/Termux:
// Android returns EACCES when Webpack snapshots parent dirs like /data/user/0.
// Mapping EACCES -> EISDIR lets FileSystemInfo cache them as directories,
// cutting warm re-bundle times roughly in half.
class TermuxWebpackCacheFixPlugin {
  apply(compiler: any) {
    const patchFsObj = (fso: any) => {
      if (!fso || fso.__termuxEaccesPatched) return;
      fso.__termuxEaccesPatched = true;
      if (typeof fso.readFile === 'function') {
        const origRead = fso.readFile;
        fso.readFile = function (p: any, ...args: any[]) {
          const cbIdx = args.length - 1;
          const cb = args[cbIdx];
          if (typeof cb === 'function') {
            args[cbIdx] = (err: any, data: any) => {
              if (err && err.code === 'EACCES') {
                const e: any = new Error(`EISDIR: illegal operation on a directory, read '${p}'`);
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

Config.setBrowserExecutable(path.join(prefix, 'bin', 'chromium-browser'));
Config.setChromeMode('chrome-for-testing');
Config.setBinariesDirectory(binariesDir);
Config.setChromiumOpenGlRenderer('swangle');
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(90);
Config.setX264Preset('veryfast');
Config.setConcurrency(4);
Config.overrideWebpackConfig((current) => ({
  ...current,
  devtool: false,
  plugins: [...(current.plugins ?? []), new TermuxWebpackCacheFixPlugin()],
}));
