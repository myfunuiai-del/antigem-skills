<p align="center">
  <img src="assets/logo.svg" width="120" alt="Remotion Video Studio Logo" />
</p>

<div align="right">

**🌐 Language / ভাষা:** &nbsp; **[English (README.md)](./README.md)** &nbsp;|&nbsp; **🇧🇩 বাংলা সংস্করণ**

</div>

# Remotion Video Studio (Android / Termux)

Android (Termux)-এ **React + CSS + SVG + Three.js** ইকোসিস্টেম ব্যবহার করে নির্ভুল ফ্রেম-বাই-ফ্রেম `.mp4` ভিডিও রেন্ডার করার পূর্ণাঙ্গ স্টুডিও সেটআপ।

---

## ১. এটি কী এবং কেন?
পিসির মতো Android-এ `@remotion/renderer` সরাসরি চলে না (`Error: Unsupported OS: android, architecture: arm64`) এবং `/storage/emulated/0` ফোল্ডারে `pnpm` symlink সাপোর্ট করে না।

এই স্কিলটি সেই সীমাবদ্ধতা দূর করে:
- **১০০% React + CSS + SVG + Three.js** সাপোর্ট দেয়।
- ফ্রেম-বাই-ফ্রেম রেন্ডারিংয়ের কারণে কোনো ফ্রেম ড্রপ বা ল্যাগ হয় না।
- ফোনের `$HOME/remotion-studio`-তে সেটআপ হয়, তাই কোনো পারমিশন এরর আসে না।

---

## ২. কীভাবে কাজ করে?
1. **`src/scene.html`:** এখানে আপনার React, CSS, SVG বা Three.js সিন থাকে, যা `window.setFrame(frame)` ফাংশনের মাধ্যমে প্রতিটি ফ্রেমে আপডেট হয়।
2. **`render.mjs`:** `puppeteer-core` ব্যবহার করে হেডলেস `chromium-browser`-এ প্রতিটি ফ্রেম রেন্ডার করে এবং সরাসরি `ffmpeg`-এ পাইপ করে `.mp4` তৈরি করে।

---

## ৩. ওয়ান-কমান্ড ইনস্টলেশন (One-Command Setup)

নিচের একটি কমান্ড চালালেই প্রয়োজনীয় সব সিস্টেম ডিপেন্ডেন্সি (`nodejs`, `pnpm`, `ffmpeg`, `chromium`) এবং `~/remotion-studio` অটোমেটিক সেটআপ হয়ে যাবে:

```bash
curl -fsSL https://raw.githubusercontent.com/myfunuiai-del/antigem-skills/main/remotion-video-studio/install.sh | bash
```

---

## ৪. ব্যবহার ও উদাহরণ

সেটআপ শেষ হলে নিচের কমান্ডে টেস্ট ভিডিও রেন্ডার করুন:
```bash
cd ~/remotion-studio
node render.mjs
```
আউটপুট তৈরি হবে: `~/remotion-studio/out/output.mp4`

### কাস্টমাইজেশন:
- **অ্যানিমেশন বদলাতে:** `~/remotion-studio/src/scene.html` এডিট করুন।
- **FPS / রেজোলিউশন / সময় বদলাতে:** `~/remotion-studio/render.mjs`-এ `FPS`, `TOTAL_FRAMES`, `WIDTH`, `HEIGHT` পরিবর্তন করুন।
