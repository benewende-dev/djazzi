import { describe, expect, it } from 'vitest'
import { TEMPLATES, TOOLS, describeSystem, idFor, parseDescribed } from './baarasseurs'

describe('the baarasseurs, app side (06/10/2026)', () => {
  it('makes a readable, unique id from the name', () => {
    expect(idFor('Aminata', [])).toBe('aminata')
    expect(idFor('Aminata', ['aminata', 'aminata-2'])).toBe('aminata-3')
    expect(idFor('  Kouadio Désiré ', [])).toBe('kouadio-desire')
    expect(idFor('★', [])).toBe('baarasseur')
  })

  it('reads the form the model filled, keeping only known tools and sane hours', () => {
    const filled = parseDescribed('Voici : {"name":"Moussa","role":"Logistique","mission":"Planifie.","tools":["WhatsApp","Fax"],"schedule":{"every":"day","hour":31}}')
    expect(filled).toEqual({ name: 'Moussa', role: 'Logistique', mission: 'Planifie.', tools: ['WhatsApp'], schedule: { every: 'day', hour: 23 } })
    expect(parseDescribed('{"schedule":null}')).toEqual({ schedule: null })
    expect(parseDescribed('no json here')).toBeNull()
  })

  it('asks for the form in the app language, with the tools it can give', () => {
    expect(describeSystem('fr')).toContain('French, with « tu »')
    expect(describeSystem('en')).toContain(JSON.stringify(TOOLS))
    expect(describeSystem('en')).not.toContain('$TOOLS')
  })

  it('offers the site carousel as templates, each with both languages and known tools', () => {
    expect(TEMPLATES.map((t) => t.name)).toEqual(['Mariama', 'Ibrahim', 'Adjoua', 'Aminata', 'Fatou', 'Moussa', 'Zara', 'Kofi', 'Awa'])
    for (const t of TEMPLATES) {
      expect(t.role.fr && t.role.en && t.mission.fr && t.mission.en).toBeTruthy()
      expect(t.tools.every((x) => (TOOLS as readonly string[]).includes(x))).toBe(true)
    }
  })
})

describe('the shared save, desktop and phone alike (06/10/2026)', () => {
  it('keeps a rule learned meanwhile, drops a forgotten one, and resets its hours', async () => {
    const { saveTeam, upsertChange } = await import('@x/shared/dist/baarasseur.js')
    const stored = { id: 'mariama', name: 'Mariama', role: '', mission: '', color: 'clay', tools: [], memory: ['old rule', 'learned meanwhile'], createdAt: 'x', schedule: null }
    const calls: Array<[string, unknown]> = []
    let file = JSON.stringify({ baarasseurs: [stored] })
    const invoke = async (channel: string, args: unknown) => {
      calls.push([channel, args])
      if (channel === 'workspace:readFile') return { data: file }
      if (channel === 'workspace:writeFile') file = (args as { data: string }).data
      return { success: true }
    }
    const edited = { ...stored, mission: 'Relance', memory: [], schedule: { every: 'week' as const, day: 1, hour: 8 } }
    const team = await saveTeam(invoke, upsertChange(edited, ['old rule']), { id: 'mariama' }, 'fr')
    expect(team[0].memory).toEqual(['learned meanwhile'])
    expect(calls.map(([c]) => c)).toEqual(['workspace:readFile', 'workspace:writeFile', 'agent-schedule:deleteAgent', 'agent-schedule:updateAgent'])
    expect(calls[3][1]).toMatchObject({ agentName: 'baarasseur-mariama', entry: { schedule: { type: 'cron', expression: '0 8 * * 1' } } })
    expect((calls[3][1] as { entry: { startingMessage: string } }).entry.startingMessage).toMatch(/^C’est l’heure/)
  })
})

// DJAZZI(26/11/2026): the Djazzi Bots page.
describe('the Djazzi Bots page (26/11/2026)', () => {
  it('keeps a paused bot\'s hours but turns its routine off', async () => {
    const { saveTeam, upsertChange } = await import('@x/shared/dist/baarasseur.js')
    const b = { id: 'mariama', name: 'Mariama', role: '', mission: '', color: 'clay', tools: [], memory: [], createdAt: 'x', schedule: { every: 'week' as const, day: 1, hour: 8 }, paused: true }
    const calls: Array<[string, unknown]> = []
    const invoke = async (channel: string, args: unknown) => { calls.push([channel, args]); return {} }
    await saveTeam(invoke, upsertChange(b), { id: 'mariama' }, 'fr')
    const update = calls.find(([c]) => c === 'agent-schedule:updateAgent')?.[1] as { entry: { enabled: boolean; schedule: { expression: string } } }
    expect(update.entry.enabled).toBe(false)
    expect(update.entry.schedule.expression).toBe('0 8 * * 1')
  })

  it('sorts every template into a category, and puts forward two of them', async () => {
    const { BOT_CATEGORIES, FEATURED_TEMPLATES, templateCategory } = await import('./baarasseurs')
    const ids = BOT_CATEGORIES.map((c) => c.id)
    for (const t of TEMPLATES) expect(ids).toContain(templateCategory(t))
    for (const id of FEATURED_TEMPLATES) expect(TEMPLATES.some((t) => t.id === id)).toBe(true)
  })

  it('answers the bot where it asked, and starts a conversation to run it now', async () => {
    const calls: Array<[string, any]> = []
    ;(globalThis as any).window = { ...(globalThis as any).window, ipc: { invoke: async (channel: string, args: unknown) => {
      calls.push([channel, args])
      return channel === 'sessions:create' ? { sessionId: 'new-1' } : { queued: false, turnId: 't' }
    } } }
    const { runBotNow, sayToBot } = await import('./baarasseurs')
    expect(await sayToBot('baarasseur-mariama', 's1', 'Oui')).toBe('s1')
    expect(calls).toEqual([['sessions:sendOrQueueMessage', { sessionId: 's1', input: { role: 'user', content: 'Oui' }, config: { agent: { agentId: 'baarasseur-mariama' } } }]])
    calls.length = 0
    expect(await runBotNow({ id: 'mariama' })).toBe('new-1')
    expect(calls.map(([c]) => c)).toEqual(['sessions:create', 'sessions:sendOrQueueMessage'])
    expect(calls[1][1].config.agent.agentId).toBe('baarasseur-mariama')
  })

  it('writes token counts short', async () => {
    const { tokensWords } = await import('./baarasseurs')
    expect(tokensWords(950)).toBe('950')
    expect(tokensWords(12_400)).toMatch(/^12 k$/)
    expect(tokensWords(1_250_000)).toMatch(/^1[.,]3 M$/)
  })
})
