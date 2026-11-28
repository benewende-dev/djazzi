import * as React from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

// DJAZZI(28/11/2026): one main account (Outlook) connected through Composio,
// in the same row as the others, while Djazzi has no Microsoft app of its own.
// Gmail and Google Calendar reuse the upstream's Composio rows
// (hooks/useConnectors.ts). Native connections come back once our apps exist.

export function ComposioAccountRow({ toolkitSlug, name, icon, description, connectedMessage }: {
  toolkitSlug: string
  name: string
  icon: React.ReactNode
  description: string
  connectedMessage: string
}) {
  const [loading, setLoading] = React.useState(true)
  const [connected, setConnected] = React.useState(false)
  const [connecting, setConnecting] = React.useState(false)

  const refresh = React.useCallback(async () => {
    try {
      const result = await window.ipc.invoke('composio:get-connection-status', { toolkitSlug })
      setConnected(result.isConnected)
    } catch {
      setConnected(false)
    } finally {
      setLoading(false)
    }
  }, [toolkitSlug])

  React.useEffect(() => { void refresh() }, [refresh])

  React.useEffect(() => window.ipc.on('composio:didConnect', (event) => {
    if (event.toolkitSlug !== toolkitSlug) return
    setConnecting(false)
    setConnected(event.success)
    if (event.success) toast.success(`Connected to ${name}`, { description: connectedMessage, duration: 8000 })
    else toast.error(event.error || `Failed to connect to ${name}`)
  }), [toolkitSlug, name, connectedMessage])

  const connect = async () => {
    setConnecting(true)
    try {
      const result = await window.ipc.invoke('composio:initiate-connection', { toolkitSlug })
      if (!result.success) {
        toast.error(result.error || `Failed to connect to ${name}`)
        setConnecting(false)
      }
    } catch {
      toast.error(`Failed to connect to ${name}`)
      setConnecting(false)
    }
  }

  const disconnect = async () => {
    setLoading(true)
    try {
      await window.ipc.invoke('composio:disconnect', { toolkitSlug })
      setConnected(false)
    } catch {
      toast.error(`Failed to disconnect from ${name}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-md px-3 py-2 hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="flex size-5 shrink-0 items-center justify-center">{icon}</span>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-medium truncate">{name}</span>
          {loading ? (
            <span className="text-xs text-muted-foreground">Checking...</span>
          ) : connected ? (
            <span className="text-xs text-[var(--rowboat-success)]">Connected</span>
          ) : (
            <span className="text-xs text-muted-foreground truncate">{description}</span>
          )}
        </div>
      </div>
      <div className="shrink-0">
        {loading ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : connected ? (
          <Button variant="outline" size="sm" onClick={() => void disconnect()} className="h-7 px-3 text-xs">
            Disconnect
          </Button>
        ) : (
          <Button variant="default" size="sm" onClick={() => void connect()} disabled={connecting} className="h-7 px-3 text-xs">
            {connecting ? <Loader2 className="size-3 animate-spin" /> : "Connect"}
          </Button>
        )}
      </div>
    </div>
  )
}
