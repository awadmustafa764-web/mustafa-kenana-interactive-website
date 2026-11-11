import * as THREE from 'three';

// Unified pointer: mouse or touch drag. ndc (-1..1), smoothed copy, velocity, active flag.
export class Pointer {
  constructor() {
    this.ndc = new THREE.Vector2(0, 0);
    this.smooth = new THREE.Vector2(0, 0);
    this.velocity = new THREE.Vector2(0, 0);
    this.uv = new THREE.Vector2(0.5, 0.5);
    this.active = false;   // pointer is over the page (mouse) or finger down
    this.touch = false;
    this.down = false;
    this._prev = new THREE.Vector2(0, 0);

    const move = (x, y) => {
      this.ndc.set((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
      this.uv.set(x / window.innerWidth, 1 - y / window.innerHeight);
      this.active = true;
    };
    window.addEventListener('pointermove', (e) => {
      this.touch = e.pointerType === 'touch';
      move(e.clientX, e.clientY);
    }, { passive: true });
    window.addEventListener('pointerdown', (e) => {
      this.down = true;
      this.touch = e.pointerType === 'touch';
      move(e.clientX, e.clientY);
    }, { passive: true });
    window.addEventListener('pointerup', () => {
      this.down = false;
      if (this.touch) this.active = false;
    }, { passive: true });
    document.addEventListener('pointerout', (e) => { if (!e.relatedTarget) this.active = false; });
  }

  update(dt) {
    const k = 1 - Math.pow(0.0015, dt);
    this.velocity.subVectors(this.ndc, this._prev).divideScalar(Math.max(dt, 1 / 240));
    this._prev.copy(this.ndc);
    this.smooth.lerp(this.ndc, k);
  }
}
