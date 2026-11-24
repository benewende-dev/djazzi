import { useEffect, useId, useRef } from 'react';
import { D_BODY, D_BOX, D_EYES, D_EYE_R, DURATION, eyesPose, type MarkMotion } from '@/lib/djazzi-d-mark';

// DJAZZI(07/11/2026): the B that looks (founder's choice C, control
// src/d-mark.ts). The eyes are holes (a mask), so the B reads on any
// background; only they move, while the mark is visible.
export function DjazziMark({ motion = 'static', size = 40, className }: {
  motion?: MarkMotion; size?: number; className?: string;
}) {
  const stage = useRef<SVGSVGElement>(null);
  const mask = `djazzi-eyes-${useId().replace(/:/g, '')}`;
  useEffect(() => {
    const svg = stage.current;
    if (!svg) return;
    const eyes = Array.from(svg.querySelectorAll('circle'));
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const draw = (phase: number) => {
      const p = eyesPose(media?.matches ? 'static' : motion, phase);
      eyes.forEach((eye, i) => {
        const { cx, cy } = D_EYES[i];
        eye.setAttribute('transform', `translate(${cx + p.dx} ${cy + p.dy}) scale(1 ${p.lid})`);
      });
    };
    let visible = true, frame = 0, elapsed = 0, previous = 0;
    const tick = (now: number) => {
      if (previous) elapsed += Math.min(80, now - previous);
      previous = now;
      draw((elapsed % DURATION[motion]) / DURATION[motion]);
      frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      cancelAnimationFrame(frame);
      previous = 0;
      if (media?.matches || motion === 'static') { draw(0); return; }
      if (visible && !document.hidden) frame = requestAnimationFrame(tick);
    };
    draw(0);
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    observer?.observe(svg);
    media?.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    sync();
    return () => {
      cancelAnimationFrame(frame); observer?.disconnect();
      media?.removeEventListener('change', sync);
      document.removeEventListener('visibilitychange', sync);
    };
  }, [motion]);
  return <svg ref={stage} viewBox={`${D_BOX.x} ${D_BOX.y} ${D_BOX.size} ${D_BOX.size}`} width={size} height={size}
    className={className} aria-hidden="true" focusable="false" style={{ flexShrink: 0 }}>
    <mask id={mask} maskUnits="userSpaceOnUse" x={D_BOX.x} y={D_BOX.y} width={D_BOX.size} height={D_BOX.size}>
      <rect x={D_BOX.x} y={D_BOX.y} width={D_BOX.size} height={D_BOX.size} fill="#fff" />
      {D_EYES.map((e, i) => <circle key={i} r={D_EYE_R} fill="#000" transform={`translate(${e.cx} ${e.cy})`} />)}
    </mask>
    <path d={D_BODY} fill="currentColor" mask={`url(#${mask})`} />
  </svg>;
}
