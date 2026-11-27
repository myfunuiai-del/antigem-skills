import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

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

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    return sendJson(res, 200, { ok: true });
  }
  try {
    const url = new URL(req.url, `http://${HOST}:${PORT}`);

    if (url.pathname === '/api/health') {
      return sendJson(res, 200, { ok: true, studio: __dirname });
    }
    if (url.pathname === '/api/skills') {
      return sendJson(res, 200, { skills: listInstalledSkills() });
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
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    fs.createReadStream(fullPath).pipe(res);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Server error: ' + err.message);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`mkprompt server running at http://${HOST}:${PORT}`);
});
