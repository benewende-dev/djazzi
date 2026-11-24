import { useEffect, useRef } from 'react';
import { MODE_DRAWS } from './engine/registry';
import { resolvePreset } from './presets';
import { useReducedMotion, useResolvedDark } from './theme';
import type { OrbSize, OrbState, OrbTheme } from './types';

// DJAZZI(24/11/2026): the orb on a canvas, for the desktop and the browser.
// Adapted from thinking-orbs' src/ThinkingOrb.tsx (MIT, see ./README.md):
// one shared clock keeps every orb in phase, each pauses offscreen and on a
// hidden page, and Reduce Motion gets one still frame.

const LABELS: Record<OrbState, string> = {
  working: 'Working…',
  searching: 'Searching…',
  solving: 'Thinking…',
  listening: 'Listening…',
  connecting: 'Connecting…',
  weaving: 'Planning…',
  composing: 'Writing…',
  breathing: 'Thinking…',
  shaping: 'Creating…',
};

export function ThinkingOrb({ state = 'working', size = 20, diameter, theme = 'auto', className }: {
  state?: OrbState;
  /** The tuned design: 64 for an avatar, 20 next to text. */
  size?: OrbSize;
  /** Draw the design at another size, in CSS pixels. */
  diameter?: number;
  theme?: OrbTheme;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const dark = useResolvedDark(theme, ref);
  const reduced = useReducedMotion();
  const px = diameter ?? size;

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = Math.min(2, (typeof devicePixelRatio !== 'undefined' && devicePixelRatio) || 1);
    canvas.width = Math.round(px * dpr);
    canvas.height = Math.round(px * dpr);

    const { mode, speed, opts } = resolvePreset(state, size);
    const draw = MODE_DRAWS[mode];
    const scale = px / size;
    const frame = (t: number) => {
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
      ctx.clearRect(0, 0, size, size);
      draw(ctx, size, t, dark, opts);
    };
    const now = () => (performance.now() / 1000) * speed;

    if (reduced) {
      frame(0.6);
      return;
    }

    let raf = 0;
    let running = false;
    const loop = () => {
      frame(now());
      if (running) raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    frame(now());
    let visible = true;
    const io = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible && document.visibilityState !== 'hidden') start();
        else stop();
      })
      : null;
    io?.observe(canvas);
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') stop();
      else if (visible) start();
    };
    document.addEventListener('visibilitychange', onVisibility);
    if (!io) start();

    return () => {
      stop();
      io?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [state, size, px, dark, reduced]);

  return <canvas ref={ref} role="img" aria-label={LABELS[state]} className={className} style={{ width: px, height: px, display: 'block', flexShrink: 0 }} />;
}
