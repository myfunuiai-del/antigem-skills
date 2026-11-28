# Core Video Logic Modules (Lightweight & Zero-Dependency)

Extracted, optimized, and context-aware modules for Remotion Video Studio.

## 1. BmTypography (`bm-typography.js`)
* **Purpose:** Kinetic typography with bracket token parsing (`[শব্দ]`), spring scale pops, brand accent colors, soft glow, and hand-drawn SVG scribbles.
* **Usage:**
  ```javascript
  import { BmTypography } from './bm-typography.js';
  const typo = new BmTypography({ accentColor: '#38bdf8', scribbleColor: '#f43f5e' });
  const html = typo.renderHTML("আজকে আমরা দেখব [টারমাক্সে] কীভাবে [ভিডিও] বানাতে হয়");
  ```

## 2. CameraShake (`camera-shake.js`)
* **Purpose:** Physics-based spring-damped oscillation matrix for beat hits and impacts ($D(t) = A \cdot e^{-\lambda t} \cos(\omega t)$).
* **Usage:**
  ```javascript
  import { CameraShake } from './camera-shake.js';
  const shake = new CameraShake({ fps: 30 });
  shake.trigger({ startFrame: 45, amplitude: 18 });
  const transform = shake.getTransform(currentFrame); // "translate(Xpx, Ypx) rotate(Rdeg)"
  ```

## 3. DeviceMockup (`device-mockup.js`)
* **Purpose:** 3D hardware mockup bezels (Phone / Laptop / Browser) with perspective tilt, internal smooth auto-scroll, and 3D card lift (`crop & lift`).
* **Usage:**
  ```javascript
  import { DeviceMockup } from './device-mockup.js';
  const phone = new DeviceMockup({ kind: 'phone', rx: 8, ry: -12 });
  const html = phone.renderHTML({
    src: '/path/to/screenshot.png',
    autoScroll: true,
    liftCard: { title: 'Revenue', badge: '+$45,000', icon: '💰' }
  });
  ```
