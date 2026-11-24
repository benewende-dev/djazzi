import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { LockKeyhole, RefreshCw } from 'lucide-react'
import { canUseWork } from '@/lib/work-access'
import { ANY_PAID_PAGE, FREE_KEEPS, PAID_FROM, PAID_PAGES } from '@/lib/paid-pages'
import { openPlans } from '@/lib/plans-window'
import { DjazziMark } from '@/components/djazzi-mark'

export type WorkspaceMode = 'chat' | 'work'
type Access = 'checking' | 'allowed' | 'denied' | 'unavailable'
type Workspace = {
  mode: WorkspaceMode; setMode: (mode: WorkspaceMode) => void
  access: Access; refresh: () => Promise<void>
  projectHost: HTMLDivElement | null; setProjectHost: (host: HTMLDivElement | null) => void
}
const Context = createContext<Workspace | null>(null)
export function useDesktopWorkspace() {
  const value = useContext(Context)
  if (!value) throw new Error('desktop_workspace_provider_required')
  return value
}

// DJAZZI(15/10/2026): the approved Chat/Work layout shares one entitlement
// check; unknown/offline accounts never mount paid surfaces. Runtime guards remain authoritative.
export function DesktopWorkspaceProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<WorkspaceMode>('chat')
  const [access, setAccess] = useState<Access>('checking')
  const [projectHost, setProjectHost] = useState<HTMLDivElement | null>(null)
  const request = useRef(0)
  const refresh = useCallback(async () => {
    const id = ++request.current
    try {
      const info = await window.ipc.invoke('billing:getInfo', null)
      if (id === request.current) setAccess(info ? canUseWork(info) ? 'allowed' : 'denied' : 'unavailable')
    } catch { if (id === request.current) setAccess('unavailable') }
  }, [])
  useEffect(() => {
    void refresh()
    const focus = () => { void refresh() }
    window.addEventListener('focus', focus)
    const resync = window.ipc.on('server:resync', focus)
    const connected = window.ipc.on('oauth:didConnect', focus)
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void refresh() }, 60_000)
    return () => { ++request.current; window.removeEventListener('focus', focus); resync(); connected(); clearInterval(timer) }
  }, [refresh])
  return <Context.Provider value={{ mode, setMode, access, refresh, projectHost, setProjectHost }}>{children}</Context.Provider>
}

export function workspaceForNav(nav: string | null | undefined): WorkspaceMode | null {
  if (['code', 'workspaces', 'agents', 'apps', 'baarasseurs', 'spaces', 'studio', 'email', 'meetings'].includes(nav ?? '')) return 'work'
  if (['assistant', 'home', 'chat-history'].includes(nav ?? '')) return 'chat'
  return null
}

// DJAZZI(07/11/2026): no Chat/Work switch any more (the founder's call,
// one sidebar as in Claude Code). The mode follows the page, so Code keeps
// its projects in the sidebar; nothing to click.
export function DesktopModeSync({ activeNav }: { activeNav?: string | null }) {
  const { setMode } = useDesktopWorkspace()
  useEffect(() => { setMode(workspaceForNav(activeNav) ?? 'chat') }, [activeNav, setMode])
  return null
}

/** What each paid page is, said on its padlock screen. */
// DJAZZI(23/11/2026): the pages and their words, shared with the phone (paid-pages.ts).

export function DesktopWorkGate({ children, required = false, page, studio = false, onChat }: { children: ReactNode; required?: boolean; page?: string | null; studio?: boolean; onChat: () => void }) {
  const workspace = useDesktopWorkspace()
  if (!required || workspace.access === 'allowed') return children
  const about = PAID_PAGES[studio ? 'studio' : page ?? ''] ?? ANY_PAID_PAGE
  return <div className="djazzi-work-gate" role="region" aria-label="Plan access">
    {workspace.access === 'checking' ? <><DjazziMark size={44} motion="loading" /><p role="status">Checking your plan…</p></> : <>
      <span className="djazzi-gate-symbol"><LockKeyhole size={25} /></span>
      {workspace.access === 'denied' && <span className="djazzi-gate-pill">{PAID_FROM}</span>}
      <h1>{workspace.access === 'denied' ? about.title : 'Your plan could not be verified'}</h1>
      <p>{workspace.access === 'denied' ? about.text : 'Check your connection and try again.'}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" className="djazzi-primary" onClick={workspace.access === 'denied' ? openPlans : () => void workspace.refresh()}>
          {workspace.access === 'unavailable' && <RefreshCw size={14} />}{workspace.access === 'denied' ? 'View plans' : 'Retry'}
        </button>
        <button type="button" onClick={onChat}>Back to the conversation</button>
      </div>
      {workspace.access === 'denied' && <small>{FREE_KEEPS}</small>}
    </>}
  </div>
}

// DJAZZI(15/10/2026): move the existing, fully functional project rail into
// Work's sidebar instead of adding a second navigation column beside it.
export function DesktopCodeRail({ children, embedded }: { children: ReactNode; embedded: boolean }) {
  const { projectHost } = useDesktopWorkspace()
  const [element] = useState(() => document.createElement('div'))
  useLayoutEffect(() => {
    element.className = 'h-full min-h-0'
    projectHost?.appendChild(element)
    return () => element.remove()
  }, [element, projectHost])
  return embedded ? createPortal(children, element) : children
}
