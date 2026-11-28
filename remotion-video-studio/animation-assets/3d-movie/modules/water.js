// animation-assets/3d-movie/modules/water.js
// Organic, non-grid shimmering golden-hour river/ocean GLSL shader for Three.js

export function createShimmeringWater(THREE, options = {}) {
  const {
    width = 240,
    length = 240,
    segmentsX = 20,
    segmentsZ = 115,
    curveFn = (z) => ({ cx: 0, hw: 14 }),
    sunDir = new THREE.Vector3(0.24, 0.155, -0.958).normalize(),
    fogColor = new THREE.Color(0xcf7b56),
    fogDensity = 0.0026
  } = options;

  const rGeo = new THREE.PlaneGeometry(1, length, segmentsX, segmentsZ);
  rGeo.rotateX(-Math.PI / 2);
  const pos = rGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i), z = pos.getZ(i);
    const { cx, hw } = curveFn(z);
    pos.setX(i, cx + u * 2.0 * hw);
    pos.setY(i, 0.06);
  }
  rGeo.computeVertexNormals();

  const uniforms = {
    uTime: { value: 0 },
    uSunDir: { value: sunDir.clone() },
    uCamPos: { value: new THREE.Vector3() },
    uFogColor: { value: fogColor.clone() },
    uFogDensity: { value: fogDensity }
  };

  const rMat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      varying vec3 vWorldPos;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uSunDir;
      uniform vec3 uCamPos;
      uniform vec3 uFogColor;
      uniform float uFogDensity;
      varying vec3 vWorldPos;
      varying vec2 vUv;

      vec2 waveGrad(vec2 p, float t) {
        vec2 g = vec2(0.0);
        vec2 d1 = vec2( 0.956,  0.292); float ph1 = dot(p, d1) * 0.85 - t * 2.1; g += d1 * cos(ph1) * 0.032;
        vec2 d2 = vec2(-0.588,  0.809); float ph2 = dot(p, d2) * 1.32 - t * 2.7; g += d2 * cos(ph2) * 0.025;
        vec2 d3 = vec2( 0.309, -0.951); float ph3 = dot(p, d3) * 2.15 + t * 3.2; g += d3 * cos(ph3) * 0.018;
        vec2 d4 = vec2(-0.891, -0.454); float ph4 = dot(p, d4) * 3.40 - t * 3.9; g += d4 * cos(ph4) * 0.012;
        vec2 d5 = vec2( 0.743,  0.669); float ph5 = dot(p, d5) * 5.20 - t * 4.6; g += d5 * cos(ph5) * 0.008;
        return g;
      }

      void main() {
        vec2 p = vWorldPos.xz;
        vec2 warp = vec2(sin(p.y * 0.18 - uTime * 0.8), cos(p.x * 0.22 + uTime * 0.6)) * 1.1;
        vec2 wg = waveGrad(p + warp, uTime);
        vec3 N = normalize(vec3(wg.x, 1.0, wg.y));

        vec3 V = normalize(uCamPos - vWorldPos);
        vec3 L = normalize(uSunDir);
        vec3 H = normalize(L + V);

        float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.4);
        vec3 deepWater    = vec3(0.04, 0.16, 0.24);
        vec3 shallowWater = vec3(0.09, 0.27, 0.31);
        float sunReflAmt  = pow(max(dot(reflect(-V, N), L), 0.0), 2.8);
        vec3 skyRefl = mix(vec3(0.36, 0.28, 0.46), vec3(1.0, 0.58, 0.26), clamp(sunReflAmt * 1.25, 0.0, 1.0));

        float edge = abs(vUv.x - 0.5) * 2.0;
        vec3 base = mix(deepWater, shallowWater, smoothstep(0.55, 0.96, edge));
        vec3 col = mix(base, skyRefl, clamp(0.22 + fresnel * 0.74, 0.0, 0.94));

        float specWarm  = pow(max(dot(N, H), 0.0), 56.0);
        float specGlint = pow(max(dot(N, H), 0.0), 320.0);
        col += vec3(1.0, 0.66, 0.26) * specWarm * 0.95;
        col += vec3(1.0, 0.94, 0.74) * specGlint * 2.2;

        float bankFoam = smoothstep(0.86, 0.98, edge) * (0.4 + 0.4 * sin(p.y * 1.7 + p.x * 0.9 - uTime * 2.3));
        col = mix(col, vec3(0.92, 0.80, 0.66), bankFoam * 0.24);

        float dist = length(uCamPos - vWorldPos);
        float fogFactor = 1.0 - exp(-uFogDensity * uFogDensity * dist * dist);
        col = mix(col, uFogColor, clamp(fogFactor, 0.0, 1.0));

        gl_FragColor = vec4(col, 1.0);
      }
    `
  });

  const mesh = new THREE.Mesh(rGeo, rMat);
  return { mesh, uniforms };
}
