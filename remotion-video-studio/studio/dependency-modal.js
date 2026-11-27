/* Video Dependencies Popup & Auto-Skill Compact Prompt Builder (Separate File) */
(function () {
  const STORE_KEY = 'mkprompt_studio_v2';
  const DEFAULT_VIDEO_SKILLS = [
    'rea-video', 'yt-viral', 'yt-script', 'yt-edit', 'beat-sync-editing',
    'svg-generator', 'remotion-video-studio', 'real-sfx', 'yt-package', 'yt-chapters', 'yt-shorts'
  ];

  const depState = {
    serverLive: false,
    folderPath: '',
    savedStoryPath: '',
    audioInfo: null,
    resumeInfo: null,
    files: {
      voice: { label: 'ভয়েসওভার অডিও (.mp3/.wav)', found: false, names: [] },
      srt: { label: 'সাবটাইটেল (.srt)', found: false, names: [] },
      bgm: { label: 'ব্যাকগ্রাউন্ড মিউজিক (BGM)', found: false, names: [] },
      leadChar: { label: 'লিড ক্যারেক্টার (char/lead)', found: false, names: [] },
      sceneImgs: { label: 'সংগৃহীত সিন ছবি / SVG', found: false, names: [] },
      refVideo: { label: 'রেফারেন্স ভিডিও (.mp4)', found: false, names: [] },
      reaStyle: { label: 'REA স্টাইল (VIDEO.md / style)', found: false, names: [] },
      storyboard: { label: 'storyboard.json / script.md', found: false, names: [] }
    },
    installedSkills: [...DEFAULT_VIDEO_SKILLS],
    selectedSkills: new Set(['beat-sync-editing', 'svg-generator', 'remotion-video-studio', 'real-sfx', 'yt-package', 'yt-chapters']),
    storyMode: 'story',
    execMode: 'subagent',
    opts: {
      map: false,
      realsfx: true,
      banglaFont: true,
      shorts: false
    }
  };

  let currentBrowseDir = '/sdcard/Download';
  let currentBrowseFolders = [];

  function apiBase() {
    return location.protocol.startsWith('http') ? '' : 'http://127.0.0.1:4173';
  }

  function buildModalHTML() {
    const backdrop = document.createElement('div');
    backdrop.className = 'dep-backdrop';
    backdrop.id = 'depBackdrop';
    backdrop.innerHTML = `
      <div class="dep-modal" role="dialog" aria-modal="true" aria-labelledby="depTitle">
        <div class="dep-header">
          <div class="dep-header-left">
            <h2 id="depTitle">ভিডিও ডিপেন্ডেন্সি</h2>
            <span class="dep-status-pill" id="depServerPill">চেক হচ্ছে...</span>
          </div>
          <button class="dep-close" id="depCloseBtn" title="Close">✕</button>
        </div>

        <div class="dep-body">
          <!-- 1. Local Folder Browser + 1-Click New Project -->
          <div>
            <span class="dep-sec-label">১. প্রজেক্ট ফোল্ডার সিলেক্ট করুন বা নতুন প্রজেক্ট বানান</span>
            <div class="dep-folder-row">
              <button type="button" class="dep-pick-btn" id="depBrowseBtn">ফোল্ডার সিলেক্ট</button>
              <button type="button" class="dep-sc-btn" id="depNewProjToggle" style="padding:7px 10px;font-size:0.78rem;color:var(--accent);border-color:var(--border);">+ নতুন</button>
              <input type="text" id="depFolderPath" class="dep-input" placeholder="/sdcard/Download/MyVideo" />
              <button type="button" class="dep-sc-btn" id="depScanPathBtn" style="padding:7px 11px;font-size:0.78rem;color:var(--text);">স্ক্যান</button>
            </div>
            <div class="dep-newproj-box" id="depNewProjBox">
              <input type="text" id="depNewProjName" class="dep-input" placeholder="নতুন প্রজেক্টের নাম (যেমন: ChinaJapanHistory)" style="flex:1;" />
              <button type="button" class="dep-select-here" id="depCreateProjBtn">তৈরি করুন</button>
            </div>
            <div class="dep-scan-status" id="depScanStatus">ফোল্ডার সিলেক্ট করলেই ভেতরের সব ফাইল ও ভয়েস ডিউরেশন অটো-স্ক্যান হয়ে যাবে।</div>
            <div class="dep-info-banner" id="depAudioBanner"></div>
            <div class="dep-info-banner resume" id="depResumeBanner"></div>

            <div class="dep-browser" id="depBrowser">
              <div class="dep-browser-bar">
                <span class="dep-browser-path" id="depBrowserPath">/sdcard/Download</span>
                <button type="button" class="dep-sc-btn" id="depBrowserClose">বন্ধ</button>
              </div>
              <div class="dep-shortcuts" id="depShortcuts"></div>
              <input type="text" id="depFolderSearch" class="dep-input" placeholder="ফোল্ডার খুঁজুন..." style="margin-bottom:7px;padding:6px 10px;font-size:0.76rem;" />
              <div class="dep-folder-list" id="depFolderList"></div>
              <div class="dep-browser-actions">
                <span id="depBrowserFileCount" style="font-size:0.72rem;color:var(--muted);"></span>
                <button type="button" class="dep-select-here" id="depSelectHereBtn">✓ এই ফোল্ডারটি সিলেক্ট করুন</button>
              </div>
            </div>
          </div>

          <!-- 2. Auto-detected Checklist -->
          <div>
            <span class="dep-sec-label">২. ফাইল চেকলিস্ট (পাওয়া গেলে সবুজ ✓ — ট্যাপ করে ম্যানুয়ালি বদলানো যাবে)</span>
            <div class="dep-checklist" id="depChecklist"></div>
          </div>

          <!-- Optional Reference URL -->
          <div>
            <span class="dep-sec-label">রেফারেন্স ভিডিও লিংক (YouTube / অনলাইন লিংক — Optional)</span>
            <input type="text" id="depRefUrl" class="dep-input" placeholder="https://youtube.com/watch?v=... (না থাকলে ফাঁকা রাখুন)" />
          </div>

          <!-- 3. Voice+SRT Ready OR Story OR Topic -->
          <div>
            <span class="dep-sec-label">৩. গল্পের সোর্স (ভয়েস + SRT থাকলে গল্প পেস্ট করতে হবে না)</span>
            <div class="dep-tabs">
              <button type="button" class="dep-tab active" data-smode="story">গল্প আছে</button>
              <button type="button" class="dep-tab" data-smode="srt_only">ভয়েস + SRT রেডি</button>
              <button type="button" class="dep-tab" data-smode="topic">টপিক দিন</button>
            </div>
            <div id="depStoryPane">
              <textarea id="depStoryText" class="dep-textarea" placeholder="যত বড় গল্পই হোক এখানে পেস্ট করুন — Generate ক্লিক করলেই অটো নাম দিয়ে .txt ফাইল বানিয়ে শুধু ফাইল পাথ প্রম্পটে দেবে..."></textarea>
              <div class="dep-scan-status" id="depStoryStatus"></div>
            </div>
            <div id="depSrtPane" style="display:none;">
              <textarea id="depVisualNotes" class="dep-textarea" style="min-height:66px;" placeholder="(Optional) বিশেষ ভিজ্যুয়াল নোট — যেমন: 0:15 এ চীন→জাপান ম্যাপ, 0:40 এ হিটলারের ছবি দেখাবে। ফাঁকা রাখলে .srt শুনে এজেন্ট নিজেই ভিজ্যুয়াল সাজাবে..."></textarea>
            </div>
            <div id="depTopicPane" style="display:none;">
              <div class="dep-grid-2">
                <select id="depGenre" class="dep-select">
                  <option value="Storytelling / Mystery">স্টোরিটেলিং / রহস্য</option>
                  <option value="Documentary / History">ডকুমেন্টারি / ইতিহাস</option>
                  <option value="Explainer / Case Study">এক্সপ্লেইনার / কেস স্টাডি</option>
                  <option value="Facts / Psychology">ফ্যাক্টস / সাইকোলজি</option>
                  <option value="Motivation / Biography">মোটিভেশন / বায়োগ্রাফি</option>
                </select>
                <input type="text" id="depTopicInput" class="dep-input" placeholder="টপিকের নাম লিখুন (যেমন: চীন কেন জাপান দখল করতে পারেনি)" />
              </div>
            </div>
          </div>

          <!-- 4. Format, Quality Preset & Language -->
          <div class="dep-grid-2">
            <div>
              <span class="dep-sec-label">ফরম্যাট</span>
              <select id="depFormat" class="dep-select">
                <option value="16:9 YouTube">16:9 YouTube</option>
                <option value="9:16 Reels/Shorts">9:16 Reels / Shorts</option>
                <option value="Both 16:9 + 9:16">দুটোই (16:9 + 9:16)</option>
              </select>
            </div>
            <div>
              <span class="dep-sec-label">রেন্ডার কোয়ালিটি প্রিসেট</span>
              <select id="depQuality" class="dep-select">
                <option value="master">Studio Master (1080p • 30fps • CRF 18)</option>
                <option value="draft">Fast Draft (720p • 16fps • CRF 23)</option>
              </select>
            </div>
          </div>

          <div>
            <span class="dep-sec-label">ভিডিওর ভাষা (Script + Caption)</span>
            <select id="depLang" class="dep-select">
              <option value="Bangla (বাংলা)">বাংলা (Bangla)</option>
              <option value="English">English</option>
              <option value="Banglish (বাংলা + English terms)">বাংলিশ (Bangla + English)</option>
            </select>
          </div>

          <div>
            <span class="dep-sec-label">অ্যানিমেশন স্টাইল ও অ্যানিমেশন স্কিল (বাকি সব স্কিল অটো-ডিটেক্ট হবে)</span>
            <div class="dep-grid-2">
              <select id="depStyle" class="dep-select">
                <option value="Follow REA Style File in Folder (VIDEO.md / style-bible.json)">ফোল্ডারের REA স্টাইল ফাইল অনুযায়ী</option>
                <option value="Match Reference Video Style (via rea-video)">রেফারেন্স ভিডিও অনুযায়ী (rea-video)</option>
                <option value="Custom">কাস্টম স্টাইল / স্কিল লিখুন (যেমন: puppet-skill)</option>
                <option value="Editorial Documentary Collage">ডকুমেন্টারি কোলাজ (Vox/Harris)</option>
                <option value="Cardboard Cutout 2.5D">কার্ডবোর্ড কাটআউট (2.5D)</option>
                <option value="Claymation Stop-Motion">ক্লে-মেশন (Claymation)</option>
                <option value="Hand-Drawn Painting / Scribble">পেইন্টিং / হ্যান্ড-ড্রন স্কেচ</option>
                <option value="2D Vector + Three.js Motion">2D ভেক্টর + Three.js</option>
              </select>
              <select id="depAnimSkill" class="dep-select">
                <option value="">অ্যানিমেশন স্কিল: অটো (remotion-video-studio)</option>
              </select>
            </div>
            <input type="text" id="depCustomStyle" class="dep-input" style="margin-top:7px;" placeholder="(Optional) কাস্টম অ্যানিমেশন স্টাইল বা স্কিলের নাম লিখুন (যেমন: puppet-skill, origami)" />
          </div>

          <!-- Extra Feature Toggles -->
          <div>
            <span class="dep-sec-label">অতিরিক্ত ফিচার</span>
            <div class="dep-chips" id="depChips">
              <button type="button" class="dep-chip on" data-opt="realsfx">✓ real-sfx (৭২+৭৮ রিয়েল সাউন্ড)</button>
              <button type="button" class="dep-chip on" data-opt="banglaFont">✓ HindSiliguriFixed বাংলা ফন্ট</button>
              <button type="button" class="dep-chip" data-opt="map">GeoJSON রিয়েল ম্যাপ আছে</button>
              <button type="button" class="dep-chip" data-opt="shorts">লং থেকে yt-shorts কাটবে</button>
            </div>
          </div>

          <!-- 5. Execution Mode -->
          <div>
            <span class="dep-sec-label">৪. এক্সিকিউশন মোড (কনটেক্সট আউটপুট ও কোয়ালিটি প্রোটেকশন)</span>
            <div class="dep-modes">
              <button type="button" class="dep-mode active" data-emode="subagent">
                <div class="dep-mode-title">সাব-এজেন্ট টিম (Recommended)</div>
                <div class="dep-mode-sub">ডিরেক্টর + ৪ ফ্রেশ সাব-এজেন্ট — প্রতিটি ভারী কাজ আলাদা ফ্রেশ কনটেক্সটে</div>
              </button>
              <button type="button" class="dep-mode" data-emode="jarvis">
                <div class="dep-mode-title">Jarvis ৪-ফেজ "Next" মোড</div>
                <div class="dep-mode-sub">handoff.json দিয়ে ৪ ফেজে ভাগ — নতুন চ্যাটে "Next" বলে রিজিউম</div>
              </button>
              <button type="button" class="dep-mode" data-emode="single">
                <div class="dep-mode-title">ফাস্ট ১-চ্যাট (৩ চেকপয়েন্ট)</div>
                <div class="dep-mode-sub">ছোট Shorts (৩০-৬০s) — একই চ্যাটে দ্রুত শেষ</div>
              </button>
            </div>
          </div>

          <!-- 6. Generate Button & Output -->
          <button type="button" class="dep-gen-btn" id="depGenBtn">ছোট মাস্টার প্রম্পট জেনারেট করুন</button>

          <div class="dep-output-wrap" id="depOutputWrap">
            <div class="dep-output-top">
              <span class="dep-sec-label" style="margin:0;color:var(--accent);">Ready English Master Prompt (Compact)</span>
              <button type="button" class="copy-btn" id="depCopyBtn">Copy Prompt</button>
            </div>
            <div class="dep-output-text" id="depOutputText"></div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);
    return backdrop;
  }

  function saveLocalState() {
    try {
      const data = {
        folderPath: document.getElementById('depFolderPath')?.value || '',
        refUrl: document.getElementById('depRefUrl')?.value || '',
        storyMode: depState.storyMode,
        storyText: document.getElementById('depStoryText')?.value || '',
        visualNotes: document.getElementById('depVisualNotes')?.value || '',
        genre: document.getElementById('depGenre')?.value || '',
        topic: document.getElementById('depTopicInput')?.value || '',
        format: document.getElementById('depFormat')?.value || '',
        quality: document.getElementById('depQuality')?.value || 'master',
        lang: document.getElementById('depLang')?.value || '',
        style: document.getElementById('depStyle')?.value || '',
        animSkill: document.getElementById('depAnimSkill')?.value || '',
        customStyle: document.getElementById('depCustomStyle')?.value || '',
        execMode: depState.execMode,
        opts: depState.opts
      };
      localStorage.setItem(STORE_KEY, JSON.stringify(data));
    } catch {}
  }

  function restoreLocalState() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.folderPath) document.getElementById('depFolderPath').value = d.folderPath;
      if (d.refUrl) document.getElementById('depRefUrl').value = d.refUrl;
      if (d.storyText) document.getElementById('depStoryText').value = d.storyText;
      if (d.visualNotes) document.getElementById('depVisualNotes').value = d.visualNotes;
      if (d.genre) document.getElementById('depGenre').value = d.genre;
      if (d.topic) document.getElementById('depTopicInput').value = d.topic;
      if (d.format) document.getElementById('depFormat').value = d.format;
      if (d.quality) document.getElementById('depQuality').value = d.quality;
      if (d.lang) document.getElementById('depLang').value = d.lang;
      if (d.style) document.getElementById('depStyle').value = d.style;
      if (d.animSkill) depState.savedAnimSkill = d.animSkill;
      if (d.customStyle) document.getElementById('depCustomStyle').value = d.customStyle;
      if (d.storyMode) {
        setStoryMode(d.storyMode);
      }
      if (d.execMode) {
        depState.execMode = d.execMode;
        document.querySelectorAll('.dep-mode').forEach(m => m.classList.toggle('active', m.dataset.emode === d.execMode));
      }
      if (d.opts) {
        depState.opts = { ...depState.opts, ...d.opts };
        document.querySelectorAll('#depChips .dep-chip').forEach(chip => {
          const k = chip.dataset.opt;
          const on = !!depState.opts[k];
          chip.classList.toggle('on', on);
          const clean = chip.textContent.replace(/^✓\s*/, '');
          chip.textContent = on ? `✓ ${clean}` : clean;
        });
      }
    } catch {}
  }

  function setStoryMode(mode) {
    depState.storyMode = mode;
    document.querySelectorAll('.dep-tab').forEach(t => t.classList.toggle('active', t.dataset.smode === mode));
    document.getElementById('depStoryPane').style.display = mode === 'story' ? 'block' : 'none';
    document.getElementById('depSrtPane').style.display = mode === 'srt_only' ? 'block' : 'none';
    document.getElementById('depTopicPane').style.display = mode === 'topic' ? 'block' : 'none';
  }

  function renderChecklist() {
    const box = document.getElementById('depChecklist');
    box.innerHTML = Object.entries(depState.files).map(([key, item]) => {
      const meta = item.names.length
        ? (item.names.length > 1 ? `${item.names.length} ফাইল` : item.names[0])
        : (item.found ? 'ম্যানুয়াল' : '');
      return `
        <div class="dep-item ${item.found ? 'found' : ''}" data-fkey="${key}">
          <span class="tick">✓</span>
          <span>${item.label}</span>
          ${meta ? `<span class="file-meta" title="${item.names.join(', ')}">${meta}</span>` : ''}
        </div>
      `;
    }).join('');

    box.querySelectorAll('.dep-item').forEach(el => {
      el.addEventListener('click', () => {
        const k = el.dataset.fkey;
        depState.files[k].found = !depState.files[k].found;
        if (!depState.files[k].found) depState.files[k].names = [];
        renderChecklist();
      });
    });
  }

  const NON_ANIM_SKILLS = new Set([
    'chisle-ponytail-efficiency', 'debug-agent', 'fast-android-automation',
    'fast-browser-automation', 'image-organizer', 'project-builder', 'run',
    'verify', 'video-content-analyzer', 'rea-video', 'real-sfx', 'beat-sync-editing',
    'yt-audit', 'yt-chapters', 'yt-comment', 'yt-edit', 'yt-package',
    'yt-plan', 'yt-retention', 'yt-script', 'yt-seo', 'yt-shorts', 'yt-viral'
  ]);

  function renderAnimSkillDropdown() {
    const sel = document.getElementById('depAnimSkill');
    if (!sel) return;
    const prev = sel.value || depState.savedAnimSkill || '';
    const animSkills = depState.installedSkills.filter(s => !NON_ANIM_SKILLS.has(s));
    const opts = [
      `<option value="">অ্যানিমেশন স্কিল: অটো (remotion-video-studio + svg-generator)</option>`,
      ...animSkills.map(s => `<option value="${s}">${s}</option>`)
    ];
    sel.innerHTML = opts.join('');
    if (prev && animSkills.includes(prev)) sel.value = prev;
  }

  async function checkServerAndLoadSkills() {
    const pill = document.getElementById('depServerPill');
    try {
      const res = await fetch(`${apiBase()}/api/health`);
      if (!res.ok) throw new Error('offline');
      depState.serverLive = true;
      pill.textContent = '● Live';
      pill.className = 'dep-status-pill live';

      const sRes = await fetch(`${apiBase()}/api/skills`);
      if (sRes.ok) {
        const sData = await sRes.json();
        if (Array.isArray(sData.skills) && sData.skills.length) {
          depState.installedSkills = sData.skills;
          renderAnimSkillDropdown();
        }
      }
    } catch {
      depState.serverLive = false;
      pill.textContent = '○ Offline (mkprompt চালান)';
      pill.className = 'dep-status-pill offline';
      renderAnimSkillDropdown();
    }
  }

  function renderFolderList(filterText = '') {
    const listEl = document.getElementById('depFolderList');
    const q = filterText.trim().toLowerCase();
    const filtered = q
      ? currentBrowseFolders.filter(f => f.name.toLowerCase().includes(q))
      : currentBrowseFolders;

    let html = '';
    if (depState.parentDir) {
      html += `<button type="button" class="dep-folder-entry" data-go="${depState.parentDir}"><span>⬆ .. (আগের ফোল্ডার)</span><span></span></button>`;
    }
    if (!filtered.length) {
      html += `<div style="font-size:0.75rem;color:var(--muted);padding:6px;">${q ? 'কোনো মিল পাওয়া যায়নি।' : 'ভেতরে আর কোনো সাব-ফোল্ডার নেই — নিচের সবুজ বাটনে চাপ দিন।'}</div>`;
    } else {
      filtered.forEach(f => {
        html += `<button type="button" class="dep-folder-entry" data-go="${f.path}"><span>📁 ${f.name}</span><span style="color:var(--muted);font-size:0.7rem;">খুলুন →</span></button>`;
      });
    }
    listEl.innerHTML = html;
    listEl.querySelectorAll('[data-go]').forEach(b =>
      b.addEventListener('click', () => openFolderBrowser(b.dataset.go))
    );
  }

  async function openFolderBrowser(targetDir) {
    const browserEl = document.getElementById('depBrowser');
    const pathEl = document.getElementById('depBrowserPath');
    const listEl = document.getElementById('depFolderList');
    const scEl = document.getElementById('depShortcuts');
    const countEl = document.getElementById('depBrowserFileCount');
    const searchEl = document.getElementById('depFolderSearch');

    browserEl.classList.add('open');
    if (searchEl) searchEl.value = '';
    listEl.innerHTML = '<div style="font-size:0.76rem;color:var(--muted);padding:6px;">লোড হচ্ছে...</div>';

    try {
      const q = targetDir ? `?dir=${encodeURIComponent(targetDir)}` : '';
      const res = await fetch(`${apiBase()}/api/browse${q}`);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Cannot read folder');

      currentBrowseDir = data.dir;
      depState.parentDir = data.parent;
      currentBrowseFolders = data.folders || [];
      pathEl.textContent = data.dir;
      countEl.textContent = `এই ফোল্ডারে ${data.fileCount}টি ফাইল আছে`;

      scEl.innerHTML = (data.shortcuts || []).map(s =>
        `<button type="button" class="dep-sc-btn" data-go="${s.path}">${s.label}</button>`
      ).join('');
      scEl.querySelectorAll('[data-go]').forEach(b =>
        b.addEventListener('click', () => openFolderBrowser(b.dataset.go))
      );

      renderFolderList('');
    } catch {
      listEl.innerHTML = `<div style="font-size:0.75rem;color:#fca5a5;padding:6px;">সার্ভার কানেক্ট হয়নি। টার্মিনালে <code>mkprompt</code> চালিয়ে http://127.0.0.1:4173 ওপেন করুন।</div>`;
    }
  }

  async function scanFolderViaApi(targetDir) {
    const statusEl = document.getElementById('depScanStatus');
    const dir = (targetDir || '').trim();
    if (!dir) return;

    try {
      const res = await fetch(`${apiBase()}/api/scan?dir=${encodeURIComponent(dir)}`);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Scan failed');

      document.getElementById('depFolderPath').value = data.dir;
      Object.entries(depState.files).forEach(([key, obj]) => {
        const list = data.files[key] || [];
        obj.found = list.length > 0;
        obj.names = list;
      });

      // Auto-select REA Style File mode if VIDEO.md / style-bible.json detected!
      if (depState.files.reaStyle.found) {
        document.getElementById('depStyle').value = 'Follow REA Style File in Folder (VIDEO.md / style-bible.json)';
        depState.selectedSkills.delete('rea-video');
      } else if (depState.files.refVideo.found) {
        document.getElementById('depStyle').value = 'Match Reference Video Style (via rea-video)';
        depState.selectedSkills.add('rea-video');
      }
      if (depState.files.srt.found) {
        depState.selectedSkills.add('yt-edit');
        if (depState.files.voice.found && !data.storyFile) {
          setStoryMode('srt_only');
        }
      }

      if (data.storyFile) {
        depState.savedStoryPath = data.storyFile;
        const ta = document.getElementById('depStoryText');
        if (ta && !ta.value.trim() && data.storyText) ta.value = data.storyText;
        document.getElementById('depStoryStatus').textContent = `✓ ফোল্ডারে গল্প ফাইল পাওয়া গেছে: ${data.storyFile}`;
      }

      depState.audioInfo = data.audioInfo || null;
      depState.resumeInfo = data.resumeInfo || null;

      const audioBanner = document.getElementById('depAudioBanner');
      if (depState.audioInfo) {
        const a = depState.audioInfo;
        audioBanner.textContent = `⏱ ভয়েস: ${a.formatted} | Master 30fps: ${a.frames30}f • Draft 16fps: ${a.frames16}f | সাজেশন: ${a.chunks30s}টি ৩০s চাঙ্ক, ~${a.suggestedShots} শট`;
        audioBanner.classList.add('show');
      } else {
        audioBanner.classList.remove('show');
      }

      const resumeBanner = document.getElementById('depResumeBanner');
      if (depState.resumeInfo) {
        const r = depState.resumeInfo;
        resumeBanner.textContent = `♻️ অটো-রিজিউম ডিটেক্টেড (${r.source}): Phase ${r.completedPhase} সম্পন্ন — প্রম্পট অটোমেটিক Phase ${r.nextPhase} থেকে শুরু হবে!`;
        resumeBanner.classList.add('show');
      } else {
        resumeBanner.classList.remove('show');
      }

      renderChecklist();
      saveLocalState();
      document.getElementById('depBrowser').classList.remove('open');
      if (statusEl) {
        statusEl.textContent = `✓ ${data.dir} (সাব-ফোল্ডারসহ) থেকে ${data.totalFiles}টি ফাইল অটো-স্ক্যান করা হয়েছে!`;
      }
    } catch (err) {
      if (statusEl) statusEl.textContent = `স্ক্যান করা যায়নি (${err.message}) — mkprompt সার্ভার চালু আছে কিনা দেখুন।`;
    }
  }

  async function generateCompactPrompt() {
    const folder = document.getElementById('depFolderPath').value.trim() || '<PROJECT_FOLDER_PATH>';
    const refUrl = document.getElementById('depRefUrl').value.trim();
    const format = document.getElementById('depFormat').value;
    const quality = document.getElementById('depQuality').value;
    const isDraft = quality === 'draft';
    const fps = isDraft ? 16 : 30;
    const qualitySpec = isDraft
      ? 'Fast Draft (720p, 16fps, CRF 23 — fast preview)'
      : 'Studio Master (1080p, 30fps, CRF 18 — final broadcast)';
    const lang = document.getElementById('depLang').value;
    const styleSel = document.getElementById('depStyle').value;
    const customStyle = document.getElementById('depCustomStyle').value.trim();
    const f = depState.files;

    // Resolve final style string
    let finalStyle = styleSel;
    if (customStyle) {
      finalStyle = styleSel === 'Custom' ? customStyle : `${styleSel} + Custom: ${customStyle}`;
    } else if (styleSel.includes('REA Style File') && f.reaStyle.found) {
      finalStyle = `Follow existing REA style file (${f.reaStyle.names.join(', ')})`;
    }

    // Story / SRT-Only / Topic handling
    let contentLine = '';
    const storyStatus = document.getElementById('depStoryStatus');
    if (depState.storyMode === 'srt_only') {
      const notes = document.getElementById('depVisualNotes').value.trim();
      contentLine = `Story Source (FINAL Voiceover + SRT): DO NOT rewrite the script. Treat the .srt file directly as the story source (fix obvious ASR spelling errors in captions only if needed) and design a 4-pillar visual mix (User Assets + Code Kinetic/Infographic Motion + Maps/Diagrams + only 6-8 missing Z-Depth art scenes) strictly synced to .srt timestamps.${notes ? `\nVisual Direction Notes: ${notes}` : ''}`;
    } else if (depState.storyMode === 'story') {
      const story = document.getElementById('depStoryText').value.trim();
      if (story) {
        if (depState.serverLive) {
          try {
            const res = await fetch(`${apiBase()}/api/save-story`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ dir: folder, story })
            });
            const saved = await res.json();
            if (res.ok && saved.path) {
              depState.savedStoryPath = saved.path;
              if (storyStatus) storyStatus.textContent = `✓ গল্প অটো-সেভ হয়েছে: ${saved.path}`;
              contentLine = `Story File (read full story from disk): ${saved.path}`;
            } else {
              throw new Error(saved.error || 'save failed');
            }
          } catch {
            contentLine = `Story:\n"""\n${story}\n"""`;
          }
        } else {
          contentLine = `Story:\n"""\n${story}\n"""`;
        }
      } else if (depState.savedStoryPath) {
        contentLine = `Story File: ${depState.savedStoryPath}`;
      } else {
        contentLine = `Story: Read story*.txt or script.md from ${folder}.`;
      }
    } else {
      const genre = document.getElementById('depGenre').value;
      const topic = document.getElementById('depTopicInput').value.trim() || '[ENTER TOPIC]';
      contentLine = `Topic: "${topic}" | Genre: ${genre} (Run live YouTube outlier research via yt-viral swipe.py & score hooks via yt-script hookscore.py before writing script.md).`;
    }

    // Build exact file inventory (including real relative paths so agent never guesses!)
    const present = [];
    if (f.voice.found) present.push(`Voiceover: ${f.voice.names.join(', ') || 'present'}`);
    if (f.srt.found) present.push(`SRT: ${f.srt.names.join(', ') || 'present'}`);
    if (f.bgm.found) present.push(`BGM: ${f.bgm.names.join(', ') || 'present'}`);
    if (f.leadChar.found) present.push(`Lead Character: ${f.leadChar.names.join(', ') || 'present'}`);
    if (f.sceneImgs.found) present.push(`Scene Images (${f.sceneImgs.names.length || 'present'}): ${f.sceneImgs.names.slice(0, 6).join(', ')}${f.sceneImgs.names.length > 6 ? '...' : ''}`);
    if (f.refVideo.found) present.push(`Ref Video: ${f.refVideo.names.join(', ') || 'present'}`);
    if (refUrl) present.push(`Ref URL: ${refUrl}`);
    if (f.reaStyle.found) present.push(`REA Style File: ${f.reaStyle.names.join(', ') || 'present'}`);
    if (f.storyboard.found) present.push(`Existing State: ${f.storyboard.names.join(', ') || 'present'}`);

    // Auto-detect ONLY the workflow skills required by user's inputs + user's chosen Animation Skill
    const animSkill = document.getElementById('depAnimSkill')?.value || '';
    const activeSkills = new Set(['beat-sync-editing', 'remotion-video-studio', 'yt-package', 'yt-chapters']);
    if (animSkill) activeSkills.add(animSkill);
    else activeSkills.add('svg-generator');
    if ((f.refVideo.found || refUrl) && !f.reaStyle.found) activeSkills.add('rea-video');
    if (depState.storyMode === 'topic' || (depState.storyMode === 'story' && !f.storyboard.found)) {
      activeSkills.add('yt-viral');
      activeSkills.add('yt-script');
    }
    if (f.srt.found) activeSkills.add('yt-edit');
    if (depState.opts.realsfx) activeSkills.add('real-sfx');
    if (depState.opts.shorts) activeSkills.add('yt-shorts');
    if (customStyle && /skill/i.test(customStyle)) activeSkills.add(customStyle);

    // Core Guardrails
    const rules = [
      `Inspect existing assets in ${folder} first; NEVER replace user's Lead Character or collected photos (blend photos via editorial cutout/shadow/grade) and only generate Z-Depth (BG/MID/FG) layers for MISSING scenes.`,
      `In src/scene.html, enforce 100% Frame-Pure Math via window.setFrame(frame) (NO CSS @keyframes/transitions) + window.readyPromise image preload guard.`,
      `For videos > 60s, render in safe 30s chunks (part1.mp4..partN.mp4) and merge via ffmpeg concat (-c copy) to avoid Android overheating/OOM and allow fast single-chunk re-renders.`
    ];
    if (depState.opts.banglaFont) rules.push(`Offline Bangla font: load ~/remotion-studio/fonts/HindSiliguriFixed-{Regular,SemiBold,Bold}.ttf via @font-face and await document.fonts.ready.`);
    if (depState.opts.map) rules.push(`For real maps/routes: NEVER draw AI-guessed maps—use accurate GeoJSON/Wikimedia SVG paths + animated stroke-dashoffset.`);
    if (depState.opts.realsfx) rules.push(`Audio: use real-sfx (~/.gemini/config/sfx_library, never synthesize) with --voice-safe --duck --snap-beats --target-lufs -14 + critique.py scoreboard (swap/drop mismatches via sheet.py).`);

    const PLAYBOOK = '/data/user/0/ai.antigem/files/home/remotion-studio/prompts-playbook.json';
    const s1Keys = [];
    if ((f.refVideo.found || refUrl) && !f.reaStyle.found) s1Keys.push('style');
    if (depState.storyMode !== 'srt_only') s1Keys.push('script');
    s1Keys.push('storyboard');
    const s2Keys = depState.opts.map ? ['art', 'art_map'] : ['art'];
    const s3Keys = ['motion', 'qc_render'];
    const s4Keys = ['qc_render'];
    if (depState.opts.realsfx) s4Keys.push('sound');
    s4Keys.push('pack');
    if (depState.opts.shorts) s4Keys.push('pack_shorts');

    let execBlock = '';
    if (depState.execMode === 'subagent') {
      execBlock = `Execution Mode (FORCED Subagent Team — Director + 4 Fresh-Context Specialists):
You are ONLY the lightweight Director. DO NOT run heavy work inside your own context. Each subagent MUST read its assigned full Mind-Map Master Prompts from ${PLAYBOOK} inside its own fresh context, save outputs to ${folder}/project/, and reply ONLY with file paths + a 5-line summary (never edit the same file concurrently):
1. First ask me any missing decisions with options.
2. Subagent 1 (Research, Script & Beat-Sync): Read playbook keys [${s1Keys.join(', ')}] -> lock style-bible.json, script.md, storyboard.json, assets-map.json -> wait for my OK.
3. Subagent 2 (Art & Map Builder): Read playbook keys [${s2Keys.join(', ')}] -> build ONLY MISSING Z-Depth layers${depState.opts.map ? ' & GeoJSON maps' : ''} -> update assets-map.json.
4. Subagent 3 (Motion & Still QC): Read playbook keys [${s3Keys.join(', ')}] -> code remotion-video-studio src/scene.html -> render 4 keyframe PNG stills (Hook, Mid, Bangla Conjunct Caption, Transition/End) -> show me the 4 PNGs & wait for my OK.
5. Subagent 4 (Final Render, Audio & Viral Pack): Read playbook keys [${s4Keys.join(', ')}] -> render final output.mp4 (30s chunks if >60s) + real-sfx critique scoreboard + yt-package/chapters publish pack.`;
    } else if (depState.execMode === 'jarvis') {
      execBlock = `Execution Mode (Jarvis / Pre-Split 4-Phase "Next" Pipeline — Zero Context Rot):
Execute ONE phase at a time. At the start of each phase, read its full Mind-Map Master Prompts from ${PLAYBOOK}, save all outputs + ${folder}/project/handoff.json, then STOP and report "PHASE_X_DONE — reply 'Next'":
- Phase 1 (Plan & Script): Follow playbook [${s1Keys.join(', ')}] -> save style-bible.json, script.md, storyboard.json, assets-map.json & handoff.json -> STOP.
- Phase 2 (Assets & Maps): Follow playbook [${s2Keys.join(', ')}] -> build MISSING layers -> update assets-map.json & handoff.json -> STOP.
- Phase 3 (Motion & Still QC): Follow playbook [${s3Keys.join(', ')}] -> code src/scene.html & render 4 PNG stills for QC -> save handoff.json -> STOP.
- Phase 4 (Render, Audio & Viral Pack): Follow playbook [${s4Keys.join(', ')}] -> render output.mp4 + real-sfx + publish pack -> DONE.`;
    } else {
      execBlock = `Execution Mode (Fast Single-Chat, 3 Checkpoints):
Read full Mind-Map Master Prompts from ${PLAYBOOK} as needed per stage -> First ask missing decisions with options -> (1) Lock [${s1Keys.join(', ')}] & [${s2Keys.join(', ')}] for OK -> (2) Code [${s3Keys.join(', ')}] & show 4 PNG stills for QC -> (3) On OK, execute [${s4Keys.join(', ')}] and deliver final output.mp4 + publish pack.`;
    }

    const audioMetricLine = depState.audioInfo
      ? `Audio Metrics (ffprobe verified): ${depState.audioInfo.seconds}s (${depState.audioInfo.formatted}) -> EXACT TOTAL_FRAMES = ${isDraft ? depState.audioInfo.frames16 : depState.audioInfo.frames30} @ ${fps}fps | Recommended: ${depState.audioInfo.chunks30s} x 30s chunks, ~${depState.audioInfo.suggestedShots} shots.`
      : '';
    const resumeLine = depState.resumeInfo
      ? `AUTO-RESUME ACTIVE (${depState.resumeInfo.source}): Phase ${depState.resumeInfo.completedPhase} is ALREADY DONE. Skip completed phases and START directly from Phase ${depState.resumeInfo.nextPhase} reading existing JSONs in ${folder}/project/.`
      : '';

    saveLocalState();

    return `Project Folder: ${folder}
Format: ${format} | Render Preset: ${qualitySpec} | Language: ${lang} | Style: ${finalStyle}
Existing Assets (✓): ${present.length ? present.join(' | ') : 'Auto-scan project folder'}
Active Skills (follow their SKILL.md): ${Array.from(activeSkills).join(', ')}${audioMetricLine ? '\n' + audioMetricLine : ''}${resumeLine ? '\n' + resumeLine : ''}

${contentLine}

Core Guardrails:
- ${rules.join('\n- ')}

${execBlock}`;
  }

  function init() {
    const backdrop = buildModalHTML();
    renderChecklist();
    restoreLocalState();
    renderAnimSkillDropdown();
    checkServerAndLoadSkills();

    const openBtn = document.getElementById('openDepModalBtn');
    const closeBtn = document.getElementById('depCloseBtn');
    const browseBtn = document.getElementById('depBrowseBtn');
    const newProjToggle = document.getElementById('depNewProjToggle');
    const createProjBtn = document.getElementById('depCreateProjBtn');
    const scanPathBtn = document.getElementById('depScanPathBtn');
    const browserCloseBtn = document.getElementById('depBrowserClose');
    const selectHereBtn = document.getElementById('depSelectHereBtn');
    const searchInput = document.getElementById('depFolderSearch');
    const genBtn = document.getElementById('depGenBtn');
    const copyBtn = document.getElementById('depCopyBtn');

    if (openBtn) {
      openBtn.addEventListener('click', () => {
        backdrop.classList.add('open');
        checkServerAndLoadSkills();
      });
    }
    closeBtn.addEventListener('click', () => backdrop.classList.remove('open'));
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) backdrop.classList.remove('open');
    });

    browseBtn.addEventListener('click', () => {
      const typed = document.getElementById('depFolderPath').value.trim();
      openFolderBrowser(typed || currentBrowseDir);
    });
    newProjToggle.addEventListener('click', () => {
      const box = document.getElementById('depNewProjBox');
      box.classList.toggle('open');
      if (box.classList.contains('open')) document.getElementById('depNewProjName').focus();
    });
    createProjBtn.addEventListener('click', async () => {
      const nameEl = document.getElementById('depNewProjName');
      const statusEl = document.getElementById('depScanStatus');
      const name = nameEl.value.trim();
      if (!name) return;
      try {
        const res = await fetch(`${apiBase()}/api/new-project`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parentDir: currentBrowseDir, name })
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Create failed');
        nameEl.value = '';
        document.getElementById('depNewProjBox').classList.remove('open');
        await scanFolderViaApi(data.dir);
        if (statusEl) statusEl.textContent = `✓ নতুন প্রজেক্ট তৈরি হয়েছে: ${data.dir} (audio, images, characters, project)`;
      } catch (err) {
        if (statusEl) statusEl.textContent = `প্রজেক্ট তৈরি করা যায়নি: ${err.message}`;
      }
    });
    browserCloseBtn.addEventListener('click', () => document.getElementById('depBrowser').classList.remove('open'));
    selectHereBtn.addEventListener('click', () => scanFolderViaApi(currentBrowseDir));
    scanPathBtn.addEventListener('click', () => {
      const typed = document.getElementById('depFolderPath').value.trim();
      if (typed) scanFolderViaApi(typed);
    });
    if (searchInput) {
      searchInput.addEventListener('input', (e) => renderFolderList(e.target.value));
    }

    backdrop.querySelectorAll('.dep-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        setStoryMode(tab.dataset.smode);
        saveLocalState();
      });
    });

    backdrop.querySelectorAll('#depChips .dep-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const k = chip.dataset.opt;
        depState.opts[k] = !depState.opts[k];
        chip.classList.toggle('on', depState.opts[k]);
        const clean = chip.textContent.replace(/^✓\s*/, '');
        chip.textContent = depState.opts[k] ? `✓ ${clean}` : clean;
        saveLocalState();
      });
    });

    backdrop.querySelectorAll('.dep-mode').forEach(btn => {
      btn.addEventListener('click', () => {
        backdrop.querySelectorAll('.dep-mode').forEach(m => m.classList.remove('active'));
        btn.classList.add('active');
        depState.execMode = btn.dataset.emode;
        saveLocalState();
      });
    });

    ['depFolderPath', 'depRefUrl', 'depStoryText', 'depVisualNotes', 'depGenre', 'depTopicInput', 'depFormat', 'depQuality', 'depLang', 'depStyle', 'depAnimSkill', 'depCustomStyle'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', saveLocalState);
    });

    genBtn.addEventListener('click', async () => {
      genBtn.textContent = 'জেনারেট হচ্ছে...';
      const prompt = await generateCompactPrompt();
      genBtn.textContent = 'ছোট মাস্টার প্রম্পট জেনারেট করুন';
      document.getElementById('depOutputText').textContent = prompt;
      const wrap = document.getElementById('depOutputWrap');
      wrap.classList.add('show');
      wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    copyBtn.addEventListener('click', () => {
      const text = document.getElementById('depOutputText').textContent;
      navigator.clipboard.writeText(text).then(() => {
        copyBtn.textContent = 'Copied ✓';
        setTimeout(() => { copyBtn.textContent = 'Copy Prompt'; }, 1500);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
