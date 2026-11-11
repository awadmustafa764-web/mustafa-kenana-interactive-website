import * as THREE from 'three';
import { BaseScene } from './BaseScene.js';
import { CameraRig } from '../core/cameraRig.js';
import { COLORS } from '../config/theme.js';
import { concreteTexture } from './shared/studio.js';

// World 6 — a monumental cast-concrete 16:9 opening in a dark hall.
// Behind it: a bright paper-white room (the colour of the link world).
// Its light falls through the opening onto the floor; the pool is computed exactly
// from the opening's shape, so its edges are sharp and believable.
const DW = 8, DH = 4.5;           // the opening (16:9), standing on the floor
const SIDE = 1.15, HEAD = 1.1, DEPTH = 1.5;
const LIGHT = new THREE.Vector3(0, DH * 0.62, -7);

const poolVert = /* glsl */ `
  varying vec3 vW;
  void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }
`;
const poolFrag = /* glsl */ `
  uniform vec3 uLight;
  uniform vec2 uHalf;      // opening half width, height
  uniform float uDepth;
  uniform vec3 uColor;
  uniform float uPower;
  varying vec3 vW;
  float inOpening(vec3 p, float z) {
    // where the ray from the light to p crosses the plane z
    float t = (z - uLight.z) / (p.z - uLight.z);
    vec3 q = uLight + (p - uLight) * t;
    float sx = 1.0 - smoothstep(uHalf.x - 0.03, uHalf.x + 0.03, abs(q.x));
    float sy = 1.0 - smoothstep(uHalf.y * 2.0 - 0.03, uHalf.y * 2.0 + 0.03, q.y);
    return sx * sy;
  }
  void main() {
    vec3 p = vW;
    float lit;
    if (p.z < -uDepth * 0.5) {
      lit = 1.0 - smoothstep(uHalf.x - 0.02, uHalf.x + 0.02, abs(p.x));   // floor of the bright room
    } else {
      // must pass both the back and the front edge of the deep reveal
      lit = inOpening(p, -uDepth * 0.5) * inOpening(p, uDepth * 0.5);
    }
    float dist = max(p.z + uDepth * 0.5, 0.0);
    float fall = 1.0 / (1.0 + dist * dist * 0.012);
    gl_FragColor = vec4(uColor * lit * fall * uPower, 1.0);
  }
`;

export class FinaleScene extends BaseScene {
  init() {
    this.clearColor = new THREE.Color('#060606');
    this.frameColor = COLORS.paper;
    this.bloom = { strength: 0.22, threshold: 1.25 };
    this.rig = new CameraRig({
      fov: 36,
      parallax: 0.5,
      keys: [
        { t: 0, pos: [-3.2, 1.6, 24], look: [0, 2.6, 0] },
        { t: 0.45, pos: [-1.2, 1.6, 16], look: [0, 2.4, 0] },
        { t: 0.75, pos: [0.3, 1.6, 10.5], look: [0, 2.2, 0] },
        { t: 1, pos: [0, 1.65, 3.4], look: [0, 2.1, -4] },
      ],
    });

    // the monolith: one U-shaped slab of cast concrete, bevelled arrises
    const ox = DW / 2 + SIDE, oy = DH + HEAD;
    const shape = new THREE.Shape([
      new THREE.Vector2(-ox, 0), new THREE.Vector2(-ox, oy), new THREE.Vector2(ox, oy), new THREE.Vector2(ox, 0),
      new THREE.Vector2(DW / 2, 0), new THREE.Vector2(DW / 2, DH), new THREE.Vector2(-DW / 2, DH), new THREE.Vector2(-DW / 2, 0),
    ]);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: DEPTH, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.035, bevelSegments: 3 });
    geo.translate(0, 0, -DEPTH / 2);
    const bump = concreteTexture(512, 21);
    bump.repeat.set(0.35, 0.35);
    const concrete = new THREE.MeshStandardMaterial({ color: '#77716a', roughness: 0.93, bumpMap: bump, bumpScale: 0.9 });
    this.portal = new THREE.Mesh(geo, concrete);
    this.scene.add(this.portal);

    // the bright room behind: an enclosure only visible through the opening.
    // Each surface has its own value, the way a real white room never reads flat.
    const RW = 2 * ox - 0.3, RH = oy - 0.15, RD = 12, z0 = -DEPTH / 2 - 0.02;
    const wall = (w, h, value, pos, rot) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: COLORS.paper.clone().multiplyScalar(value), fog: false }));
      m.position.set(...pos);
      m.rotation.set(...rot);
      this.scene.add(m);
    };
    wall(RW, RH, 2.0, [0, RH / 2, z0 - RD], [0, 0, 0]);                         // back
    wall(RD, RH, 1.45, [-RW / 2, RH / 2, z0 - RD / 2], [0, Math.PI / 2, 0]);     // left
    wall(RD, RH, 1.6, [RW / 2, RH / 2, z0 - RD / 2], [0, -Math.PI / 2, 0]);      // right
    wall(RW, RD, 1.15, [0, 0.001, z0 - RD / 2], [-Math.PI / 2, 0, 0]);           // floor
    wall(RW, RD, 1.75, [0, RH, z0 - RD / 2], [Math.PI / 2, 0, 0]);               // ceiling

    // dark hall floor: matte concrete with slab joints (a quiet sense of scale)
    const fc = document.createElement('canvas');
    fc.width = fc.height = 512;
    const fx = fc.getContext('2d');
    fx.drawImage(concreteTexture(512, 5).image, 0, 0);
    fx.strokeStyle = 'rgb(40,40,40)';
    fx.lineWidth = 3;
    fx.strokeRect(0, 0, 512, 512);
    const floorBump = new THREE.CanvasTexture(fc);
    floorBump.wrapS = floorBump.wrapT = THREE.RepeatWrapping;
    floorBump.repeat.set(15, 15);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshStandardMaterial({ color: '#2b2926', roughness: 0.9, bumpMap: floorBump, bumpScale: 0.8 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.z = 30 - DEPTH / 2;
    this.scene.add(floor);

    // light pool, added on top of the floor
    this.poolU = {
      uLight: { value: LIGHT },
      uHalf: { value: new THREE.Vector2(DW / 2, DH / 2) },
      uDepth: { value: DEPTH },
      uColor: { value: COLORS.paper.clone().lerp(COLORS.brass, 0.25).multiplyScalar(0.55) },
      uPower: { value: 1 },
    };
    const pool = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.ShaderMaterial({
        vertexShader: poolVert, fragmentShader: poolFrag, uniforms: this.poolU,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      })
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(0, 0.004, 30 - DEPTH / 2);
    this.scene.add(pool);

    // light: the room spills onto the reveals; a faint cold fill so the monolith's face reads
    const spill = new THREE.PointLight(COLORS.paper, 55, 16, 1.4);
    spill.position.set(0, DH * 0.55, -DEPTH / 2 - 1.2);
    this.spill = spill;
    this.scene.add(spill);
    const moon = new THREE.DirectionalLight('#8d9aa8', 0.85);
    moon.position.set(-8, 10, 12);
    this.scene.add(moon);
    this.scene.add(new THREE.HemisphereLight('#1b1d20', '#0a0907', 0.4));
    this.scene.fog = new THREE.Fog('#060606', 26, 70);
    this.ready = true;
  }

  portalAnchor() { return null; }

  update(dt, time, progress, pointer) {
    this.rig.update(dt, progress, pointer);
    // the room's light breathes very slightly — a lamp, not an effect
    const b = 1 + Math.sin(time * 0.6) * 0.02;
    this.poolU.uPower.value = b;
    this.spill.intensity = 55 * b;
  }
}
