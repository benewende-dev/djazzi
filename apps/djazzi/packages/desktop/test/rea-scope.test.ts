import { describe, expect, it, vi } from 'vitest';
import { reaConnection, reaScopeKey, withReaScope } from '../assets/rea-scope.js';

describe('REA investigation isolation', () => {
  it('keeps each chat identity across awaits and follow-up turns', async () => {
    const result = await Promise.all(['chat-a', 'chat-b'].map(sessionId => withReaScope({ sessionId, runId: 'first' }, async () => {
      await Promise.resolve();
      return reaScopeKey('djazzi-rea');
    })));
    expect(result).toEqual(['djazzi-rea:chat-a', 'djazzi-rea:chat-b']);
    expect(withReaScope({ sessionId: 'chat-a', runId: 'second' }, () => reaScopeKey('djazzi-rea'))).toBe(result[0]);
    expect(reaScopeKey('djazzi-rea')).toBe('djazzi-rea');
    expect(withReaScope({ runId: 'headless' }, () => reaScopeKey('other'))).toBe('other');
  });

  it('shares a concurrent connection attempt and releases failed attempts', async () => {
    let finish!: (value: string) => void;
    const connect = vi.fn(() => new Promise<string>(resolve => { finish = resolve; }));
    const first = reaConnection('djazzi-rea:one', [], connect);
    const second = reaConnection('djazzi-rea:one', [], connect);
    await Promise.resolve();
    expect(connect).toHaveBeenCalledOnce();
    finish('client');
    expect(await Promise.all([first, second])).toEqual(['client', 'client']);
    await expect(reaConnection('djazzi-rea:failed', [], async () => { throw Error('failed'); })).rejects.toThrow('failed');
    expect(await reaConnection('djazzi-rea:failed', [], async () => 'recovered')).toBe('recovered');
  });

  it('bounds retained REA connections without blocking reuse or unrelated servers', async () => {
    const active = ['djazzi-rea:a', 'djazzi-rea:b'];
    await expect(reaConnection('djazzi-rea:c', active, async () => 'new')).rejects.toThrow('already open');
    expect(await reaConnection('djazzi-rea:a', active, async () => 'existing')).toBe('existing');
    expect(await reaConnection('other', active, async () => 'other')).toBe('other');
  });
});
