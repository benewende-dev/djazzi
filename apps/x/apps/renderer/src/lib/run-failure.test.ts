import { describe, expect, it } from 'vitest'
import { runFailure } from './run-failure'

describe('runFailure', () => {
  it('says a refused request in plain words, never the provider\'s', () => {
    const raw = 'This request requires more credits, or fewer max_tokens. You requested up to 32000 tokens, but can only afford 1200. To increase, visit https://openrouter.ai/settings/keys [status 402]'
    expect(runFailure(raw)).toBe("Djazzi can't answer right now: the AI service refused the request. Please try again in a moment.")
    expect(runFailure('429 Too Many Requests')).toBe('Too many requests at once. Please try again in a moment.')
  })

  it('keeps the first line of anything else, without links', () => {
    expect(runFailure('Tool failed: see https://example.test/x\nstack…')).toBe('Tool failed: see')
    expect(runFailure('')).toBe('Unknown error')
  })
})
