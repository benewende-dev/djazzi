import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_LOOK, EMPTY, ideasFor, loadLook, LOOK_KEY, mergeProfile, profileBlock, readSaved, SECTORS, shouldShow } from './model'

// DJAZZI(04/10/2026): the onboarding's logic, without React.

describe('readSaved', () => {
  it('keeps a well-formed record and drops what it does not know', () => {
    const raw = JSON.stringify({ step: 2, profile: { name: '  Awa ', sector: 'Accounting and finance', role: 'Pirate' }, spaceSince: 5, returning: true })
    expect(readSaved(raw)).toEqual({ step: 2, profile: { name: 'Awa', sector: 'Accounting and finance' }, spaceSince: 5, returning: true })
  })

  it('drops an activity no longer offered (26/11/2026: nine in place of twenty-three)', () => {
    expect(SECTORS).toHaveLength(9)
    expect(readSaved(JSON.stringify({ step: 2, profile: { sector: 'Legal' } })).profile.sector).toBeNull()
  })

  it('starts over on anything unreadable', () => {
    expect(readSaved(null)).toEqual(EMPTY)
    expect(readSaved('{"step":9')).toEqual(EMPTY)
    expect(readSaved('{"step":7}').step).toBe(0)
  })
})

describe('shouldShow', () => {
  const saved = (step: 0 | 1 | 2, returning = false) => ({ ...EMPTY, step, returning })

  it('opens without a Djazzi session, after a sign-out too', () => {
    expect(shouldShow({ upstream: false, signedIn: false, saved: saved(0) })).toBe(true)
  })

  it('keeps a new person\'s onboarding going once joined, though the instance says it was done', () => {
    expect(shouldShow({ upstream: false, signedIn: true, saved: saved(1) })).toBe(true)
  })

  it('lets someone who already had an account into the app once joined', () => {
    expect(shouldShow({ upstream: false, signedIn: true, saved: saved(1, true) })).toBe(false)
    expect(shouldShow({ upstream: false, signedIn: true, saved: saved(0) })).toBe(false)
  })
})

describe('the profile in the agent\'s notes', () => {
  const awa = { name: 'Awa', sector: 'Retail and distribution' }

  it('is told only when something was said', () => {
    expect(profileBlock({ name: '', sector: null }, 'fr')).toBe('')
    expect(profileBlock(awa, 'fr')).toContain('- Activity: Retail and distribution\n')
    expect(profileBlock(awa, 'fr')).toContain('- Language of the app: French')
  })

  it('goes first, replaces itself, and keeps the notes the agent took', () => {
    const block = profileBlock(awa, 'en')
    const notes = 'Prefers short answers.'
    const once = mergeProfile(notes, block)
    expect(once.startsWith(block)).toBe(true)
    expect(once).toContain(notes)
    const again = mergeProfile(once, profileBlock({ ...awa, name: 'Awa T.' }, 'en'))
    expect(again.match(/Told at sign-up/g)).toHaveLength(1)
    expect(again).toContain('First name: Awa T.')
    expect(again).toContain(notes)
    expect(mergeProfile(again, '')).toBe(`${notes}\n`)
  })
})

describe('first requests', () => {
  it('fit the activity, and anyone without one', () => {
    expect(ideasFor('Construction and crafts')[0].title).toBe('Plan the week on site')
    expect(ideasFor(null)).toHaveLength(3)
    expect(ideasFor('Other')).toEqual(ideasFor(null))
  })
})

describe('the person\'s Djazzi', () => {
  afterEach(() => vi.unstubAllGlobals())
  const storage = (value: string | null) => vi.stubGlobal('localStorage', { getItem: (k: string) => (k === LOOK_KEY ? value : null) })

  it('keeps a look it offers, and falls back on the D in white', () => {
    storage(JSON.stringify({ shape: 'drop', color: 'violet' }))
    expect(loadLook()).toEqual({ shape: 'drop', color: 'violet' })
    storage(JSON.stringify({ shape: 'kite', color: 'gold' }))
    expect(loadLook()).toEqual(DEFAULT_LOOK)
    storage('{oops')
    expect(loadLook()).toEqual(DEFAULT_LOOK)
  })
})
