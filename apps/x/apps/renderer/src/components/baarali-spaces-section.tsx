import { useState } from 'react'
import { ChevronRight, Hash, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar'
import { type SpaceSelection } from '@/components/spaces-view'
import { useSpacesOrgs } from '@/hooks/use-spaces'
import { spaceLastActivityAt, useSpacesUnreadCounts } from '@/hooks/use-space-chat'
import { NO_BADGE } from '@/lib/spaces-read-state'
import { UnreadBadge } from '@/components/spaces/unread-badge'
import { MemberAvatar } from '@/components/spaces/atoms'
import { NewChatDialog } from '@/components/spaces/new-chat-dialog'
import { directAvatarId, isSelfDirect, spaceDisplayName } from '@/lib/spaces-direct'

// BAARALI: the « Groupes » section of Baarali's one sidebar (decided by the
// founder on 23/11/2026, after ChatGPT's group chats and Claude's single
// sidebar): no Spaces | Local switch, the groups beside the chats. It lists
// the one server's spaces and the conversations with people, newest
// activity first; a click opens one in the main pane, with no second rail
// (SpacesView `withRail`). It folds, as validated on 09/10/2026.

const FOLDED_KEY = 'baarali.spacesFolded'
/** Rows shown before « All groups ». */
const MAX_ROWS = 8

function useFolded(): [boolean, () => void] {
    const [folded, setFolded] = useState(() => {
        try { return localStorage.getItem(FOLDED_KEY) === '1' } catch { return false }
    })
    const toggle = () => setFolded((v) => {
        try { localStorage.setItem(FOLDED_KEY, v ? '0' : '1') } catch { /* kept for this session */ }
        return !v
    })
    return [folded, toggle]
}

export function BaaraliSpacesSection({ active, activeSpace, onOpenSpace, onOpenSpaces, label, className }: {
    active: boolean
    activeSpace?: SpaceSelection
    onOpenSpace: (orgId: string, spaceId: string) => void
    /** Where Spaces was left, or its sign-in. */
    onOpenSpaces?: () => void
    /** The name the admin console gave the section; null keeps « Groups ». */
    label?: string | null
    /** A plan's padlock (desktop-layout's lock), on the whole section. */
    className?: string
}) {
    const { orgs } = useSpacesOrgs()
    const org = orgs[0]
    const [folded, toggleFolded] = useFolded()
    const [creating, setCreating] = useState(false)
    const [showAll, setShowAll] = useState(false)
    const unread = useSpacesUnreadCounts()
    const rooms = org
        ? [...org.spaces.filter((space) => !space.archived), ...org.directs.filter((dm) => !isSelfDirect(dm, org.memberId))]
            .map((room) => ({ room, at: spaceLastActivityAt(org.id, room.id) ?? room.createdAt }))
            .sort((a, b) => b.at.localeCompare(a.at))
            .map((row) => row.room)
        : []
    const shown = showAll ? rooms : rooms.slice(0, MAX_ROWS)
    let total = 0
    if (org) for (const room of rooms) total += unread.get(`${org.id}/${room.id}`)?.unread ?? 0

    return <SidebarGroup className={cn('pt-0', className)}>
        <SidebarGroupContent>
            <div data-tour-id="nav-spaces" className="flex h-8 items-center gap-1.5 pl-1 pr-2.5">
                <button type="button" aria-expanded={!folded} aria-label={folded ? 'Show groups' : 'Hide groups'}
                    className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                    onClick={toggleFolded}>
                    <ChevronRight className={cn('size-3 shrink-0 text-muted-foreground transition-transform', !folded && 'rotate-90')} />
                    <h2 className="min-w-0 flex-1 truncate text-xs font-semibold text-muted-foreground">{label ? <span data-no-translate>{label}</span> : 'Groups'}</h2>
                </button>
                {folded && total > 0 && <span className="text-xs tabular-nums text-muted-foreground" data-no-translate>{total > 99 ? '99+' : total}</span>}
                {org && <button type="button" aria-label="New group" title="New group"
                    className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                    onClick={() => setCreating(true)}>
                    <Plus className="size-4" />
                </button>}
            </div>
            {!folded && <SidebarMenu>
                {!org && <SidebarMenuItem>
                    <SidebarMenuButton className="text-muted-foreground" onClick={() => onOpenSpaces?.()}>
                        <span className="min-w-0 flex-1 truncate">Talk with your people and your team</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>}
                {org && rooms.length === 0 && <SidebarMenuItem>
                    <SidebarMenuButton className="text-muted-foreground" onClick={() => setCreating(true)}>
                        <Plus className="size-4 shrink-0" />
                        <span className="min-w-0 flex-1 truncate">Create your first group</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>}
                {org && shown.map((room) => {
                    const direct = room.kind === 'direct'
                    const name = direct ? spaceDisplayName(org, room) : room.name
                    return <SidebarMenuItem key={room.id}>
                        <SidebarMenuButton isActive={active && activeSpace?.orgId === org.id && activeSpace.spaceId === room.id}
                            title={name} onClick={() => onOpenSpace(org.id, room.id)}>
                            {direct
                                ? <MemberAvatar id={directAvatarId(room, org.memberId)} name={name} size="sm" orgId={org.id} />
                                : <Hash className="size-4 shrink-0 text-muted-foreground" />}
                            <span className="min-w-0 flex-1 truncate" data-no-translate>{name}</span>
                            <UnreadBadge badge={unread.get(`${org.id}/${room.id}`) ?? NO_BADGE} direct={direct} />
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                })}
                {org && rooms.length > MAX_ROWS && <SidebarMenuItem>
                    <SidebarMenuButton className="text-muted-foreground" onClick={() => setShowAll((v) => !v)}>
                        <span className="min-w-0 flex-1 truncate">{showAll ? 'Show fewer' : 'All groups'}</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>}
            </SidebarMenu>}
            {org && <NewChatDialog org={org} open={creating} start="group" onOpenChange={setCreating} onOpenSpace={onOpenSpace} />}
        </SidebarGroupContent>
    </SidebarGroup>
}
