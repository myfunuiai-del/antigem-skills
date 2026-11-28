/**
 * bm-typography.js
 * Lightweight, zero-dependency kinetic typography parser & renderer.
 * Context-aware: Parses text with [bracket] highlights, applying spring scale,
 * brand accent colors, soft glow, and SVG hand-drawn scribbles / underlines.
 */

export class BmTypography {
  /**
   * @param {Object} options
   * @param {string} options.accentColor Highlight text color (default: #38bdf8)
   * @param {string} options.glowColor Neon glow shadow color (default: rgba(56, 189, 248, 0.45))
   * @param {string} options.scribbleColor Underline / scribble color (default: #f43f5e)
   */
  constructor(options = {}) {
    this.accentColor = options.accentColor || '#38bdf8';
    this.glowColor = options.glowColor || 'rgba(56, 189, 248, 0.45)';
    this.scribbleColor = options.scribbleColor || '#f43f5e';
  }

  /**
   * Parses raw script string into structured token segments.
   * Example: "আজকে আমরা দেখব [টারমাক্সে] কীভাবে [সিনেমাটিক ভিডিও] তৈরি করা যায়"
   * @param {string} rawText
   * @returns {Array<{text: string, isHighlighted: boolean}>}
   */
  parse(rawText) {
    if (!rawText) return [];
    const tokens = [];
    const regex = /\[(.*?)\]/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(rawText)) !== null) {
      if (match.index > lastIndex) {
        tokens.push({
          text: rawText.substring(lastIndex, match.index),
          isHighlighted: false
        });
      }
      tokens.push({
        text: match[1],
        isHighlighted: true
      });
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < rawText.length) {
      tokens.push({
        text: rawText.substring(lastIndex),
        isHighlighted: false
      });
    }

    return tokens;
  }

  /**
   * Renders parsed tokens into semantic HTML with SVG dynamic scribble & spring-like styling.
   * @param {string} rawText
   * @param {Object} styleOpts
   * @param {number} styleOpts.fontSize px font size (default: 48)
   * @param {string} styleOpts.textColor Base text color (default: #ffffff)
   * @param {string} styleOpts.fontFamily Font family
   * @param {boolean} styleOpts.showScribble Draw hand-drawn scribble under brackets
   * @returns {string} HTML string
   */
  renderHTML(rawText, styleOpts = {}) {
    const tokens = this.parse(rawText);
    const fontSize = styleOpts.fontSize || 48;
    const textColor = styleOpts.textColor || '#ffffff';
    const fontFamily = styleOpts.fontFamily || "'Hind Siliguri', 'Anek Bangla', sans-serif";
    const showScribble = styleOpts.showScribble !== false;

    const partsHtml = tokens.map((t, idx) => {
      if (!t.isHighlighted) {
        return `<span class="bm-text-plain" style="color: ${textColor};">${this._escape(t.text)}</span>`;
      }

      const scribbleSvg = showScribble ? `
        <svg class="bm-scribble" viewBox="0 0 100 16" preserveAspectRatio="none" style="position: absolute; left: 0; bottom: -8px; width: 100%; height: 12px; pointer-events: none; overflow: visible;">
          <path d="M 2 10 Q 25 3, 50 11 T 98 8" fill="none" stroke="${this.scribbleColor}" stroke-width="3" stroke-linecap="round" stroke-dasharray="120" stroke-dashoffset="0" style="animation: bmScribbleDraw 0.4s ease-out forwards;" />
        </svg>
      ` : '';

      return `
        <span class="bm-text-highlight" style="position: relative; display: inline-block; color: ${this.accentColor}; font-weight: 700; text-shadow: 0 0 16px ${this.glowColor}; transform-origin: center; animation: bmPop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;">
          ${this._escape(t.text)}
          ${scribbleSvg}
        </span>
      `;
    }).join('');

    return `
      <div class="bm-kinetic-block" style="font-family: ${fontFamily}; font-size: ${fontSize}px; line-height: 1.4; display: inline-block;">
        <style>
          @keyframes bmPop {
            0% { transform: scale(0.92); opacity: 0.6; }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes bmScribbleDraw {
            0% { stroke-dashoffset: 120; opacity: 0; }
            100% { stroke-dashoffset: 0; opacity: 1; }
          }
        </style>
        ${partsHtml}
      </div>
    `.trim();
  }

  _escape(str) {
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }
}
