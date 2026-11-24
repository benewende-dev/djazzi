// DJAZZI(08/11/2026): Djazzi's own renderer files kept in apps/x (work-steps.tsx,
// baarasseurs-view.tsx) draw the B, the agents' shapes and (24/11/2026) the
// thinking orbs, so apps/x keeps a copy of those modules: its unbranded build (the Electron smoke test) needs
// them. scripts/brand.mjs still copies the sources over them; this keeps the
// copies the same as their sources.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const root = new URL('../../../../../', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), 'utf8');

describe('the renderer copies of the B', () => {
  it.each([
    ['apps/djazzi/packages/desktop/assets/motion/djazzi-mark.tsx', 'apps/x/apps/renderer/src/components/djazzi-mark.tsx'],
    ['apps/djazzi/packages/desktop/assets/desktop/agent-shape.tsx', 'apps/x/apps/renderer/src/components/djazzi-agent-shape.tsx'],
    ['apps/djazzi/packages/control/src/d-mark.ts', 'apps/x/apps/renderer/src/lib/djazzi-d-mark.ts'],
    // DJAZZI(24/11/2026): work-steps.tsx shows the thinking orbs too.
    ...[
      ...['braid', 'core', 'index', 'lattice', 'morph', 'orbits', 'profiles', 'registry', 'ribbon', 'types', 'web'].map((f) => `engine/${f}.ts`),
      'presets.ts', 'theme.ts', 'types.ts', 'orb-for.ts', 'thinking-orb.tsx',
    ].map((f) => [`apps/djazzi/packages/desktop/assets/orbs/${f}`, `apps/x/apps/renderer/src/components/djazzi-orbs/${f}`]),
  ])('%s is copied as is', (source, copy) => {
    expect(read(copy)).toBe(read(source));
  });
});
