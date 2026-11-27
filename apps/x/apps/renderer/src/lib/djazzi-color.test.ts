// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// DJAZZI(27/11/2026): the colour of your Djazzi, the app's accent.

let store: Map<string, string>
beforeEach(() => {
  store = new Map()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  })
  vi.resetModules()
  delete document.documentElement.dataset.djazziColor
})
afterEach(() => vi.unstubAllGlobals())

describe('the colour of your Djazzi', () => {
  it('is on the page from the first paint, the one kept on this computer', async () => {
    store.set('djazzi.look.v1', JSON.stringify({ shape: 'drop', color: 'violet' }))
    await import('./djazzi-color')
    expect(document.documentElement.dataset.djazziColor).toBe('violet')
  })

  it('changes the colour, keeps the shape, and tells the app', async () => {
    store.set('djazzi.look.v1', JSON.stringify({ shape: 'drop', color: 'violet' }))
    const { setColor } = await import('./djazzi-color')
    const heard = vi.fn()
    window.addEventListener('djazzi-color', heard)
    setColor('orange')
    expect(JSON.parse(store.get('djazzi.look.v1')!)).toEqual({ shape: 'drop', color: 'orange' })
    expect(document.documentElement.dataset.djazziColor).toBe('orange')
    expect(heard).toHaveBeenCalledOnce()
  })

  it('falls back on white, the brand blue, for a colour it does not offer', async () => {
    store.set('djazzi.look.v1', JSON.stringify({ shape: 'b', color: 'gold' }))
    const { currentColor } = await import('./djazzi-color')
    expect(currentColor()).toBe('white')
  })
})
