<p align="center">
  <img src="assets/logo.svg" width="120" alt="Remotion Video Studio Logo" />
</p>

<div align="right">

**🌐 Language / ভাষা:** &nbsp; **[English (README.md)](./README.md)** &nbsp;|&nbsp; **🇧🇩 বাংলা সংস্করণ**

</div>

# Remotion Video Studio (Android / Termux)

Android (Termux / AntiGem)-এ **কোনো `proot` বা OS spoof ছাড়াই সরাসরি আসল `@remotion/renderer` + `@remotion/cli`** (ফুল প্যারালাল রেন্ডারিংসহ) এবং React + CSS + SVG + Three.js স্টুডিও চালানোর পূর্ণাঙ্গ **ওয়ান-কমান্ড সেটআপ**।

---

## ১. এটি কী এবং কীভাবে কাজ করে?
সাধারণত Android-এ `@remotion/renderer` চালালে `Error: Unsupported OS: android, architecture: arm64` এরর আসে।

এই ইনস্টলারটি সব বাধা অটোমেটিক সমাধান করে দেয়:
- **নেটিভ `@remotion/renderer` ও Remotion CLI:** Termux-এর `glibc-runner`-এর `ld-linux-aarch64.so.1` লিংকার দিয়ে `@remotion/compositor-linux-arm64-gnu` সরাসরি নেটিভ স্পিডে চালায় (`~/remotion-studio/binaries/`-এ আর্গুমেন্ট-সেফ wrapper সহ)।
- **Termux-এর নিজের Chromium:** `remotion.config.ts`-এ `browserExecutable` + `chromeMode: 'chrome-for-testing'` (`--headless=new`) + `gl: 'swangle'` অটো কনফিগার করা থাকে।
- **ফুল প্যারালাল রেন্ডারিং ও স্পিড টিউনিং:** ফোনের বেঞ্চমার্ক অনুযায়ী `concurrency: 4`, `jpeg (q=90)` ক্যাপচার, `x264Preset: 'veryfast'`, `devtool: false` এবং `TermuxWebpackCacheFixPlugin` (যা Android `/data/user/0` `EACCES` ক্যাশ এরর ফিক্স করে ওয়ার্ম বান্ডলিং সময় অর্ধেকে নামায়) আগে থেকেই কনফিগার করা থাকে।
- **অফলাইন বাংলা ফন্ট ও `mkprompt` স্টুডিও:** `HindSiliguriFixed` ফন্ট, Mind-Map স্টুডিও এবং লাইটওয়েট `scene.html` + `render.mjs` মোডও সাথেই থাকে।

---

## ২. ওয়ান-কমান্ড ইনস্টলেশন (One-Click Setup)

নিচের একটি কমান্ড চালালেই সব সিস্টেম প্যাকেজ (`nodejs`, `pnpm`, `ffmpeg`, `chromium`, `glibc-repo`, `glibc-runner`), Remotion-এর ভার্সন-ম্যাচড compositor বাইনারি, wrapper, `remotion.config.ts`, ফন্ট ও `mkprompt` অটোমেটিক সেটআপ হয়ে যাবে:

```bash
curl -fsSL https://raw.githubusercontent.com/myfunuiai-del/antigem-skills/main/remotion-video-studio/install.sh | bash
```

---

## ৩. ব্যবহার ও উদাহরণ

### ক) সরাসরি Remotion CLI (`@remotion/renderer`) — কোনো এক্সট্রা ফ্ল্যাগ ছাড়াই
```bash
cd ~/remotion-studio
./node_modules/.bin/remotion compositions src/index.ts
./node_modules/.bin/remotion render src/index.ts TestVideo out/test.mp4
```

### খ) Node.js থেকে সরাসরি `@remotion/renderer` API
```bash
cd ~/remotion-studio
node render-remotion.mjs TestVideo out/test.mp4
```

যেকোনো অন্য প্রজেক্টেও শুধু এই অপশনগুলো পাস করলেই `@remotion/renderer` চলবে:
```js
const termuxRemotionOpts = {
  browserExecutable: `${process.env.PREFIX || '/data/user/0/ai.antigem/files/usr'}/bin/chromium-browser`,
  chromeMode: 'chrome-for-testing',
  binariesDirectory: `${process.env.HOME}/remotion-studio/binaries`,
  chromiumOptions: { gl: 'swangle' },
};
```

### গ) লাইটওয়েট HTML/Puppeteer মোড ও `mkprompt` স্টুডিও
```bash
cd ~/remotion-studio && node render.mjs
# অথবা Studio & Prompt Builder চালু করতে:
mkprompt
```
