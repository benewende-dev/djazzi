import type { OrbState } from './types';

// DJAZZI(24/11/2026): the orb next to what the agent is doing (the founder's
// ThinkingOrbs, 24/11/2026), on the desktop (components/work-steps.tsx) and the
// phone (components/turn-view.tsx). The D stays the agent's sign; the orb says
// what kind of work it is doing right now.

/** The orb for a tool the agent is calling, by the tool's name. */
export function orbForTool(name: string): OrbState {
  const n = name.toLowerCase();
  if (/mcp|composio/.test(n)) return 'connecting';
  if (/image|video|media|draw|design|cad|slides?|deck/.test(n)) return 'shaping';
  if (/write|edit|create|save|update|rename|copy|mkdir|remove|compose|draft|note/.test(n)) return 'composing';
  if (/search|research|fetch|browse|browser|navigate|page|read|list|glob|grep|stat|exists|parse|find|lookup|get/.test(n)) return 'searching';
  if (/command|exec|code|run|test|build|analy[sz]e|calc/.test(n)) return 'solving';
  if (/skill|plan|task|agent|todo/.test(n)) return 'weaving';
  if (/mcp|composio|connect|call|send|sync|api|app|open/.test(n)) return 'connecting';
  return 'working';
}

/** What the agent is doing now, as the orb shows it. */
export type OrbActivity =
  | { kind: 'tool'; name: string }
  | { kind: 'said' }
  | { kind: 'thinking' }
  | { kind: 'listening' };

export function orbFor(activity: OrbActivity): OrbState {
  switch (activity.kind) {
    case 'tool': return orbForTool(activity.name);
    case 'said': return 'composing';
    case 'thinking': return 'solving';
    case 'listening': return 'listening';
  }
}

/** The orb for a step of work on the phone: its last tool, or the agent's words. */
export function orbForStep(step: { tools: { toolName: string }[] }): OrbState {
  const tool = step.tools[step.tools.length - 1];
  return tool ? orbForTool(tool.toolName) : orbFor({ kind: 'said' });
}
