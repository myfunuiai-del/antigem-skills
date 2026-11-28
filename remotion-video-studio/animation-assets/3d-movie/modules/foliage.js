// animation-assets/3d-movie/modules/foliage.js
// High-detail 4-tier alpine pines and smooth Miyazaki broadleaf trees with zero-heat InstancedMesh

export function createPineForest(THREE, spots, options = {}) {
  const n = spots.length;
  if (!n) return [];
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3b2619, roughness: 0.94, envMapIntensity: 0.18 });
  const pTrunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.14, 0.28, 2.2, 7), trunkMat, n);
  const p1 = new THREE.InstancedMesh(new THREE.ConeGeometry(1.75, 2.35, 10), new THREE.MeshStandardMaterial({ color: 0x133522, roughness: 0.90, envMapIntensity: 0.22 }), n);
  const p2 = new THREE.InstancedMesh(new THREE.ConeGeometry(1.42, 2.15, 10), new THREE.MeshStandardMaterial({ color: 0x1d492b, roughness: 0.88, envMapIntensity: 0.22 }), n);
  const p3 = new THREE.InstancedMesh(new THREE.ConeGeometry(1.06, 1.95, 10), new THREE.MeshStandardMaterial({ color: 0x2b5d31, roughness: 0.86, envMapIntensity: 0.22 }), n);
  const p4 = new THREE.InstancedMesh(new THREE.ConeGeometry(0.68, 1.65, 10), new THREE.MeshStandardMaterial({ color: 0x447234, roughness: 0.84, envMapIntensity: 0.24 }), n);
  p1.castShadow = p2.castShadow = p3.castShadow = true;
  p1.receiveShadow = p2.receiveShadow = true;

  const dummy = new THREE.Object3D();
  for (let i = 0; i < n; i++) {
    const s = spots[i];
    dummy.rotation.set(0, s.rot || 0, 0);
    dummy.scale.setScalar(s.sc || 1);

    dummy.position.set(s.x, s.y + 0.9 * (s.sc || 1), s.z);
    dummy.updateMatrix(); pTrunk.setMatrixAt(i, dummy.matrix);

    dummy.position.set(s.x, s.y + 2.35 * (s.sc || 1), s.z);
    dummy.updateMatrix(); p1.setMatrixAt(i, dummy.matrix);

    dummy.position.set(s.x, s.y + 3.65 * (s.sc || 1), s.z);
    dummy.updateMatrix(); p2.setMatrixAt(i, dummy.matrix);

    dummy.position.set(s.x, s.y + 4.85 * (s.sc || 1), s.z);
    dummy.updateMatrix(); p3.setMatrixAt(i, dummy.matrix);

    dummy.position.set(s.x, s.y + 5.85 * (s.sc || 1), s.z);
    dummy.updateMatrix(); p4.setMatrixAt(i, dummy.matrix);
  }
  return [pTrunk, p1, p2, p3, p4];
}

export function createMiyazakiTrees(THREE, spots, options = {}) {
  const n = spots.length;
  if (!n) return [];
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3b2619, roughness: 0.94, envMapIntensity: 0.18 });
  const bTrunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.34, 2.7, 7), trunkMat, n);
  const smoothSphere = new THREE.SphereGeometry(1.38, 12, 10);
  const bMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.88, metalness: 0.0, envMapIntensity: 0.22 });
  const b1 = new THREE.InstancedMesh(smoothSphere, bMat, n);
  const b2 = new THREE.InstancedMesh(smoothSphere, bMat, n);
  const b3 = new THREE.InstancedMesh(smoothSphere, bMat, n);
  const b4 = new THREE.InstancedMesh(smoothSphere, bMat, n);
  b1.castShadow = b2.castShadow = b3.castShadow = true;
  b1.receiveShadow = b2.receiveShadow = true;

  const cG1 = new THREE.Color(0x214f27), cG2 = new THREE.Color(0x3a6e2e), cG3 = new THREE.Color(0x638530), cG4 = new THREE.Color(0x889935);
  const cA1 = new THREE.Color(0x96451e), cA2 = new THREE.Color(0xc46b24), cA3 = new THREE.Color(0xdf942c), cA4 = new THREE.Color(0xebb43e);

  const dummy = new THREE.Object3D();
  for (let i = 0; i < n; i++) {
    const s = spots[i];
    const sc = s.sc || 1;
    dummy.rotation.set(0, s.rot || 0, 0);
    dummy.scale.setScalar(sc);
    dummy.position.set(s.x, s.y + 1.15 * sc, s.z);
    dummy.updateMatrix(); bTrunk.setMatrixAt(i, dummy.matrix);

    dummy.position.set(s.x, s.y + 3.45 * sc, s.z);
    dummy.scale.set(sc * 1.15, sc * 0.90, sc * 1.12);
    dummy.updateMatrix(); b1.setMatrixAt(i, dummy.matrix);

    dummy.position.set(s.x + Math.cos(s.rot || 0) * 1.05 * sc, s.y + 2.85 * sc, s.z + Math.sin(s.rot || 0) * 1.05 * sc);
    dummy.scale.set(sc * 0.90, sc * 0.78, sc * 0.90);
    dummy.updateMatrix(); b2.setMatrixAt(i, dummy.matrix);

    dummy.position.set(s.x - Math.cos((s.rot || 0) + 0.5) * 0.95 * sc, s.y + 3.10 * sc, s.z - Math.sin((s.rot || 0) + 0.5) * 0.95 * sc);
    dummy.scale.set(sc * 0.86, sc * 0.76, sc * 0.86);
    dummy.updateMatrix(); b3.setMatrixAt(i, dummy.matrix);

    dummy.position.set(s.x + Math.sin(s.rot || 0) * 0.4 * sc, s.y + 4.35 * sc, s.z - Math.cos(s.rot || 0) * 0.4 * sc);
    dummy.scale.set(sc * 0.78, sc * 0.72, sc * 0.78);
    dummy.updateMatrix(); b4.setMatrixAt(i, dummy.matrix);

    b1.setColorAt(i, s.autumn ? cA1 : cG1);
    b2.setColorAt(i, s.autumn ? cA2 : cG2);
    b3.setColorAt(i, s.autumn ? cA3 : cG3);
    b4.setColorAt(i, s.autumn ? cA4 : cG4);
  }
  b1.instanceColor.needsUpdate = b2.instanceColor.needsUpdate = b3.instanceColor.needsUpdate = b4.instanceColor.needsUpdate = true;
  return [bTrunk, b1, b2, b3, b4];
}
