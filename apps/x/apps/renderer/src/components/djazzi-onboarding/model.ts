import type { ShapeId } from '@/lib/djazzi-d-mark'
import type { Profile } from '@x/shared/dist/djazzi-profile.js'

// DJAZZI(04/10/2026): Djazzi's onboarding. Its logic lives here, without
// React. 26/11/2026 (founder's mockup): one flow of five screens in place
// of the intro and the steps that followed it: welcome, the account (the
// space prepares meanwhile), who the person is, their tools, a first task.
//
// Joining the instance reloads every window (cloud-link), and so does a
// change of language: the step and the answers are kept in this window's
// storage so the onboarding picks up where it was.

/** Welcome, account, you, tools, ready. */
export type Step = 0 | 1 | 2 | 3 | 4

export type { Profile }

export interface Saved {
  step: Step
  profile: Profile
  /** When the space started being prepared (ms), for its progress across a reload. */
  spaceSince: number | null
  /** « I already have an account »: once joined, straight to the app. */
  returning: boolean
}

export const STORAGE_KEY = 'djazzi-onboarding'

export const EMPTY: Saved = { step: 0, profile: { name: '', sector: null }, spaceSince: null, returning: false }

const isStep = (v: unknown): v is Step => v === 0 || v === 1 || v === 2 || v === 3 || v === 4
const text = (v: unknown, max: number): string | null => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)

/** What a window kept, read leniently: anything unreadable starts over. */
export function readSaved(raw: string | null): Saved {
  try {
    const parsed = JSON.parse(raw ?? 'null') as Partial<Saved> | null
    if (!parsed || typeof parsed !== 'object') return EMPTY
    const p = (parsed.profile ?? {}) as Partial<Profile>
    return {
      step: isStep(parsed.step) ? parsed.step : 0,
      profile: {
        name: text(p.name, 60) ?? '',
        sector: SECTORS.includes(p.sector as string) ? (p.sector as string) : null,
      },
      spaceSince: typeof parsed.spaceSince === 'number' ? parsed.spaceSince : null,
      returning: parsed.returning === true,
    }
  } catch {
    return EMPTY
  }
}

export function loadSaved(): Saved {
  try {
    return readSaved(localStorage.getItem(STORAGE_KEY))
  } catch {
    return EMPTY
  }
}

export function storeSaved(saved: Saved): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
  } catch {
    // Storage refused: a reload starts over, nothing else breaks.
  }
}

export function clearSaved(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing kept to clear.
  }
}

/**
 * Whether the window opens the onboarding. An instance always says it was
 * done (instance seed.ts), so after joining it, the window's own record
 * keeps a new person's onboarding going; and without a Djazzi session the
 * onboarding is where one signs in, after a sign-out too.
 */
export function shouldShow({ upstream, signedIn, saved }: { upstream: boolean; signedIn: boolean; saved: Saved }): boolean {
  return upstream || !signedIn || (saved.step >= 1 && !saved.returning)
}

/** The activities offered, in English: the app's French layer translates them. */
export const SECTORS = [
  'Retail and distribution', 'Services and consulting', 'Accounting and finance', 'Construction and crafts',
  'Transport and logistics', 'Farming and livestock', 'Health and pharmacy', 'Education and training', 'Other',
]

/** Six shapes and six colours of the phone's twelve and eleven: enough to choose, quick to scan. */
export const SHAPE_CHOICES = [
  { id: 'b', label: 'D' },
  { id: 'round', label: 'Round' },
  { id: 'pebble', label: 'Pebble' },
  { id: 'drop', label: 'Drop' },
  { id: 'square', label: 'Square' },
  { id: 'dome', label: 'Dome' },
] as const satisfies ReadonlyArray<{ id: ShapeId; label: string }>

export const COLOR_CHOICES = [
  { id: 'white', label: 'White' },
  { id: 'orange', label: 'Orange' },
  { id: 'blue', label: 'Blue' },
  { id: 'green', label: 'Green' },
  { id: 'violet', label: 'Violet' },
  { id: 'rose', label: 'Pink' },
] as const

/** The person's Djazzi, as the phone keeps it (agent-shape.tsx `djazzi.look.v1`). */
export const LOOK_KEY = 'djazzi.look.v1'

export interface Look {
  shape: ShapeId
  color: string
}

export const DEFAULT_LOOK: Look = { shape: 'b', color: 'white' }

/** The look kept on this computer, read leniently. */
export function loadLook(): Look {
  try {
    const raw = JSON.parse(localStorage.getItem(LOOK_KEY) ?? 'null') as Partial<Look> | null
    const shape = SHAPE_CHOICES.find((c) => c.id === raw?.shape)?.id
    const color = COLOR_CHOICES.find((c) => c.id === raw?.color)?.id
    return { shape: shape ?? DEFAULT_LOOK.shape, color: color ?? DEFAULT_LOOK.color }
  } catch {
    return DEFAULT_LOOK
  }
}

export function storeLook(look: Look): void {
  try {
    localStorage.setItem(LOOK_KEY, JSON.stringify(look))
  } catch {
    // A private window: the default look next time.
  }
}

export interface Idea {
  title: string
  detail: string
  /** What lands in the composer, for the person to read before sending. */
  prompt: string
}

const SELLING: Idea[] = [
  { title: 'Follow up on an unpaid invoice', detail: 'Djazzi writes the reminder, you read it over', prompt: 'Help me write a polite reminder to a client about an unpaid invoice.' },
  { title: 'Prepare a quote', detail: 'From a few lines of description', prompt: 'Help me prepare a quote for a client. Here is what they need:' },
  { title: 'Review my emails of the week', detail: 'What needs an answer, what can wait', prompt: 'Go through my emails of the week: what needs an answer from me, and what can wait?' },
]
const ADVISING: Idea[] = [
  { title: 'Prepare a client meeting', detail: 'An agenda and the questions to ask', prompt: 'Help me prepare my next client meeting: an agenda and the questions to ask.' },
  { title: 'Write a proposal', detail: 'Clear, structured, ready to send', prompt: 'Help me write a proposal for a client. Here is the context:' },
  { title: 'Review my emails of the week', detail: 'What needs an answer, what can wait', prompt: 'Go through my emails of the week: what needs an answer from me, and what can wait?' },
]
const FIELD: Idea[] = [
  { title: 'Plan the week on site', detail: 'Who does what, and when', prompt: 'Help me plan the work of the week: who does what, and when.' },
  { title: 'Prepare a quote', detail: 'From a few lines of description', prompt: 'Help me prepare a quote for a client. Here is what they need:' },
  { title: 'Follow up on a supplier', detail: 'Djazzi writes the message, you read it over', prompt: 'Help me write a message to follow up on a supplier who is late.' },
]
const CARING: Idea[] = [
  { title: 'Organize my week', detail: 'Appointments, priorities, reminders', prompt: 'Help me organize my week: appointments, priorities and reminders.' },
  { title: 'Write a clear notice', detail: 'For parents, patients or the team', prompt: 'Help me write a clear notice. Here is what it is about:' },
  { title: 'Summarize a document', detail: 'The essentials in a few lines', prompt: 'Summarize this document for me in a few lines:' },
]
const ANYONE: Idea[] = [
  { title: 'Review my emails of the week', detail: 'What needs an answer, what can wait', prompt: 'Go through my emails of the week: what needs an answer from me, and what can wait?' },
  { title: 'Organize my week', detail: 'Appointments, priorities, reminders', prompt: 'Help me organize my week: appointments, priorities and reminders.' },
  { title: 'Write a professional message', detail: 'The right tone, in a minute', prompt: 'Help me write a professional message. Here is what I want to say:' },
]

const IDEAS_BY_SECTOR: Record<string, Idea[]> = {
  'Retail and distribution': SELLING,
  'Services and consulting': ADVISING, 'Accounting and finance': ADVISING,
  'Construction and crafts': FIELD, 'Transport and logistics': FIELD, 'Farming and livestock': FIELD,
  'Health and pharmacy': CARING, 'Education and training': CARING,
}

/** Three first requests, picked for the activity chosen. */
export function ideasFor(sector: string | null): Idea[] {
  return (sector && IDEAS_BY_SECTOR[sector]) || ANYONE
}

// DJAZZI(27/11/2026): the block on the person is shared with the phone
// (@x/shared djazzi-profile), so both write it the same way.
export { mergeProfile, PROFILE_FILE, profileBlock } from '@x/shared/dist/djazzi-profile.js'

/** The space takes about a minute; past this, the onboarding says it is slow. */
export const SLOW_SPACE_MS = 150_000
