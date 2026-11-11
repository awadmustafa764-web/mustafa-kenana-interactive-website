import * as THREE from 'three';
import { BaseScene } from './BaseScene.js';
import { CameraRig } from '../core/cameraRig.js';
import { COLORS } from '../config/theme.js';
import { wordMask } from './shared/textures.js';

// World 5 — a kinetic façade of everyone's identical grey slides at golden hour.
// The panels flip, right-to-left, to their ember side and write «تميّز».
const PW = 0.2, PH = 0.1125, GAP = 0.026;

function flipShader(shader) {
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nattribute float aFlip;')
    .replace(
      '#include <beginnormal_vertex>',
      `#include <beginnormal_vertex>
       float fa = aFlip * 3.14159265;
       mat3 fr = mat3(cos(fa), 0.0, -sin(fa), 0.0, 1.0, 0.0, sin(fa), 0.0, cos(fa));
       objectNormal = fr * objectNormal;`
    )
    .replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       transformed = fr * transformed;
       transformed.z += sin(fa) * 0.05;`
    );
}

export class StandoutScene extends BaseScene {
  init() {
    this.clearColor = new THREE.Color('#140e0b');
    this.frameColor = COLORS.paper;
    this.scene.fog = new THREE.Fog('#140e0b', 9, 26);
    this.rig = new CameraRig({
      fov: 40,
      parallax: 0.8,
      keys: [
        { t: 0, pos: [-4.5, -0.6, 12], look: [0, 0, 0] },
        { t: 0.32, pos: [-0.6, 0, 9.8], look: [0, 0, 0] },
        { t: 0.5, pos: [0, 0, 10.6], look: [0, 0, 0] },
        { t: 0.75, pos: [1.6, 0.2, 7.5], look: [0, 0, 0] },
        { t: 1, pos: [0, 0, 1.4], look: [0, 0, -1] },
      ],
    });

    this.scene.add(new THREE.AmbientLight('#4a3326', 0.9));
    const sun = new THREE.DirectionalLight(COLORS.brass, 5.5);
    sun.position.set(-12, 2.5, 5);   // low, raking golden-hour light
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight('#5a6b8a', 0.6);
    fill.position.set(8, -2, 6);
    this.scene.add(fill);

    // light behind the wall that pours through when it opens
    this.glowU = { uPower: { value: 0 }, uBrass: { value: COLORS.brass }, uPaper: { value: COLORS.paper } };
    this.glow = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 18),
      new THREE.ShaderMaterial({
        uniforms: this.glowU, fog: false,
        vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }",
        fragmentShader: "uniform float uPower; uniform vec3 uBrass; uniform vec3 uPaper; varying vec2 vUv; void main(){ vec2 p = (vUv - .5) * vec2(1.67, 1.); float d = length(p); vec3 c = mix(uPaper * 1.5, uPaper * .35 + uBrass * .25, smoothstep(0., .4, d)) * exp(-d * d * 5.); gl_FragColor = vec4(c * uPower, 1.); }",
      })
    );
    this.glow.position.z = -2.5;
    this.scene.add(this.glow);

    this.front = new THREE.MeshStandardMaterial({ color: '#77716a', roughness: 0.85, metalness: 0.05 });
    this.back = new THREE.MeshStandardMaterial({ color: COLORS.ember, roughness: 0.45, emissive: COLORS.ember, emissiveIntensity: 0.25 });
    this.front.onBeforeCompile = flipShader;
    this.back.onBeforeCompile = flipShader;
    this.layoutFor(window.innerWidth / window.innerHeight);
    this.ready = true;
  }

  layoutFor(aspect) {
    const portrait = aspect < 1;
    const key = portrait ? 'p' : 'l';
    if (this.layoutKey === key) return;
    this.layoutKey = key;
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.dispose();
    }
    const [cols, rows] = portrait ? [36, 58] : this.ctx.quality.facade;
    this.cols = cols;
    this.rows = rows;
    const n = cols * rows;
    const geo = new THREE.BoxGeometry(PW, PH, 0.018);
    // back face (−z, group 5) is ember; all others grey
    const mats = [this.front, this.front, this.front, this.front, this.front, this.back];
    const mesh = new THREE.InstancedMesh(geo, mats, n);
    const m = new THREE.Matrix4();
    const W = cols * (PW + GAP), H = rows * (PH + GAP);
    this.wallSize = new THREE.Vector2(W, H);
    this.cells = new Float32Array(n * 2);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        const x = -W / 2 + (c + 0.5) * (PW + GAP);
        const y = -H / 2 + (r + 0.5) * (PH + GAP);
        m.makeTranslation(x, y, 0);
        mesh.setMatrixAt(i, m);
        this.cells[i * 2] = c / (cols - 1);
        this.cells[i * 2 + 1] = r / (rows - 1);
      }
    }
    this.flip = new Float32Array(n);
    this.wake = new Float32Array(n);
    this.flipAttr = new THREE.InstancedBufferAttribute(this.flip, 1);
    this.flipAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aFlip', this.flipAttr);
    this.mask = wordMask('تميّز', cols, rows);
    mesh.frustumCulled = false;
    this.mesh = mesh;
    this.scene.add(mesh);
    // fit the wall to the view
    this.fit = portrait ? 1 : Math.max(1, 17 / W);
  }

  resize(w, h) {
    super.resize(w, h);
    this.layoutFor(w / h);
  }

  portalAnchor() { return null; }

  update(dt, time, progress, pointer) {
    const S = THREE.MathUtils.smoothstep;
    this.rig.update(dt, progress, pointer);
    const cols = this.cols, rows = this.rows, n = cols * rows;

    // cursor hit on the wall plane
    let hx = 99, hy = 99;
    if (pointer.active) {
      const cam = this.camera;
      this._v.set(pointer.ndc.x, pointer.ndc.y, 0.5).unproject(cam).sub(cam.position).normalize();
      const t = -cam.position.z / this._v.z;
      if (t > 0) {
        hx = (cam.position.x + this._v.x * t) / (this.wallSize.x * this.fit) + 0.5;
        hy = (cam.position.y + this._v.y * t) / (this.wallSize.y * this.fit) + 0.5;
      }
    }
    const write = S(progress, 0.08, 0.42);
    const ripple = S(progress, 0.45, 0.6);
    const open = S(progress, 0.9, 1.0);
    const decay = Math.pow(0.12, dt);
    const ax = this.wallSize.x / this.wallSize.y;
    for (let i = 0; i < n; i++) {
      const u = this.cells[i * 2], v = this.cells[i * 2 + 1];
      // right-to-left reveal: the right edge flips first
      const delay = (1 - u) * 0.65 + v * 0.08;
      const reveal = S(write, delay, delay + 0.3);
      let target = this.mask[i] > 0.32 ? reveal : 0;
      // idle kinetic ripple on the grey panels
      target += Math.sin(u * 9 + v * 4 - time * 1.6) * 0.035 * ripple * (1 - target);
      // cursor wake: panels turn edge-on as the cursor passes
      const dx = (u - hx) * ax, dy = v - hy;
      const near = Math.exp(-(dx * dx + dy * dy) * 160);
      this.wake[i] = Math.max(this.wake[i] * decay, near);
      target = Math.max(target, this.wake[i] * 0.42 * (1 - (this.mask[i] > 0.32 ? reveal : 0)));
      // opening: everything turns edge-on from the centre outwards, light floods through
      const dc = Math.hypot((u - 0.5) * ax, v - 0.5);
      const o = S(open * 1.6, dc, dc + 0.25);
      target = target + (0.5 - target) * o;
      this.flip[i] += (target - this.flip[i]) * Math.min(1, dt * 7);
    }
    this.flipAttr.needsUpdate = true;
    this.glowU.uPower.value = open * 1.05 + ripple * 0.04;
    this.mesh.scale.setScalar(this.fit);
  }
}
