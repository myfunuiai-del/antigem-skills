/**
 * device-mockup.js
 * Context-aware Smart Device Mockup Engine (Phone / Laptop / Browser).
 * Zero-dependency: Renders CSS 3D realistic hardware bezels, perspective tilt,
 * internal auto-scroll, and card lift / crop pop-out.
 */

export class DeviceMockup {
  /**
   * @param {Object} options
   * @param {'phone'|'laptop'|'browser'} options.kind Device type (default: 'phone')
   * @param {number} options.width Target width in px (default: 340 for phone, 720 for laptop)
   * @param {number} options.height Target height in px
   * @param {number} options.rx 3D rotation X in degrees (default: 8)
   * @param {number} options.ry 3D rotation Y in degrees (default: -12)
   */
  constructor(options = {}) {
    this.kind = options.kind || 'phone';
    this.rx = options.rx !== undefined ? options.rx : (this.kind === 'phone' ? 8 : 12);
    this.ry = options.ry !== undefined ? options.ry : (this.kind === 'phone' ? -12 : -8);

    if (this.kind === 'phone') {
      this.width = options.width || 340;
      this.height = options.height || 680;
    } else if (this.kind === 'laptop') {
      this.width = options.width || 760;
      this.height = options.height || 480;
    } else {
      // browser window
      this.width = options.width || 680;
      this.height = options.height || 440;
    }
  }

  /**
   * Generates complete HTML & CSS for the 3D device mockup.
   * @param {Object} content
   * @param {string} content.src Image / UI screenshot URL
   * @param {boolean} [content.autoScroll] Auto-scroll internal content
   * @param {number} [content.scrollDuration] Duration of scroll in seconds (default: 4s)
   * @param {Object} [content.liftCard] Optional card to lift/pop out from screen in 3D
   * @param {string} [content.liftCard.title] Title of lifted card
   * @param {string} [content.liftCard.badge] Highlight metric / badge
   * @param {string} [content.liftCard.icon] SVG/emoji icon
   * @returns {string} HTML string
   */
  renderHTML(content = {}) {
    const src = content.src || '';
    const autoScroll = content.autoScroll !== false && src !== '';
    const scrollDuration = content.scrollDuration || 4;
    const liftCard = content.liftCard;

    const liftCardHtml = liftCard ? `
      <div class="bm-lift-card" style="
        position: absolute;
        right: -30px;
        bottom: 80px;
        background: rgba(15, 23, 42, 0.88);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.16);
        border-radius: 16px;
        padding: 14px 20px;
        color: #fff;
        box-shadow: 0 20px 40px rgba(0,0,0,0.45), 0 0 24px rgba(56, 189, 248, 0.25);
        transform: translateZ(50px) scale(1.05);
        animation: bmLiftFloat 3s ease-in-out infinite alternate;
        z-index: 10;
        min-width: 170px;
      ">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 600;">
          ${liftCard.title || 'Feature'}
        </div>
        <div style="font-size: 18px; font-weight: 700; color: #38bdf8; margin-top: 4px; display: flex; align-items: center; gap: 6px;">
          <span>${liftCard.icon || '🚀'}</span>
          <span>${liftCard.badge || 'Active'}</span>
        </div>
      </div>
    ` : '';

    if (this.kind === 'phone') {
      return `
        <div class="bm-device-wrapper" style="perspective: 1200px; display: inline-block;">
          <style>
            @keyframes bmPhoneScroll {
              0% { transform: translateY(0); }
              40% { transform: translateY(calc(-100% + ${this.height - 40}px)); }
              60% { transform: translateY(calc(-100% + ${this.height - 40}px)); }
              100% { transform: translateY(0); }
            }
            @keyframes bmLiftFloat {
              0% { transform: translateZ(50px) translateY(0); }
              100% { transform: translateZ(65px) translateY(-8px); }
            }
          </style>
          <div class="bm-phone-frame" style="
            position: relative;
            width: ${this.width}px;
            height: ${this.height}px;
            background: #0f172a;
            border-radius: 46px;
            padding: 12px;
            box-shadow: 0 28px 60px rgba(0,0,0,0.55), 0 0 0 4px #334155, 0 0 0 6px #0f172a;
            transform: rotateX(${this.rx}deg) rotateY(${this.ry}deg);
            transform-style: preserve-3d;
            transition: transform 0.4s ease-out;
          ">
            <!-- Dynamic Island / Speaker Notch -->
            <div style="
              position: absolute;
              top: 18px;
              left: 50%;
              transform: translateX(-50%);
              width: 90px;
              height: 22px;
              background: #000;
              border-radius: 20px;
              z-index: 20;
            "></div>

            <!-- Screen Viewport -->
            <div class="bm-screen" style="
              width: 100%;
              height: 100%;
              background: #020617;
              border-radius: 36px;
              overflow: hidden;
              position: relative;
            ">
              ${src ? `
                <img src="${src}" alt="Screen Preview" style="
                  width: 100%;
                  display: block;
                  ${autoScroll ? `animation: bmPhoneScroll ${scrollDuration}s ease-in-out infinite alternate;` : ''}
                " />
              ` : `
                <div style="display: flex; height: 100%; align-items: center; justify-content: center; color: #64748b; font-size: 14px;">
                  📱 Screen Viewport
                </div>
              `}
            </div>

            ${liftCardHtml}
          </div>
        </div>
      `.trim();
    }

    // Browser / Laptop Window
    return `
      <div class="bm-device-wrapper" style="perspective: 1200px; display: inline-block;">
        <div class="bm-browser-frame" style="
          position: relative;
          width: ${this.width}px;
          height: ${this.height}px;
          background: #1e293b;
          border-radius: 14px;
          box-shadow: 0 28px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1);
          transform: rotateX(${this.rx}deg) rotateY(${this.ry}deg);
          transform-style: preserve-3d;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        ">
          <!-- Top Window Bar -->
          <div style="height: 36px; background: #0f172a; display: flex; align-items: center; padding: 0 14px; gap: 8px; border-bottom: 1px solid rgba(255,255,255,0.06);">
            <div style="width: 10px; height: 10px; border-radius: 50%; background: #ef4444;"></div>
            <div style="width: 10px; height: 10px; border-radius: 50%; background: #f59e0b;"></div>
            <div style="width: 10px; height: 10px; border-radius: 50%; background: #10b981;"></div>
            <div style="margin-left: 12px; height: 20px; background: #1e293b; border-radius: 6px; flex: 1; max-width: 280px; display: flex; align-items: center; padding: 0 8px; font-size: 11px; color: #64748b;">
              🔒 studio.antigem.ai
            </div>
          </div>
          <!-- Body Content -->
          <div style="flex: 1; overflow: hidden; position: relative; background: #020617;">
            ${src ? `<img src="${src}" style="width: 100%; display: block;" />` : `
              <div style="display: flex; height: 100%; align-items: center; justify-content: center; color: #64748b;">
                💻 Display Output
              </div>
            `}
          </div>
          ${liftCardHtml}
        </div>
      </div>
    `.trim();
  }
}
