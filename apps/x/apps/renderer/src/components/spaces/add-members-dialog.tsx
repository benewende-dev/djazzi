import { invokeSpace } from '@/lib/spaces-invoke'
import { useEffect, useMemo, useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import type { spaces } from '@x/shared'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { AgentBadge, MemberAvatar } from '@/components/spaces/atoms'
import { SeatChoice, type Seat } from '@/components/spaces/agent-access'
import { refreshMembers, useOrgRoster } from '@/hooks/use-space-members'
import { useBaarasseurs } from '@/lib/baarasseurs'
import type { OrgWithSpaces } from '@/hooks/use-spaces'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { isDeparted, isOwnAgent } from '@/lib/spaces-direct'

// "Add people" (2026-09-29): any member adds their contacts, people or their
// own agents, to a space they are in (2026-11-09: only an agent's owner adds
// it, choosing who may ask it there). The candidates are your contacts minus
// who is already here. They learn of it by their sidebar and the stream's
// join line; no notification in v1.
//
// DJAZZI(07/10/2026): the person's baarasseurs are offered too. One that is
// not on the server yet joins it first as an agent the person owns (core
// spaces/baarasseur-members.ts keeps its key), then the space, like the
// phone's « New group » does.

export function AddMembersDialog({ org, space, members, open, onOpenChange, kind }: {
    kind?: 'people' | 'agents'
    org: OrgWithSpaces
    space: spaces.Space
    /** Who is in the space now — never offered. */
    members: readonly spaces.Member[]
    open: boolean
    onOpenChange: (open: boolean) => void
}) {
    const spaceIds = useMemo(() => org.spaces.map((s) => s.id), [org.spaces])
    const roster = useOrgRoster(org.id, spaceIds)
    const [query, setQuery] = useState('')
    const [picked, setPicked] = useState<ReadonlySet<string>>(() => new Set())
    const [seat, setSeat] = useState<Seat>('members')
    const [adding, setAdding] = useState(false)
    const { team } = useBaarasseurs()

    const inSpace = useMemo(() => new Set(members.map((m) => m.id)), [members])
    const candidates = useMemo(() => {
        const q = query.trim().toLowerCase()
        // A deleted account is never offered (2026-10-13), nor an agent that is not yours (2026-11-09): Harbor refuses the add.
        return roster.filter((m) => !inSpace.has(m.id) && (!kind || (kind === 'agents' ? m.kind === 'agent' : m.kind !== 'agent')) && !isDeparted(m) && (m.kind !== 'agent' || isOwnAgent(m, org.memberId)) && (!q || m.displayName.toLowerCase().includes(q)))
    }, [roster, inSpace, query, org.memberId, kind])
    // DJAZZI: a picked baarasseur ('b:<id>') is an agent too, and gets the seat choice.
    const pickedAgents = useMemo(() => roster.filter((m) => picked.has(m.id) && m.kind === 'agent').length + [...picked].filter((id) => id.startsWith('b:')).length, [roster, picked])

    useEffect(() => {
        if (!open) return
        setQuery('')
        setPicked(new Set())
        setSeat('members')
        setAdding(false)
    }, [open])

    // A baarasseur already in the org is its roster entry (same name, owned by the person).
    const crew = useMemo(() => {
        const q = query.trim().toLowerCase()
        const mine = roster.filter((m) => m.kind === 'agent' && m.ownerId === org.memberId)
        return (team ?? []).filter((b) =>
            !mine.some((m) => m.displayName === b.name) && (!q || b.name.toLowerCase().includes(q)))
    }, [team, roster, org.memberId, query])

    const toggle = (id: string) => setPicked((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
    })

    const add = async () => {
        if (picked.size === 0 || adding) return
        setAdding(true)
        try {
            const memberIds = [...picked].filter((id) => !id.startsWith('b:'))
            const baarasseurs = [...picked].filter((id) => id.startsWith('b:'))
            for (const id of baarasseurs) {
                const { memberId } = await window.ipc.invoke('spaces:enrollBaarasseur', { orgId: org.id, baarasseurId: id.slice(2) })
                memberIds.push(memberId)
            }
            await invokeSpace('spaces:addMembers', { orgId: org.id, spaceId: space.id, memberIds, ...(pickedAgents > 0 ? { invocableBy: seat } : {}) })
            refreshMembers(org.id, space.id, { force: true })
            toast(picked.size === 1 ? `Added to #${space.name}` : `Added ${picked.size} to #${space.name}`, 'success')
            onOpenChange(false)
        } catch (err) {
            toast(err instanceof Error ? err.message : 'Could not add them', 'error')
        } finally {
            setAdding(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm gap-0 p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
                <DialogHeader className="px-4 pb-2 pt-4">
                    <DialogTitle className="text-sm">Add {kind === 'agents' ? 'agents' : 'people'} to #{space.name}</DialogTitle>
                    <DialogDescription className="text-xs">{kind === 'agents' ? 'Choose your existing agents to add to this space.' : kind === 'people' ? 'Choose people you share a space with.' : `People you share a space with, and your own agents. They’ll see #${space.name} in their sidebar.`}</DialogDescription>
                </DialogHeader>
                <div className="px-3 pb-2">
                    <Input
                        autoFocus
                        value={query}
                        placeholder="Search by name"
                        className="h-8 text-sm"
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>
                <div className="max-h-72 overflow-y-auto border-t border-border p-1.5">
                    {crew.map((b) => {
                        const on = picked.has(`b:${b.id}`)
                        return (
                            <button
                                key={b.id}
                                type="button"
                                role="checkbox"
                                aria-checked={on}
                                onClick={() => toggle(`b:${b.id}`)}
                                className={cn('flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent/60', on && 'bg-accent')}
                            >
                                <MemberAvatar id={b.id} name={b.name} size="md" agent />
                                <span className="min-w-0 flex-1 truncate">{b.name}<span className="ml-1.5 text-xs text-muted-foreground">{b.role}</span></span>
                                <AgentBadge />
                                <span className={cn('inline-flex size-4 shrink-0 items-center justify-center rounded border', on ? 'border-foreground bg-foreground text-background' : 'border-border')}>
                                    {on && <Check className="size-3" />}
                                </span>
                            </button>
                        )
                    })}
                    {candidates.length === 0 && crew.length === 0 ? (
                        <div className="px-2 py-6 text-center text-xs text-muted-foreground">
                            {query.trim() ? 'No one matches.' : kind === 'agents' ? 'No agents available to add. Use Connect an agent to set one up.' : `Everyone you know is already in #${space.name}. Invite someone new with the group’s link.`}
                        </div>
                    ) : (
                        candidates.map((m) => {
                            const on = picked.has(m.id)
                            return (
                                <button
                                    key={m.id}
                                    type="button"
                                    role="checkbox"
                                    aria-checked={on}
                                    onClick={() => toggle(m.id)}
                                    className={cn('flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent/60', on && 'bg-accent')}
                                >
                                    <MemberAvatar orgId={org.id} avatarUrl={m.avatarUrl} id={m.id} name={m.displayName} size="md" agent={m.kind === 'agent'} agentKind={m.agentKind} />
                                    <span className="min-w-0 flex-1 truncate">{m.displayName}</span>
                                    {m.kind === 'agent' && <AgentBadge agentKind={m.agentKind} agentConnection={m.agentConnection} />}
                                    <span className={cn('inline-flex size-4 shrink-0 items-center justify-center rounded border', on ? 'border-foreground bg-foreground text-background' : 'border-border')}>
                                        {on && <Check className="size-3" />}
                                    </span>
                                </button>
                            )
                        })
                    )}
                </div>
                {pickedAgents > 0 && (
                    <div className="border-t border-border px-3 py-2">
                        <SeatChoice seat={seat} onChange={setSeat} note={pickedAgents === 1 ? 'For the agent you picked. You can change it later from the member list.' : 'For the agents you picked. You can change each later from the member list.'} />
                    </div>
                )}
                <DialogFooter className="border-t border-border px-3 py-2">
                    <Button size="sm" disabled={picked.size === 0 || adding} onClick={() => void add()}>
                        {adding && <Loader2 className="size-3.5 animate-spin" />}
                        {picked.size > 1 ? `Add ${picked.size}` : 'Add'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
