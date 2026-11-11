import * as THREE from 'three';
import { PALETTE } from '../../config/theme.js';

const DISPLAY = '"Reem Kufi", "IBM Plex Sans Arabic", sans-serif';
const BODY = '"IBM Plex Sans Arabic", sans-serif';
const MONO = '"IBM Plex Mono", monospace';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

const SLIDE_TITLES = ['المقدمة', 'أهداف المشروع', 'منهجية البحث', 'الدراسات السابقة', 'النتائج', 'شكرًا لكم'];

// 3×2 atlas of generic, lifeless slides (grey, bullet points, clip-art chart).
export function slideAtlas() {
  const cw = 640, ch = 360;
  const [c, ctx] = canvas(cw * 3, ch * 2);
  SLIDE_TITLES.forEach((title, i) => {
    const x0 = (i % 3) * cw;
    const y0 = Math.floor(i / 3) * ch;
    ctx.save();
    ctx.translate(x0, y0);
    ctx.fillStyle = '#d9dcdb';
    ctx.fillRect(0, 0, cw, ch);
    ctx.fillStyle = '#9aa3a3';
    ctx.fillRect(0, 0, cw, 70);
    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#f2f4f4';
    ctx.font = `600 38px ${BODY}`;
    ctx.fillText(title, cw - 36, 48);
    ctx.fillStyle = '#7d8585';
    const bullets = i === 5 ? 0 : 3 + (i % 3);
    for (let b = 0; b < bullets; b++) {
      const y = 112 + b * 46;
      const len = 240 + ((i * 97 + b * 53) % 220);
      ctx.beginPath();
      ctx.arc(cw - 44, y + 7, 7, 0, Math.PI * 2);
      ctx.fill();
      roundRect(ctx, cw - 64 - len, y, len, 14, 7);
    }
    if (i === 2 || i === 4) {
      // clip-art bar chart
      const bx = 50, by = 300;
      [80, 140, 110, 180].forEach((h, k) => {
        ctx.fillStyle = k % 2 ? '#8f9898' : '#adb5b5';
        ctx.fillRect(bx + k * 46, by - h, 32, h);
      });
    }
    if (i === 5) {
      ctx.textAlign = 'center';
      ctx.font = `600 64px ${BODY}`;
      ctx.fillStyle = '#8a9292';
      ctx.fillText('شكرًا لحسن استماعكم', cw / 2, ch / 2 + 40);
    }
    ctx.direction = 'ltr';
    ctx.textAlign = 'left';
    ctx.font = `400 20px ${MONO}`;
    ctx.fillStyle = '#8a9292';
    ctx.fillText(`${(i * 4 + 3) % 24 || 24} / 24`, 24, ch - 22);
    ctx.restore();
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// The ember slide — the one that is about to come alive.
export function emberSlide() {
  const [c, ctx] = canvas(1280, 720);
  ctx.fillStyle = PALETTE.ember;
  ctx.fillRect(0, 0, 1280, 720);
  ctx.strokeStyle = 'rgba(11,11,13,.35)';
  ctx.lineWidth = 2;
  for (let x = 0; x <= 1280; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 720); ctx.stroke(); }
  for (let y = 0; y <= 720; y += 80) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1280, y); ctx.stroke(); }
  ctx.fillStyle = PALETTE.ink;
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.font = `700 120px ${DISPLAY}`;
  ctx.fillText('مشروعك', 1180, 300);
  ctx.font = `400 26px ${MONO}`;
  ctx.direction = 'ltr';
  ctx.textAlign = 'left';
  ctx.fillText('25 / 24', 60, 660);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// A tall abstract "interactive site" shown on every device in the link world.
export function siteTexture() {
  const W = 1024, H = 2304;
  const [c, ctx] = canvas(W, H);
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(0, 0, W, H);
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  // hero
  ctx.fillStyle = PALETTE.paper;
  ctx.font = `700 150px ${DISPLAY}`;
  ctx.fillText('مشروعك', W - 80, 300);
  ctx.font = `400 44px ${BODY}`;
  ctx.globalAlpha = 0.6;
  ctx.fillText('فكرة · منهجية · نتائج', W - 80, 390);
  ctx.globalAlpha = 1;
  // ember disc diagram
  ctx.fillStyle = PALETTE.ember;
  ctx.beginPath(); ctx.arc(250, 640, 170, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = PALETTE.paper;
  ctx.lineWidth = 3;
  for (let r = 60; r < 300; r += 40) { ctx.beginPath(); ctx.arc(250, 640, r, 0, Math.PI * 2); ctx.stroke(); }
  // lines of text
  ctx.fillStyle = 'rgba(236,230,218,.35)';
  for (let i = 0; i < 6; i++) roundRect(ctx, W - 80 - (360 - (i % 3) * 60), 520 + i * 44, 360 - (i % 3) * 60, 16, 8);
  // bar chart
  const vals = [0.35, 0.6, 0.45, 0.8, 0.7, 0.95, 0.55, 0.85];
  vals.forEach((v, i) => {
    ctx.fillStyle = i === 5 ? PALETTE.ember : 'rgba(236,230,218,.8)';
    const h = v * 420;
    ctx.fillRect(100 + i * 104, 1380 - h, 70, h);
  });
  ctx.fillStyle = 'rgba(236,230,218,.25)';
  ctx.fillRect(80, 1382, W - 160, 3);
  // line graph
  ctx.strokeStyle = PALETTE.ember;
  ctx.lineWidth = 8;
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const x = 80 + (i / 40) * (W - 160);
    const y = 1800 - Math.sin(i * 0.35) * 90 - i * 6;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.stroke();
  ctx.fillStyle = PALETTE.paper;
  ctx.font = `700 90px ${DISPLAY}`;
  ctx.fillText('النتائج', W - 80, 1580);
  ctx.font = `700 110px ${DISPLAY}`;
  ctx.fillText('الخلاصة', W - 80, 2140);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

// Rasterise a word to a cols×rows coverage grid (0..1) — used by the façade.
export function wordMask(word, cols, rows) {
  const s = 12;
  const [c, ctx] = canvas(cols * s, rows * s);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  // fit the real ink bounds (Arabic glyphs use far less than the em box)
  ctx.textBaseline = "alphabetic";
  ctx.font = `700 100px ${DISPLAY}`;
  const m = ctx.measureText(word);
  const inkW = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
  const inkH = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
  const k = Math.min((c.width * 0.84) / inkW, (c.height * 0.8) / inkH);
  ctx.font = `700 ${100 * k}px ${DISPLAY}`;
  const x = c.width / 2 + ((m.actualBoundingBoxLeft - m.actualBoundingBoxRight) / 2) * k;
  const y = c.height / 2 + ((m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2) * k;
  ctx.fillText(word, x, y);
  const data = ctx.getImageData(0, 0, c.width, c.height).data;
  const out = new Float32Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let q = 0; q < cols; q++) {
      let sum = 0;
      for (let y = 0; y < s; y += 3) for (let x = 0; x < s; x += 3) sum += data[((r * s + y) * c.width + q * s + x) * 4];
      out[(rows - 1 - r) * cols + q] = sum / (16 * 255);
    }
  }
  return out;
}
