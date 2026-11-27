<p align="center">
  <img src="assets/logo.svg" width="120" alt="Remotion Video Studio Logo" />
</p>

<div align="right">

**🌐 Language / ভাষা:** &nbsp; **English** &nbsp;|&nbsp; **[🇧🇩 বাংলা সংস্করণ (README_BN.md)](./README_BN.md)**

</div>

# Remotion Video Studio (Android / Termux)

A complete studio setup for rendering deterministic, frame-by-frame `.mp4` videos on **Android (Termux)** using the **React + CSS + SVG + Three.js** ecosystem.

---

## 1. What & Why?
Unlike desktop OSes, `@remotion/renderer` does not run natively on Android (`Error: Unsupported OS: android, architecture: arm64`), and `/storage/emulated/0` does not support `pnpm` symlinks.

This skill solves both limitations:
- **100% React + CSS + SVG + Three.js** support.
- **Zero frame drops:** Deterministic frame-by-frame rendering.
- **Android-friendly:** Installs in `$HOME/remotion-studio` to avoid FUSE symlink permission errors.

---

## 2. How It Works
1. **`src/scene.html`:** Holds your React, CSS, SVG, or Three.js scene, controlled frame-by-frame via `window.setFrame(frame)`.
2. **`render.mjs`:** Uses `puppeteer-core` with headless `chromium-browser` to capture each frame and pipes them directly into `ffmpeg` to produce `.mp4`.

---

## 3. One-Command Installation

Run this single command in Termux to automatically install all required system dependencies (`nodejs`, `pnpm`, `ffmpeg`, `chromium`) and set up `~/remotion-studio`:

```bash
curl -fsSL https://raw.githubusercontent.com/myfunuiai-del/antigem-skills/main/remotion-video-studio/install.sh | bash
```

---

## 4. Usage & Examples

Once installed, render the starter video:
```bash
cd ~/remotion-studio
node render.mjs
```
Output will be saved to: `~/remotion-studio/out/output.mp4`

### Customization:
- **Edit the animation:** Modify `~/remotion-studio/src/scene.html`
- **Change FPS / Resolution / Duration:** Update `FPS`, `TOTAL_FRAMES`, `WIDTH`, `HEIGHT` in `~/remotion-studio/render.mjs`
