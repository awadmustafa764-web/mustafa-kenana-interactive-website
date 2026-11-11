import * as THREE from 'three';

// Product-cinematography environment: black stage, a few large softboxes.
// Metals only look like metal when they have something to reflect — strips give
// long, readable highlights instead of the grey blur of a generic HDRI.
let cached = null;

export function studioEnvironment(renderer) {
  if (cached) return cached;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const panel = (w, h, color, intensity, pos, look) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide })
    );
    m.position.set(...pos);
    m.lookAt(...look);
    scene.add(m);
  };
  panel(9, 0.7, '#f4f1ea', 7, [0, 5, 1], [0, 0, 0]);          // overhead strip
  panel(0.5, 6, '#e8eef2', 4, [-6, 1, 2], [0, 0, 0]);         // cool side strip
  panel(0.35, 6, '#e8eef2', 2.5, [6, 0.5, 3], [0, 0, 0]);     // second strip
  panel(7, 2.5, '#c9a24a', 1.6, [0, 1, -7], [0, 0, 0]);       // warm rim wall
  panel(30, 30, '#16120e', 1, [0, -6, 0], [0, 0, 0]);         // dim floor bounce
  const pmrem = new THREE.PMREMGenerator(renderer);
  cached = pmrem.fromScene(scene, 0.015).texture;
  pmrem.dispose();
  scene.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
  return cached;
}

// Fine directional scratches (brushed steel / tooling marks) as a roughness map.
export function brushedTexture(size = 512, seed = 3, base = 0.32, spread = 0.18) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = Math.round(base * 255);
  ctx.fillStyle = `rgb(${g},${g},${g})`;
  ctx.fillRect(0, 0, size, size);
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < size * 6; i++) {
    const y = rnd() * size;
    const v = Math.round((base + (rnd() - 0.5) * spread) * 255);
    ctx.strokeStyle = `rgba(${v},${v},${v},${0.25 + rnd() * 0.5})`;
    ctx.lineWidth = rnd() < 0.9 ? 1 : 2;
    const x = rnd() * size;
    const len = size * (0.1 + rnd() * 0.6);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len, y + (rnd() - 0.5) * 2);
    ctx.stroke();
  }
  // a few random nicks: real metal is never perfect
  for (let i = 0; i < 40; i++) {
    const v = Math.round((base + spread) * 255);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(rnd() * size, rnd() * size, 1 + rnd() * 3, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

// Speckled, cast-concrete grain (pores + soft mottling) for bump/roughness.
export function concreteTexture(size = 256, seed = 13) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  ctx.fillStyle = "rgb(150,150,150)";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 60; i++) {
    const v = 120 + rnd() * 60;
    ctx.fillStyle = `rgba(${v},${v},${v},0.18)`;
    ctx.beginPath(); ctx.arc(rnd() * size, rnd() * size, 8 + rnd() * 30, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = 0; i < size * 10; i++) {
    const v = rnd() < 0.5 ? 60 + rnd() * 40 : 190 + rnd() * 50;
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    const r = rnd() < 0.95 ? 1 : 2;
    ctx.fillRect(rnd() * size, rnd() * size, r, r);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
