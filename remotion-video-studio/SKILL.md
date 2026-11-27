---
name: remotion-video-studio
description: Render high-quality programmatic MP4 videos on Android/Termux using the React + CSS + SVG + Three.js ecosystem via headless Chromium and FFmpeg (avoiding @remotion/renderer's Android OS block).
---

# Remotion Video Studio (Android / Termux)

Use this skill when the user wants to create or render programmatic videos using **React + CSS + SVG + Three.js** on Android/Termux.

## Why This Architecture?
`@remotion/renderer` fails on Android (`Error: Unsupported OS: android, architecture: arm64`), and `/storage/emulated/0` does not support `pnpm` symlinks.
Instead, this skill uses:
- **Workspace:** `$HOME/remotion-studio` (`/data/user/0/ai.antigem/files/home/remotion-studio`)
- **Scene Engine:** React + CSS + SVG + Three.js driven by `window.setFrame(frame)` in `src/scene.html`
- **Renderer:** `puppeteer-core` + `/data/user/0/ai.antigem/files/usr/bin/chromium-browser` piping PNG frames directly to `ffmpeg`.

## Setup (If Not Installed)
Run the included one-command installer:
```bash
bash /data/user/0/ai.antigem/files/home/.gemini/config/skills/remotion-video-studio/install.sh
```

## Rendering a Video
1. Edit `$HOME/remotion-studio/src/scene.html` with the desired React/CSS/SVG/Three.js animation.
   - **Bangla Font (Offline Pre-Installed):** Use `@font-face` pointing to `../fonts/HindSiliguriFixed-{Light,Regular,Medium,SemiBold,Bold}.ttf` (from `Hind Siliguri Fixed By Fahim`, also installed in `~/.local/share/fonts/`) and always `await document.fonts.ready` before capturing frames so Bengali conjuncts (যুক্তবর্ণ) render cleanly offline.
   - **Frame-Pure Rule:** Never use CSS `@keyframes` or `transition`—drive 100% of motion mathematically from `window.setFrame(frame)`.
2. Adjust `FPS`, `TOTAL_FRAMES`, `WIDTH`, `HEIGHT` in `$HOME/remotion-studio/render.mjs` if needed.
3. Run:
```bash
cd /data/user/0/ai.antigem/files/home/remotion-studio && node render.mjs
```
4. Output is saved to `/data/user/0/ai.antigem/files/home/remotion-studio/out/output.mp4`.
