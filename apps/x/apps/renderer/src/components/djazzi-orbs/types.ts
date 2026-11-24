// DJAZZI(24/11/2026): the orb's own types, cut from thinking-orbs' src/types.ts
// (its React canvas props stay upstream: Djazzi draws the orb itself, in
// thinking-orb.tsx and thinking-orb.native.tsx). See ./README.md.

/** The nine shipped animations, each hand-tuned. */
export type OrbState = 'working' | 'searching' | 'solving' | 'listening' | 'connecting' | 'weaving' | 'composing' | 'breathing' | 'shaping';

/** 64 (an avatar) and 20 (next to text) are two tuned designs, not one scaled. */
export type OrbSize = 64 | 20;

/** `auto` follows the page (a `.dark` ancestor, then the system). */
export type OrbTheme = 'auto' | 'dark' | 'light';
