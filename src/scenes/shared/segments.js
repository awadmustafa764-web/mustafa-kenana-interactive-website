import * as THREE from 'three';

// Each discipline as a set of rods (line segments) — a node-and-strut model,
// the way an architect's or chemist's study model is built.
// Every builder returns [[ax,ay,az,bx,by,bz], ...] centred roughly on the origin, height ≈ 3.

const seg = (a, b) => [a.x, a.y, a.z, b.x, b.y, b.z];
const V = (x, y, z) => new THREE.Vector3(x, y, z);

export function domeSegs() {
  const g = new THREE.IcosahedronGeometry(1.8, 1);
  const p = g.attributes.position;
  const key = (v) => v.toArray().map((n) => n.toFixed(3)).join(',');
  const seen = new Set();
  const out = [];
  for (let f = 0; f < p.count; f += 3) {
    for (let k = 0; k < 3; k++) {
      const a = V().fromBufferAttribute(p, f + k);
      const b = V().fromBufferAttribute(p, f + ((k + 1) % 3));
      if (a.y < -0.05 || b.y < -0.05) continue;
      const id = [key(a), key(b)].sort().join('|');
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(seg(a, b));
    }
  }
  g.dispose();
  // ring beam at the base
  for (let i = 0; i < 16; i++) {
    const a0 = (i / 16) * Math.PI * 2, a1 = ((i + 1) / 16) * Math.PI * 2;
    out.push(seg(V(Math.cos(a0) * 1.8, 0, Math.sin(a0) * 1.8), V(Math.cos(a1) * 1.8, 0, Math.sin(a1) * 1.8)));
  }
  return out.map((s) => [s[0], s[1] - 0.9, s[2], s[3], s[4] - 0.9, s[5]]);
}

export function barSegs() {
  const out = [];
  const hs = [0.7, 1.05, 0.9, 1.5, 1.35, 2.0, 2.6];
  const w = 0.32, gap = 0.52;
  hs.forEach((h, i) => {
    const x = (i - 3) * gap, y0 = -1.4;
    const c = [V(x - w / 2, 0, -w / 2), V(x + w / 2, 0, -w / 2), V(x + w / 2, 0, w / 2), V(x - w / 2, 0, w / 2)];
    for (let k = 0; k < 4; k++) {
      const a = c[k], b = c[(k + 1) % 4];
      out.push(seg(V(a.x, y0, a.z), V(b.x, y0, b.z)));
      out.push(seg(V(a.x, y0 + h, a.z), V(b.x, y0 + h, b.z)));
      out.push(seg(V(a.x, y0, a.z), V(a.x, y0 + h, a.z)));
    }
  });
  // trend line with arrow head
  const tops = hs.map((h, i) => V((i - 3) * gap, -1.4 + h + 0.35, 0));
  for (let i = 0; i < tops.length - 1; i++) out.push(seg(tops[i], tops[i + 1]));
  const tip = tops[tops.length - 1];
  out.push(seg(tip, V(tip.x - 0.25, tip.y - 0.05, 0)), seg(tip, V(tip.x - 0.08, tip.y - 0.25, 0)));
  out.push(seg(V(-1.9, -1.4, 0.4), V(1.9, -1.4, 0.4)));
  return out;
}

export function helixSegs() {
  const out = [];
  const n = 34, L = 3.4, R = 0.75, turns = 1.6;
  const pt = (i, s) => {
    const t = i / n;
    const a = t * turns * Math.PI * 2 + s;
    return V(Math.cos(a) * R, (t - 0.5) * L, Math.sin(a) * R);
  };
  for (let i = 0; i < n; i++) {
    out.push(seg(pt(i, 0), pt(i + 1, 0)));
    out.push(seg(pt(i, Math.PI), pt(i + 1, Math.PI)));
  }
  for (let i = 1; i < n; i += 2) out.push(seg(pt(i, 0), pt(i, Math.PI)));
  return out;
}

export function chipSegs() {
  const out = [];
  const S = 0.85, top = 0.12;
  const sq = (s, y) => [V(-s, y, -s), V(s, y, -s), V(s, y, s), V(-s, y, s)];
  const a = sq(S, top), b = sq(S, -top), d = sq(0.42, top + 0.06);
  for (let k = 0; k < 4; k++) {
    out.push(seg(a[k], a[(k + 1) % 4]), seg(b[k], b[(k + 1) % 4]), seg(a[k], b[k]), seg(d[k], d[(k + 1) % 4]));
  }
  for (let side = 0; side < 4; side++) {
    for (let p = 0; p < 7; p++) {
      const along = -S + 0.15 + p * ((2 * S - 0.3) / 6);
      const inner = S, outer = S + 0.28, far = S + 0.55 + (p % 3) * 0.3;
      const mk = (r, q, y = 0) => (side === 0 ? V(r, y, q) : side === 1 ? V(-r, y, q) : side === 2 ? V(q, y, r) : V(q, y, -r));
      out.push(seg(mk(inner, along), mk(outer, along)));                     // pin
      if (p % 2 === 0) {
        out.push(seg(mk(outer, along), mk(far, along)));                     // trace out
        out.push(seg(mk(far, along), mk(far, along + (p < 3 ? -0.3 : 0.3)))); // trace bend
      }
    }
  }
  // stand it up at an angle so it reads as an object, not a floor plan
  const m = new THREE.Matrix4().makeRotationX(-1.05).premultiply(new THREE.Matrix4().makeRotationY(0.5));
  return out.map((s) => {
    const p = V(s[0], s[1], s[2]).applyMatrix4(m), q = V(s[3], s[4], s[5]).applyMatrix4(m);
    return seg(p, q);
  });
}

export function bookSegs() {
  const out = [];
  const W = 1.25, H = 1.7, n = 8;
  const page = (side, lift) => (u, y) => V(side * u * W, y, Math.sin(u * Math.PI * 0.85) * 0.42 * lift + u * 0.08);
  for (const side of [-1, 1]) {
    for (const lift of [1, 0.82, 0.66]) {
      const P = page(side, lift);
      for (let i = 0; i < n; i++) {
        if (lift === 1 || i % 2 === 0) out.push(seg(P(i / n, H / 2), P((i + 1) / n, H / 2)));
        if (lift === 1) out.push(seg(P(i / n, -H / 2), P((i + 1) / n, -H / 2)));
      }
    }
    const P = page(side, 1);
    out.push(seg(P(1, -H / 2), P(1, H / 2)));
    for (let l = 0; l < 6; l++) {
      const y = H / 2 - 0.35 - l * 0.22;
      const end = l === 5 ? 0.55 : 0.88;
      out.push(seg(P(0.14, y), P(0.5, y)), seg(P(0.5, y), P(end, y)));
    }
  }
  out.push(seg(V(0, -H / 2, 0), V(0, H / 2, 0)));
  const m = new THREE.Matrix4().makeRotationX(-0.75);
  return out.map((s) => {
    const p = V(s[0], s[1], s[2]).applyMatrix4(m), q = V(s[3], s[4], s[5]).applyMatrix4(m);
    return seg(p, q);
  });
}

// Bring every form to exactly n rods: split the longest rods (collinear joints),
// or drop the shortest. Then order bottom-to-top so the snap ripples upwards.
export function normalise(segs, n) {
  const s = segs.map((x) => x.slice());
  const len = (q) => Math.hypot(q[3] - q[0], q[4] - q[1], q[5] - q[2]);
  while (s.length < n) {
    let bi = 0;
    for (let i = 1; i < s.length; i++) if (len(s[i]) > len(s[bi])) bi = i;
    const q = s[bi];
    const m = [(q[0] + q[3]) / 2, (q[1] + q[4]) / 2, (q[2] + q[5]) / 2];
    s.splice(bi, 1, [q[0], q[1], q[2], ...m], [...m, q[3], q[4], q[5]]);
  }
  while (s.length > n) {
    let si = 0;
    for (let i = 1; i < s.length; i++) if (len(s[i]) < len(s[si])) si = i;
    s.splice(si, 1);
  }
  // every form stands on the plinth: lowest point at y = 0
  let minY = Infinity;
  for (const q of s) minY = Math.min(minY, q[1], q[4]);
  for (const q of s) { q[1] -= minY; q[4] -= minY; }
  const key = (q) => (q[1] + q[4]) * 0.5 * 10 + Math.atan2((q[2] + q[5]) * 0.5, (q[0] + q[3]) * 0.5);
  return s.sort((a, b) => key(a) - key(b));
}
