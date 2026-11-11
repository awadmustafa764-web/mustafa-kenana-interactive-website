import { gsap } from 'gsap';
import { REDUCED_MOTION } from '../config/theme.js';
import { DURATION } from '../scenes/PrologueScene.js';

// Prologue playback. No skip button, but any attempt to scroll fast-forwards the
// film (x4) to its deterministic end state instead of trapping the visitor.
export function playPrologue({ prologue, hall, director, scroll, onDone }) {
  const veil = document.querySelector('#intro');
  scroll.lock();
  prologue.init();
  prologue.resize(window.innerWidth, window.innerHeight);
  director.prologue = prologue;

  const state = { t: 0 };
  const tween = gsap.to(state, {
    t: DURATION,
    duration: DURATION,
    ease: 'none',
    delay: 0.25,
    onUpdate: () => prologue.setTime(state.t),
    onComplete: finish,
  });
  if (REDUCED_MOTION) tween.timeScale(2);
  // dev only: ?pt=1.2 freezes the film at that moment for frame review
  const pt = import.meta.env.DEV && new URLSearchParams(location.search).get('pt');
  if (pt) { tween.pause(); state.t = +pt; prologue.setTime(+pt); window.__pt = (v) => prologue.setTime(v); }

  const hurry = () => tween.timeScale(4);
  const opts = { passive: true };
  window.addEventListener('wheel', hurry, opts);
  window.addEventListener('touchmove', hurry, opts);
  window.addEventListener('keydown', hurry);

  // the veil only hides the first, not-yet-rendered frame
  requestAnimationFrame(() => requestAnimationFrame(() => veil?.classList.add('is-done')));

  function finish() {
    window.removeEventListener('wheel', hurry, opts);
    window.removeEventListener('touchmove', hurry, opts);
    window.removeEventListener('keydown', hurry);
    hall.setPower(1);
    director.prologue = null;
    prologue.dispose();
    veil?.remove();
    scroll.unlock();
    onDone();
  }
}
