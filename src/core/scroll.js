import Lenis from 'lenis';
import { gsap } from 'gsap';
import { REDUCED_MOTION } from '../config/theme.js';

// Unified scroll: Lenis smoothing (skipped for reduced motion) + section progress map.
export class Scroll {
  constructor() {
    this.lenis = null;
    this.y = window.scrollY;
    this.velocity = 0;
    this.sections = [];
    if (!REDUCED_MOTION) {
      this.lenis = new Lenis({ duration: 1.25, smoothWheel: true, touchMultiplier: 1.4 });
      this.lenis.on('scroll', (e) => { this.velocity = e.velocity; });
      gsap.ticker.add((t) => this.lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    }
    window.addEventListener('resize', () => this.measure());
  }

  register(elements) {
    this.sections = elements.map((el) => ({ el, top: 0, height: 0 }));
    this.measure();
  }

  measure() {
    const sy = window.scrollY;
    for (const s of this.sections) {
      const r = s.el.getBoundingClientRect();
      s.top = r.top + sy;
      s.height = r.height;
    }
    this.vh = window.innerHeight;
  }

  // Returns the scroll position each frame (Lenis animated or native).
  read() {
    const y = this.lenis ? this.lenis.animatedScroll : window.scrollY;
    if (!this.lenis) this.velocity = y - this.y;
    this.y = y;
    return y;
  }

  // progress of section i: 0 when its top meets the viewport top, 1 when its bottom meets the viewport bottom
  progress(i, y = this.y) {
    const s = this.sections[i];
    const span = Math.max(1, s.height - this.vh);
    return (y - s.top) / span;
  }

  lock() { this.lenis ? this.lenis.stop() : (document.documentElement.style.overflow = 'hidden'); }
  unlock() { this.lenis ? this.lenis.start() : (document.documentElement.style.overflow = ''); }

  to(y, opts = {}) {
    if (this.lenis) this.lenis.scrollTo(y, { duration: 1.6, ...opts });
    else window.scrollTo({ top: y, behavior: 'auto' });
  }
}
