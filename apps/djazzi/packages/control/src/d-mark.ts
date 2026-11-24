// DJAZZI(24/11/2026): the Djazzi sign, in OpenBaara's family: the D that
// looks, drawn in the box and with the eyes of the former B (07/11/2026,
// the founder's choice C). Black and white only, the eyes cut out of the
// body. One source for every app, page and file (desktop
// scripts/identity.mjs makes the kit).
//
// The body's box is 384..626 × 250..502: a straight back with softly
// rounded corners, one round front (variant C, 24/11/2026). The eyes look right. The word is Geist
// SemiBold (OFL, the OpenBaara typeface), tracking −0.03 em, size 100,
// capitals from y = 0 to y = 71, the j down to 86 (vectorized from
// Geist-SemiBold.ttf with fontkit).

export const INK = '#0A0A0A';
export const PAPER = '#FFFFFF';

export const D_BODY =
  'M432 250 H520 C590 250 626 304 626 376 C626 448 590 502 520 502 H432 C405 502 384 481 384 454 V298 C384 271 405 250 432 250 Z';
export const D_EYES = [{ cx: 500, cy: 324 }, { cx: 554, cy: 324 }] as const;
export const D_EYE_R = 14;
/** A square box around the body, its centre at the body's centre. */
export const D_BOX = { x: 369, y: 240, size: 272 } as const;
/** How far the eyes may travel when it looks around (motion), in body units. */
export const D_LOOK = 16; // eyesPose's `look`

export const WORD = {
  d: 'M8 0L31.6 0Q48.6 0 57.75 9.25Q66.9 18.5 66.9 35.6Q66.9 52.6 57.9 61.8Q48.9 71 32.2 71L8 71ZM31.6 59.7Q42.7 59.7 48.1 53.75Q53.5 47.8 53.5 35.6Q53.5 23.3 48.1 17.3Q42.7 11.3 31.6 11.3L21 11.3L21 59.7L31.6 59.7ZM66 76.1L71.3 76.1Q74.3 76.1 75.75 74.8Q77.2 73.5 77.2 70.2L77.2 17.6L90 17.6L90 70.6Q90 78.9 86.25 82.45Q82.5 86 73.6 86L66 86ZM76.9 -0.9L90.2 -0.9L90.2 10.5L76.9 10.5ZM116.8 72.2Q108.3 72.2 103.25 68.35Q98.2 64.5 98.2 57.6Q98.2 50.8 102.45 46.85Q106.7 42.9 115.6 41.2L133.3 37.7Q133.3 32.1 130.7 29.2Q128.1 26.3 123.1 26.3Q114 26.3 112.2 34.6L99.1 34Q100.7 25.6 106.9 21Q113.1 16.4 123.1 16.4Q134.4 16.4 140.25 22.15Q146.1 27.9 146.1 38.6L146.1 58Q146.1 60.1 146.8 60.9Q147.5 61.7 149.1 61.7L150.8 61.7L150.8 71Q149.2 71.4 146.2 71.4Q141.5 71.4 138.65 69.4Q135.8 67.4 135 62.7Q133 67 128.15 69.6Q123.3 72.2 116.8 72.2ZM119.4 62.9Q125.7 62.9 129.5 59.2Q133.3 55.5 133.3 49.4L133.3 46.4L119.5 49.2Q115.3 50 113.4 51.8Q111.5 53.6 111.5 56.4Q111.5 59.5 113.55 61.2Q115.6 62.9 119.4 62.9ZM156.6 60.4L187.4 27.5L157.7 27.5L157.7 17.6L202.5 17.6L202.5 28.2L171.3 61.1L203.3 61.1L203.3 71L156.6 71ZM210 60.4L240.8 27.5L211.1 27.5L211.1 17.6L255.9 17.6L255.9 28.2L224.7 61.1L256.7 61.1L256.7 71L210 71ZM265.4 17.6L278.2 17.6L278.2 71L265.4 71ZM265.2 -0.9L278.5 -0.9L278.5 10.5L265.2 10.5Z',
  /** First stroke of the D (its side bearing), and the advance of the word. */
  left: 8,
  width: 285.3,
  capHeight: 71,
  /** How far the j goes below the baseline: every box around the word keeps it. */
  descent: 15,
} as const;

/** The eyes as sub-paths, so `evenodd` cuts them out of the body. */
const EYE_HOLES = D_EYES.map(e => `M${e.cx - D_EYE_R} ${e.cy}a${D_EYE_R} ${D_EYE_R} 0 1 0 ${2 * D_EYE_R} 0a${D_EYE_R} ${D_EYE_R} 0 1 0 ${-2 * D_EYE_R} 0Z`).join('');

/**
 * The D alone, as SVG markup (no <svg> wrapper), in the body's units.
 * `eyes: 'cut'` (the default) leaves them transparent: the sign reads on any
 * background and as a mask (Android's monochrome icon, favicons).
 */
export function dMarkup(body = INK, eyes: string = 'cut'): string {
  if (eyes === 'cut') return `<path d="${D_BODY}${EYE_HOLES}" fill-rule="evenodd" fill="${body}"/>`;
  return `<path d="${D_BODY}" fill="${body}"/>` + D_EYES.map(e => `<circle cx="${e.cx}" cy="${e.cy}" r="${D_EYE_R}" fill="${eyes}"/>`).join('');
}

/** The D, square, standalone; `eyes` 'none' cuts nothing (a silhouette for masks). */
export function dSvg({ size = 512, body = INK, eyes = 'cut', tile, pad = 0.12, radius = 0 }: { size?: number; body?: string; eyes?: string; tile?: string; pad?: number; radius?: number } = {}): string {
  const s = D_BOX.size / (1 - 2 * pad);
  const x = D_BOX.x + D_BOX.size / 2 - s / 2, y = D_BOX.y + D_BOX.size / 2 - s / 2;
  const bg = tile ? `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${s * radius}" fill="${tile}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${x} ${y} ${s} ${s}">${bg}${dMarkup(body, eyes)}</svg>`;
}

/** The word's box: its capitals from 0, the j's tail below. */
export const WORD_VIEW = `${WORD.left} 0 ${WORD.width - WORD.left} ${WORD.capHeight + WORD.descent}`;

/** The word alone, its capitals `height` px tall (the j goes below), one colour. */
export function wordSvg({ height = 71, color = INK }: { height?: number; color?: string } = {}): string {
  const k = height / WORD.capHeight;
  const width = Math.round(k * (WORD.width - WORD.left));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${Math.round(k * (WORD.capHeight + WORD.descent))}" viewBox="${WORD_VIEW}" role="img" aria-label="Djazzi"><path d="${WORD.d}" fill="${color}"/></svg>`;
}

/**
 * The D beside the word: the D is 1.5 times the capitals' height, centred
 * on them, 0.35 D away from the word (OpenBaara's lockup, re-proportioned
 * for a taller sign). The j's tail stays inside the D's height.
 */
export function lockupSvg({ height = 120, color = INK, eyes = 'cut', background }: { height?: number; color?: string; eyes?: string; background?: string } = {}): string {
  const cap = WORD.capHeight, markH = cap * 1.5;
  const k = markH / 252;
  const gap = markH * 0.35;
  const wordW = WORD.width - WORD.left;
  const markW = 242 * k;
  const total = markW + gap + wordW, top = (cap - markH) / 2;
  const vb = `0 ${top} ${total} ${markH}`;
  const width = Math.round((height * total) / markH);
  const bg = background ? `<rect x="0" y="${top}" width="${total}" height="${markH}" fill="${background}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${vb}">${bg}` +
    `<g transform="translate(0 ${top}) scale(${k}) translate(-384 -250)">${dMarkup(color, eyes)}</g>` +
    `<path transform="translate(${markW + gap - WORD.left} 0)" d="${WORD.d}" fill="${color}"/></svg>`;
}

// ── Its life: only the eyes move, as a person looking up from work ──
// « loading » (working, waiting): a glance left, back right, a blink.
// « rotation » (a longer moment): the eyes go round once, then blink.
// « static »: still, eyes right, as drawn.

export type MarkMotion = 'static' | 'loading' | 'rotation';
export const DURATION = { static: 0, loading: 3200, rotation: 4000 } as const;
export type EyesPose = { dx: number; dy: number; lid: number };

/** Self-contained (no outer helpers): public pages serialize it (logo.ts). */
export function eyesPose(motion: MarkMotion, phase: number): EyesPose {
  const look = 16;
  const ease = (u: number) => { const t = Math.max(0, Math.min(1, u)); return t * t * (3 - 2 * t); };
  // A blink centred on 0.85, 0.05 long: 1 open, 0.1 shut.
  const lid = 1 - 0.9 * Math.max(0, 1 - Math.abs(phase - 0.85) / 0.025);
  if (motion === 'static') return { dx: 0, dy: 0, lid: 1 };
  if (motion === 'loading') {
    // right (as drawn) → left → right, holding each look.
    const left = -2.2 * look;
    const dx = phase < 0.25 ? 0 : phase < 0.35 ? left * ease((phase - 0.25) / 0.1)
      : phase < 0.6 ? left : phase < 0.7 ? left * (1 - ease((phase - 0.6) / 0.1)) : 0;
    return { dx, dy: 0, lid };
  }
  // rotation: one turn around the drawn position, then a blink.
  const turn = 2 * Math.PI * ease((phase - 0.1) / 0.6);
  const r = phase > 0.1 && phase < 0.7 ? look : look * Math.max(0, 1 - Math.abs(phase < 0.1 ? phase - 0.1 : phase - 0.7) * 10);
  return { dx: -Math.sin(turn) * r, dy: -Math.cos(turn) * r, lid };
}

// DJAZZI(07/11/2026): the agents' shapes, the sign's family (the founder's
// call): drawn in a 100-unit box, each with the sign's two round eyes. The
// phone (agent-shape.tsx) and the site (living-shapes.ts) draw them from here.
export type ShapeId = 'b' | 'round' | 'pebble' | 'dome' | 'drop' | 'pill' | 'square' | 'arch' | 'bean' | 'cloud' | 'leaf' | 'kite';

/** The colour a shape is filled with, by the name the agent keeps. */
export const SHAPE_FILL: Record<string, string> = {
  white: '#FFFFFF', brown: '#8B5E3C', red: '#F0353F', orange: '#FF6A1A', amber: '#FFA31A',
  green: '#12C26B', teal: '#14B8A6', blue: '#1F7BFF', violet: '#8B5CF6', rose: '#F43F8E',
  gray: '#7A7A7A', clay: '#E0703C', ink: INK,
};


export type Eyes = [number, number, number, number];
export const EYES: Eyes = [42, 44, 58, 44];

export const SHAPES: Record<Exclude<ShapeId, 'b'>, { d: string; eyes?: Eyes }> = {
  round: { d: 'M50 12 A38 38 0 1 1 49.9 12 Z' },
  pebble: { d: 'M50 14 C76 14 92 32 90 56 C88 78 70 90 48 88 C24 86 8 70 10 48 C12 28 28 14 50 14 Z' },
  dome: { d: 'M14 82 V50 C14 28 30 14 50 14 C70 14 86 28 86 50 V82 C86 86 84 88 80 88 H20 C16 88 14 86 14 82 Z' },
  drop: { d: 'M50 10 C64 30 84 44 84 62 C84 80 69 90 50 90 C31 90 16 80 16 62 C16 44 36 30 50 10 Z', eyes: [42, 58, 58, 58] },
  pill: { d: 'M30 26 H70 C84 26 94 37 94 50 C94 63 84 74 70 74 H30 C16 74 6 63 6 50 C6 37 16 26 30 26 Z', eyes: [42, 46, 58, 46] },
  square: { d: 'M50 12 C80 12 88 20 88 50 C88 80 80 88 50 88 C20 88 12 80 12 50 C12 20 20 12 50 12 Z' },
  arch: { d: 'M12 88 V46 C12 26 29 12 50 12 C71 12 88 26 88 46 V88 H68 V66 C68 58 60 52 50 52 C40 52 32 58 32 66 V88 Z', eyes: [42, 32, 58, 32] },
  bean: { d: 'M30 16 C46 10 58 22 66 26 C80 32 92 42 90 62 C88 82 70 92 50 88 C30 84 12 74 10 52 C8 34 16 22 30 16 Z', eyes: [44, 44, 60, 46] },
  cloud: { d: 'M28 84 C14 84 6 74 6 62 C6 50 15 42 26 42 C26 26 38 14 52 14 C66 14 77 24 79 37 C89 39 96 48 96 60 C96 73 86 84 72 84 Z', eyes: [44, 50, 60, 50] },
  leaf: { d: 'M88 12 C88 60 70 88 30 88 C18 88 12 82 12 70 C12 34 44 12 88 12 Z', eyes: [46, 50, 62, 44] },
  kite: { d: 'M50 8 C54 8 57 10 60 14 L88 44 C92 48 92 52 88 56 L60 86 C57 90 54 92 50 92 C46 92 43 90 40 86 L12 56 C8 52 8 48 12 44 L40 14 C43 10 46 8 50 8 Z', eyes: [42, 48, 58, 48] },
};

