import { useState } from 'react'
import { ChevronRight, Hash, Plus, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar'
import { type SpaceSelection } from '@/components/spaces-view'
import { useSpacesOrgs } from '@/hooks/use-spaces'
import { spaceLastActivityAt, useSpacesUnreadCounts } from '@/hooks/use-space-chat'
import { NO_BADGE } from '@/lib/spaces-read-state'
import { UnreadBadge } from '@/components/spaces/unread-badge'
import { NewChatDialog } from '@/components/spaces/new-chat-dialog'
import { serverLandingSpaceId } from '@/lib/spaces-navigation'

// BAARALI: the Spaces section of Baarali's sidebar (baarali-sidebar-content.tsx).
// It folds, as validated on 09/10/2026, and the choice is kept. Since the
// upstream's one server (2026-11-09: no orgs, no server list) it lists the
// groups of that one server, newest activity first; the full chat list
// (Agents, Spaces, People, Activity) is the Spaces view's rail, the
// upstream's own. Kept apart from spaces-sidebar-section.tsx, which stays
// the upstream's file.

const FOLDED_KEY = 'baarali.spacesFolded'
/** Groups shown in the sidebar; the rest are one click away in the Spaces view. */
const MAX_ROWS = 6

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

export function BaaraliSpacesSection({ active, activeSpace, onOpenSpace, onOpenSpaces, label }: {
    active: boolean
    activeSpace?: SpaceSelection
    onOpenSpace: (orgId: string, spaceId: string) => void
    /** The Spaces view where it last was, or its sign-in. */
    onOpenSpaces?: () => void
    /** The name the admin console gave the section; null keeps « Spaces ». */
    label?: string | null
}) {
    const { orgs } = useSpacesOrgs()
    const org = orgs[0]
    const [folded, toggleFolded] = useFolded()
    const [creating, setCreating] = useState(false)
    const unread = useSpacesUnreadCounts()
    const groups = org
        ? org.spaces
            .filter((space) => !space.archived)
            .map((space) => ({ space, at: spaceLastActivityAt(org.id, space.id) ?? space.createdAt }))
            .sort((a, b) => b.at.localeCompare(a.at))
            .map((row) => row.space)
        : []
    let total = 0
    if (org) for (const room of [...org.spaces, ...org.directs]) total += unread.get(`${org.id}/${room.id}`)?.unread ?? 0
    return <SidebarGroup className="pt-0">
        <SidebarGroupContent>
            <div data-tour-id="nav-spaces" className="flex h-8 items-center gap-1.5 pl-1 pr-2.5">
                <button type="button" aria-expanded={!folded} aria-label={folded ? 'Show spaces' : 'Hide spaces'}
                    className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                    onClick={toggleFolded}>
                    <ChevronRight className={cn('size-3 shrink-0 text-muted-foreground transition-transform', !folded && 'rotate-90')} />
                    <Users className="size-4 shrink-0 text-sidebar-foreground" />
                    <h2 className="min-w-0 flex-1 truncate text-sm text-sidebar-foreground">{label ? <span data-no-translate>{label}</span> : 'Spaces'}</h2>
                </button>
                {folded ? (
                    total > 0 && <span className="text-xs tabular-nums text-muted-foreground" data-no-translate>{total > 99 ? '99+' : total}</span>
                ) : org && (
                    <button type="button" aria-label="New space" title="New space"
                        className="flex size-5 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                        onClick={() => setCreating(true)}>
                        <Plus className="size-4" />
                    </button>
                )}
            </div>
            {!folded && <SidebarMenu>
                {!org && <SidebarMenuItem>
                    <SidebarMenuButton className="pl-6 text-muted-foreground" onClick={() => onOpenSpaces?.()}>
                        <span className="min-w-0 flex-1 truncate">Sign in to Spaces</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>}
                {org && groups.slice(0, MAX_ROWS).map((space) => <SidebarMenuItem key={space.id}>
                    <SidebarMenuButton className="pl-6" isActive={active && activeSpace?.orgId === org.id && activeSpace.spaceId === space.id}
                        title={space.name} onClick={() => onOpenSpace(org.id, space.id)}>
                        <Hash className="size-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate" data-no-translate>{space.name}</span>
                        <UnreadBadge badge={unread.get(`${org.id}/${space.id}`) ?? NO_BADGE} />
                    </SidebarMenuButton>
                </SidebarMenuItem>)}
                {org && (groups.length > MAX_ROWS || groups.length === 0) && <SidebarMenuItem>
                    <SidebarMenuButton className="pl-6 text-muted-foreground" isActive={false}
                        onClick={() => onOpenSpaces ? onOpenSpaces() : onOpenSpace(org.id, serverLandingSpaceId(org))}>
                        <span className="min-w-0 flex-1 truncate">{groups.length === 0 ? 'Open Spaces' : 'All spaces'}</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>}
            </SidebarMenu>}
            {org && <NewChatDialog org={org} open={creating} start="group" onOpenChange={setCreating} onOpenSpace={onOpenSpace} />}
        </SidebarGroupContent>
    </SidebarGroup>
}
