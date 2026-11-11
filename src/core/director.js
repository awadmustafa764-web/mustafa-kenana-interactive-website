import { AMBIENT, IS_MOBILE } from '../config/theme.js';

const smooth = (x) => x * x * (3 - 2 * x);
const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 60));

// Owns the loop: decides which world is active, drives the portal transition,
// lazily initialises scenes and adapts resolution to keep frame rate.
export class Director {
  constructor({ renderer, scroll, pointer, scenes }) {
    this.renderer = renderer;
    this.scroll = scroll;
    this.pointer = pointer;
    this.scenes = scenes;
    this.last = 0;
    this.lastW = window.innerWidth;
    this.lastH = window.innerHeight;
    this.time = 0;
    this.listeners = [];
    this.state = { index: 0, next: -1, mix: 0, progress: 0 };
    this.fps = { acc: 0, frames: 0, low: 0, value: 60 };
    this.running = false;
    this.prologue = null;
    window.addEventListener('resize', () => this.resize());
  }

  onFrame(fn) { this.listeners.push(fn); }

  ensure(i) {
    const s = this.scenes[i];
    if (s && !s.ready) {
      s.init();
      s.resize(this.renderer.width, this.renderer.height);
    }
  }

  // Warm the remaining worlds one at a time while the browser is idle.
  warmup() {
    const queue = this.scenes.map((_, i) => i).filter((i) => !this.scenes[i].ready);
    const step = () => {
      const i = queue.shift();
      if (i === undefined) return;
      this.ensure(i);
      // compile shaders off the critical scroll path
      const s = this.scenes[i];
      this.renderer.gl.compile(s.scene, s.camera);
      idle(step, { timeout: 400 });
    };
    idle(step, { timeout: 400 });
  }

  resize() {
    // mobile URL-bar show/hide only nudges the height: do not reallocate render targets for it
    const w = window.innerWidth, h = window.innerHeight;
    if (w === this.lastW && Math.abs(h - this.lastH) < 120 && IS_MOBILE) return;
    this.lastW = w;
    this.lastH = h;
    this.renderer.resize();
    this.scenes.forEach((s) => s.ready && s.resize(this.renderer.width, this.renderer.height));
    this.prologue?.resize(this.renderer.width, this.renderer.height);
    this.scroll.measure();
  }

  locate(y) {
    const secs = this.scroll.sections;
    const vh = this.scroll.vh;
    for (let i = 0; i < secs.length; i++) {
      const nextTop = i + 1 < secs.length ? secs[i + 1].top : Infinity;
      if (y < nextTop - vh) return { index: i, next: -1, mix: 0 };
      if (y < nextTop) return { index: i, next: i + 1, mix: smooth((y - (nextTop - vh)) / vh) };
    }
    return { index: secs.length - 1, next: -1, mix: 0 };
  }

  start() {
    this.running = true;
    this.last = performance.now();
    const loop = () => {
      if (!this.running) return;
      requestAnimationFrame(loop);
      this.tick();
    };
    requestAnimationFrame(loop);
  }

  tick() {
    const now = performance.now();
    const dt = Math.min((now - this.last) / 1000, 1 / 20);
    this.last = now;
    this.time += dt * AMBIENT;
    const y = this.scroll.read();
    this.pointer.update(dt);

    if (this.prologue) {
      // the prologue is drawn over the hall; the hall shows through the cut
      const hall = this.scenes[0];
      this.ensure(0);
      hall.setPower(this.prologue.hallPower);
      hall.update(dt, this.time, 0, this.pointer, 0);
      this.prologue.update(dt);
      this.renderer.frame(this.prologue, hall, 0, null, this.time, true);
      for (const fn of this.listeners) fn(this.state, dt);
      return;
    }

    const loc = this.locate(y);
    this.state.index = loc.index;
    this.state.next = loc.next;
    this.state.mix = loc.mix;

    const a = this.scenes[loc.index];
    const b = loc.next >= 0 ? this.scenes[loc.next] : null;
    this.ensure(loc.index);
    if (b) this.ensure(loc.next);
    // keep the following world ready before it is needed
    if (loc.index + 1 < this.scenes.length && this.scroll.progress(loc.index, y) > 0.5) this.ensure(loc.index + 1);

    const pa = this.scroll.progress(loc.index, y);
    this.state.progress = pa;
    a.update(dt, this.time, pa, this.pointer, this.scroll.velocity);
    if (b) b.update(dt, this.time, this.scroll.progress(loc.next, y), this.pointer, this.scroll.velocity);

    this.renderer.uniforms.uFrameColor.value.copy(a.frameColor || b?.frameColor || this.renderer.uniforms.uFrameColor.value);
    this.renderer.frame(a, b, loc.mix, a.portalOrigin(), this.time);

    for (const fn of this.listeners) fn(this.state, dt);
    this.adapt(dt);
  }

  adapt(dt) {
    const f = this.fps;
    f.acc += dt;
    f.frames++;
    if (f.acc < 0.5) return;
    f.value = f.frames / f.acc;
    f.acc = 0;
    f.frames = 0;
    if (f.value < 45) f.low++;
    else f.low = Math.max(0, f.low - 1);
    if (f.low >= 4 && this.renderer.dpr > 1) {
      this.renderer.setDpr(Math.max(1, this.renderer.dpr - 0.25));
      f.low = 0;
    }
  }
}

