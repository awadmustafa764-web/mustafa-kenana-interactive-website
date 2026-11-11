import * as THREE from 'three';

export class BaseScene {
  constructor(ctx) {
    this.ctx = ctx;            // { renderer, pointer, scroll, quality }
    this.scene = new THREE.Scene();
    this.clearColor = new THREE.Color('#000000');
    this.rig = null;
    this.ready = false;
    this.progress = 0;
    this._origin = new THREE.Vector2(0.5, 0.5);
    this._v = new THREE.Vector3();
  }

  get camera() { return this.rig.camera; }

  init() { this.ready = true; }

  // Override: world-space point the next portal should grow from when leaving this scene.
  portalAnchor() { return null; }

  portalOrigin() {
    const a = this.portalAnchor();
    if (!a) return this._origin.set(0.5, 0.5);
    this._v.copy(a).project(this.camera);
    return this._origin.set(
      THREE.MathUtils.clamp(this._v.x * 0.5 + 0.5, 0.1, 0.9),
      THREE.MathUtils.clamp(this._v.y * 0.5 + 0.5, 0.1, 0.9)
    );
  }

  resize(w, h) { this.rig?.resize(w / h); }

  update(/* dt, time, progress, pointer */) {}

  dispose() {
    this.scene.traverse((o) => {
      o.geometry?.dispose();
      const m = o.material;
      if (m) (Array.isArray(m) ? m : [m]).forEach((mm) => {
        // envMap is the shared, cached studio environment: never dispose it here
        Object.entries(mm).forEach(([k, v]) => k !== 'envMap' && v?.isTexture && v.dispose());
        mm.uniforms && Object.values(mm.uniforms).forEach((u) => u.value?.isTexture && u.value.dispose());
        mm.dispose();
      });
    });
  }
}
