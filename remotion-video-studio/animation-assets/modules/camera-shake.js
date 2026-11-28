/**
 * camera-shake.js
 * Physics-based spring-dampened camera shake & impact matrix generator.
 * Zero-dependency: Computes [dx, dy, rot] offsets on keyframe beat/sound drops.
 * Equation: D(t) = A * exp(-lambda * t) * cos(omega * t)
 */

export class CameraShake {
  /**
   * @param {Object} options
   * @param {number} options.defaultAmplitude Max displacement in px (default: 16)
   * @param {number} options.decay Damping decay factor lambda (default: 8.0)
   * @param {number} options.frequency Oscillation frequency omega (default: 24.0)
   * @param {number} options.fps Target animation FPS (default: 30)
   */
  constructor(options = {}) {
    this.defaultAmplitude = options.defaultAmplitude || 16;
    this.decay = options.decay || 8.0;
    this.frequency = options.frequency || 24.0;
    this.fps = options.fps || 30;
    this.activeShakes = [];
  }

  /**
   * Triggers an impact shake at a specific time/frame.
   * @param {Object} hit
   * @param {number} hit.startFrame Frame number when hit occurs
   * @param {number} [hit.amplitude] Optional custom amplitude in px
   * @param {number} [hit.durationFrames] Duration of shake in frames (default: 14)
   * @param {number} [hit.angle] Direction of impact in radians (random if omitted)
   */
  trigger(hit = {}) {
    const startFrame = hit.startFrame || 0;
    const amplitude = hit.amplitude || this.defaultAmplitude;
    const durationFrames = hit.durationFrames || Math.round(this.fps * 0.45); // ~0.45s
    const angle = hit.angle !== undefined ? hit.angle : (Math.random() * Math.PI * 2);

    this.activeShakes.push({
      startFrame,
      durationFrames,
      amplitude,
      angle
    });
  }

  /**
   * Evaluates camera offset for the given current frame idempotently.
   * @param {number} currentFrame
   * @returns {{x: number, y: number, rot: number}} Offset to apply to camera/stage
   */
  evaluate(currentFrame) {
    let totalX = 0;
    let totalY = 0;
    let totalRot = 0;

    for (const shake of this.activeShakes) {
      const elapsedFrames = currentFrame - shake.startFrame;
      if (elapsedFrames < 0 || elapsedFrames >= shake.durationFrames) {
        continue;
      }

      const t = elapsedFrames / this.fps; // elapsed in seconds
      // Damped harmonic oscillation: A * e^(-lambda*t) * cos(omega*t)
      const envelope = shake.amplitude * Math.exp(-this.decay * t);
      const wave = Math.cos(this.frequency * t);
      const disp = envelope * wave;

      // Deterministic high-frequency jitter
      const jitterX = (Math.sin(elapsedFrames * 3.7) * 0.25) * envelope;
      const jitterY = (Math.cos(elapsedFrames * 4.3) * 0.25) * envelope;

      totalX += Math.cos(shake.angle) * disp + jitterX;
      totalY += Math.sin(shake.angle) * disp + jitterY;
      totalRot += (Math.sin(shake.angle) * (disp / shake.amplitude) * 0.75);
    }

    return {
      x: +totalX.toFixed(2),
      y: +totalY.toFixed(2),
      rot: +totalRot.toFixed(2)
    };
  }

  /**
   * Generates a CSS transform string for DOM elements / canvas wrapper.
   * @param {number} currentFrame
   * @returns {string} e.g. "translate(4.2px, -3.1px) rotate(0.4deg)"
   */
  getTransform(currentFrame) {
    const offset = this.evaluate(currentFrame);
    if (Math.abs(offset.x) < 0.05 && Math.abs(offset.y) < 0.05 && Math.abs(offset.rot) < 0.05) {
      return '';
    }
    return `translate(${offset.x}px, ${offset.y}px) rotate(${offset.rot}deg)`;
  }
}
