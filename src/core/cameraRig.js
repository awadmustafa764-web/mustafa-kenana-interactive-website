import * as THREE from 'three';
import { REDUCED_MOTION } from '../config/theme.js';

// Keyframed camera driven by section progress, with damping and pointer parallax.
// keys: [{ t, pos:[x,y,z], look:[x,y,z], fov? }]
export class CameraRig {
  constructor({ keys, fov = 45, near = 0.1, far = 400, parallax = 0.6, damping = 0.075 }) {
    this.camera = new THREE.PerspectiveCamera(fov, 1, near, far);
    this.keys = keys.map((k) => ({
      t: k.t,
      pos: new THREE.Vector3(...k.pos),
      look: new THREE.Vector3(...k.look),
      fov: k.fov ?? fov,
    }));
    this.parallax = REDUCED_MOTION ? parallax * 0.3 : parallax;
    this.damping = damping;
    this.portraitBoost = 1;  // multiplies distance from look target on portrait screens
    this.fovBoost = 0;

    this._pos = new THREE.Vector3();
    this._look = new THREE.Vector3();
    this.curPos = this.keys[0].pos.clone();
    this.curLook = this.keys[0].look.clone();
    this.curFov = this.keys[0].fov;
    this._tmp = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._up = new THREE.Vector3(0, 1, 0);
    this.snap = true;
  }

  resize(aspect) {
    this.camera.aspect = aspect;
    const portrait = aspect < 1;
    this.portraitBoost = portrait ? THREE.MathUtils.clamp(1 / aspect, 1, 1.9) * 0.85 + 0.15 : 1;
    this.fovBoost = portrait ? 10 : 0;
    this.camera.updateProjectionMatrix();
  }

  sample(p) {
    const k = this.keys;
    p = THREE.MathUtils.clamp(p, 0, 1);
    let i = 0;
    while (i < k.length - 2 && p > k[i + 1].t) i++;
    const a = k[i];
    const b = k[Math.min(i + 1, k.length - 1)];
    const span = Math.max(1e-5, b.t - a.t);
    let f = THREE.MathUtils.clamp((p - a.t) / span, 0, 1);
    f = f * f * (3 - 2 * f); // smoothstep between keys
    this._pos.lerpVectors(a.pos, b.pos, f);
    this._look.lerpVectors(a.look, b.look, f);
    this._fov = THREE.MathUtils.lerp(a.fov, b.fov, f);
  }

  update(dt, progress, pointer) {
    this.sample(progress);
    // portrait: pull back along view direction
    if (this.portraitBoost !== 1) {
      this._tmp.subVectors(this._pos, this._look).multiplyScalar(this.portraitBoost);
      this._pos.copy(this._look).add(this._tmp);
    }
    // pointer parallax: orbit slightly around look target
    if (pointer) {
      this._tmp.subVectors(this._pos, this._look);
      const dist = this._tmp.length();
      this._right.crossVectors(this._tmp, this._up).normalize();
      this._pos.addScaledVector(this._right, pointer.smooth.x * this.parallax * dist * 0.04);
      this._pos.y += pointer.smooth.y * this.parallax * dist * 0.025;
    }
    const k = this.snap ? 1 : 1 - Math.pow(1 - this.damping, dt * 60);
    this.snap = false;
    this.curPos.lerp(this._pos, k);
    this.curLook.lerp(this._look, k);
    this.curFov += (this._fov + this.fovBoost - this.curFov) * k;
    this.camera.position.copy(this.curPos);
    this.camera.lookAt(this.curLook);
    if (Math.abs(this.camera.fov - this.curFov) > 0.01) {
      this.camera.fov = this.curFov;
      this.camera.updateProjectionMatrix();
    }
  }
}
