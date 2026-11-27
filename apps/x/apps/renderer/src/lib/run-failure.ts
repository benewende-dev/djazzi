// DJAZZI(27/11/2026): why a routine's last run failed, in plain words, as
// the phone says it (desktop assets/mobile/turn-failure.ts). The provider's
// error came through whole (« This request requires more credits, or fewer
// max_tokens… », a link to its key page); the app's French layer translates
// these sentences.
export function runFailure(error: string | null | undefined): string {
  const raw = String(error ?? '')
  if (/requires more credits|can only afford|status 402|insufficient (credits|balance)|provider_credits|Djazzi cannot answer right now/i.test(raw)) {
    return "Djazzi can't answer right now: the AI service refused the request. Please try again in a moment."
  }
  if (/rate.?limit|status 429|too many requests/i.test(raw)) {
    return 'Too many requests at once. Please try again in a moment.'
  }
  const first = (raw.split('\n')[0] ?? '')
    .replace(/\s*\[status[\s\S]*$/, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240)
  return first || 'Unknown error'
}
