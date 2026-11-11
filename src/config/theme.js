import { Color } from 'three';

export const PALETTE = {
  ink: '#0b0b0d',
  paper: '#ece6da',
  ember: '#ff4a1c',
  brass: '#c9a24a',
  fluoro: '#cfd8d6',
  night: '#07080c',
};

export const COLORS = Object.fromEntries(
  Object.entries(PALETTE).map(([k, v]) => [k, new Color(v)])
);

const coarse = window.matchMedia('(pointer: coarse)').matches;
const small = window.innerWidth < 760;
const cores = navigator.hardwareConcurrency || 4;

export const IS_MOBILE = coarse || small;
export const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const QUALITY = IS_MOBILE || cores <= 4
  ? { tier: 'low', maxDpr: 1.5, msaa: 0, shadows: false, particles: 7000, tiles: [30, 18], facade: [56, 30] }
  : { tier: 'high', maxDpr: 2, msaa: 4, shadows: true, particles: 16000, tiles: [52, 30], facade: [78, 40] };

// Ambient time multiplier (reduced motion keeps the world alive but calm).
export const AMBIENT = REDUCED_MOTION ? 0.25 : 1;
