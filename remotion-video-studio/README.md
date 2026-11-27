<p align="center">
  <img src="assets/logo.svg" width="120" alt="Remotion Video Studio Logo" />
</p>

<div align="right">

**🌐 Language / ভাষা:** &nbsp; **English** &nbsp;|&nbsp; **[🇧🇩 বাংলা সংস্করণ (README_BN.md)](./README_BN.md)**

</div>

# Remotion Video Studio (Android / Termux)

A complete **one-command setup** to run **native `@remotion/renderer` + `@remotion/cli`** (with full parallel rendering, **no `proot`**, **no OS spoofing**) AND the lightweight React/HTML/SVG/Three.js studio on **Android (Termux / AntiGem)**.

---

## 1. What & Why?
Out of the box, `@remotion/renderer` fails on Android (`Error: Unsupported OS: android, architecture: arm64`) because it tries to resolve a desktop compositor package and download Linux `chrome-headless-shell`.

This installer solves all Android/Termux limitations automatically:
- **Native `@remotion/renderer` & Remotion CLI:** Runs `@remotion/compositor-linux-arm64-gnu` directly via Termux's `glibc` dynamic linker (`ld-linux-aarch64.so.1`) using argument-safe wrappers in `~/remotion-studio/binaries/`.
- **Native Termux Chromium:** Uses `browserExecutable` + `chromeMode: 'chrome-for-testing'` (`--headless=new`) + `gl: 'swangle'`.
- **Full Parallel Rendering & Termux Speed Tuning:** Pre-tuned with `concurrency: 4`, `jpeg` (`q=90`) frame capture, `x264Preset: 'veryfast'`, `devtool: false`, and a `TermuxWebpackCacheFixPlugin` that fixes Android `/data/user/0` `EACCES` cache errors (cutting warm re-bundle time by ~50%).
- **Zero Permission Errors:** Installs inside `$HOME/remotion-studio` (avoiding `/storage/emulated/0` FUSE symlink issues).
- **Offline Bangla Fonts + `mkprompt` Studio:** Includes `HindSiliguriFixed` fonts, Mind-Map workflow UI, and lightweight `scene.html` + `render.mjs` fallback.

---

## 2. One-Command Installation

Run this single command in Termux/AntiGem to install all dependencies (`nodejs`, `pnpm`, `ffmpeg`, `chromium`, `glibc-repo`, `glibc-runner`), matching Remotion compositor binaries, wrappers, `remotion.config.ts`, fonts, and `mkprompt`:

```bash
curl -fsSL https://raw.githubusercontent.com/myfunuiai-del/antigem-skills/main/remotion-video-studio/install.sh | bash
```

---

## 3. Usage & Examples

### A) Official Remotion CLI (`@remotion/renderer`) — Zero Extra Flags
```bash
cd ~/remotion-studio
./node_modules/.bin/remotion compositions src/index.ts
./node_modules/.bin/remotion render src/index.ts TestVideo out/test.mp4
```

### B) Programmatic `@remotion/renderer` Node.js API
```bash
cd ~/remotion-studio
node render-remotion.mjs TestVideo out/test.mp4
```

Or reuse the Termux options in any other Node.js project:
```js
const termuxRemotionOpts = {
  browserExecutable: `${process.env.PREFIX || '/data/user/0/ai.antigem/files/usr'}/bin/chromium-browser`,
  chromeMode: 'chrome-for-testing',
  binariesDirectory: `${process.env.HOME}/remotion-studio/binaries`,
  chromiumOptions: { gl: 'swangle' },
};
```

### C) Lightweight HTML/Puppeteer Mode & `mkprompt` Studio
```bash
cd ~/remotion-studio && node render.mjs
# Or launch the visual Studio & Prompt Builder:
mkprompt
```
