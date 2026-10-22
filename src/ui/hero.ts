import type { Channel, Vod } from '../data';
export type HeroInfo = { kind: 'vod'; v: Vod; line?: string } | { kind: 'ch'; c: Channel } | { kind: 'lib'; title: string; desc: string; hue: number; kicker?: string };
let cur: HeroInfo | null = null;
const ls = new Set<(h: HeroInfo | null) => void>();
export const hero = {
  get: () => cur,
  set(h: HeroInfo) { cur = h; ls.forEach((l) => l(h)); },
  sub(fn: (h: HeroInfo | null) => void) { ls.add(fn); return () => { ls.delete(fn); }; },
};
