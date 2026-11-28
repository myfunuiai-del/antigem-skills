// animation-assets/3d-movie/modules/camera-drone.js
// 3-beat emotional drone camera system with smooth CatmullRom splines and cubic easing

export function createDroneRig(THREE, waypoints = {}) {
  const {
    posPoints = [
      new THREE.Vector3(-24, 19.5,  30.0),
      new THREE.Vector3( -4, 14.5,  24.0),
      new THREE.Vector3( 15, 13.6,  17.5),
      new THREE.Vector3( 24, 16.2,   5.5),
      new THREE.Vector3( 28, 17.6,  -5.2)
    ],
    lookPoints = [
      new THREE.Vector3( -8,  8.8,   1.5),
      new THREE.Vector3(  5,  9.0,  -1.0),
      new THREE.Vector3( 22,  9.8,  -5.5),
      new THREE.Vector3( 43, 13.4, -25.0),
      new THREE.Vector3( 51, 14.6, -35.5)
    ]
  } = waypoints;

  const camPosCurve = new THREE.CatmullRomCurve3(posPoints, false, 'catmullrom', 0.5);
  const camLookCurve = new THREE.CatmullRomCurve3(lookPoints, false, 'catmullrom', 0.5);

  const easeInOutCubic = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  return {
    update(camera, t, duration) {
      const p = clamp(t / duration, 0, 1);
      const camU = clamp(lerp(p, easeInOutCubic(p), 0.35), 0, 1);
      camPosCurve.getPointAt(camU, camera.position);
      camera.position.y += Math.sin(t * 0.85) * 0.16; // subtle hover
      const lookPt = camLookCurve.getPointAt(camU);
      camera.lookAt(lookPt);
    }
  };
}
