import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DjazziOnboarding } from './index'
import { LOOK_KEY, STORAGE_KEY } from './model'

// DJAZZI(04/10/2026): the onboarding validated by the founder. 26/11/2026:
// one flow of five screens: welcome, account, you, tools, ready.

vi.mock('@/components/settings/mobile-channels-settings', () => ({ MobileChannelsSettings: () => <div>Phone pairing</div> }))

class ResizeObserverStub { observe() {} unobserve() {} disconnect() {} }
;(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub

let store: Map<string, string>
let calls: Array<[string, unknown]>
let state: { signedIn: boolean; mode: 'child' | 'remote'; notes: string }
let didConnect: ((event: { provider: string; success: boolean }) => void) | null

beforeEach(() => {
  // DJAZZI(13/10/2026): JSDOM has no media-query API; functional
  // onboarding tests use the supported reduced-motion preference.
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
  store = new Map()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  })
  calls = []
  didConnect = null
  state = { signedIn: false, mode: 'child', notes: 'Prefers short answers.' }
  ;(window as unknown as { ipc: unknown }).ipc = {
    on: (channel: string, fn: (event: { provider: string; success: boolean }) => void) => {
      if (channel === 'oauth:didConnect') didConnect = fn
      return () => undefined
    },
    invoke: async (channel: string, args: unknown) => {
      calls.push([channel, args])
      switch (channel) {
        case 'oauth:getState': return { config: { rowboat: { connected: state.signedIn }, google: { connected: false } } }
        case 'server:getConnection': return { mode: state.mode, url: null, fromEnv: false }
        case 'oauth:list-providers': return { providers: ['google', 'microsoft'] }
        case 'oauth:connect': return { success: true }
        case 'workspace:readFile': return { data: state.notes }
        case 'workspace:writeFile': return {}
        default: throw new Error(`no handler: ${channel}`)
      }
    },
  }
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

const saved = (value: object) => store.set(STORAGE_KEY, JSON.stringify(value))

describe('DjazziOnboarding', () => {
  it('welcomes once, then opens the sign-in, for a new account or an existing one', async () => {
    render(<DjazziOnboarding open onComplete={() => {}} />)
    expect(screen.getAllByText('Welcome to Djazzi')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Get started' }))
    fireEvent.click(screen.getByRole('button', { name: 'I already have an account' }))
    await waitFor(() => expect(calls.some(([c, a]) => c === 'oauth:connect' && (a as { provider: string }).provider === 'rowboat')).toBe(true))
    expect(JSON.parse(store.get(STORAGE_KEY)!).returning).toBe(true)
    expect(screen.getByText('Enter your email in the window that opened, then the code you receive. Closed it? Click again.')).toBeTruthy()
  })

  it('carries a new account on to the person once signed in, the space preparing meanwhile', async () => {
    saved({ step: 1, profile: {}, spaceSince: Date.now() })
    render(<DjazziOnboarding open onComplete={() => {}} />)
    await waitFor(() => expect(didConnect).not.toBeNull())
    didConnect!({ provider: 'rowboat', success: true })
    await waitFor(() => expect(screen.getByText('Let’s get to know each other')).toBeTruthy())
    expect(screen.getByText('Your space is being prepared… the app connects by itself.')).toBeTruthy()
  })

  it('picks up where it was after the reload that joins the instance', async () => {
    saved({ step: 2, profile: { name: 'Awa' }, spaceSince: Date.now() })
    state = { ...state, signedIn: true, mode: 'remote' }
    render(<DjazziOnboarding open onComplete={() => {}} />)
    expect((screen.getByLabelText('Your first name') as HTMLInputElement).value).toBe('Awa')
    await waitFor(() => expect(screen.getByText('Your space is ready')).toBeTruthy())
  })

  it('steps over the account screen when already signed in', async () => {
    state = { ...state, signedIn: true }
    render(<DjazziOnboarding open onComplete={() => {}} />)
    await waitFor(() => expect(calls.some(([c]) => c === 'oauth:getState')).toBe(true))
    await new Promise((r) => setTimeout(r, 0))
    fireEvent.click(screen.getByRole('button', { name: 'Get started' }))
    expect(screen.getByText('Let’s get to know each other')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByText('Welcome to Djazzi')).toBeTruthy()
  })

  it('keeps the person, their Djazzi and their activity, and hands the task they picked to the composer', async () => {
    saved({ step: 2, profile: {}, spaceSince: 1 })
    const onComplete = vi.fn()
    render(<DjazziOnboarding open onComplete={onComplete} />)
    fireEvent.change(screen.getByLabelText('Your first name'), { target: { value: 'Awa' } })
    fireEvent.click(screen.getByRole('radio', { name: 'Drop' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Violet' }))
    expect(JSON.parse(store.get(LOOK_KEY) ?? '{}')).toEqual({ shape: 'drop', color: 'violet' })
    fireEvent.click(screen.getByText('Construction and crafts'))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    // Only the tools that work today, and one way on.
    expect(screen.queryByText('Notion')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    expect(screen.getByText('All set, Awa')).toBeTruthy()
    fireEvent.click(screen.getByText('Plan the week on site'))
    expect(screen.getByText('Help me plan the work of the week: who does what, and when.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Open Djazzi' }))
    await waitFor(() => expect(onComplete).toHaveBeenCalledWith({ prompt: 'Help me plan the work of the week: who does what, and when.' }))
    const write = calls.find(([c]) => c === 'workspace:writeFile')![1] as { path: string; data: string }
    expect(write.path).toBe('knowledge/Agent Notes/user.md')
    expect(write.data).toContain('- First name: Awa')
    expect(write.data).toContain('- Activity: Construction and crafts')
    expect(write.data).toContain('Prefers short answers.')
    expect(store.has(STORAGE_KEY)).toBe(false)
  })

  it('opens the app with an empty composer when no task was picked', async () => {
    saved({ step: 4, profile: {}, spaceSince: 1 })
    const onComplete = vi.fn()
    render(<DjazziOnboarding open onComplete={onComplete} />)
    fireEvent.click(screen.getByRole('button', { name: 'Open Djazzi' }))
    await waitFor(() => expect(onComplete).toHaveBeenCalledWith(undefined))
  })

  it('lets someone who already had an account into the app once joined', async () => {
    saved({ step: 1, profile: {}, spaceSince: 1, returning: true })
    state = { ...state, signedIn: true, mode: 'remote' }
    const onComplete = vi.fn()
    render(<DjazziOnboarding open onComplete={onComplete} />)
    await waitFor(() => expect(onComplete).toHaveBeenCalledWith())
  })

  it('offers a way out when the space does not open (26/11/2026)', async () => {
    saved({ step: 1, profile: {}, spaceSince: Date.now() - 120_000, returning: true })
    state = { ...state, signedIn: true }
    const onComplete = vi.fn()
    render(<DjazziOnboarding open onComplete={onComplete} />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Open Djazzi now' }))
    expect(onComplete).toHaveBeenCalledWith()
    expect(store.has(STORAGE_KEY)).toBe(false)
  })

  it('shows nothing when closed', () => {
    const { container } = render(<DjazziOnboarding open={false} onComplete={() => {}} />)
    expect(container.innerHTML).toBe('')
  })
})
