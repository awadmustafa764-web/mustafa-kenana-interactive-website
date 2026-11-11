import * as THREE from 'three';
import { BaseScene } from './BaseScene.js';
import { CameraRig } from '../core/cameraRig.js';
import { slideAtlas, emberSlide } from './shared/textures.js';
import { COLORS } from '../config/theme.js';

// World 1 — the archive of identical slides. Fluorescent, cold, endless.
const LENGTH = 124;
const FOG = new THREE.Color('#0c0f11');

const vert = /* glsl */ `
  attribute vec2 aCell;      // atlas cell
  attribute vec3 aSeed;      // x: phase, y: flicker class, z: side
  uniform float uTime;
  uniform float uPower;
  uniform vec2 uPointer;
  varying vec2 vUv;
  varying float vDepth;
  varying float vLight;
  void main() {
    vUv = (uv + aCell) / vec2(3.0, 2.0);
    vec3 p = position;
    // slides breathe and lean away from the cursor side
    float lean = sin(uTime * 0.6 + aSeed.x * 6.28) * 0.04 - uPointer.x * aSeed.z * 0.12;
    float c = cos(lean), s = sin(lean);
    p.xz = mat2(c, -s, s, c) * p.xz;
    vec4 mv = modelViewMatrix * instanceMatrix * vec4(p, 1.0);
    vDepth = -mv.z;
    // fluorescent flicker: a few tubes misbehave
    float f = 1.0;
    if (aSeed.y > 0.9) f = step(0.25, fract(sin(floor(uTime * 9.0 + aSeed.x * 40.0)) * 4375.85)) * 0.6 + 0.4;
    vLight = f * uPower;
    gl_Position = projectionMatrix * mv;
  }
`;
const frag = /* glsl */ `
  uniform sampler2D uAtlas;
  uniform vec3 uFog;
  uniform float uFogDensity;
  varying vec2 vUv;
  varying float vDepth;
  varying float vLight;
  void main() {
    vec3 c = texture2D(uAtlas, vUv).rgb;
    c *= vec3(0.5, 0.56, 0.57) * vLight;     // cold, tired cast
    float fog = 1.0 - exp(-pow(vDepth * uFogDensity, 1.6));
    gl_FragColor = vec4(mix(c, uFog, fog), 1.0);
  }
`;

export class HallScene extends BaseScene {
  init() {
    const q = this.ctx.quality;
    this.clearColor = FOG.clone();
    this.frameColor = new THREE.Color('#ece6da');
    this.rig = new CameraRig({
      fov: 50,
      parallax: 0.9,
      keys: [
        { t: 0, pos: [0, 0, 9], look: [0, 0, 0] },
        { t: 0.3, pos: [0.4, 0.25, -28], look: [-0.2, 0, -50] },
        { t: 0.62, pos: [-0.5, -0.15, -70], look: [0.2, 0.1, -95] },
        { t: 0.9, pos: [0, 0, -112], look: [0, 0, -LENGTH] },
        { t: 1, pos: [0, 0, -LENGTH + 2.2], look: [0, 0, -LENGTH] },
      ],
    });

    this.uniforms = {
      uAtlas: { value: slideAtlas() },
      uTime: { value: 0 },
      uPower: { value: 0 },
      uPointer: { value: new THREE.Vector2() },
      uFog: { value: FOG.clone() },
      uFogDensity: { value: 0.035 },
    };
    const mat = new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms: this.uniforms, side: THREE.DoubleSide });

    // corridor: walls, ceiling, floor tiled with slides + loose slides hanging in the air
    const W = 1.6, H = 0.9;
    const geo = new THREE.PlaneGeometry(W, H);
    const step = q.tier === 'high' ? 1.25 : 1.7;
    const transforms = [];
    const dummy = new THREE.Object3D();
    const rnd = mulberry(7);
    const push = (x, y, z, rx, ry, rz, side) => {
      dummy.position.set(x, y, z);
      dummy.rotation.set(rx, ry, rz);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      transforms.push({ m: dummy.matrix.clone(), side });
    };
    for (let z = 6; z > -LENGTH + 4; z -= step) {
      for (let k = -2; k <= 2; k++) {
        const j = () => (rnd() - 0.5) * 0.12;
        push(-3.6, k * 1.05, z + j() * 4, j(), Math.PI / 2 + j(), j(), -1);  // left wall
        push(3.6, k * 1.05, z + j() * 4, j(), -Math.PI / 2 + j(), j(), 1);   // right wall
      }
      for (let k = -1; k <= 1; k++) {
        const j = () => (rnd() - 0.5) * 0.12;
        push(k * 1.75, 2.75, z + j() * 4, Math.PI / 2 + j(), 0, j(), 0);    // ceiling
        push(k * 1.75, -2.75, z + j() * 4, -Math.PI / 2 + j(), 0, j(), 0);  // floor
      }
      if (rnd() > 0.35) {
        // hanging slides: never on the camera axis
        const ang = rnd() * Math.PI * 2;
        const rad = 1.35 + rnd() * 1.2;
        push(Math.cos(ang) * rad, Math.sin(ang) * rad * 0.8, z - rnd(), (rnd() - 0.5) * 0.5, (rnd() - 0.5) * 0.9, (rnd() - 0.5) * 0.3, Math.sign(Math.cos(ang)));
      }
    }
    const count = transforms.length;
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    const cell = new Float32Array(count * 2);
    const seed = new Float32Array(count * 3);
    transforms.forEach((t, i) => {
      mesh.setMatrixAt(i, t.m);
      const c = Math.floor(rnd() * 6);
      cell[i * 2] = c % 3;
      cell[i * 2 + 1] = 1 - Math.floor(c / 3);
      seed[i * 3] = rnd();
      seed[i * 3 + 1] = rnd();
      seed[i * 3 + 2] = t.side;
    });
    geo.setAttribute('aCell', new THREE.InstancedBufferAttribute(cell, 2));
    geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 3));
    mesh.frustumCulled = false;
    this.scene.add(mesh);

    // fluorescent tubes along the ceiling
    const tubeGeo = new THREE.BoxGeometry(0.06, 0.03, 2.4);
    this.tubeMat = new THREE.MeshBasicMaterial({ color: COLORS.fluoro.clone().multiplyScalar(1.6), fog: true });
    const tubes = new THREE.InstancedMesh(tubeGeo, this.tubeMat, Math.ceil(LENGTH / 6) * 2);
    let ti = 0;
    for (let z = 2; z > -LENGTH + 4 && ti < tubes.count; z -= 6) {
      for (const x of [-0.9, 0.9]) {
        dummy.position.set(x, 2.6, z);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        tubes.setMatrixAt(ti++, dummy.matrix);
      }
    }
    tubes.count = ti;
    this.scene.add(tubes);
    this.scene.fog = new THREE.FogExp2(FOG, 0.05);

    // the one ember slide at the end of the corridor
    this.ember = new THREE.Mesh(
      new THREE.PlaneGeometry(W, H),
      new THREE.MeshBasicMaterial({ map: emberSlide(), fog: false, toneMapped: false })
    );
    this.ember.position.set(0, 0, -LENGTH);
    this.scene.add(this.ember);
    this.emberGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(W * 3.2, H * 3.2),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uColor: { value: COLORS.ember.clone() }, uStrength: { value: 0 } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
        fragmentShader: 'uniform vec3 uColor; uniform float uStrength; varying vec2 vUv; void main(){ float d = length((vUv-.5)*vec2(1.,.56)); gl_FragColor = vec4(uColor * pow(max(0.,1.-d*2.2),3.) * uStrength, 1.); }',
      })
    );
    this.emberGlow.position.set(0, 0, -LENGTH - 0.05);
    this.scene.add(this.emberGlow);

    this.power = 0;      // driven by the intro
    this.ready = true;
  }

  setPower(v) { this.power = v; }

  portalAnchor() { return this.ember.position; }

  update(dt, time, progress, pointer) {
    this.rig.update(dt, progress, pointer);
    const u = this.uniforms;
    u.uTime.value = time;
    u.uPower.value = this.power;
    u.uPointer.value.copy(pointer.smooth);
    // fog thins as we approach the end so the ember slide reads
    u.uFogDensity.value = THREE.MathUtils.lerp(0.035, 0.022, THREE.MathUtils.smoothstep(progress, 0.6, 1));
    this.tubeMat.color.copy(COLORS.fluoro).multiplyScalar(1.6 * this.power * (0.92 + Math.sin(time * 50) * 0.04));
    this.emberGlow.material.uniforms.uStrength.value = 0.4 + THREE.MathUtils.smoothstep(progress, 0.5, 1) * 0.9 + Math.sin(time * 2) * 0.06;
    this.ember.material.color.setScalar(0.5 + this.power * 0.5);
  }
}

function mulberry(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export { mulberry };
