import { SCENES, CONTACT, BRAND, WHATSAPP_URL, WHATSAPP_DISPLAY } from '../config/content.js';
import { IS_MOBILE } from '../config/theme.js';

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Split by words (never letters — Arabic letters must stay joined).
export const words = (text, cls = '') =>
  esc(text).split(/\s+/).map((w, i) => `<span class="w ${cls}" style="--i:${i}"><span>${w}</span></span>`).join(' ');

const wa = (html, cls, aria) =>
  `<a class="${cls}" href="${WHATSAPP_URL}" target="_blank" rel="noopener" aria-label="${esc(aria)} — واتساب ${WHATSAPP_DISPLAY}">${html}</a>`;

function beat(b, scene) {
  const attrs = `class="beat beat--${b.layout}" data-in="${b.in}" data-out="${b.out}"`;
  const index = b.index ? `<span class="beat__index" aria-hidden="true">${b.index}</span>` : '';
  switch (b.layout) {
    case 'monument':
      return `<div ${attrs}>
        ${b.kicker ? `<p class="kicker kicker--brand" style="--d:0s"><span>${esc(b.kicker)}</span></p>` : ''}
        <h${scene.id === 'hall' ? 1 : 2} class="display">
          <span class="line" style="--d:${b.kicker ? 0.55 : 0}s">${words(b.title)}</span>
          <span class="line line--accent" style="--d:${b.kicker ? 1.25 : 0.5}s">${words(b.titleAccent)}</span>
        </h${scene.id === 'hall' ? 1 : 2}>
      </div>`;
    case 'index':
      return `<div ${attrs}>
        ${index}
        <h2 class="display display--md">${words(b.title)}</h2>
        <p class="hint">${esc(b.hint)}</p>
        <ul class="disciplines" role="list">
          ${scene.disciplines.map((d, k) => `<li><button type="button" class="discipline" data-k="${k}"><span class="mono">${String(k + 1).padStart(2, '0')}</span><span class="discipline__name">${esc(d)}</span></button></li>`).join('')}
        </ul>
      </div>`;
    case 'swap':
      return `<div ${attrs}>
        ${index}
        <h2 class="swap" aria-label="رابط واحد لمشروعك">
          <span class="swap__line" data-k="0">${esc(scene.swapWords[0])}</span>
          <span class="swap__line" data-k="1">${esc(scene.swapWords[1])}</span>
          <span class="swap__line swap__line--final" data-k="2">${esc(scene.swapWords[2])} <em>${esc(b.titleSuffix)}</em></span>
        </h2>
      </div>`;
    case 'columns':
      return `<div ${attrs}>
        <p class="body body--serif">${words(b.body)}</p>
        <div class="device-labels" aria-hidden="true">
          ${b.labels.map((l, k) => `<span class="device-label" data-k="${k}"><span class="mono">${String(k + 1).padStart(2, '0')}</span>${esc(l)}</span>`).join('')}
        </div>
      </div>`;
    case 'giant':
      return `<div ${attrs}>${index}<h2 class="display display--giant">${words(b.title)}</h2></div>`;
    case 'contact':
      return `<div ${attrs}>
        <div class="bubble" role="group" aria-label="تواصل">
          <p class="bubble__brand">${esc(BRAND)}</p>
          <p class="bubble__lead">${esc(CONTACT.lead)}</p>
          <p class="bubble__body">${esc(CONTACT.body)}</p>
          ${wa(`<span>${CONTACT.button}</span><bdi dir="ltr" class="mono">${WHATSAPP_DISPLAY}</bdi>`, 'cta cta--big', CONTACT.button)}
        </div>
      </div>`;
    default: {
      const hint = b.hint ? `<p class="hint">${esc(IS_MOBILE ? b.hintTouch || b.hint : b.hint)}</p>` : '';
      const cta = b.cta ? wa(esc(b.cta), 'cta cta--inline', b.cta) : '';
      return `<div ${attrs}>
        ${index}
        ${b.title ? `<h2 class="display display--md">${words(b.title)}</h2>` : ''}
        ${b.body ? `<p class="body">${words(b.body)}</p>` : ''}
        ${hint}${cta}
      </div>`;
    }
  }
}

export function buildStory(root) {
  root.innerHTML = SCENES.map((s, i) => `
    <section class="scene scene--${s.id}" data-scene="${s.id}" data-index="${i}"
      style="--len:${IS_MOBILE ? s.length[1] : s.length[0]}" aria-label="${esc(s.label)}">
      <div class="stage">${s.beats.map((b) => beat(b, s)).join('')}</div>
    </section>`).join('');
  return [...root.querySelectorAll('.scene')];
}

export function buildChrome() {
  const total = String(SCENES.length).padStart(2, '0');
  document.querySelector('#chrome').innerHTML = `
    <div class="mark" aria-hidden="true"><span class="mark__name">${esc(BRAND)}</span><span class="mono mark__sub">DIGITAL EXPERIENCE STUDIO</span></div>
    <div class="hud" aria-hidden="true">
      <span class="mono hud__count"><span class="hud__cur">01</span> / ${total}</span>
      <span class="hud__label">${esc(SCENES[0].label)}</span>
      <span class="hud__bar"><span class="hud__fill"></span></span>
    </div>
    ${wa(`<span class="pill__dot" aria-hidden="true"></span>${CONTACT.pill}`, 'pill', CONTACT.pill)}
  `;
}
