import '@fontsource/reem-kufi/700.css';
import '@fontsource/ibm-plex-sans-arabic/300.css';
import '@fontsource/ibm-plex-sans-arabic/400.css';
import '@fontsource/ibm-plex-sans-arabic/600.css';
import '@fontsource/amiri/400.css';
import '@fontsource/ibm-plex-mono/400.css';
import './styles/main.css';

import { QUALITY } from './config/theme.js';
import { Renderer } from './core/renderer.js';
import { Scroll } from './core/scroll.js';
import { Pointer } from './core/pointer.js';
import { Director } from './core/director.js';
import { HallScene } from './scenes/HallScene.js';
import { UnfoldScene } from './scenes/UnfoldScene.js';
import { DisciplinesScene } from './scenes/DisciplinesScene.js';
import { LinkScene } from './scenes/LinkScene.js';
import { StandoutScene } from './scenes/StandoutScene.js';
import { FinaleScene } from './scenes/FinaleScene.js';
import { buildStory, buildChrome } from './ui/dom.js';
import { Beats } from './ui/beats.js';
import { Hud } from './ui/hud.js';
import { playPrologue } from './ui/intro.js';
import { PrologueScene } from './scenes/PrologueScene.js';

async function fontsReady() {
  const wanted = ['700 40px "Reem Kufi"', '400 20px "IBM Plex Sans Arabic"', '600 20px "IBM Plex Sans Arabic"', '400 20px "IBM Plex Mono"'];
  const timeout = new Promise((r) => setTimeout(r, 2500));
  await Promise.race([Promise.all(wanted.map((f) => document.fonts.load(f, 'مشروعك 01'))), timeout]);
}

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!c.getContext('webgl2');
  } catch {
    return false;
  }
}

// The story always starts at the projector, never mid-scroll after a reload.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

async function boot() {
  const sections = buildStory(document.querySelector('#story'));
  buildChrome();
  const scroll = new Scroll();
  scroll.register(sections);
  const beats = new Beats(sections);

  await fontsReady();

  if (!webglAvailable()) {
    document.documentElement.classList.add('no-webgl');
    document.querySelector('#intro')?.remove();
    beats.enabled = true;
    const tick = () => {
      const y = scroll.read();
      let idx = 0;
      scroll.sections.forEach((s, i) => { if (y >= s.top - scroll.vh * 0.5) idx = i; });
      beats.update(idx, scroll.progress(idx, y));
      requestAnimationFrame(tick);
    };
    tick();
    return;
  }

  const renderer = new Renderer(document.querySelector('#gl'));
  const pointer = new Pointer();
  const ctx = { renderer, pointer, scroll, quality: QUALITY };
  const scenes = [HallScene, UnfoldScene, DisciplinesScene, LinkScene, StandoutScene, FinaleScene].map((S) => new S(ctx));
  const director = new Director({ renderer, scroll, pointer, scenes });
  director.ensure(0);
  const hud = new Hud({ sections, scroll, scenes, DisciplinesScene });

  director.onFrame((state) => {
    beats.update(state.index, state.progress);
    hud.update(state);
  });
  director.start();
  document.documentElement.classList.add('is-ready');

  playPrologue({
    prologue: new PrologueScene(ctx),
    hall: scenes[0],
    director,
    scroll,
    onDone: () => {
      beats.enabled = true;
      document.documentElement.classList.add('is-live');
      director.warmup();
    },
  });

  // expose for QA in dev only
  if (import.meta.env.DEV) {
    window.__exp = { director, renderer, scroll, scenes };
    window.go = (i, p) => {
      const s = scroll.sections[i];
      const y = s.top + p * (s.height - scroll.vh);
      scroll.lenis ? scroll.lenis.scrollTo(y, { immediate: true, force: true }) : window.scrollTo(0, y);
      return y;
    };
  }
}

boot();
