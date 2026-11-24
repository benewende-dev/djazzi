import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, useColorScheme, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Svg, { Circle, Line } from 'react-native-svg';
import { useReducedMotion } from '@/components/agent-avatar';
import { interfaceText } from '@/djazzi-i18n/mobile/runtime';
import { MODE_FRAMES } from './engine/registry';
import { resolvePreset } from './presets';
import type { OrbFrame } from './engine/types';
import type { OrbSize, OrbState } from './types';

// DJAZZI(24/11/2026): the orb on the phone, drawn with react-native-svg (already
// in the app, where thinking-orbs' own port needs Skia). The geometry is the
// web engine's, unchanged (see ./README.md): this file only draws its dots.
// It runs while the screen shows and the app is in front, at 30 images a
// second (plenty for dots this small); Reduce Motion gets one still frame.

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

const FRAME_MS = 1000 / 30;

/** The engine's ink (0 = darkest) as a grey, mirrored on a dark page, as the web painter does. */
function ink(white: number, dark: boolean): string {
  const w = Math.min(1, Math.max(0, white));
  const g = Math.round((dark ? 1 - w : w) * 255);
  return `rgb(${g},${g},${g})`;
}

export function ThinkingOrb({ state = 'working', size = 20, diameter }: {
  state?: OrbState;
  /** The tuned design: 64 for an avatar, 20 next to text. */
  size?: OrbSize;
  /** Draw the design at another size, in points. */
  diameter?: number;
}) {
  const dark = useColorScheme() === 'dark';
  const reduced = useReducedMotion();
  const [focused, setFocused] = useState(false);
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  useFocusEffect(useCallback(() => { setFocused(true); return () => setFocused(false); }, []));
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => setForeground(next === 'active'));
    return () => subscription.remove();
  }, []);

  const { mode, speed, opts } = useMemo(() => resolvePreset(state, size), [state, size]);
  const build = MODE_FRAMES[mode];
  const now = useCallback(() => (Date.now() / 1000) * speed, [speed]);
  const [frame, setFrame] = useState<OrbFrame>(() => build(size, reduced ? 0.6 : now(), opts));

  useEffect(() => {
    if (reduced) {
      setFrame(build(size, 0.6, opts));
      return;
    }
    setFrame(build(size, now(), opts));
    if (!focused || !foreground) return;
    let raf = 0;
    let last = 0;
    const loop = (at: number) => {
      if (at - last >= FRAME_MS) {
        last = at;
        setFrame(build(size, now(), opts));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [build, size, opts, now, reduced, focused, foreground]);

  const px = diameter ?? size;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={interfaceText(LABELS[state])} style={{ width: px, height: px }}>
      <Svg width={px} height={px} viewBox={`0 0 ${size} ${size}`}>
        {frame.lines.map((l, i) => (
          <Line key={`l${i}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={ink(l.white, dark)} strokeOpacity={l.a ?? 1} strokeWidth={l.w} />
        ))}
        {frame.dots.map((d, i) => (
          <Circle key={i} cx={d.x} cy={d.y} r={d.r} fill={ink(d.white, dark)} fillOpacity={d.a ?? 1} />
        ))}
      </Svg>
    </View>
  );
}
