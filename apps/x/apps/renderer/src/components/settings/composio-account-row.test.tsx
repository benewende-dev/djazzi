import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ComposioAccountRow } from './composio-account-row'

// DJAZZI(28/11/2026): Outlook through Composio while Djazzi has no Microsoft app of its own.

afterEach(cleanup)

function ipc(connected: boolean) {
  const calls: Array<[string, unknown]> = []
  let didConnect: ((e: { toolkitSlug: string; success: boolean; error?: string }) => void) | null = null
  ;(window as unknown as { ipc: unknown }).ipc = {
    invoke: async (channel: string, args: unknown) => {
      calls.push([channel, args])
      if (channel === 'composio:get-connection-status') return { isConnected: connected }
      if (channel === 'composio:initiate-connection') return { success: true }
      return {}
    },
    on: (channel: string, fn: typeof didConnect) => {
      if (channel === 'composio:didConnect') didConnect = fn
      return () => undefined
    },
  }
  return { calls, connect: (e: { toolkitSlug: string; success: boolean }) => didConnect?.(e) }
}

const row = <ComposioAccountRow toolkitSlug="outlook" name="Microsoft Outlook" icon={<span />} description="Email and calendar" connectedMessage="ok" />

describe('ComposioAccountRow', () => {
  it('connects Outlook through Composio, and shows it connected once Composio says so', async () => {
    const { calls, connect } = ipc(false)
    render(row)
    fireEvent.click(await screen.findByRole('button', { name: 'Connect' }))
    expect(calls).toContainEqual(['composio:initiate-connection', { toolkitSlug: 'outlook' }])
    connect({ toolkitSlug: 'gmail', success: true })
    expect(screen.queryByText('Connected')).toBeNull()
    connect({ toolkitSlug: 'outlook', success: true })
    await waitFor(() => expect(screen.getByText('Connected')).toBeTruthy())
  })

  it('offers to disconnect an account already connected', async () => {
    const { calls } = ipc(true)
    render(row)
    fireEvent.click(await screen.findByRole('button', { name: 'Disconnect' }))
    await waitFor(() => expect(calls).toContainEqual(['composio:disconnect', { toolkitSlug: 'outlook' }]))
  })
})
