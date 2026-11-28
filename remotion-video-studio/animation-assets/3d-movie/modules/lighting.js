// animation-assets/3d-movie/modules/lighting.js
// Production-grade filmic lighting and IBL for Three.js (3D Movie / Pixar Style)

export function setupFilmicLighting(THREE, scene, renderer, options = {}) {
  const {
    sunDir = new THREE.Vector3(0.24, 0.155, -0.958).normalize(),
    sunColor = 0xffa84c,
    sunIntensity = 2.75,
    hemiSky = 0x7c9ad4,
    hemiGround = 0x222c1b,
    hemiIntensity = 0.42,
    fillColor = 0x5276bd,
    fillIntensity = 0.28,
    fogColor = 0xcf7b56,
    fogDensity = 0.0026,
    exposure = 0.94
  } = options;

  // Renderer color grading & ACES Tone Mapping
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = exposure;
  renderer.outputEncoding = THREE.sRGBEncoding;

  // Fog
  if (fogColor) {
    scene.fog = new THREE.FogExp2(fogColor, fogDensity);
  }

  // Hemisphere ambient
  const hemiLight = new THREE.HemisphereLight(hemiSky, hemiGround, hemiIntensity);
  scene.add(hemiLight);

  // Key directional sun with soft shadows
  const sunLight = new THREE.DirectionalLight(sunColor, sunIntensity);
  sunLight.position.copy(sunDir).multiplyScalar(118);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(1024, 1024);
  sunLight.shadow.camera.near = 22;
  sunLight.shadow.camera.far = 230;
  sunLight.shadow.camera.left = -60;
  sunLight.shadow.camera.right = 60;
  sunLight.shadow.camera.top = 44;
  sunLight.shadow.camera.bottom = -44;
  sunLight.shadow.bias = -0.0006;
  scene.add(sunLight);

  // Cool fill light for rich contrast
  const fillLight = new THREE.DirectionalLight(fillColor, fillIntensity);
  fillLight.position.set(-55, 38, 68);
  scene.add(fillLight);

  // Prefiltered IBL Environment (PMREMGenerator)
  const envScene = new THREE.Scene();
  const envGeo = new THREE.SphereGeometry(40, 24, 16);
  const envMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {},
    vertexShader: `
      varying vec3 vPos;
      void main() { vPos = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: `
      varying vec3 vPos;
      void main() {
        float y = vPos.y;
        vec3 low = vec3(0.20, 0.14, 0.12);
        vec3 hor = vec3(0.95, 0.58, 0.30);
        vec3 mid = vec3(0.32, 0.24, 0.44);
        vec3 top = vec3(0.08, 0.14, 0.32);
        vec3 col = y < 0.0 ? mix(hor, low, clamp(-y * 2.5, 0.0, 1.0))
                           : (y < 0.25 ? mix(hor, mid, y / 0.25) : mix(mid, top, (y - 0.25) / 0.75));
        gl_FragColor = vec4(col, 1.0);
      }
    `
  });
  envScene.add(new THREE.Mesh(envGeo, envMat));
  const sunPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(22, 14),
    new THREE.MeshBasicMaterial({ color: 0xffd28e })
  );
  sunPanel.position.set(14, 8, -28);
  sunPanel.lookAt(0, 0, 0);
  envScene.add(sunPanel);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(envScene, 0.03).texture;
  pmrem.dispose();

  return { hemiLight, sunLight, fillLight };
}
