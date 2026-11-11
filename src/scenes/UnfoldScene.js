import * as THREE from 'three';
import { BaseScene } from './BaseScene.js';
import { CameraRig } from '../core/cameraRig.js';
import { COLORS } from '../config/theme.js';

// World 2 — the flat ember slide breaks into tiles that rise into a living data landscape.
const vert = /* glsl */ `
  attribute vec2 aGrid;       // 0..1 across the slide
  attribute float aRand;
  uniform float uTime;
  uniform float uRise;        // 0 flat slide -> 1 landscape
  uniform float uChart;       // 0 waves -> 1 bar chart
  uniform float uSurface;     // 0 -> 1 smooth surface plot
  uniform vec3 uMouse;        // xz hit, z = strength
  uniform vec2 uSize;
  varying float vH;
  varying vec3 vN;
  varying float vTop;
  varying float vDepth;
  varying float vLens;

  float bars(vec2 g) {
    float col = floor(g.x * 9.0);
    float v = fract(sin(col * 12.9898 + 4.1) * 43758.5453);
    float row = abs(g.y - 0.5) < 0.32 ? 1.0 : 0.0;
    float edge = step(0.12, fract(g.x * 9.0)) * step(fract(g.x * 9.0), 0.88);
    return (0.4 + v * 1.9 + col * 0.05) * row * edge;
  }

  void main() {
    vec2 g = aGrid;
    float t = uTime;
    float waves = 0.55 + 0.45 * sin(g.x * 9.0 + t * 0.9) * cos(g.y * 7.0 - t * 0.6)
                + 0.3 * sin(length(g - 0.5) * 18.0 - t * 1.4);
    float surf = 1.3 * exp(-pow(length((g - vec2(0.62, 0.45)) * vec2(1.6, 2.2)), 2.0) * 3.0)
               + 0.7 * exp(-pow(length((g - vec2(0.25, 0.65)) * vec2(2.4, 2.4)), 2.0) * 3.0)
               + 0.12 * sin(g.x * 20.0 + t);
    float h = mix(waves, bars(g), uChart);
    h = mix(h, surf * 1.4, uSurface);
    // staggered rise from the centre outwards
    float d = length(g - 0.5);
    float rise = smoothstep(d * 0.9, d * 0.9 + 0.35, uRise);
    h = 0.03 + max(h, 0.0) * rise;
    // cursor lens
    vec2 wp = (g - 0.5) * uSize;
    float lens = exp(-dot(wp - uMouse.xy, wp - uMouse.xy) * 1.6) * uMouse.z;
    h += lens * 1.4;
    vLens = lens;
    vH = h;

    vec3 p = position;
    vTop = step(0.5, normal.y);
    p.y = (p.y + 0.5) * h;
    vN = normal;
    vec4 mv = modelViewMatrix * instanceMatrix * vec4(p, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const frag = /* glsl */ `
  uniform vec3 uInk;
  uniform vec3 uEmber;
  uniform vec3 uPaper;
  uniform float uRise;
  uniform vec3 uLightDir;
  varying float vH;
  varying vec3 vN;
  varying float vTop;
  varying float vDepth;
  varying float vLens;
  void main() {
    vec3 n = normalize(vN);
    float diff = max(dot(n, normalize(uLightDir)), 0.0);
    float hn = clamp(vH / 2.4, 0.0, 1.0);
    // flat: the whole slide is ember. risen: ember only on the peaks.
    vec3 topCol = mix(uEmber, mix(uInk * 2.5, uEmber, smoothstep(0.35, 0.8, hn)), smoothstep(0.0, 0.5, uRise));
    topCol = mix(topCol, uPaper, smoothstep(0.85, 1.0, hn) * 0.7 + vLens * 0.5);
    vec3 side = uInk * 1.6 + uEmber * hn * 0.25;
    vec3 c = mix(side, topCol, vTop);
    c *= 0.35 + diff * 0.9;
    c += uEmber * vLens * 0.25;
    float fog = smoothstep(9.0, 26.0, vDepth);
    gl_FragColor = vec4(mix(c, uInk * 0.6, fog), 1.0);
  }
`;

export class UnfoldScene extends BaseScene {
  init() {
    const [nx, nz] = this.ctx.quality.tiles;
    this.clearColor = COLORS.ink.clone().multiplyScalar(0.6);
    this.frameColor = COLORS.paper;
    const size = new THREE.Vector2(11.2, 6.3);
    this.size = size;
    const cell = size.x / nx;
    this.rig = new CameraRig({
      fov: 42,
      parallax: 0.7,
      keys: [
        { t: 0, pos: [0, 9.2, 0.01], look: [0, 0, 0] },
        { t: 0.25, pos: [0, 8, 3.5], look: [0, 0, 0] },
        { t: 0.55, pos: [-5.5, 4, 6.5], look: [0.4, 0.6, 0] },
        { t: 0.8, pos: [-7, 2.2, 3], look: [1, 0.9, -0.4] },
        { t: 1, pos: [-3.4, 2.4, 1.6], look: [1.3, 1.4, -0.6] },
      ],
    });

    const geo = new THREE.BoxGeometry(cell * 0.86, 1, (size.y / nz) * 0.86);
    const count = nx * nz;
    const grid = new Float32Array(count * 2);
    const rand = new Float32Array(count);
    this.uniforms = {
      uTime: { value: 0 },
      uRise: { value: 0 },
      uChart: { value: 0 },
      uSurface: { value: 0 },
      uMouse: { value: new THREE.Vector3(0, 0, 0) },
      uSize: { value: size },
      uInk: { value: COLORS.ink },
      uEmber: { value: COLORS.ember },
      uPaper: { value: COLORS.paper },
      uLightDir: { value: new THREE.Vector3(-0.6, 0.9, 0.35) },
    };
    const mat = new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms: this.uniforms });
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    const m = new THREE.Matrix4();
    let i = 0;
    for (let z = 0; z < nz; z++) {
      for (let x = 0; x < nx; x++) {
        const gx = (x + 0.5) / nx, gz = (z + 0.5) / nz;
        m.makeTranslation((gx - 0.5) * size.x, 0, (gz - 0.5) * size.y);
        mesh.setMatrixAt(i, m);
        grid[i * 2] = gx;
        grid[i * 2 + 1] = gz;
        rand[i] = Math.random();
        i++;
      }
    }
    geo.setAttribute('aGrid', new THREE.InstancedBufferAttribute(grid, 2));
    geo.setAttribute('aRand', new THREE.InstancedBufferAttribute(rand, 1));
    mesh.frustumCulled = false;
    this.scene.add(mesh);
    this.mesh = mesh;

    // editorial axis ticks around the chart
    const pts = [];
    const hx = size.x / 2 + 0.25, hz = size.y / 2 + 0.25;
    for (let k = 0; k <= 16; k++) {
      const x = -hx + (k / 16) * hx * 2;
      pts.push(x, 0, hz, x, 0, hz + (k % 4 ? 0.12 : 0.3));
    }
    for (let k = 0; k <= 9; k++) {
      const z = -hz + (k / 9) * hz * 2;
      pts.push(-hx, 0, z, -hx - (k % 3 ? 0.12 : 0.3), 0, z);
    }
    pts.push(-hx, 0, hz, hx, 0, hz, -hx, 0, hz, -hx, 0, -hz, -hx, 0, -hz, -hx, 3.2, -hz);
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.axisMat = new THREE.LineBasicMaterial({ color: COLORS.paper, transparent: true, opacity: 0 });
    this.scene.add(new THREE.LineSegments(lg, this.axisMat));

    this.raycaster = new THREE.Raycaster();
    this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.6);
    this.hit = new THREE.Vector3();
    this.lens = new THREE.Vector3();
    this.anchor = new THREE.Vector3(1.3, 1.4, -0.6);
    this.ready = true;
  }

  portalAnchor() { return this.anchor; }

  update(dt, time, progress, pointer) {
    const S = THREE.MathUtils.smoothstep;
    this.rig.update(dt, progress, pointer);
    const u = this.uniforms;
    u.uTime.value = time;
    u.uRise.value = S(progress, 0.05, 0.4) * 1.4;
    u.uChart.value = S(progress, 0.42, 0.55) * (1 - S(progress, 0.7, 0.82));
    u.uSurface.value = S(progress, 0.7, 0.85);
    this.axisMat.opacity = S(progress, 0.3, 0.5) * 0.35;

    // cursor lens on the landscape
    let strength = 0;
    if (pointer.active && progress > 0.05) {
      this.raycaster.setFromCamera(pointer.ndc, this.camera);
      if (this.raycaster.ray.intersectPlane(this.plane, this.hit)) {
        strength = 1;
        this.lens.x += (this.hit.x - this.lens.x) * 0.2;
        this.lens.y += (this.hit.z - this.lens.y) * 0.2;
      }
    }
    this.lens.z += (strength - this.lens.z) * 0.08;
    u.uMouse.value.copy(this.lens);
  }
}
