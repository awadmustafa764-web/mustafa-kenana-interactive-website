import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { brushedTexture } from './studio.js';

// A single-handed arming sword, modelled procedurally so we control every bevel.
// Local frame: blade along +Y from the guard (y = 0) to the tip, edges along ±X.
const BLADE_LEN = 2.25;
const BASE_W = 0.086;     // half width at the guard
const THICK = 0.016;      // half thickness at the spine

// Profile: half-width along the blade (distal taper + gentle leaf + pointed tip).
function halfWidth(t) {
  const taper = BASE_W * (1 - t * 0.38) * (1 + Math.sin(t * Math.PI) * 0.05);
  const tip = t > 0.86 ? Math.pow(1 - (t - 0.86) / 0.14, 0.8) : 1;
  return Math.max(taper * tip, 0.0008);
}
function halfThick(t) {
  return Math.max(THICK * (1 - t * 0.55) * (t > 0.9 ? Math.pow(1 - (t - 0.9) / 0.1, 0.6) : 1), 0.0008);
}

// Hexagonal section: flat central face (with a shallow fuller) and two edge bevels per side.
// Each face is its own strip so the ridges stay crisp (flat normals across, smooth along).
function bladeGeometry(rows = 90) {
  const faces = [
    // [x0 factor, y0 factor] → [x1, y1]; x as fraction of half width, y as fraction of half thickness
    [[-1, 0], [-0.55, 1]],
    [[-0.55, 1], [0.55, 1]],
    [[0.55, 1], [1, 0]],
    [[1, 0], [0.55, -1]],
    [[0.55, -1], [-0.55, -1]],
    [[-0.55, -1], [-1, 0]],
  ];
  const geos = faces.map(([a, b], fi) => {
    const pos = [];
    const uv = [];
    const idx = [];
    const cols = fi === 1 || fi === 4 ? 10 : 2; // central faces get columns for the fuller
    for (let r = 0; r <= rows; r++) {
      const t = r / rows;
      const w = halfWidth(t), h = halfThick(t);
      const fuller = t < 0.7 ? (1 - t / 0.7) * 0.22 : 0;
      for (let c = 0; c <= cols; c++) {
        const f = c / cols;
        const x = THREE.MathUtils.lerp(a[0], b[0], f);
        let y = THREE.MathUtils.lerp(a[1], b[1], f);
        if (cols > 1) {
          const q = x / 0.55;
          y *= (1 + 0.28 * (1 - q * q)) * (1 - fuller * Math.cos(q * Math.PI * 0.5) ** 2); // crowned face with a shallow fuller
        }
        pos.push(x * w, t * BLADE_LEN, y * h);
        uv.push(f, t);
      }
    }
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * (cols + 1) + c;
        const j = i + cols + 1;
        idx.push(i, j, i + 1, i + 1, j, j + 1);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    // normals must face outwards: flip strips whose winding came out inverted
    const n = g.attributes.normal;
    const mid = Math.floor(n.count / 2);
    const nx = n.getX(mid), nz = n.getZ(mid);
    const ox = (a[0] + b[0]) / 2, oz = (a[1] + b[1]) / 2;
    if (nx * ox + nz * oz < 0) {
      g.setIndex(idx.map((_, k) => idx[k - (k % 3) + [0, 2, 1][k % 3]]));
      g.computeVertexNormals();
    }
    return g;
  });
  return geos;
}

export function createSword(envMap) {
  const group = new THREE.Group();
  const rough = brushedTexture(512, 7, 0.24, 0.16);
  rough.repeat.set(1, 6);
  const steel = new THREE.MeshPhysicalMaterial({
    color: '#d8dade', metalness: 1, roughness: 1, roughnessMap: rough,
    anisotropy: 0.75, anisotropyRotation: Math.PI / 2, envMap, envMapIntensity: 0.95,
  });
  for (const g of bladeGeometry()) group.add(new THREE.Mesh(g, steel));

  // cross-guard: blackened steel, slightly drooping quillons
  const iron = new THREE.MeshPhysicalMaterial({ color: '#2a2622', metalness: 1, roughness: 0.42, envMap, envMapIntensity: 1, clearcoat: 0.3, clearcoatRoughness: 0.5 });
  const guardGeo = new RoundedBoxGeometry(0.56, 0.045, 0.07, 3, 0.016);
  const gp = guardGeo.attributes.position;
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i);
    gp.setY(i, gp.getY(i) - Math.pow(Math.abs(x) / 0.28, 2.2) * 0.035);
    gp.setZ(i, gp.getZ(i) * (1 - Math.abs(x) * 0.6));
  }
  guardGeo.computeVertexNormals();
  const guard = new THREE.Mesh(guardGeo, iron);
  guard.position.y = -0.02;
  group.add(guard);

  // grip: tapered, leather-wrapped (bump from a diagonal wrap texture)
  const wrap = document.createElement('canvas');
  wrap.width = 64; wrap.height = 256;
  const wc = wrap.getContext('2d');
  wc.fillStyle = '#777'; wc.fillRect(0, 0, 64, 256);
  for (let y = -64; y < 320; y += 14) {
    wc.strokeStyle = '#222'; wc.lineWidth = 3;
    wc.beginPath(); wc.moveTo(0, y); wc.lineTo(64, y + 22); wc.stroke();
  }
  const wrapTex = new THREE.CanvasTexture(wrap);
  wrapTex.wrapS = wrapTex.wrapT = THREE.RepeatWrapping;
  const leather = new THREE.MeshStandardMaterial({ color: '#2b1d16', roughness: 0.78, bumpMap: wrapTex, bumpScale: 2.2, envMap, envMapIntensity: 0.4 });
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.036, 0.42, 20, 1), leather);
  grip.position.y = -0.255;
  group.add(grip);

  // pommel: lathe profile (wheel pommel)
  const prof = [];
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * Math.PI;
    prof.push(new THREE.Vector2(Math.max(0.0001, Math.sin(a) * 0.058), -Math.cos(a) * 0.045));
  }
  const pommel = new THREE.Mesh(mergeVertices(new THREE.LatheGeometry(prof, 32)), iron);
  pommel.geometry.computeVertexNormals();
  pommel.scale.set(1, 1, 0.6);
  pommel.position.y = -0.5;
  group.add(pommel);

  group.userData.length = BLADE_LEN;
  return group;
}
