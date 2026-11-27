import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Config } from '@remotion/cli/config';

const prefix = process.env.PREFIX || '/data/user/0/ai.antigem/files/usr';
const localBins = path.resolve('binaries');
const defaultBins = path.join(os.homedir(), 'remotion-studio', 'binaries');
const binariesDir = fs.existsSync(localBins) ? localBins : defaultBins;

Config.setBrowserExecutable(path.join(prefix, 'bin', 'chromium-browser'));
Config.setChromeMode('chrome-for-testing');
Config.setBinariesDirectory(binariesDir);
Config.setChromiumOpenGlRenderer('swangle');
