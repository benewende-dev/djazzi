import { describe, expect, it } from 'vitest';
import { MODE_FRAMES } from '../assets/orbs/engine/registry';
import { resolvePreset } from '../assets/orbs/presets';
import { orbFor, orbForStep, orbForTool } from '../assets/orbs/orb-for';
import type { OrbSize, OrbState } from '../assets/orbs/types';

const STATES: OrbState[] = ['working', 'searching', 'solving', 'listening', 'connecting', 'weaving', 'composing', 'breathing', 'shaping'];
const SIZES: OrbSize[] = [64, 20];

describe('the thinking orbs engine (thinking-orbs, MIT)', () => {
  it('draws every design at both sizes, inside its box', () => {
    for (const state of STATES) {
      for (const size of SIZES) {
        const { mode, opts } = resolvePreset(state, size);
        for (const t of [0, 0.6, 3.7, 12]) {
          const frame = MODE_FRAMES[mode](size, t, opts);
          expect(frame.dots.length, `${state} ${size} ${t}`).toBeGreaterThan(0);
          for (const d of frame.dots) {
            expect(Number.isFinite(d.x) && Number.isFinite(d.y) && d.r > 0).toBe(true);
            expect(d.x).toBeGreaterThan(-size * 0.25);
            expect(d.x).toBeLessThan(size * 1.25);
          }
        }
      }
    }
  });
});

describe('which orb for what the agent does', () => {
  it('reads the tool the agent calls', () => {
    expect(orbForTool('web-search')).toBe('searching');
    expect(orbForTool('file-grep')).toBe('searching');
    expect(orbForTool('file-writeText')).toBe('composing');
    expect(orbForTool('executeCommand')).toBe('solving');
    expect(orbForTool('executeMcpTool')).toBe('connecting');
    expect(orbForTool('composio-execute-tool')).toBe('connecting');
    expect(orbForTool('generate-image')).toBe('shaping');
    expect(orbForTool('loadSkill')).toBe('weaving');
    expect(orbForTool('something-new')).toBe('working');
  });

  it('writes while the agent speaks, and thinks while it reasons', () => {
    expect(orbFor({ kind: 'said' })).toBe('composing');
    expect(orbFor({ kind: 'thinking' })).toBe('solving');
    expect(orbForStep({ tools: [] })).toBe('composing');
    expect(orbForStep({ tools: [{ toolName: 'file-readText' }, { toolName: 'web-search' }] })).toBe('searching');
  });
});
