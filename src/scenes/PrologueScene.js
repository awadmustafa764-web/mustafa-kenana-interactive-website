import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { BaseScene } from './BaseScene.js';
import { CameraRig } from '../core/cameraRig.js';
import { COLORS, QUALITY, REDUCED_MOTION } from '../config/theme.js';
import { studioEnvironment } from './shared/studio.js';
import { createSword } from './shared/sword.js';
import { mulberry } from './HallScene.js';

// Prologue — the traditional slide, cast in steel, is cut in two.
// Everything is a pure function of the timeline value `t` (seconds), so the
// sequence can be fast-forwarded deterministically when the visitor scrolls.
export const DURATION = 3.1;
// additive colour that leaves destination alpha alone, so the hall still shows behind sparks
const ADD = {
  blending: THREE.CustomBlending,
  blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
};
const W = 3.2, H = 1.8, D = 0.07;
const T_IMPACT = 1.12, T_STOP_END = 1.21, T_SLOW_END = 2.2, T_CUT_END = 1.95;
const TOP = new THREE.Vector2(0.45, H / 2);
const BOTTOM = new THREE.Vector2(-0.6, -H / 2);
const S = THREE.MathUtils.smoothstep;
const clamp01 = (x) => Math.min(1, Math.max(0, x));

// physical (slow-motion) time used by the sparks
function phys(t) {
  if (t < T_IMPACT) return t;
  if (t < T_STOP_END) return T_IMPACT;
  if (t < T_SLOW_END) return T_IMPACT + (t - T_STOP_END) * 0.35;
  return T_IMPACT + (T_SLOW_END - T_STOP_END) * 0.35 + (t - T_SLOW_END);
}

// Engraved slide: a bump/roughness map of a generic presentation slide.
function engraving(kind) {
  const c = document.createElement('canvas');
  c.width = 1600; c.height = 900;
  const ctx = c.getContext('2d');
  const base = kind === 'bump' ? 200 : 92;
  const cut = kind === 'bump' ? 70 : 190;
  ctx.fillStyle = `rgb(${base},${base},${base})`;
  ctx.fillRect(0, 0, 1600, 900);
  ctx.fillStyle = ctx.strokeStyle = `rgb(${cut},${cut},${cut})`;
  ctx.lineWidth = 5;
  ctx.strokeRect(46, 46, 1508, 808);
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.font = '700 104px "Reem Kufi", sans-serif';
  ctx.fillText('عرض تقديمي', 1470, 220);
  ctx.fillRect(130, 262, 1340, 6);
  for (let i = 0; i < 4; i++) {
    const y = 370 + i * 92;
    ctx.beginPath(); ctx.arc(1450, y, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(1400 - (520 + ((i * 173) % 300)), y - 9, 520 + ((i * 173) % 300), 18);
  }
  [150, 240, 190, 300].forEach((h, i) => ctx.strokeRect(150 + i * 92, 760 - h, 62, h));
  ctx.direction = 'ltr';
  ctx.textAlign = 'left';
  ctx.font = '400 40px "IBM Plex Mono", monospace';
  ctx.fillText('01 / 24', 130, 820);
  // sparse pitting (seeded: the same plate on every visit)
  const rnd = mulberry(kind === 'bump' ? 41 : 43);
  for (let i = 0; i < 900; i++) {
    const v = base + (rnd() - 0.5) * 40;
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(rnd() * 1600, rnd() * 900, 2, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  return t;
}

const sparkVert = /* glsl */ `
  attribute vec3 aP0;
  attribute vec3 aV;
  attribute vec2 aLife;     // birth (phys time), lifetime
  attribute float aSeed;
  uniform float uPhys;
  uniform vec3 uGravity;
  uniform float uWidth;
  varying float vHeat;
  varying float vSide;
  vec3 at(float a) {
    float k = 2.2;
    return aP0 + aV * (1.0 - exp(-a * k)) / k + 0.5 * uGravity * a * a;
  }
  void main() {
    float age = uPhys - aLife.x;
    if (age < 0.0 || age > aLife.y) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
    vec4 h = modelViewMatrix * vec4(at(age), 1.0);
    vec4 t = modelViewMatrix * vec4(at(max(age - 0.018, 0.0)), 1.0);
    vec2 dir = h.xy - t.xy;
    float len = length(dir);
    dir = len > 1e-5 ? dir / len : vec2(1.0, 0.0);
    vec2 perp = vec2(-dir.y, dir.x);
    vec4 p = mix(t, h, position.x);
    float w = uWidth * (0.6 + aSeed * 0.8);
    p.xy += perp * position.y * w + dir * (position.x - 0.5) * w * 2.0;
    gl_Position = projectionMatrix * p;
    vHeat = 1.0 - age / aLife.y;
    vSide = position.y;
  }
`;
const sparkFrag = /* glsl */ `
  varying float vHeat;
  varying float vSide;
  void main() {
    float core = 1.0 - smoothstep(0.0, 1.0, abs(vSide));
    vec3 hot = vec3(1.0, 0.82, 0.58) * 7.0;
    vec3 warm = vec3(1.0, 0.38, 0.08) * 2.6;
    vec3 c = mix(warm, hot, pow(vHeat, 2.5)) * smoothstep(0.0, 0.35, vHeat) * core;
    gl_FragColor = vec4(c, 0.0);
  }
`;

export class PrologueScene extends BaseScene {
  init() {
    const env = studioEnvironment(this.ctx.renderer.gl);
    this.clearColor = new THREE.Color(0x000000);
    this.clearAlpha = 0;          // transparent where the hall should show through
    this.bloom = { strength: 0.55, threshold: 1.6 };
    this.frameColor = COLORS.paper;
    this.rig = new CameraRig({
      fov: 30,
      parallax: 0,
      damping: 1,
      keys: [
        { t: 0, pos: [3.5, 1.15, 5.9], look: [0.05, 0.5, 0] },
        { t: 0.3, pos: [3.1, 0.95, 5.3], look: [0.1, 0.42, 0] },
        { t: 0.38, pos: [2.7, 0.55, 4.4], look: [0.15, 0.12, 0] },
        { t: 0.68, pos: [2.25, 0.32, 3.95], look: [0.05, 0.0, 0] },
        { t: 1, pos: [0, 0, 3.3], look: [0, 0, 0] },
      ],
    });

    // light: one cool key, a warm rim from behind, an ember flash at the contact point
    const key = new THREE.DirectionalLight('#eef2f5', 2.2);
    key.position.set(-2, 4, 3);
    this.scene.add(key);
    this.rim = new THREE.SpotLight(COLORS.brass, 60, 14, 0.5, 0.6, 1.6);
    this.rim.position.set(-1, 2.5, -4);
    this.scene.add(this.rim, this.rim.target);
    this.flash = new THREE.PointLight('#ffb27a', 0, 3, 2);
    this.scene.add(this.flash);
    this.scene.add(new THREE.AmbientLight('#ffffff', 0.04));

    // the steel slide
    const bump = engraving('bump');
    const rough = engraving('rough');
    const plateMat = new THREE.MeshPhysicalMaterial({
      color: '#4a4e55', metalness: 0.92, roughness: 1, roughnessMap: rough,
      bumpMap: bump, bumpScale: 2.4, envMap: env, envMapIntensity: 1.1,
      clearcoat: 0.25, clearcoatRoughness: 0.35,
    });
    this.plateMat = plateMat;
    this.plate = new THREE.Mesh(new RoundedBoxGeometry(W, H, D, 3, 0.012), plateMat);
    this.scene.add(this.plate);

    // the two halves (shown from the moment the cut completes)
    const halfMat = plateMat.clone();
    for (const k of ['roughnessMap', 'bumpMap']) {
      halfMat[k] = plateMat[k].clone();
      halfMat[k].repeat.set(1 / W, 1 / H);
      halfMat[k].offset.set(0.5, 0.5);
      halfMat[k].needsUpdate = true;
    }
    const mk = (pts) => {
      const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
      const g = new THREE.ExtrudeGeometry(shape, { depth: D, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2 });
      g.translate(0, 0, -D / 2);
      const m = new THREE.Mesh(g, halfMat);
      m.visible = false;
      this.scene.add(m);
      return m;
    };
    this.halfL = mk([[-W / 2, H / 2], [TOP.x, TOP.y], [BOTTOM.x, BOTTOM.y], [-W / 2, -H / 2]]);
    this.halfR = mk([[TOP.x, TOP.y], [W / 2, H / 2], [W / 2, -H / 2], [BOTTOM.x, BOTTOM.y]]);

    // incandescent kerf along the cut
    const cutLen = TOP.distanceTo(BOTTOM);
    this.cutLen = cutLen;
    this.kerfU = { uHead: { value: 0 }, uCool: { value: 0 }, uLen: { value: cutLen } };
    const kerf = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 0.012, 64, 1).translate(0.5, 0, 0),
      new THREE.ShaderMaterial({
        uniforms: this.kerfU,
        transparent: true,
        depthWrite: false,
        ...ADD,
        vertexShader: 'varying float vS; void main(){ vS = position.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position.x * 1.0, position.y, position.z, 1.0); }',
        fragmentShader: `uniform float uHead; uniform float uCool; uniform float uLen; varying float vS;
          void main(){ float s = vS * uLen; if (s > uHead) discard;
            float heat = exp(-(uHead - s) * 1.6) * (1.0 - uCool);
            vec3 c = mix(vec3(1.0, 0.25, 0.05) * 2.0, vec3(1.0, 0.8, 0.5) * 10.0, heat * heat);
            gl_FragColor = vec4(c * heat, 0.0); }`,
      })
    );
    const dir = new THREE.Vector2().subVectors(BOTTOM, TOP);
    kerf.scale.x = cutLen;
    kerf.rotation.z = Math.atan2(dir.y, dir.x);
    kerf.position.set(TOP.x, TOP.y, D / 2 + 0.002);
    this.kerf = kerf;
    this.scene.add(kerf);

    // the sword, aligned with the cut plane
    this.sword = createSword(env);
    this.scene.add(this.sword);
    const u = new THREE.Vector3(dir.x, dir.y, 0).normalize();     // along the cut, downwards
    const v = new THREE.Vector3(0, 0, 1);                           // towards the camera
    const n = new THREE.Vector3().crossVectors(u, v).normalize();   // flat of the blade
    this.basis = { u, v, n };
    this.top3 = new THREE.Vector3(TOP.x, TOP.y, 0);

    // backdrop: black everywhere except a 16:9 window onto the hall
    this.holeU = { uHalf: { value: new THREE.Vector2(0, 0) } };
    const back = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.ShaderMaterial({
        uniforms: this.holeU,
        blending: THREE.NoBlending,
        vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
        fragmentShader: 'uniform vec2 uHalf; varying vec2 vP; void main(){ vec2 d = abs(vP) - uHalf; float inside = step(max(d.x, d.y), 0.0); gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0 - inside); }',
      })
    );
    back.position.z = -0.9;
    this.scene.add(back);

    this.buildSparks();
    this.t = 0;
    this._m = new THREE.Matrix4();
    this._a = new THREE.Vector3();
    this._x = new THREE.Vector3();
    this._z = new THREE.Vector3();
    this.ready = true;
  }

  buildSparks() {
    const n = QUALITY.tier === 'high' ? 720 : 240;
    const rnd = mulberry(23);
    const p0 = new Float32Array(n * 3), vel = new Float32Array(n * 3), life = new Float32Array(n * 2), seed = new Float32Array(n);
    const { u, v, n: nn } = this.basis;
    const tmp = new THREE.Vector3();
    const tCutPhys0 = phys(T_STOP_END), tCutPhys1 = phys(T_CUT_END);
    for (let i = 0; i < n; i++) {
      const burst = i < n * 0.55;
      let birth, s;
      if (burst) { birth = T_IMPACT + Math.pow(rnd(), 2) * 0.22; s = 0; }
      else { const f = rnd(); birth = tCutPhys0 + f * (tCutPhys1 - tCutPhys0); s = this.cutProgress(T_STOP_END + f * (T_CUT_END - T_STOP_END)); }
      const o = tmp.copy(this.top3).addScaledVector(u, s * this.cutLen);
      o.z += (rnd() - 0.5) * 0.04;
      o.toArray(p0, i * 3);
      // sprays out of both faces, mostly up and towards the camera, fanning along the blade flat
      const speed = burst ? 2.5 + rnd() * 6.5 : 1 + rnd() * 3.2;
      const dirv = new THREE.Vector3()
        .addScaledVector(v, (rnd() < 0.7 ? 1 : -1) * (0.4 + rnd()))
        .addScaledVector(u, -0.6 - rnd() * 0.8)
        .addScaledVector(nn, (rnd() - 0.5) * 2.2)
        .normalize()
        .multiplyScalar(speed);
      dirv.toArray(vel, i * 3);
      life[i * 2] = birth;
      life[i * 2 + 1] = burst ? 0.35 + rnd() * 0.9 : 0.25 + rnd() * 0.6;
      seed[i] = rnd();
    }
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0], 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    g.setAttribute('aP0', new THREE.InstancedBufferAttribute(p0, 3));
    g.setAttribute('aV', new THREE.InstancedBufferAttribute(vel, 3));
    g.setAttribute('aLife', new THREE.InstancedBufferAttribute(life, 2));
    g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 1));
    g.instanceCount = n;
    this.sparkU = { uPhys: { value: 0 }, uGravity: { value: new THREE.Vector3(0, -5.5, 0) }, uWidth: { value: 0.0045 } };
    const m = new THREE.Mesh(g, new THREE.ShaderMaterial({
      vertexShader: sparkVert, fragmentShader: sparkFrag, uniforms: this.sparkU,
      transparent: true, depthWrite: false, ...ADD,
    }));
    m.frustumCulled = false;
    this.scene.add(m);
  }

  // 0..1 along the cut line, as a function of timeline time
  cutProgress(t) {
    if (t < T_STOP_END) return 0;
    const f = clamp01((t - T_STOP_END) / (T_CUT_END - T_STOP_END));
    return 1 - Math.pow(1 - f, 2.2);
  }

  // where the blade crosses the plate (distance along u from the top edge)
  contactS(t) {
    if (t < 0.45) return -3;                                                  // off-frame, waiting
    if (t < 0.7) return -3 + S(t, 0.45, 0.7) * 2.35;                         // enters, decelerating
    if (t < 0.95) return -0.65 - S(t, 0.7, 0.95) * 0.3;                      // anticipation: draws back
    if (t < T_IMPACT) return -0.95 + Math.pow((t - 0.95) / (T_IMPACT - 0.95), 3) * 0.95; // the strike
    if (t < T_STOP_END) return 0;                                     // hit-stop
    if (t < T_CUT_END) return this.cutProgress(t) * this.cutLen;
    return this.cutLen + Math.pow((t - T_CUT_END) / 0.6, 2) * 3;      // follow-through
  }

  setTime(t) { this.t = t; }

  update(dt) {
    const t = this.t;
    const { u, v } = this.basis;
    this.rig.update(dt, t / DURATION, null);

    // camera shake on impact (skipped for reduced motion)
    if (!REDUCED_MOTION && t > T_IMPACT) {
      const k = Math.exp(-(t - T_IMPACT) * 7) * 0.035;
      this.camera.position.x += Math.sin(t * 91) * k;
      this.camera.position.y += Math.cos(t * 77) * k;
    }

    // sword pose: blade lies in the cut plane, edge leading, tilted into the plate
    const tilt = t < T_IMPACT ? 0.55 : t < T_CUT_END ? 0.4 : 0.3;
    // glancing slash: the blade plane is rolled ~65° about the cut line so the sword reads in profile
    const axis = this._a.copy(v).multiplyScalar(-0.42).addScaledVector(this.basis.n, 0.9).addScaledVector(u, tilt).normalize();
    const edge = this._x.copy(u).addScaledVector(axis, -u.dot(axis)).normalize();
    const side = this._z.crossVectors(edge, axis);
    this._m.makeBasis(edge, axis, side);
    this.sword.quaternion.setFromRotationMatrix(this._m);
    this.sword.position.copy(this.top3).addScaledVector(u, this.contactS(t)).addScaledVector(axis, -1.35);
    this.sword.visible = t > 0.4 && t < T_CUT_END + 0.7;

    // impact flash
    const sinceHit = t - T_IMPACT;
    this.flash.position.copy(this.top3).addScaledVector(u, this.cutProgress(t) * this.cutLen).addScaledVector(v, 0.25);
    this.flash.intensity = sinceHit < 0 ? 0 : 7 * Math.exp(-sinceHit * 8) + (t < T_CUT_END ? 0.8 : 0);

    // reveal: the strip light slides onto the steel
    const reveal = S(t, 0.05, 0.75);
    this.plateMat.envMapIntensity = 0.15 + reveal * 1.0;
    this.rim.intensity = 60 * S(t, 0.2, 0.9);

    // kerf heat
    this.kerfU.uHead.value = this.cutProgress(t) * this.cutLen;
    this.kerfU.uCool.value = S(t, T_CUT_END, T_CUT_END + 0.5);
    this.kerf.visible = t > T_STOP_END && t < 2.6;

    // the cut slide parts; the window behind opens onto the hall
    const split = t >= T_CUT_END;
    this.plate.visible = !split;
    this.halfL.visible = this.halfR.visible = split;
    if (split) {
      const k = S(t, T_CUT_END, 2.75);
      this.halfL.position.set(-0.95 * k, -1.9 * k * k, 0.7 * k);
      this.halfL.rotation.set(-0.3 * k, -0.5 * k, 0.45 * k);
      this.halfR.position.set(1.05 * k, -2.1 * k * k, 0.55 * k);
      this.halfR.rotation.set(-0.25 * k, 0.55 * k, -0.5 * k);
      this.kerf.position.z = D / 2 + 0.002 + k;  // drift away with the halves, then fade
    }
    const open = S(t, T_CUT_END, 2.45);
    const grow = 1 + Math.pow(S(t, 2.35, DURATION), 2) * 14;
    this.holeU.uHalf.value.set((W / 2) * open * grow, (H / 2) * open * grow);

    this.sparkU.uPhys.value = phys(t);
  }

  get hallPower() { return S(this.t, 2.0, 2.6); }
}
