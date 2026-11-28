import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowRight, ArrowUp, Check, ChevronDown, ChevronLeft, Loader2, MessageCircle, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { MobileChannelsSettings } from '@/components/settings/mobile-channels-settings'
import { GmailIcon, OutlookIcon } from '@/components/onboarding/provider-icons'
import { fillOf, Shape } from './shape'
import { applyColor } from '@/lib/djazzi-color'
import {
  clearSaved, COLOR_CHOICES, ideasFor, loadLook, loadSaved, mergeProfile, profileBlock, PROFILE_FILE, SECTORS,
  SHAPE_CHOICES, SLOW_SPACE_MS, storeLook, storeSaved, type Look, type Profile, type Saved, type Step,
} from './model'

// DJAZZI(04/10/2026): Djazzi's onboarding, in place of the upstream's in
// App.tsx only (the upstream's files stay as they are). model.ts says why
// it keeps its place across reloads.
//
// 26/11/2026 (founder's mockup « Accueil Djazzi »): one full-window flow, one
// style, five screens, where there were an intro and a dialog of steps
// asking the same things twice. Welcome (the language at the top), the
// account (the space prepares meanwhile, shown by a pill below), the person
// (first name, their Djazzi, their activity), their tools (only those that
// work today), and a first task to read before sending.
//
// 28/11/2026 (founder's mockup « Onboarding Djazzi », after OpenBot, MIT):
// the words and controls on the left, the step's live demo in a panel on
// the right. The buttons sit at the same place on every step, so moving on
// never moves what the person is about to press; where they are is one line
// (« Step 2 of 5 ») that opens the list. A step comes in from the way the
// journey goes, by 24 px at most, and focus moves to its heading. The last
// button says what happens: Saving…, then Ready, green with a check.

interface DjazziOnboardingProps {
  open: boolean
  onComplete: (opts?: { prompt?: string }) => void
}

const STEP_COUNT = 5
/** Each step's name in the list of steps. */
const STEP_NAMES = ['Welcome', 'Your account', 'About you', 'Your tools', 'Your first task'] as const

/** For text put in a field, which the French layer does not see (desktop i18n/index.ts). */
const say = (text: string) => (window as { __djazziText?: (t: string) => string }).__djazziText?.(text) ?? text

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const CSS = `
@keyframes dj-rise{0%{opacity:0;transform:translateY(16px)}100%{opacity:1;transform:none}}
@keyframes dj-pop{0%{opacity:0;transform:scale(.5) translateY(20px)}70%{opacity:1;transform:scale(1.06) translateY(-4px)}100%{opacity:1;transform:none}}
@keyframes dj-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
@keyframes dj-hop{0%,100%{transform:translateY(0)}30%{transform:translateY(-28px)}55%{transform:translateY(0)}70%{transform:translateY(-8px)}}
@keyframes dj-blink{0%,44%,50%,100%{transform:scaleY(1)}47%{transform:scaleY(.1)}}
@keyframes dj-dim{0%,100%{opacity:.25}50%{opacity:1}}
@keyframes dj-fwd{0%{opacity:0;transform:translateX(24px)}100%{opacity:1;transform:none}}
@keyframes dj-back{0%{opacity:0;transform:translateX(-24px)}100%{opacity:1;transform:none}}
@keyframes dj-fade{0%{opacity:0}100%{opacity:1}}
@keyframes dj-caret{0%,49%{opacity:1}50%,100%{opacity:0}}
@keyframes dj-work{0%{width:18%}100%{width:86%}}
.dj-rise{animation:dj-rise .55s cubic-bezier(.2,.8,.2,1) both}
.dj-pop{animation:dj-pop .7s cubic-bezier(.2,.9,.3,1.2) both}
.dj-bob{animation:dj-bob 3.2s ease-in-out infinite}
.dj-hop{animation:dj-hop 1.8s ease-in-out infinite}
.dj-eye{animation:dj-blink 4.2s infinite;transform-box:fill-box;transform-origin:center}
.dj-dim{animation:dj-dim 1.2s ease-in-out infinite}
.dj-fwd{animation:dj-fwd .35s cubic-bezier(.2,.8,.2,1) both}
.dj-back{animation:dj-back .35s cubic-bezier(.2,.8,.2,1) both}
.dj-fade{animation:dj-fade .45s ease both}
.dj-caret{animation:dj-caret 1s steps(1) infinite}
.dj-work{animation:dj-work 4.5s cubic-bezier(.4,0,.2,1) both}
.dj-d2{animation-delay:.12s}.dj-d3{animation-delay:.24s}.dj-d4{animation-delay:.36s}.dj-d5{animation-delay:.5s}
@media (prefers-reduced-motion: reduce){.dj-root *{animation:none !important}}
`

const ring = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]'
const primary = cn('flex h-12 items-center justify-center gap-2 rounded-full bg-white px-7 text-[15px] font-semibold text-[#0A0A0A] transition-[opacity,background-color] hover:opacity-90 disabled:opacity-50', ring)
const secondary = cn('flex h-12 items-center justify-center gap-1.5 rounded-full border border-[#3A3A3C] px-5 text-[15px] font-medium text-white transition-colors hover:bg-white/5 disabled:opacity-50', ring)
const label = 'text-[13px] text-[#A1A1A6]'
/** A step's heading: focus moves to it when the step changes. */
const heading = 'm-0 font-serif font-normal outline-none'

function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('size-5 shrink-0 animate-spin text-white', className)} aria-hidden="true" />
}

function Tick() {
  return <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#30D158]"><Check className="size-3 text-[#0A0A0A]" strokeWidth={3} aria-hidden="true" /></span>
}

// ── 1. Welcome ────────────────────────────────────────────────────────────

function WelcomeStep() {
  return (
    <>
      <h1 data-dj-heading tabIndex={-1} className={cn(heading, 'text-[52px] leading-[56px] tracking-[-0.5px]')}>Colleagues who work for you</h1>
      <p className="m-0 max-w-[400px] text-[17px] leading-[27px] text-[#B5B5B5]">Tell them what to do, in plain words. Djazzi prepares the work, and nothing goes out without your approval.</p>
      <p className="m-0 text-[13px] text-[#8E8E93]">On your computer, your phone and the web: the same conversation.</p>
    </>
  )
}

// ── 2. Account ────────────────────────────────────────────────────────────

/** Waiting for the space since `since`: past this, a way out (26/11/2026). */
const OPENING_TOO_LONG_MS = 90_000

function useLate(since: number | null, active: boolean, after: number): boolean {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const timer = window.setInterval(() => setNow(Date.now()), 3000)
    return () => window.clearInterval(timer)
  }, [active])
  return active && since !== null && now - since > after
}

function AccountStep({ signedIn, connecting, returning, since, onSignIn, onOpenAnyway }: {
  signedIn: boolean; connecting: boolean; returning: boolean; since: number | null
  onSignIn: (returning: boolean) => void; onOpenAnyway: () => void
}) {
  // 26/11/2026: a space that never opens (a refused link: the app says why
  // in a dialog) left this screen turning for good. Past a minute and a half,
  // the person can try again or open the app as it is.
  const late = useLate(since, signedIn && returning, OPENING_TOO_LONG_MS)
  if (signedIn && returning) {
    return (
      <>
        <h2 data-dj-heading tabIndex={-1} className={cn(heading, 'text-[46px] leading-[50px]')}>Welcome back</h2>
        {late ? (
          <>
            <p role="status" className="m-0 max-w-[430px] text-[16px] leading-[25px] text-[#B5B5B5]">Your space is taking longer than usual to open. Try again, or open Djazzi now: it connects as soon as your space answers.</p>
            <div className="flex flex-wrap gap-2.5">
              <button type="button" className={secondary} onClick={onOpenAnyway}>Open Djazzi now</button>
              <button type="button" autoFocus className={primary} onClick={() => onSignIn(true)}>Try again</button>
            </div>
          </>
        ) : (
          <p role="status" className="m-0 flex items-center gap-3 text-[16px] leading-[25px] text-[#B5B5B5]"><Spinner />Djazzi is opening your space and everything you left in it.</p>
        )}
      </>
    )
  }
  return (
    <>
      <h2 data-dj-heading tabIndex={-1} className={cn(heading, 'text-[46px] leading-[50px]')}>Your account</h2>
      <p className="m-0 max-w-[420px] text-[16px] leading-[25px] text-[#B5B5B5]">Sign in with your email: Djazzi sends you a code. No password to remember.</p>
      {/* Enabled while signing in: a sign-in window closed by mistake opens again. */}
      <div className="mt-1.5 flex max-w-[380px] flex-col gap-2.5">
        <button type="button" autoFocus className={primary} onClick={() => onSignIn(false)}>Create my account</button>
        <button type="button" className={secondary} onClick={() => onSignIn(true)}>I already have an account</button>
      </div>
      <p role="status" className="m-0 flex min-h-5 items-center gap-2.5 text-[13px] text-[#8E8E93]">
        {connecting && <Spinner className="size-4" />}
        {connecting ? 'Enter your email in the window that opened, then the code you receive. Closed it? Click again.' : 'Your private space gets ready while you carry on.'}
      </p>
    </>
  )
}

// ── 3. You ────────────────────────────────────────────────────────────────

function YouStep({ profile, look, onProfile, onLook, onNext }: {
  profile: Profile; look: Look; onProfile: (p: Profile) => void; onLook: (l: Look) => void; onNext: () => void
}) {
  const chip = (on: boolean) => cn(
    'h-[38px] rounded-full border px-3.5 text-sm transition-colors', ring,
    on ? 'border-white bg-white text-[#0A0A0A]' : 'border-[#3A3A3C] text-[#D6D6D6] hover:text-white',
  )
  return (
    <>
      <h2 data-dj-heading tabIndex={-1} className={cn(heading, 'text-[46px] leading-[50px]')}>Let’s get to know each other</h2>
      <div className="flex flex-col gap-2">
        <label htmlFor="djazzi-onboarding-name" className={label}>Your first name</label>
        <input
          id="djazzi-onboarding-name"
          autoFocus
          value={profile.name}
          onChange={(e) => onProfile({ ...profile, name: e.target.value.slice(0, 60) })}
          onKeyDown={(e) => { if (e.key === 'Enter') onNext() }}
          autoComplete="given-name"
          placeholder="Your first name"
          className="h-12 rounded-2xl border border-[#2C2C2E] bg-[#1C1C1E] px-4 text-base text-white outline-none placeholder:text-[#6E6E73] focus:border-[#8E8E93]"
        />
      </div>
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className={cn(label, 'mb-2 p-0')}>The face of your Djazzi</legend>
        <div className="flex flex-wrap items-center gap-2">
          <div role="radiogroup" aria-label="Shape" className="flex gap-2">
            {SHAPE_CHOICES.map((s) => (
              <button
                key={s.id} type="button" role="radio" aria-checked={look.shape === s.id} aria-label={s.label}
                onClick={() => onLook({ ...look, shape: s.id })}
                className={cn('flex size-12 items-center justify-center rounded-2xl border-2 bg-[#1C1C1E]', ring, look.shape === s.id ? 'border-white' : 'border-transparent')}
              >
                <Shape shape={s.id} color={look.color} size={30} />
              </button>
            ))}
          </div>
          <span className="w-2" aria-hidden="true" />
          <div role="radiogroup" aria-label="Colour" className="flex gap-1.5">
            {COLOR_CHOICES.map((c) => (
              <button
                key={c.id} type="button" role="radio" aria-checked={look.color === c.id} aria-label={c.label}
                onClick={() => onLook({ ...look, color: c.id })}
                className={cn('size-[30px] rounded-full border-[3px] border-[#0A0A0A]', ring, look.color === c.id && 'shadow-[0_0_0_2px_#FFFFFF]')}
                style={{ background: fillOf(c.id) }}
              />
            ))}
          </div>
        </div>
      </fieldset>
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className={cn(label, 'mb-2 p-0')}>Your activity</legend>
        <div className="flex flex-wrap gap-2">
          {SECTORS.map((s) => (
            <button key={s} type="button" aria-pressed={profile.sector === s} className={chip(profile.sector === s)} onClick={() => onProfile({ ...profile, sector: profile.sector === s ? null : s })}>{s}</button>
          ))}
        </div>
      </fieldset>
    </>
  )
}

// ── 4. Tools ──────────────────────────────────────────────────────────────

type Mail = 'google' | 'microsoft'

function useTools() {
  const [providers, setProviders] = useState<string[]>([])
  const [connected, setConnected] = useState<Record<Mail, boolean>>({ google: false, microsoft: false })
  const [connecting, setConnecting] = useState<Mail | null>(null)
  const [phoneOpen, setPhoneOpen] = useState(false)
  useEffect(() => {
    let live = true
    void Promise.all([
      window.ipc.invoke('oauth:list-providers', null).catch(() => ({ providers: [] as string[] })),
      window.ipc.invoke('oauth:getState', null).catch(() => null),
    ]).then(([list, state]) => {
      if (!live) return
      setProviders(list.providers ?? [])
      const config = (state?.config ?? {}) as Record<string, { connected?: boolean } | undefined>
      setConnected({ google: !!config.google?.connected, microsoft: !!config.microsoft?.connected })
    })
    return () => { live = false }
  }, [])
  useEffect(() => window.ipc.on('oauth:didConnect', (event) => {
    if (event.provider !== 'google' && event.provider !== 'microsoft') return
    setConnecting(null)
    if (event.success) setConnected((prev) => ({ ...prev, [event.provider]: true }))
  }), [])
  const connect = async (provider: Mail) => {
    setConnecting(provider)
    const result = await window.ipc.invoke('oauth:connect', { provider }).catch(() => ({ success: false }))
    if (!result.success) setConnecting(null)
  }
  /** Something connected, or the phone pairing opened: the way on is Continue, not Skip. */
  const anything = connected.google || connected.microsoft || phoneOpen
  return { providers, connected, connecting, connect, phoneOpen, openPhone: () => setPhoneOpen(true), anything }
}

type ToolState = 'connected' | 'connecting' | 'idle' | 'blocked'

function ToolRow({ icon, name, text, state, onConnect }: { icon: ReactNode; name: string; text: string; state: ToolState; onConnect: () => void }) {
  return (
    <li className="flex items-center gap-3.5 rounded-2xl bg-[#1C1C1E] px-3.5 py-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#2C2C2E]">{icon}</div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[15px] font-semibold">{name}</span>
        <span className="text-[13px] text-[#A1A1A6]">{text}</span>
      </div>
      {state === 'connected' ? (
        <span role="status" className="flex items-center gap-1.5 text-[13px] font-semibold text-[#30D158]"><Check className="size-4" aria-hidden="true" />Connected</span>
      ) : (
        <button
          type="button" disabled={state !== 'idle'} onClick={onConnect} aria-label={`Connect ${name}`}
          className={cn('h-9 rounded-full border border-[#3A3A3C] px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-white/5 disabled:opacity-40', ring)}
        >
          {state === 'connecting' ? <Loader2 className="size-4 animate-spin" /> : 'Connect'}
        </button>
      )}
    </li>
  )
}

function ToolsStep({ tools }: { tools: ReturnType<typeof useTools> }) {
  const { providers, connected, connecting, connect, phoneOpen, openPhone } = tools
  const mailState = (provider: Mail, other: Mail): ToolState =>
    connected[provider] ? 'connected' : connecting === provider ? 'connecting' : connected[other] || connecting ? 'blocked' : 'idle'
  return (
    <>
      <h2 data-dj-heading tabIndex={-1} className={cn(heading, 'text-[46px] leading-[50px]')}>Connect your tools</h2>
      <p className="m-0 text-[15px] leading-[23px] text-[#B5B5B5]">Your bots prepare, you approve. You can change everything later in Settings › Connections.</p>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {providers.includes('google') && (
          <ToolRow
            icon={<GmailIcon className="size-5" />} name="Gmail and Google Calendar"
            text={connected.microsoft ? 'One email account at a time' : 'Your Google email and calendar'}
            state={mailState('google', 'microsoft')} onConnect={() => void connect('google')}
          />
        )}
        {providers.includes('microsoft') && (
          <ToolRow
            icon={<OutlookIcon className="size-5" />} name="Outlook and calendar"
            text={connected.google ? 'One email account at a time' : 'Microsoft 365 or Outlook.com'}
            state={mailState('microsoft', 'google')} onConnect={() => void connect('microsoft')}
          />
        )}
        <ToolRow icon={<MessageCircle className="size-5 text-[#25D366]" />} name="WhatsApp" text="Talk to your bots from your phone" state="idle" onConnect={openPhone} />
        <ToolRow icon={<Send className="size-5 text-[#229ED9]" />} name="Telegram" text="Chat with Djazzi like with a contact" state="idle" onConnect={openPhone} />
      </ul>
      {phoneOpen && (
        <div className="dj-rise max-h-[260px] overflow-y-auto rounded-2xl border border-[#2C2C2E] p-4">
          <MobileChannelsSettings dialogOpen />
        </div>
      )}
    </>
  )
}

// ── 5. Ready ──────────────────────────────────────────────────────────────

function ReadyStep({ profile, picked, onPick, finishing }: {
  profile: Profile; picked: number | null; onPick: (i: number) => void; finishing: boolean
}) {
  const name = profile.name.trim()
  return (
    <>
      <h2 data-dj-heading tabIndex={-1} className={cn(heading, 'text-[50px] leading-[54px]')}>{name ? `All set, ${name}` : 'All set'}</h2>
      <p className="m-0 text-[16px] leading-[25px] text-[#B5B5B5]">To start, hand it one of these tasks. Or write your own.</p>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {ideasFor(profile.sector).map((idea, i) => (
          <li key={idea.title}>
            <button
              type="button" aria-pressed={picked === i} disabled={finishing} onClick={() => onPick(i)}
              className={cn(
                'flex w-full items-center gap-3.5 rounded-2xl border px-4 py-3.5 text-left transition-colors', ring,
                picked === i ? 'border-[#8E8E93] bg-[#2C2C2E]' : 'border-transparent bg-[#1C1C1E] hover:bg-[#242426]',
              )}
            >
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[15px] font-semibold">{idea.title}</span>
                <span className="text-[13px] text-[#A1A1A6]">{idea.detail}</span>
              </span>
              {picked === i ? <Check className="size-4 text-white" aria-hidden="true" /> : <ArrowRight className="size-4 text-[#A1A1A6]" aria-hidden="true" />}
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}

// ── The space, prepared meanwhile ─────────────────────────────────────────

function SpacePill({ joined, since }: { joined: boolean; since: number | null }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (joined) return
    const timer = window.setInterval(() => setNow(Date.now()), 5000)
    return () => window.clearInterval(timer)
  }, [joined])
  const slow = !joined && since !== null && now - since > SLOW_SPACE_MS
  return (
    <div role="status" className="flex items-center gap-2.5 self-start rounded-full bg-[#1C1C1E] py-2 pl-2.5 pr-3.5 text-[13px] text-[#D6D6D6]">
      {joined ? <Tick /> : <Spinner className="size-[18px]" />}
      {joined
        ? 'Your space is ready'
        : slow
          ? 'Taking longer than usual: the app connects as soon as your space answers.'
          : 'Your space is being prepared… the app connects by itself.'}
    </div>
  )
}

// ── Where the person is, on demand ────────────────────────────────────────

function StepMenu({ step, reachable, onPick }: { step: number; reachable: (i: number) => boolean; onPick: (i: number) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={cn('flex h-8 items-center gap-1.5 rounded-full border border-[#2C2C2E] px-3 text-[13px] font-medium text-[#B5B5B5] hover:text-white', ring)}>
          {`Step ${step + 1} of ${STEP_COUNT}`}
          <ChevronDown className="size-3.5" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      {/* Above the onboarding, which covers the window at z-60. */}
      <PopoverContent align="end" style={{ zIndex: 70 }} className="dark w-64 border-[#2C2C2E] bg-[#1C1C1E] p-1.5 text-white">
        <ol className="m-0 flex list-none flex-col p-0">
          {STEP_NAMES.map((name, i) => {
            const can = i !== step && reachable(i)
            return (
              <li key={name}>
                <button
                  type="button" disabled={!can} aria-current={i === step ? 'step' : undefined}
                  onClick={() => { setOpen(false); onPick(i) }}
                  className={cn('flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm', ring, i === step ? 'bg-[#2C2C2E] font-semibold' : can ? 'hover:bg-white/5' : 'text-[#6E6E73]')}
                >
                  <span className="flex size-5 items-center justify-center">{i < step ? <Check className="size-3.5 text-[#30D158]" strokeWidth={2.6} aria-hidden="true" /> : <span className="text-xs text-[#8E8E93]">{i + 1}</span>}</span>
                  {name}
                </button>
              </li>
            )
          })}
        </ol>
      </PopoverContent>
    </Popover>
  )
}

// ── The demo, on the right ────────────────────────────────────────────────

/** Types `text` in, one character every 38 ms (linear: a typewriter that eases reads as hesitating). */
function useTyped(text: string, active: boolean): string {
  const [shown, setShown] = useState(active ? 0 : text.length)
  useEffect(() => {
    if (!active) { setShown(text.length); return }
    setShown(0)
    const timer = window.setInterval(() => setShown((n) => (n >= text.length ? n : n + 1)), 38)
    return () => window.clearInterval(timer)
  }, [text, active])
  return text.slice(0, shown)
}

function BotLine({ role, text, color = 'orange' }: { role: string; text: string; color?: string }) {
  return (
    <div className="flex items-start gap-3">
      <Shape shape="pebble" color={color} size={36} />
      <div className="flex flex-col gap-1 pt-1">
        <span className="text-[13px] text-[#8E8E93]">{role}</span>
        <span className="text-[15px] leading-[22px]">{text}</span>
      </div>
    </div>
  )
}

function Composer({ text, typing, hint }: { text: string; typing: boolean; hint?: string }) {
  return (
    <div className="flex w-full items-center gap-2.5 rounded-[26px] border border-[#2C2C2E] bg-[#1C1C1E] py-2.5 pl-[18px] pr-2.5">
      <span className="min-h-[22px] flex-1 text-[15px] leading-[22px] text-white">
        {text || <span className="text-[#6E6E73]">{hint}</span>}
        {typing && <span className="dj-caret ml-0.5 inline-block h-[18px] w-0.5 translate-y-[3px] bg-white" />}
      </span>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white"><ArrowUp className="size-4 text-[#0A0A0A]" strokeWidth={2.4} /></span>
    </div>
  )
}

function ApprovalCard() {
  return (
    <div className="flex w-full flex-col gap-3.5 rounded-[22px] bg-[#1C1C1E] p-[18px]">
      <span className="flex items-center gap-2 text-[13px] text-[#FFA31A]"><span className="size-2 rounded-full bg-[#FFA31A]" />Waiting for your approval</span>
      <span className="text-base leading-6">Send the 3 follow-ups to clients?</span>
      <span className="rounded-xl bg-[#141416] px-3.5 py-3 text-[13.5px] leading-[20px] text-[#B5B5B5]">« Hello Paul, did you have a chance to look at Tuesday’s quote? I’m happy to talk it through. »</span>
      <div className="flex gap-2.5">
        <span className="flex h-10 flex-1 items-center justify-center rounded-full border border-[#3A3A3C] text-sm">Refuse</span>
        <span className="flex h-10 flex-1 items-center justify-center rounded-full bg-white text-sm font-semibold text-[#0A0A0A]">Accept</span>
      </div>
    </div>
  )
}

/** The welcome's reel: ask, approve, everywhere, each with its caption. */
const SCENES = ['ask', 'approve', 'everywhere'] as const
const SCENE_MS = 5200

function WelcomeReel({ look }: { look: Look }) {
  const still = reducedMotion()
  const [scene, setScene] = useState(0)
  useEffect(() => {
    if (still) return
    const timer = window.setInterval(() => setScene((s) => (s + 1) % SCENES.length), SCENE_MS)
    return () => window.clearInterval(timer)
  }, [still])
  const typed = useTyped(say('Prepare the quote for Paul’s shop'), SCENES[scene] === 'ask' && !still)
  const captions = {
    ask: 'Ask in plain words. The bot does the work and tells you when it’s ready.',
    approve: 'Nothing goes out without your yes.',
    everywhere: 'Your computer, your phone, the web: the same conversation.',
  }
  return (
    <div className="flex w-full max-w-[540px] flex-col items-center gap-7">
      <div key={scene} className="dj-fade flex min-h-[330px] w-full flex-col justify-center gap-4">
        {SCENES[scene] === 'ask' && (
          <>
            <div className="max-w-[380px] self-end rounded-[20px] rounded-br-md bg-[#2C2C2E] px-4 py-3 text-[15px] leading-[22px]">Follow up with the customers who haven’t answered for a week.</div>
            <BotLine role="Sales" text="I’m reading your exchanges and preparing the messages…" />
            <div className="mt-3"><Composer text={typed} typing={!still} /></div>
          </>
        )}
        {SCENES[scene] === 'approve' && (
          <>
            <div className="flex w-full flex-col gap-3 rounded-[22px] bg-[#1C1C1E] p-[18px]">
              <div className="flex items-center gap-3">
                <Shape shape="pebble" color="orange" size={40} />
                <div className="flex flex-1 flex-col gap-0.5">
                  <span className="text-[15px] font-semibold">Sales</span>
                  <span className="text-[13px] text-[#B5B5B5]">Preparing this week's quotes</span>
                </div>
                <span className="text-xs text-[#8E8E93]">At work</span>
              </div>
              <div className="h-1 rounded-sm bg-[#2C2C2E]"><div className="dj-work h-1 w-[62%] rounded-sm bg-white" /></div>
            </div>
            <ApprovalCard />
          </>
        )}
        {SCENES[scene] === 'everywhere' && (
          <div className="flex flex-col items-center gap-6">
            <div className="dj-bob"><Shape shape={look.shape} color={look.color} size={150} /></div>
            <div className="flex gap-2">
              {['Mac', 'Windows', 'iPhone', 'Android', 'Web'].map((d) => <span key={d} className="rounded-full bg-[#1C1C1E] px-3.5 py-2 text-[13px] text-[#D6D6D6]">{d}</span>)}
            </div>
          </div>
        )}
      </div>
      <p key={`c${scene}`} className="dj-fade m-0 text-center text-sm text-[#8E8E93]">{captions[SCENES[scene]]}</p>
      <div className="flex gap-1.5">
        {SCENES.map((s, i) => <span key={s} className={cn('h-1 rounded-sm transition-all duration-500', i === scene ? 'w-[22px] bg-white' : 'w-2 bg-[#3A3A3C]')} />)}
      </div>
    </div>
  )
}

const ORBIT = [
  { id: 'google', name: 'Gmail', left: '6%', top: '14%' },
  { id: 'microsoft', name: 'Outlook', left: '62%', top: '8%' },
  { id: 'whatsapp', name: 'WhatsApp', left: '4%', top: '74%' },
  { id: 'telegram', name: 'Telegram', left: '64%', top: '78%' },
] as const

function Stage({ step, look, profile, connected, preview }: {
  step: Step; look: Look; profile: Profile; connected: Partial<Record<string, boolean>>; preview: string
}) {
  const name = profile.name.trim()
  return (
    <>
      {step === 0 && <WelcomeReel look={look} />}

      {step === 1 && (
        <div className="relative flex w-[400px] flex-col gap-3.5">
          <div className="dj-rise flex flex-col gap-3 rounded-[22px] bg-[#1C1C1E] p-[18px]">
            <span className="text-[13px] text-[#A1A1A6]">Your Djazzi code</span>
            <div className="flex gap-2">
              {[0, 1, 2, 3, 4, 5].map((i) => <span key={i} className="dj-dim h-[52px] flex-1 rounded-xl bg-[#2C2C2E]" style={{ animationDelay: `${i * 0.12}s` }} />)}
            </div>
            <span className="text-xs text-[#8E8E93]">Sent by no-reply@djazzi.com</span>
          </div>
          <div className="dj-rise dj-d3 ml-10 flex flex-col gap-3 rounded-[22px] bg-[#1C1C1E] p-[18px]">
            <span className="text-[15px] font-semibold">Your private space</span>
            <span className="flex items-center gap-2.5 text-sm text-[#D6D6D6]"><Tick />Encrypted, yours alone</span>
            <span className="flex items-center gap-2.5 text-sm text-[#D6D6D6]"><Spinner />Ready on all your devices</span>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col items-center gap-[26px]">
          <div className="dj-rise dj-d2 max-w-[340px] rounded-[20px] rounded-bl-md bg-[#1C1C1E] px-[18px] py-3.5 text-base leading-6">
            {name ? `Nice to meet you, ${name}! I’ll remember your name in all our conversations.` : 'Hi, I’m your Djazzi. What should I call you?'}
          </div>
          <div key={`${look.shape}-${look.color}`} className="dj-pop"><div className="dj-bob"><Shape shape={look.shape} color={look.color} size={210} /></div></div>
          <span className="dj-rise dj-d3 text-[13px] text-[#8E8E93]">{profile.sector ?? 'You can change all of this later'}</span>
        </div>
      )}

      {step === 3 && (
        <div className="relative flex h-[460px] w-[520px] max-w-full items-center justify-center">
          <div className="dj-bob"><Shape shape={look.shape} color={look.color} size={150} /></div>
          {ORBIT.map((o, i) => {
            const on = !!connected[o.id]
            return (
              <div key={o.id} className={cn('dj-pop absolute flex items-center gap-2 rounded-full bg-[#1C1C1E] px-3.5 py-2.5 text-sm', on ? 'text-white' : 'text-[#8E8E93]')} style={{ left: o.left, top: o.top, animationDelay: `${0.15 * i}s` }}>
                <span className={cn('size-2 rounded-full', on ? 'bg-[#30D158]' : 'bg-[#3A3A3C]')} />{o.name}
              </div>
            )
          })}
        </div>
      )}

      {step === 4 && (
        <div className="flex w-[440px] max-w-full flex-col items-center gap-7">
          <div className="dj-hop"><Shape shape={look.shape} color={look.color} size={140} /></div>
          <div className="dj-rise dj-d2 w-full" data-no-translate>
            <Composer text={preview} typing={false} hint={say('Your first request, in your own words.')} />
          </div>
          <span className="dj-rise dj-d3 text-xs text-[#8E8E93]">You read it before sending</span>
        </div>
      )}
    </>
  )
}

// ── The flow ──────────────────────────────────────────────────────────────

export function DjazziOnboarding({ open, onComplete }: DjazziOnboardingProps) {
  const [saved, setSaved] = useState<Saved>(() => loadSaved())
  const [look, setLook] = useState<Look>(() => loadLook())
  const [signedIn, setSignedIn] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [joined, setJoined] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [done, setDone] = useState(false)
  const [picked, setPicked] = useState<number | null>(null)
  const lang = typeof document !== 'undefined' && document.documentElement.lang === 'fr' ? 'fr' : 'en'
  const tools = useTools()
  const left = useRef<HTMLDivElement>(null)
  const way = useRef<'fwd' | 'back'>('fwd')
  const shown = useRef<number | null>(null)

  const update = useCallback((next: Partial<Saved>) => {
    setSaved((prev) => {
      const merged = { ...prev, ...next }
      storeSaved(merged)
      return merged
    })
  }, [])

  // Signed in to Djazzi? Answered by this app, or by the instance once joined.
  useEffect(() => {
    if (!open) return
    void window.ipc.invoke('oauth:getState', null)
      .then((r) => setSignedIn(!!r.config?.rowboat?.connected))
      .catch(() => undefined)
    return window.ipc.on('oauth:didConnect', (event) => {
      if (event.provider !== 'rowboat') return
      setConnecting(false)
      if (event.success) setSignedIn(true)
    })
  }, [open])

  // Joined to the instance: the app's server is the remote one.
  useEffect(() => {
    if (!open) return
    let live = true
    const check = () => void window.ipc.invoke('server:getConnection', null)
      .then((r) => { if (live) setJoined(r.mode === 'remote') })
      .catch(() => undefined)
    check()
    const timer = window.setInterval(check, 2000)
    return () => { live = false; window.clearInterval(timer) }
  }, [open])

  // Signed in on the account screen: a new account carries on while its
  // space prepares; « I already have an account » waits there to be joined.
  useEffect(() => {
    if (open && signedIn && saved.step === 1 && !saved.returning) update({ step: 2, spaceSince: saved.spaceSince ?? Date.now() })
  }, [open, signedIn, saved.step, saved.returning, saved.spaceSince, update])

  useEffect(() => {
    if (open && saved.returning && saved.step === 1 && signedIn && joined) {
      clearSaved()
      onComplete()
    }
  }, [open, saved.returning, saved.step, signedIn, joined, onComplete])

  // A new step: focus goes to its heading, which a screen reader then reads.
  // The first draw leaves focus where the step's own field put it.
  useEffect(() => {
    if (!open) return
    if (shown.current !== null && shown.current !== saved.step) {
      left.current?.querySelector<HTMLElement>('[data-dj-heading]')?.focus()
    }
    shown.current = saved.step
  }, [open, saved.step])

  // DJAZZI(28/11/2026): seen in the app, the composer behind kept the focus,
  // and a key went into the hidden chat. Focus stays in the onboarding (and
  // its steps menu, drawn outside it).
  useEffect(() => {
    if (!open) return
    const inside = (el: Element | null) => !!el?.closest('.dj-root, [data-radix-popper-content-wrapper]')
    const pull = () => left.current?.querySelector<HTMLElement>('[data-dj-heading]')?.focus()
    if (!inside(document.activeElement)) pull()
    const onFocus = (e: FocusEvent) => { if (!inside(e.target as Element)) pull() }
    document.addEventListener('focusin', onFocus)
    return () => document.removeEventListener('focusin', onFocus)
  }, [open])

  const signIn = async (returning: boolean) => {
    // A new try counts its wait from now.
    update({ returning, spaceSince: Date.now() })
    setConnecting(true)
    const result = await window.ipc.invoke('oauth:connect', { provider: 'rowboat' }).catch(() => ({ success: false }))
    if (!result.success) setConnecting(false)
  }

  const chooseLang = (next: 'fr' | 'en') => {
    if (next === lang) return
    try {
      localStorage.setItem('djazzi-lang', next)
    } catch {
      return
    }
    // The French layer starts with the page (desktop i18n/index.ts); the step is kept.
    window.location.reload()
  }

  const changeLook = (next: Look) => {
    setLook(next)
    storeLook(next)
    // The app behind takes the colour at once (lib/djazzi-color.ts).
    applyColor(next.color)
  }

  const step = saved.step
  const go = (next: number) => {
    const to = Math.max(0, Math.min(STEP_COUNT - 1, next)) as Step
    way.current = to < step ? 'back' : 'fwd'
    update({ step: to })
  }
  // Signed in already, the account screen has nothing to ask: it is stepped over.
  const forward = () => go(step === 0 && signedIn ? 2 : step + 1)
  const back = () => go(step === 2 && signedIn ? 0 : step - 1)
  const reachable = (i: number) => i < step && !(i === 1 && signedIn)
  const ideas = ideasFor(saved.profile.sector)
  const preview = picked === null ? '' : say(ideas[picked]?.prompt ?? '')

  const finish = useCallback(async (prompt?: string) => {
    setFinishing(true)
    const block = profileBlock(saved.profile, lang)
    if (block) {
      try {
        const existing = await window.ipc.invoke('workspace:readFile', { path: PROFILE_FILE, encoding: 'utf8' })
          .then((r) => r.data).catch(() => '')
        await window.ipc.invoke('workspace:writeFile', { path: PROFILE_FILE, data: mergeProfile(existing, block), opts: { encoding: 'utf8', mkdirp: true } })
      } catch (err) {
        // The profile is a help, not a gate: the app opens all the same.
        console.error('[onboarding] could not save the profile', err)
      }
    }
    // What has happened, said before the app opens: Ready, green.
    setDone(true)
    if (!reducedMotion()) await new Promise((r) => window.setTimeout(r, 700))
    clearSaved()
    setFinishing(false)
    setDone(false)
    setSaved(loadSaved())
    onComplete(prompt ? { prompt } : undefined)
  }, [saved.profile, lang, onComplete])

  // The buttons are the frame's, at the same place on every step.
  const returningWait = step === 1 && saved.returning && signedIn
  const showBack = step > 0 && !returningWait
  const next: { label: string; onClick: () => void } | null =
    step === 0 ? { label: 'Get started', onClick: forward }
      : step === 2 ? { label: 'Continue', onClick: forward }
        : step === 3 ? { label: tools.anything ? 'Continue' : 'Skip', onClick: forward }
          : step === 4 ? { label: 'Open Djazzi', onClick: () => void finish(preview || undefined) }
            : null

  if (!open) return null
  const enter = way.current === 'back' ? 'dj-back' : 'dj-fwd'
  return (
    <div className="dj-root dark fixed inset-0 z-[60] grid grid-rows-[minmax(0,1fr)] bg-[#0A0A0A] font-sans text-white min-[960px]:grid-cols-[minmax(460px,540px)_minmax(0,1fr)]" role="dialog" aria-modal="true" aria-label="Get started with Djazzi">
      <style>{CSS}</style>
      <div ref={left} className="flex h-full min-h-0 min-w-0 flex-col gap-6 px-12 pb-8 pt-10">
        <header className="flex items-center gap-2.5">
          <Shape shape="b" color="white" size={26} />
          <span className="text-[17px] font-semibold">Djazzi</span>
          <span className="flex-1" />
          <StepMenu step={step} reachable={reachable} onPick={go} />
          <div role="group" aria-label="Language of the app and of Djazzi" className="flex gap-0.5 rounded-full bg-[#1C1C1E] p-[3px]">
            {(['fr', 'en'] as const).map((l) => (
              <button
                key={l} type="button" aria-pressed={lang === l} onClick={() => chooseLang(l)}
                aria-label={l === 'fr' ? 'Français' : 'English'}
                className={cn('h-[26px] rounded-full px-2.5 text-xs font-semibold transition-colors', ring, lang === l ? 'bg-[#3A3A3C] text-white' : 'text-[#8E8E93] hover:text-white')}
              >
                <span data-no-translate>{l.toUpperCase()}</span>
              </button>
            ))}
          </div>
        </header>
        {/* The step scrolls when it is taller than the window; the header and the buttons stay. */}
        <div className="-mx-3 min-h-0 flex-1 overflow-y-auto px-3">
          <div className="flex min-h-full flex-col justify-center gap-6 py-2">
            {/* Keyed by the step: each one comes in from the way the journey goes. */}
            <div key={step} className={cn(enter, 'flex flex-col gap-[18px]')}>
              {step === 0 && <WelcomeStep />}
              {step === 1 && <AccountStep signedIn={signedIn} connecting={connecting} returning={saved.returning} since={saved.spaceSince} onSignIn={(r) => void signIn(r)} onOpenAnyway={() => { clearSaved(); onComplete() }} />}
              {step === 2 && <YouStep profile={saved.profile} look={look} onProfile={(profile) => update({ profile })} onLook={changeLook} onNext={forward} />}
              {step === 3 && <ToolsStep tools={tools} />}
              {step === 4 && <ReadyStep profile={saved.profile} picked={picked} onPick={setPicked} finishing={finishing} />}
            </div>
            {step >= 2 && !saved.returning && <SpacePill joined={joined} since={saved.spaceSince} />}
          </div>
        </div>
        <footer className="flex min-h-12 items-center justify-end gap-3">
          {/* 28/11/2026 (founder): an account already, the sign-in at once, as in Claude or Grok. */}
          {step === 0 && !signedIn && (
            <button type="button" className={cn('h-12 rounded-full px-4 text-[15px] font-medium text-[#B5B5B5] transition-colors hover:text-white', ring)}
              onClick={() => { go(1); void signIn(true) }}>
              I already have an account
            </button>
          )}
          {showBack && (
            <button type="button" className={secondary} disabled={finishing} onClick={back}>
              <ChevronLeft className="size-4" aria-hidden="true" />Back
            </button>
          )}
          {next && (
            <button
              type="button" autoFocus={step === 0} disabled={finishing}
              className={cn(primary, 'min-w-[150px]', done && 'bg-[#30D158] disabled:opacity-100')}
              onClick={next.onClick}
            >
              {done ? <><Check className="size-[18px]" strokeWidth={2.6} aria-hidden="true" />Ready</> : finishing ? <><Loader2 className="size-4 animate-spin" aria-hidden="true" />Saving…</> : next.label}
            </button>
          )}
        </footer>
      </div>
      <div className="hidden min-h-0 min-w-0 py-6 pr-6 min-[960px]:block" aria-hidden="true">
        <div className="flex h-full items-center justify-center overflow-hidden rounded-[28px] border border-[#1F1F22] bg-[#141416] p-12">
          <div key={step} className={cn(enter, 'flex w-full justify-center')}>
            <Stage step={step} look={look} profile={saved.profile} connected={tools.connected} preview={preview} />
          </div>
        </div>
      </div>
    </div>
  )
}
