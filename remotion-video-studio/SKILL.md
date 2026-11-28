---
name: remotion-video-studio
description: Render high-quality programmatic MP4 videos on Android/Termux using native @remotion/renderer + @remotion/cli (via glibc ld-linux wrapper, no proot) or the lightweight HTML/Puppeteer pipeline.
---

# Remotion Video Studio (Android / Termux)

Use this skill when the user wants to create or render programmatic videos using **Remotion (`@remotion/renderer`, `@remotion/cli`, React, CSS, SVG, Three.js)** on Android/Termux.

## Architecture (Native `@remotion/renderer` on Android — No PRoot!)
By default, `@remotion/renderer` throws `Error: Unsupported OS: android, architecture: arm64` because it tries to auto-resolve a compositor npm package and download Linux `chrome-headless-shell`.
This setup bypasses both cleanly and runs **real `@remotion/renderer` natively with parallel rendering**:
- **Workspace:** `$HOME/remotion-studio` (avoids `/storage/emulated/0` FUSE symlink errors)
- **Compositor Binaries:** `@remotion/compositor-linux-arm64-gnu` unpacked to `$HOME/remotion-studio/binaries-gnu/`, wrapped in `$HOME/remotion-studio/binaries/{remotion,ffmpeg,ffprobe}` via Termux's `glibc-runner` dynamic linker (`ld-linux-aarch64.so.1` with `unset LD_PRELOAD` and quoted `"$@"`).
- **Remotion Config (`remotion.config.ts`):**
  - `Config.setBrowserExecutable('$PREFIX/bin/chromium-browser')`
  - `Config.setChromeMode('chrome-for-testing')` (uses `--headless=new` for modern Chromium)
  - `Config.setBinariesDirectory('$HOME/remotion-studio/binaries')`
  - `Config.setChromiumOpenGlRenderer('swangle')`
  - **Termux Speed Tuning:** `imageFormat: 'jpeg'` (`quality: 90`), `x264Preset: 'veryfast'`, `concurrency: 4`, `devtool: false`, and `TermuxWebpackCacheFixPlugin` (fixes Android `/data/user/0` `EACCES` snapshot error so Webpack persistent cache works and halves warm bundle time; use `remotion bundle src/index.ts --out-dir=build` + `remotion render build ...` for 0s bundling on repeat/data-only renders).

## One-Command Setup (If Not Installed)
```bash
curl -fsSL https://raw.githubusercontent.com/myfunuiai-del/antigem-skills/main/remotion-video-studio/install.sh | bash
```
Or locally:
```bash
bash /data/user/0/ai.antigem/files/home/.gemini/config/skills/remotion-video-studio/install.sh
```

## Rendering Videos

### Mode 1 (Recommended): Official `@remotion/renderer` & Remotion CLI
1. Edit React/TSX compositions in `$HOME/remotion-studio/src/` (`index.ts`, `Root.tsx`, `TestVideo.tsx`).
2. Render with Remotion CLI (zero extra flags needed thanks to `remotion.config.ts`):
```bash
cd "$HOME/remotion-studio"
./node_modules/.bin/remotion compositions src/index.ts
./node_modules/.bin/remotion render src/index.ts TestVideo out/output.mp4
```
3. Or render programmatically using `@remotion/renderer` + `@remotion/bundler`:
```bash
cd "$HOME/remotion-studio" && node render-remotion.mjs TestVideo out/output.mp4
```

### Mode 2 (Lightweight Fallback): Direct HTML + Puppeteer + FFmpeg
1. Edit `$HOME/remotion-studio/src/scene.html` (frame-pure via `window.setFrame(frame)`, no CSS `@keyframes`/`transition`).
   - **Bangla Font (Offline Pre-Installed):** Use `HindSiliguriFixed-{Light,Regular,Medium,SemiBold,Bold}.ttf` from `../fonts/` (also in `~/.local/share/fonts/`) and `await document.fonts.ready`.
2. Run:
```bash
cd "$HOME/remotion-studio" && node render.mjs
```

## Core Motion Logic & Kinetic Modules (Zero-Dependency & Context-Aware)
Located at `animation-assets/modules/` (deployed directly to `$HOME/remotion-studio/animation-assets/modules/`):
- **`bm-typography.js`:** Kinetic bracket parser. In scripts, write `[গুরুত্বপূর্ণ শব্দ]` — the engine automatically renders spring scale pops, accent colors, soft glow, and dynamic SVG hand-drawn scribbles/underlines without writing raw CSS animations.
- **`camera-shake.js`:** Physics-based spring-dampened oscillation matrix ($D(t) = A \cdot e^{-\lambda t} \cos(\omega t)$). Triggers on sound hits / beat drops for realistic impact feedback.
- **`device-mockup.js`:** CSS 3D hardware bezels (Phone / Laptop / Browser) with 3D tilt, internal auto-scroll, and 3D card lift (`crop & lift`).
- **Context Filtering Rule:** Only trigger kinetic text/camera shake when the narrative context demands it (action/impact/promo). Keep calm in emotional/nature scenes.
- **Interactive Visualizer:** Accessible live via `http://127.0.0.1:4173/modules-preview.html`.

