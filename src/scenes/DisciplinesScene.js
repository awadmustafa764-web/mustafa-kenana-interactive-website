import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { BaseScene } from './BaseScene.js';
import { CameraRig } from '../core/cameraRig.js';
import { COLORS, QUALITY } from '../config/theme.js';
import { studioEnvironment, brushedTexture, concreteTexture } from './shared/studio.js';
import { domeSegs, barSegs, helixSegs, chipSegs, bookSegs, normalise } from './shared/segments.js';

// World 3 — a gallery plinth. One blackened-steel rod sculpture that snaps,
// rod by rod, into a study model of each discipline. Brass exists only as light.
export const SHAPE_RANGE = [0.06, 0.94];
const RODS = 150;

const ROD_COMMON = /* glsl */ `
  attribute vec3 a0; attribute vec3 a1; attribute vec3 a2; attribute vec3 a3; attribute vec3 a4;
  attribute vec3 b0; attribute vec3 b1; attribute vec3 b2; attribute vec3 b3; attribute vec3 b4;
  attribute float aOrder;
  attribute float aEnd;
  uniform float uShape;
  uniform float uRadius;
  vec3 pickA(float i) { return i < 0.5 ? a0 : i < 1.5 ? a1 : i < 2.5 ? a2 : i < 3.5 ? a3 : a4; }
  vec3 pickB(float i) { return i < 0.5 ? b0 : i < 1.5 ? b1 : i < 2.5 ? b2 : i < 3.5 ? b3 : b4; }
  void rodFrame(out vec3 A, out vec3 X, out vec3 Y, out vec3 Z, out float len) {
    float i = clamp(floor(uShape), 0.0, 3.0);
    float f = uShape - i;
    float d = aOrder * 0.6;
    float k = smoothstep(d, d + 0.32, f);          // each rod snaps quickly, in a rising ripple
    A = mix(pickA(i), pickA(i + 1.0), k);
    vec3 B = mix(pickB(i), pickB(i + 1.0), k);
    vec3 D = B - A;
    len = max(length(D), 1e-4);
    Y = D / len;
    X = normalize(abs(Y.y) < 0.98 ? cross(Y, vec3(0.0, 1.0, 0.0)) : cross(Y, vec3(1.0, 0.0, 0.0)));
    Z = cross(X, Y);
  }
`;

function rodShader(kind) {
  return (shader) => {
    shader.uniforms.uShape = kind.uShape;
    shader.uniforms.uRadius = kind.uRadius;
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\n' + ROD_COMMON);
    const body = `vec3 A, X, Y, Z; float len; rodFrame(A, X, Y, Z, len);`;
    const place = kind.node
      ? `transformed = A + Y * len * aEnd + position * uRadius;`
      : `transformed = A + Y * ((position.y + 0.5) * len) + (X * position.x + Z * position.z) * uRadius;`;
    if (!kind.node && shader.vertexShader.includes('#include <beginnormal_vertex>')) {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <beginnormal_vertex>',
        `#include <beginnormal_vertex>
         { ${body} objectNormal = X * objectNormal.x + Y * objectNormal.y + Z * objectNormal.z; }`
      );
    }
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n{ ${body} ${place} }`);
  };
}

export class DisciplinesScene extends BaseScene {
  init() {
    const env = studioEnvironment(this.ctx.renderer.gl);
    this.clearColor = new THREE.Color('#0b0a09');
    this.frameColor = COLORS.paper;
    this.scene.fog = new THREE.Fog('#0b0a09', 9, 22);
    this.rig = new CameraRig({
      fov: 34,
      parallax: 0.9,
      keys: [
        { t: 0, pos: [0.6, 2.0, 12.5], look: [0, 1.0, 0] },
        { t: 0.25, pos: [0.4, 1.5, 10], look: [0, 0.9, 0] },
        { t: 1, pos: [0, 1.2, 9.2], look: [0, 0.85, 0] },
      ],
    });

    // museum light: one warm spot from above, a cool rim, almost nothing else
    this.spot = new THREE.SpotLight(COLORS.brass, 260, 20, 0.42, 0.55, 1.4);
    this.spot.position.set(1.5, 9, 3);
    this.spot.castShadow = QUALITY.shadows;
    this.spot.shadow.mapSize.set(1024, 1024);
    this.spot.shadow.bias = -0.0004;
    this.spot.shadow.radius = 3;
    this.scene.add(this.spot, this.spot.target);
    const rim = new THREE.DirectionalLight('#9fb3c8', 0.9);
    rim.position.set(-6, 3, -5);
    this.scene.add(rim);
    this.scene.add(new THREE.AmbientLight('#2a2420', 0.25));

    this.stage = new THREE.Group();
    this.scene.add(this.stage);

    // rods
    const forms = [domeSegs(), barSegs(), helixSegs(), chipSegs(), bookSegs()].map((s) => normalise(s, RODS));
    this.uShape = { value: 0 };
    const rodR = { value: 0.022 }, nodeR = { value: 0.045 };
    const rods = this.instanced(new THREE.CylinderGeometry(1, 1, 1, 8, 1, true), forms, 1);
    const steel = new THREE.MeshStandardMaterial({
      color: '#26272a', metalness: 1, roughness: 1, roughnessMap: brushedTexture(256, 5, 0.38, 0.2),
      envMap: env, envMapIntensity: 0.9,
    });
    steel.onBeforeCompile = rodShader({ uShape: this.uShape, uRadius: rodR });
    const rodMesh = new THREE.Mesh(rods, steel);
    rodMesh.frustumCulled = false;
    rodMesh.castShadow = true;
    rodMesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
    rodMesh.customDepthMaterial.onBeforeCompile = rodShader({ uShape: this.uShape, uRadius: rodR });

    // nodes: small turned joints at every rod end
    const nodes = this.instanced(new THREE.IcosahedronGeometry(1, 2), forms, 2);
    const nodeMat = new THREE.MeshStandardMaterial({ color: '#3b3732', metalness: 1, roughness: 0.3, envMap: env, envMapIntensity: 1.1 });
    nodeMat.onBeforeCompile = rodShader({ uShape: this.uShape, uRadius: nodeR, node: true });
    const nodeMesh = new THREE.Mesh(nodes, nodeMat);
    nodeMesh.frustumCulled = false;
    nodeMesh.castShadow = true;
    nodeMesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
    nodeMesh.customDepthMaterial.onBeforeCompile = rodShader({ uShape: this.uShape, uRadius: nodeR, node: true });

    this.sculpture = new THREE.Group();
    this.sculpture.add(rodMesh, nodeMesh);
    this.sculpture.position.y = -0.35;   // forms stand on the plinth top
    this.stage.add(this.sculpture);

    // plinth: cast concrete with softened arrises, on a dark floor
    const concrete = new THREE.MeshStandardMaterial({
      color: '#5d5852', roughness: 0.9, bumpMap: concreteTexture(256, 13), bumpScale: 0.5,
    });
    const plinth = new THREE.Mesh(new RoundedBoxGeometry(3.2, 0.9, 3.2, 4, 0.03), concrete);
    plinth.position.y = -0.8;
    plinth.receiveShadow = true;
    this.stage.add(plinth);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: '#141210', roughness: 0.95 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.25;
    floor.receiveShadow = true;
    this.scene.add(floor);

    this.shape = 0;
    this.spin = 0;
    this.ready = true;
  }

  // one instance per rod (copies = 1) or per rod end (copies = 2)
  instanced(base, forms, copies) {
    const g = new THREE.InstancedBufferGeometry();
    g.index = base.index;
    g.setAttribute('position', base.attributes.position);
    g.setAttribute('normal', base.attributes.normal);
    g.setAttribute('uv', base.attributes.uv);   // 3 + 12 custom = 15 of 16 attributes
    const n = RODS * copies;
    forms.forEach((form, f) => {
      const A = new Float32Array(n * 3), B = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const s = form[i % RODS];
        A.set(s.slice(0, 3), i * 3);
        B.set(s.slice(3, 6), i * 3);
      }
      g.setAttribute('a' + f, new THREE.InstancedBufferAttribute(A, 3));
      g.setAttribute('b' + f, new THREE.InstancedBufferAttribute(B, 3));
    });
    const order = new Float32Array(n), end = new Float32Array(n);
    for (let i = 0; i < n; i++) { order[i] = (i % RODS) / RODS; end[i] = i < RODS ? 0 : 1; }
    g.setAttribute('aOrder', new THREE.InstancedBufferAttribute(order, 1));
    g.setAttribute('aEnd', new THREE.InstancedBufferAttribute(end, 1));
    g.instanceCount = n;
    return g;
  }

  static progressFor(k) {
    return SHAPE_RANGE[0] + (k / 4) * (SHAPE_RANGE[1] - SHAPE_RANGE[0]);
  }

  static shapeAt(progress) {
    const q = THREE.MathUtils.clamp((progress - SHAPE_RANGE[0]) / (SHAPE_RANGE[1] - SHAPE_RANGE[0]), 0, 1) * 4;
    const seg = Math.min(Math.floor(q), 3);
    return seg + THREE.MathUtils.smoothstep(q - seg, 0.3, 0.7);
  }

  resize(w, h) {
    super.resize(w, h);
    if (!this.stage) return;
    const portrait = w < h;
    // landscape: the plinth sits left of the index; portrait: centred, higher
    this.stage.position.set(portrait ? 0 : -2.3, portrait ? 1.9 : 0, 0);
    this.stage.scale.setScalar(portrait ? 1.3 : 1);
    this.spot.target.position.set(this.stage.position.x, 0.4, 0);
    this.spot.position.x = this.stage.position.x + 1.5;
  }

  update(dt, time, progress, pointer) {
    this.rig.update(dt, progress, pointer);
    const target = DisciplinesScene.shapeAt(progress);
    this.shape += (target - this.shape) * (1 - Math.pow(0.004, dt));
    this.uShape.value = this.shape;
    // slow turntable; the cursor lends a hand
    this.spin += dt * 0.12;
    this.sculpture.rotation.y = this.spin + pointer.smooth.x * 0.7;
  }
}
