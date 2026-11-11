import { SCENES } from '../config/content.js';

// Progress HUD (pays off the intro's slide counter) + per-scene DOM hooks.
export class Hud {
  constructor({ sections, scroll, scenes, DisciplinesScene }) {
    this.scroll = scroll;
    this.scenes = scenes;
    this.cur = document.querySelector('.hud__cur');
    this.label = document.querySelector('.hud__label');
    this.fill = document.querySelector('.hud__fill');
    this.pill = document.querySelector('.pill');
    this.root = document.documentElement;
    this.last = -1;
    this.lastTheme = '';

    // disciplines: names drive the scroll
    const dSec = sections.findIndex((s) => s.dataset.scene === 'disciplines');
    this.dSec = dSec;
    this.dButtons = [...sections[dSec].querySelectorAll('.discipline')];
    this.dButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const k = +btn.dataset.k;
        const s = scroll.sections[dSec];
        scroll.to(s.top + DisciplinesScene.progressFor(k) * (s.height - scroll.vh));
      });
    });
    this.DisciplinesScene = DisciplinesScene;

    const lSec = sections.findIndex((s) => s.dataset.scene === 'link');
    this.lSec = lSec;
    this.swapLines = [...sections[lSec].querySelectorAll('.swap__line')];
    this.devLabels = [...sections[lSec].querySelectorAll('.device-label')];
  }

  update(state) {
    const { index, progress } = state;
    if (index !== this.last) {
      this.last = index;
      this.cur.textContent = String(index + 1).padStart(2, '0');
      this.label.textContent = SCENES[index].label;
    }
    // paper world inverts the chrome
    const theme = SCENES[index].id === 'link' && state.mix < 0.5 ? 'paper' : (state.next >= 0 && SCENES[state.next].id === 'link' && state.mix > 0.5 ? 'paper' : 'ink');
    if (theme !== this.lastTheme) {
      this.lastTheme = theme;
      this.root.dataset.world = theme;
    }
    const y = this.scroll.y;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    this.fill.style.transform = `scaleY(${Math.min(1, Math.max(0, y / max))})`;
    // pill hides at the finale's contact bubble (it would duplicate it)
    this.pill.classList.toggle('is-hidden', SCENES[index].id === 'finale' && progress > 0.4);

    if (index === this.dSec) {
      const k = Math.round(this.DisciplinesScene.shapeAt(progress));
      this.dButtons.forEach((b, i) => b.classList.toggle('is-active', i === k));
    }
    if (index === this.lSec || state.next === this.lSec) this.updateLink(index === this.lSec ? progress : 0);
  }

  updateLink(p) {
    // فلاشة → ملف عرض → رابط واحد : each is struck as the next arrives
    const show = [p > 0.03, p > 0.16, p > 0.34];
    const strike = [p > 0.16, p > 0.34, false];
    this.swapLines.forEach((el, i) => {
      el.classList.toggle('is-shown', show[i]);
      el.classList.toggle('is-struck', strike[i]);
    });
    const scene = this.scenes[this.lSec];
    if (!scene.ready) return;
    const pos = scene.labels();
    const w = window.innerWidth, h = window.innerHeight;
    this.devLabels.forEach((el, i) => {
      const v = pos[i];
      const on = scene.devices[i].su.uOn.value > 0.6 && v.z < 1 && Math.abs(v.x) < 0.95 && Math.abs(v.y) < 0.92;
      el.classList.toggle('is-on', on);
      if (on) el.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px) translate(-50%, -100%)`;
    });
  }
}
