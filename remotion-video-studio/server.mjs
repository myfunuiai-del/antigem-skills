import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.MKPROMPT_PORT || 4173);
const HOST = '127.0.0.1';
const SKILLS_DIR = path.join(process.env.HOME || '/data/user/0/ai.antigem/files/home', '.gemini/config/skills');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.ttf': 'font/ttf',
};

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 2 * 1024 * 1024) reject(new Error('Body too large'));
    });
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); }
      catch (e) { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

function defaultStartDir() {
  const candidates = ['/sdcard/Download', '/storage/emulated/0/Download', process.env.HOME || __dirname];
  for (const c of candidates) {
    try { if (fs.existsSync(c) && fs.statSync(c).isDirectory()) return c; } catch {}
  }
  return __dirname;
}

function browseDir(targetDir) {
  const dir = path.resolve(targetDir || defaultStartDir());
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const folders = [];
  let fileCount = 0;

  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    if (e.isDirectory()) {
      folders.push({ name: e.name, path: path.join(dir, e.name) });
    } else if (e.isFile()) {
      fileCount++;
    }
  }
  folders.sort((a, b) => a.name.localeCompare(b.name));
  const parent = path.dirname(dir);
  return {
    dir,
    parent: parent !== dir ? parent : null,
    fileCount,
    folders,
    shortcuts: [
      { label: 'Download', path: '/sdcard/Download' },
      { label: 'AntiGem', path: '/sdcard/Download/AntiGem' },
      { label: 'Movies', path: '/sdcard/Movies' },
      { label: 'Studio', path: __dirname },
    ].filter(s => { try { return fs.existsSync(s.path); } catch { return false; } }),
  };
}

function walkFiles(baseDir, maxDepth = 2) {
  const out = [];
  function walk(curr, depth) {
    let entries;
    try { entries = fs.readdirSync(curr, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name.startsWith('.') || e.name === 'node_modules') continue;
      const full = path.join(curr, e.name);
      const rel = path.relative(baseDir, full);
      if (e.isFile()) {
        out.push({ name: e.name, rel, full });
      } else if (e.isDirectory() && depth < maxDepth) {
        walk(full, depth + 1);
      }
    }
  }
  walk(baseDir, 0);
  return out;
}

function probeAudioDuration(filePath) {
  try {
    const out = execFileSync('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath,
    ], { encoding: 'utf-8', timeout: 4000 }).trim();
    const sec = parseFloat(out);
    if (!Number.isFinite(sec) || sec <= 0) return null;
    const mins = Math.floor(sec / 60);
    const rem = Math.round(sec % 60);
    return {
      seconds: +sec.toFixed(2),
      formatted: mins > 0 ? `${mins}m ${rem}s` : `${rem}s`,
      frames30: Math.ceil(sec * 30),
      frames16: Math.ceil(sec * 16),
      chunks30s: Math.max(1, Math.ceil(sec / 30)),
      suggestedShots: Math.max(4, Math.round(sec / 4.5)),
    };
  } catch {
    return null;
  }
}

function detectResumeState(dir) {
  const projDir = path.join(dir, 'project');
  const handoffPath = path.join(projDir, 'handoff.json');
  if (fs.existsSync(handoffPath)) {
    try {
      const h = JSON.parse(fs.readFileSync(handoffPath, 'utf-8'));
      const done = Number(h.completedPhase || h.phase || 1);
      return {
        source: 'handoff.json',
        completedPhase: done,
        nextPhase: Math.min(4, done + 1),
        summary: h.summary || h.nextStep || `Resume from Phase ${Math.min(4, done + 1)}`,
      };
    } catch {}
  }
  const hasStyle = fs.existsSync(path.join(projDir, 'style-bible.json')) || fs.existsSync(path.join(dir, 'style-bible.json'));
  const hasStory = fs.existsSync(path.join(projDir, 'storyboard.json')) || fs.existsSync(path.join(dir, 'storyboard.json'));
  const hasAssets = fs.existsSync(path.join(projDir, 'assets-map.json')) || fs.existsSync(path.join(dir, 'assets-map.json'));
  if (hasAssets && hasStory) {
    return { source: 'project files', completedPhase: 1, nextPhase: 2, summary: 'Phase 1 files found — ready for Phase 2 (Assets & Maps)' };
  }
  if (hasStyle && hasStory) {
    return { source: 'project files', completedPhase: 1, nextPhase: 2, summary: 'Style & Storyboard found — ready for Phase 2' };
  }
  return null;
}

function createNewProject(parentDir, rawName) {
  const safeName = String(rawName || '').trim().replace(/[\/\\:*?"<>|]/g, '_');
  if (!safeName) throw new Error('Project name is required');
  const base = parentDir && fs.existsSync(parentDir) ? path.resolve(parentDir) : defaultStartDir();
  const projectPath = path.join(base, safeName);
  ['audio', 'images', 'characters', 'project'].forEach(sub => {
    fs.mkdirSync(path.join(projectPath, sub), { recursive: true });
  });
  return { dir: projectPath, subfolders: ['audio', 'images', 'characters', 'project'] };
}

function scanDir(targetDir) {
  const dir = path.resolve(targetDir);
  const all = walkFiles(dir, 2);
  const result = {
    dir,
    totalFiles: all.length,
    storyFile: '',
    storyText: '',
    audioInfo: null,
    resumeInfo: detectResumeState(dir),
    files: {
      voice: [],
      srt: [],
      bgm: [],
      leadChar: [],
      sceneImgs: [],
      refVideo: [],
      reaStyle: [],
      storyboard: [],
    },
  };

  let firstVoiceFull = '';

  for (const f of all) {
    const lower = f.name.toLowerCase();
    const relLower = f.rel.toLowerCase();

    if (lower.endsWith('.srt')) {
      result.files.srt.push(f.rel);
    } else if (/\.(mp3|wav|m4a|ogg|aac)$/.test(lower)) {
      if (lower.includes('sfx') || relLower.includes('sfx/')) {
        // Ignore raw SFX clips so they don't pollute voiceover
      } else if (lower.includes('bgm') || lower.includes('music') || relLower.includes('music/')) {
        result.files.bgm.push(f.rel);
      } else {
        result.files.voice.push(f.rel);
        if (!firstVoiceFull) firstVoiceFull = f.full;
      }
    } else if (/\.(mp4|mov|mkv|webm)$/.test(lower)) {
      result.files.refVideo.push(f.rel);
    } else if (
      lower === 'video.md' ||
      lower === 'style-bible.json' ||
      (lower.includes('rea') && lower.endsWith('.md')) ||
      (lower.includes('style') && (lower.endsWith('.md') || lower.endsWith('.json')))
    ) {
      result.files.reaStyle.push(f.rel);
    } else if (lower === 'storyboard.json' || lower === 'script.md' || lower === 'assets-map.json' || lower === 'handoff.json') {
      result.files.storyboard.push(f.rel);
    } else if (lower.startsWith('story') && lower.endsWith('.txt')) {
      if (!result.storyFile) {
        result.storyFile = f.full;
        try { result.storyText = fs.readFileSync(f.full, 'utf-8').slice(0, 20000); } catch {}
      }
    } else if (/\.(svg|png|jpg|jpeg|webp)$/.test(lower)) {
      const isChar = /(char|lead|hero|puppet|avatar)/.test(relLower);
      if (isChar) {
        result.files.leadChar.push(f.rel);
      } else {
        result.files.sceneImgs.push(f.rel);
      }
    }
  }

  if (firstVoiceFull) {
    result.audioInfo = probeAudioDuration(firstVoiceFull);
  }

  return result;
}

function listRigAssets() {
  const archetypesDir = path.join(__dirname, 'rigs', 'archetypes');
  const rigOutDir = path.join(__dirname, 'rigs', 'out');
  const archetypes = [];
  const videos = [];

  if (fs.existsSync(archetypesDir)) {
    for (const f of fs.readdirSync(archetypesDir).sort()) {
      if (!f.endsWith('.r2d.json')) continue;
      const full = path.join(archetypesDir, f);
      try {
        const m = JSON.parse(fs.readFileSync(full, 'utf8'));
        const stem = f.replace(/\.r2d\.json$/, '');
        const pngRel = `rigs/archetypes/out/${stem}.png`;
        archetypes.push({
          id: stem,
          name: m.meta?.name || stem,
          description: m.meta?.description || '',
          bones: (m.bones || []).length,
          ik: (m.ik || []).length,
          physics: (m.physics || []).length,
          animations: (m.animations || []).map(a => a.id),
          hasMouth: (m.parameters || []).some(p => p.id === 'MouthOpen'),
          previewPng: fs.existsSync(path.join(__dirname, pngRel)) ? `./${pngRel}` : null,
        });
      } catch {}
    }
  }

  for (const dir of [rigOutDir, path.join(archetypesDir, 'out')]) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).sort()) {
      if (!f.endsWith('.mp4')) continue;
      const full = path.join(dir, f);
      const rel = path.relative(__dirname, full).replace(/\\/g, '/');
      const metaFile = full.replace(/\.mp4$/, '.meta.json');
      let meta = {};
      if (fs.existsSync(metaFile)) {
        try { meta = JSON.parse(fs.readFileSync(metaFile, 'utf8')); } catch {}
      }
      const posterRel = rel.replace(/\.mp4$/, '.png');
      videos.push({
        file: f,
        url: `./${rel}`,
        poster: fs.existsSync(path.join(__dirname, posterRel)) ? `./${posterRel}` : null,
        modelName: meta.modelName || f,
        duration: meta.duration || null,
        fps: meta.fps || 30,
        layers: meta.layers || [],
        hasAudio: Boolean(meta.hasAudio),
        sizeKB: meta.sizeKB || Math.round(fs.statSync(full).size / 1024),
        createdAt: meta.createdAt || null,
      });
    }
  }
  videos.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return { archetypes, videos };
}

function listInstalledSkills() {
  try {
    return fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
      .filter(e => e.isDirectory() && !e.name.startsWith('.') && fs.existsSync(path.join(SKILLS_DIR, e.name, 'SKILL.md')))
      .map(e => e.name)
      .sort();
  } catch {
    return [];
  }
}

function saveStoryToFile(targetDir, storyText) {
  const cleanDir = targetDir && targetDir.trim() && !targetDir.includes('<')
    ? path.resolve(targetDir.trim())
    : path.join(__dirname, 'stories');
  fs.mkdirSync(cleanDir, { recursive: true });

  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const fileName = `story_${stamp}.txt`;
  const fullPath = path.join(cleanDir, fileName);
  fs.writeFileSync(fullPath, storyText, 'utf-8');
  return { path: fullPath, fileName, bytes: Buffer.byteLength(storyText, 'utf-8') };
}


function auditSystemItems() {
  const prefix = process.env.PREFIX || '/data/user/0/ai.antigem/files/usr';
  const home = os.homedir();
  const confPath = path.join(prefix, 'etc/chromium/default.conf');
  const symlinkPath = path.join(prefix, 'bin/chromium');
  const fontPath = path.join(home, 'remotion-studio/fonts/HindSiliguriFixed-Bold.ttf');
  const wrapperPath = path.join(home, 'remotion-studio/binaries/remotion');
  const modulesPath = path.join(home, 'remotion-studio/animation-assets/modules/bm-typography.js');

  const items = [
    {
      id: 'chromium_flags',
      category: 'termux',
      title: 'Chromium স্যান্ডবক্স ও /dev/shm ক্র্যাশ গার্ড',
      desc: 'etc/chromium/default.conf ফাইলে --no-sandbox ও --disable-dev-shm-usage ফ্ল্যাগ সক্রিয় থাকা।',
      ok: fs.existsSync(confPath) && fs.readFileSync(confPath, 'utf8').includes('--no-sandbox'),
      fixId: 'fix_chromium_flags'
    },
    {
      id: 'chromium_symlink',
      category: 'termux',
      title: 'Chromium বাইনারি সিমলিংক ব্রিজ',
      desc: '$PREFIX/bin/chromium -> chromium-browser লিঙ্ক বজায় রাখা।',
      ok: fs.existsSync(symlinkPath),
      fixId: 'fix_chromium_symlink'
    },
    {
      id: 'glibc_wrapper',
      category: 'remotion',
      title: 'Native ARM64 Compositor Wrappers',
      desc: 'remotion-studio/binaries/{remotion,ffmpeg,ffprobe} এক্সিকিউটেবল র‍্যাপার থাকা।',
      ok: fs.existsSync(wrapperPath) && (fs.statSync(wrapperPath).mode & 0o111) !== 0,
      fixId: 'fix_glibc_wrapper'
    },
    {
      id: 'bangla_fonts',
      category: 'remotion',
      title: 'অফলাইন বাংলা ফন্ট ও যুক্তবর্ণ সাপোর্ট',
      desc: 'HindSiliguriFixed ফন্ট ফাইল স্টুডিও ও সিস্টেমে ইনস্টল থাকা।',
      ok: fs.existsSync(fontPath),
      fixId: 'fix_bangla_fonts'
    },
    {
      id: 'core_modules',
      category: 'modules',
      title: 'কোর মোশন লজিক মডিউলস (Zero-Token Logic)',
      desc: 'bm-typography.js, camera-shake.js, device-mockup.js সক্রিয় থাকা।',
      ok: fs.existsSync(modulesPath),
      fixId: 'fix_core_modules'
    }
  ];

  return { ok: items.every(i => i.ok), items };
}

async function fixSystemItem(fixId) {
  const prefix = process.env.PREFIX || '/data/user/0/ai.antigem/files/usr';
  const home = os.homedir();
  const repoRaw = 'https://raw.githubusercontent.com/myfunuiai-del/antigem-skills/main/remotion-video-studio';

  if (fixId === 'fix_chromium_flags') {
    const dir = path.join(prefix, 'etc/chromium');
    fs.mkdirSync(dir, { recursive: true });
    const content = `export LIBGL_ALWAYS_SOFTWARE=1\nexport LP_NUM_THREADS="2"\nCHROMIUM_FLAGS="--no-sandbox --disable-dev-shm-usage --use-gl=angle --use-angle=gl-egl --ignore-gpu-blocklist"\n`;
    fs.writeFileSync(path.join(dir, 'default.conf'), content);
    return { ok: true, message: 'Chromium flags configured successfully!' };
  }

  if (fixId === 'fix_chromium_symlink') {
    const target = path.join(prefix, 'bin/chromium-browser');
    const link = path.join(prefix, 'bin/chromium');
    if (fs.existsSync(target) && !fs.existsSync(link)) {
      fs.symlinkSync('chromium-browser', link);
    }
    return { ok: true, message: 'Chromium symlink created!' };
  }

  if (fixId === 'fix_bangla_fonts') {
    const fontDir = path.join(home, 'remotion-studio/fonts');
    const localFontDir = path.join(home, '.local/share/fonts');
    fs.mkdirSync(fontDir, { recursive: true });
    fs.mkdirSync(localFontDir, { recursive: true });
    // fetch fonts if needed or copy from local repo
    const localRepoFont = path.join(__dirname, 'fonts/HindSiliguriFixed-Bold.ttf');
    if (fs.existsSync(localRepoFont)) {
      fs.copyFileSync(localRepoFont, path.join(fontDir, 'HindSiliguriFixed-Bold.ttf'));
      fs.copyFileSync(localRepoFont, path.join(localFontDir, 'HindSiliguriFixed-Bold.ttf'));
    }
    return { ok: true, message: 'Fonts restored successfully!' };
  }

  if (fixId === 'fix_core_modules') {
    const targetDir = path.join(home, 'remotion-studio/animation-assets/modules');
    const srcDir = path.join(__dirname, 'animation-assets/modules');
    fs.mkdirSync(targetDir, { recursive: true });
    if (fs.existsSync(srcDir)) {
      for (const file of fs.readdirSync(srcDir)) {
        fs.copyFileSync(path.join(srcDir, file), path.join(targetDir, file));
      }
    }
    return { ok: true, message: 'Core motion modules deployed!' };
  }

  if (fixId === 'fix_glibc_wrapper') {
    const binDir = path.join(home, 'remotion-studio/binaries');
    const gnuDir = path.join(home, 'remotion-studio/binaries-gnu');
    const glibcLib = path.join(prefix, 'glibc/lib');
    const ldLinux = path.join(glibcLib, 'ld-linux-aarch64.so.1');
    fs.mkdirSync(binDir, { recursive: true });
    for (const b of ['remotion', 'ffmpeg', 'ffprobe']) {
      const script = `#!/data/user/0/ai.antigem/files/usr/bin/sh\nunset LD_PRELOAD\nexec "${ldLinux}" --library-path "${gnuDir}:${glibcLib}" "${gnuDir}/${b}" "$@"\n`;
      fs.writeFileSync(path.join(binDir, b), script, { mode: 0o755 });
    }
    return { ok: true, message: 'Compositor binaries and wrappers configured!' };
  }

  return { ok: false, error: 'Unknown fixId: ' + fixId };
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    return sendJson(res, 200, { ok: true });
  }
  try {
    const url = new URL(req.url, `http://${HOST}:${PORT}`);

        if (url.pathname === '/api/audit') {
      return sendJson(res, 200, auditSystemItems());
    }
    if (url.pathname === '/api/audit-fix' && req.method === 'POST') {
      try {
        const body = await readJsonBody(req);
        const resFix = await fixSystemItem(body.fixId);
        return sendJson(res, 200, resFix);
      } catch (err) {
        return sendJson(res, 500, { ok: false, error: err.message });
      }
    }
    if (url.pathname === '/api/health') {
      return sendJson(res, 200, { ok: true, studio: __dirname });
    }
    if (url.pathname === '/api/skills') {
      return sendJson(res, 200, { skills: listInstalledSkills() });
    }
    if (url.pathname === '/api/rigs') {
      return sendJson(res, 200, listRigAssets());
    }
    if (url.pathname === '/api/browse') {
      try { return sendJson(res, 200, browseDir(url.searchParams.get('dir') || '')); }
      catch (err) { return sendJson(res, 400, { error: err.message }); }
    }
    if (url.pathname === '/api/scan') {
      const dir = url.searchParams.get('dir') || '';
      if (!dir) return sendJson(res, 400, { error: 'Missing dir parameter' });
      try { return sendJson(res, 200, scanDir(dir)); }
      catch (err) { return sendJson(res, 400, { error: err.message }); }
    }
    if (url.pathname === '/api/save-story' && req.method === 'POST') {
      try {
        const body = await readJsonBody(req);
        if (!body.story || !body.story.trim()) {
          return sendJson(res, 400, { error: 'Empty story' });
        }
        return sendJson(res, 200, saveStoryToFile(body.dir, body.story));
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }
    if (url.pathname === '/api/new-project' && req.method === 'POST') {
      try {
        const body = await readJsonBody(req);
        return sendJson(res, 200, createNewProject(body.parentDir, body.name));
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }

    let relPath = url.pathname === '/' ? 'video-workflow-mindmap.html' : url.pathname.replace(/^\/+/, '');
    const fullPath = path.resolve(__dirname, relPath);
    if (!fullPath.startsWith(__dirname) || !fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Not found');
    }

    const ext = path.extname(fullPath).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';
    const stat = fs.statSync(fullPath);
    const range = req.headers.range;
    if (range) {
      const m = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (m) {
        const start = m[1] ? parseInt(m[1], 10) : 0;
        const end = m[2] ? parseInt(m[2], 10) : stat.size - 1;
        if (start <= end && end < stat.size) {
          res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${stat.size}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': end - start + 1,
            'Content-Type': contentType,
          });
          return fs.createReadStream(fullPath, { start, end }).pipe(res);
        }
      }
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stat.size,
      'Accept-Ranges': 'bytes',
    });
    fs.createReadStream(fullPath).pipe(res);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Server error: ' + err.message);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`mkprompt server running at http://${HOST}:${PORT}`);
});
