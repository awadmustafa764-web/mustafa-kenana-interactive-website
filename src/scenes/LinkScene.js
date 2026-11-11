import * as THREE from 'three';
import { BaseScene } from './BaseScene.js';
import { CameraRig } from '../core/cameraRig.js';
import { COLORS } from '../config/theme.js';
import { siteTexture } from './shared/textures.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { studioEnvironment } from './shared/studio.js';

// World 4 — inverted paper gallery. One vermilion thread pierces every screen.
const THREAD_LEN = 70;
const SEG = 480;
const PLUCKS = 6;
const DEVICE_S = [4, 11, 18, 25];

const threadVert = /* glsl */ `
  uniform vec4 uPlucks[${PLUCKS}];  // x: s position, y: amplitude, z: age, w: dir angle
  uniform float uTime;
  uniform float uLen;
  varying float vS;
  void main() {
    vec3 p = position;
    float s = p.y;                 // along the thread
    vS = s;
    vec2 off = vec2(0.0);
    for (int i = 0; i < ${PLUCKS}; i++) {
      vec4 k = uPlucks[i];
      if (k.y <= 0.0) continue;
      float dist = abs(s - k.x);
      float front = k.z * 9.0;     // wave speed
      float env = (1.0 - smoothstep(front - 2.5, front + 0.5, dist)) * exp(-k.z * 1.4);
      float w = sin(dist * 2.2 - k.z * 22.0) * env * k.y;
      off += vec2(cos(k.w), sin(k.w)) * w;
    }
    // ends are pinned
    float pin = (1.0 - smoothstep(uLen * 0.5 - 4.0, uLen * 0.5, abs(s)));
    off *= pin;
    off += vec2(sin(s * 0.35 + uTime * 0.8), cos(s * 0.27 + uTime * 0.6)) * 0.015;
    p.x += off.x;
    p.z += off.y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;
const threadFrag = /* glsl */ `
  uniform vec3 uColor;
  uniform float uDraw;   // how much of the thread exists (0..1)
  uniform float uLen;
  varying float vS;
  void main() {
    float t = (vS / uLen) + 0.5;
    if (t > uDraw) discard;
    gl_FragColor = vec4(uColor, 1.0);
  }
`;

const screenVert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const screenFrag = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uAspect;   // screen w/h
  uniform float uScroll;
  uniform float uOn;
  varying vec2 vUv;
  void main() {
    // cover-fit the 1024-wide site onto any screen ratio, then scroll it
    vec2 uv = vUv;
    float texAspect = 1024.0 / 2304.0;
    uv.y = 1.0 - (1.0 - uv.y) * (texAspect / uAspect);
    uv.y = fract(uv.y - uScroll);
    vec3 c = texture2D(uMap, uv).rgb;
    vec3 off = vec3(0.04, 0.04, 0.045);
    gl_FragColor = vec4(mix(off, c, uOn), 1.0);
  }
`;

export class LinkScene extends BaseScene {
  init() {
    this.clearColor = COLORS.paper.clone();
    this.frameColor = COLORS.ink;
    this.scene.fog = new THREE.Fog(COLORS.paper, 14, 34);

    this.rig = new CameraRig({ fov: 42, parallax: 0.8, keys: [{ t: 0, pos: [0, 0, 10], look: [0, 0, 0] }, { t: 1, pos: [0, 0, 10], look: [0, 0, 0] }] });
    this.rig.portraitBoost = 1;

    this.scene.add(new THREE.HemisphereLight('#fffaf0', '#b7ae9e', 1.6));
    const key = new THREE.DirectionalLight('#fff4e2', 2.2);
    key.position.set(-6, 10, 8);
    this.scene.add(key);

    // the thread
    this.threadU = {
      uPlucks: { value: Array.from({ length: PLUCKS }, () => new THREE.Vector4(0, 0, 99, 0)) },
      uTime: { value: 0 },
      uLen: { value: THREAD_LEN },
      uColor: { value: COLORS.ember.clone().multiplyScalar(0.9) },
      uDraw: { value: 0 },
    };
    const tg = new THREE.CylinderGeometry(0.018, 0.018, THREAD_LEN, 6, SEG, true);
    this.thread = new THREE.Mesh(tg, new THREE.ShaderMaterial({ vertexShader: threadVert, fragmentShader: threadFrag, uniforms: this.threadU }));
    this.thread.frustumCulled = false;
    this.threadPivot = new THREE.Group();
    this.threadPivot.add(this.thread);
    this.scene.add(this.threadPivot);
    this.pluckI = 0;
    this.pluckCooldown = 0;

    // devices: projector screen, laptop, tablet, phone — same site on each
    const tex = siteTexture();
    // anodised dark aluminium, reflecting the same studio as the prologue steel
    const bodyMat = new THREE.MeshStandardMaterial({ color: '#1c1d20', roughness: 0.38, metalness: 0.85, envMap: studioEnvironment(this.ctx.renderer.gl), envMapIntensity: 0.6 });
    const specs = [
      { w: 4.8, h: 2.7, bezel: 0.08, depth: 0.05, kind: 'projector' },
      { w: 2.6, h: 1.62, bezel: 0.07, depth: 0.06, kind: 'laptop' },
      { w: 1.5, h: 2.0, bezel: 0.09, depth: 0.06, kind: 'tablet' },
      { w: 0.72, h: 1.5, bezel: 0.06, depth: 0.07, kind: 'phone' },
    ];
    this.devices = specs.map((sp, i) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new RoundedBoxGeometry(sp.w + sp.bezel * 2, sp.h + sp.bezel * 2, sp.depth, 3, Math.min(sp.depth / 2 - 0.002, sp.kind === 'phone' ? 0.03 : 0.02)), bodyMat);
      g.add(body);
      const su = { uMap: { value: tex }, uAspect: { value: sp.w / sp.h }, uScroll: { value: 0 }, uOn: { value: 0 } };
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(sp.w, sp.h), new THREE.ShaderMaterial({ vertexShader: screenVert, fragmentShader: screenFrag, uniforms: su }));
      screen.position.z = sp.depth / 2 + 0.002;
      g.add(screen);
      if (sp.kind === 'laptop') {
        const base = new THREE.Mesh(new RoundedBoxGeometry(sp.w + 0.3, 0.05, 1.7, 3, 0.02), bodyMat);
        base.position.set(0, -sp.h / 2 - sp.bezel, 0.85);
        base.rotation.x = 0.0;
        g.add(base);
      }
      if (sp.kind === 'projector') {
        // projection screen hangs from a rod
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, sp.w + 0.6, 8), bodyMat);
        rod.rotation.z = Math.PI / 2;
        rod.position.y = sp.h / 2 + 0.16;
        g.add(rod);
      }
      this.scene.add(g);
      return { g, su, sp, s: DEVICE_S[i] };
    });

    // the flash drive, then the presentation file — both fall away
    const drive = new THREE.Group();
    const dBody = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.12), bodyMat);
    const dPlug = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.2, 0.08), new THREE.MeshStandardMaterial({ color: '#a7a7a7', metalness: 0.9, roughness: 0.25 }));
    dPlug.position.x = 0.6;
    drive.add(dBody, dPlug);
    this.drive = drive;
    this.scene.add(drive);

    const fileShape = new THREE.Shape();
    fileShape.moveTo(-0.5, -0.65); fileShape.lineTo(0.5, -0.65); fileShape.lineTo(0.5, 0.4);
    fileShape.lineTo(0.25, 0.65); fileShape.lineTo(-0.5, 0.65); fileShape.lineTo(-0.5, -0.65);
    this.file = new THREE.Mesh(new THREE.ShapeGeometry(fileShape), new THREE.MeshStandardMaterial({ color: '#d6d0c4', roughness: 0.9, side: THREE.DoubleSide }));
    this.scene.add(this.file);

    // drafting grid on the floor of the gallery
    const pts = [];
    for (let k = -30; k <= 30; k++) { pts.push(k, 0, -40, k, 0, 40); }
    for (let k = -40; k <= 40; k++) { pts.push(-30, 0, k, 30, 0, k); }
    const gg = new THREE.BufferGeometry();
    gg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.grid = new THREE.LineSegments(gg, new THREE.LineBasicMaterial({ color: COLORS.ink, transparent: true, opacity: 0.1, fog: true }));
    this.scene.add(this.grid);

    this.dir = new THREE.Vector3();
    this.origin = new THREE.Vector3();
    this.side = new THREE.Vector3();
    this.up = new THREE.Vector3();
    this._a = new THREE.Vector3();
    this._b = new THREE.Vector3();
    this._c = new THREE.Vector3();
    this._d = new THREE.Vector3();
    this.raycaster = new THREE.Raycaster();
    this.labelPos = DEVICE_S.map(() => new THREE.Vector3());
    this.portrait = null;
    this.layout(false);
    this.ready = true;
  }

  // point on the thread at arc-length s
  at(s, out) { return out.copy(this.origin).addScaledVector(this.dir, s); }

  layout(portrait) {
    if (this.portrait === portrait) return;
    this.portrait = portrait;
    if (portrait) this.dir.set(0.12, -1, -0.32).normalize();
    else this.dir.set(-0.42, 0.06, -1).normalize();
    this.origin.set(0, portrait ? 6 : 0, 0);
    this.side.crossVectors(this.dir, new THREE.Vector3(0, 1, 0)).normalize();
    if (portrait) this.side.set(1, 0, 0);
    this.up.crossVectors(this.side, this.dir).normalize();

    // thread: cylinder axis is local Y → align with dir, centred at s = THREAD_LEN/2 - 10
    const centre = THREAD_LEN / 2 - 10;
    this.threadCentre = centre;
    this.threadPivot.position.copy(this.at(centre, this._a));
    this.threadPivot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), this.dir);

    // camera follows the thread from beside it
    const off = portrait ? new THREE.Vector3(0, 0.0, 8.5) : this.side.clone().multiplyScalar(-7.6).add(new THREE.Vector3(0, 1.9, 5.2));

    const tilt = portrait ? [0.25, -0.35, 0.3, -0.2] : [0.35, -0.3, 0.45, -0.35];
    this.devices.forEach((d, i) => {
      this.at(d.s, d.g.position);
      // screens face the approaching camera, each at its own surreal angle
      d.g.lookAt(this.at(d.s - 5, this._b).add(off));
      d.g.rotateY(tilt[i]);
      d.g.rotateZ(portrait ? 0 : (i % 2 ? 0.12 : -0.08));
    });
    this.grid.position.y = portrait ? -12 : -3.2;
    const keys = [];
    const path = [-6, -1, 2, 9, 16, 23, 26.2];
    const ts = [0, 0.12, 0.3, 0.5, 0.68, 0.86, 1];
    path.forEach((s, k) => {
      const last = k === path.length - 1;
      const pos = this.at(s, new THREE.Vector3()).add(last ? off.clone().multiplyScalar(0.35) : off);
      const look = this.at(last ? 25 : s + 3.5, new THREE.Vector3());
      keys.push({ t: ts[k], pos: pos.toArray(), look: look.toArray() });
    });
    this.rig.keys = keys.map((k) => ({ t: k.t, pos: new THREE.Vector3(...k.pos), look: new THREE.Vector3(...k.look), fov: 42 }));
    this.rig.snap = true;
  }

  resize(w, h) {
    this.rig.camera.aspect = w / h;
    this.rig.fovBoost = w < h ? 14 : 0;
    // landscape: frame the thread in the left 2/3 so the editorial type owns the right column
    if (w >= h) this.rig.camera.setViewOffset(w, h, w * 0.26, 0, w, h);
    else this.rig.camera.clearViewOffset();
    this.rig.camera.updateProjectionMatrix();
    this.layout(w < h);
  }

  portalAnchor() { return this.devices[3].g.position; }

  pluck(s, amp, ang) {
    const p = this.threadU.uPlucks.value[this.pluckI];
    p.set(s, amp, 0, ang);
    this.pluckI = (this.pluckI + 1) % PLUCKS;
  }

  // screen-space position of each device label (for the DOM labels)
  labels() {
    return this.devices.map((d, i) => {
      this._c.copy(d.g.position).addScaledVector(this.up, d.sp.h / 2 + 0.35).project(this.camera);
      return this.labelPos[i].set(this._c.x, this._c.y, this._c.z);
    });
  }

  update(dt, time, progress, pointer, scrollVel = 0) {
    const S = THREE.MathUtils.smoothstep;
    this.rig.update(dt, progress, pointer);
    const tu = this.threadU;
    tu.uTime.value = time;
    tu.uDraw.value = S(progress, 0.2, 0.42);
    for (const p of tu.uPlucks.value) p.z += dt;

    // devices light up as the thread reaches them
    this.devices.forEach((d, i) => {
      d.su.uOn.value = S(tu.uDraw.value, (d.s + 10) / THREAD_LEN - 0.02, (d.s + 10) / THREAD_LEN + 0.04);
      d.su.uScroll.value = time * 0.02 + i * 0.13;
    });

    // drive falls (0.1–0.3), file drifts away (0.2–0.4)
    const drop = S(progress, 0.08, 0.3);
    this.at(-1, this.drive.position).addScaledVector(this.up, 0.6 - drop * 9).addScaledVector(this.side, 0.5);
    this.drive.rotation.set(drop * 2.4 + 0.3, time * 0.3 + drop * 3, 0.4 + drop * 1.5);
    const fly = S(progress, 0.3, 0.44);
    this.at(1.2, this.file.position).addScaledVector(this.up, 0.3 + fly * 5).addScaledVector(this.side, 0.9 + fly * 7);
    this.file.rotation.set(0.2 + fly * 2, -0.4 + fly * 3 + Math.sin(time) * 0.05, fly * 1.5);
    this.file.scale.setScalar(Math.max(0.001, S(progress, 0.12, 0.22)));
    this.file.visible = progress > 0.12 && progress < 0.46;

    // pluck: pointer crossing the thread
    this.pluckCooldown -= dt;
    const pv = pointer.velocity.length();
    if (pointer.active && tu.uDraw.value > 0.1 && this.pluckCooldown <= 0 && pv > 0.3) {
      this.raycaster.setFromCamera(pointer.ndc, this.camera);
      const ray = this.raycaster.ray;
      const a = this.at(-10, this._a);
      const b = this.at(THREAD_LEN - 10, this._b);
      const closest = this._d;
      const dist = Math.sqrt(ray.distanceSqToSegment(a, b, null, closest));
      const camDist = closest.distanceTo(this.camera.position);
      if (dist < 0.05 * camDist) {
        const s = closest.sub(this.origin).dot(this.dir) - this.threadCentre;
        this.pluck(s, Math.min(0.28, 0.05 + pv * 0.04), Math.random() * Math.PI * 2);
        this.pluckCooldown = 0.12;
      }
    }
    // scrolling hard makes the whole thread hum
    if (Math.abs(scrollVel) > 35 && this.pluckCooldown <= 0 && tu.uDraw.value > 0.5) {
      this.pluck((Math.random() - 0.5) * 30, 0.06, Math.random() * 6.28);
      this.pluckCooldown = 0.4;
    }
  }
}
