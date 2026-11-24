import { __djazziT as translate } from '@/djazzi-i18n/mobile/runtime';

// DJAZZI(09/11/2026): a failed turn said in plain words. The model's error
// came through whole (OpenRouter's JSON, its retries, the link to the key's
// page): the person reads why in one line, never a provider's link.
export function turnFailure(error: unknown): string {
  const raw = String(error ?? '');
  // 23/11/2026: the control plane now says it itself (llm-proxy.ts, code provider_credits, status 503).
  if (/requires more credits|can only afford|status 402|insufficient (credits|balance)|provider_credits|Djazzi cannot answer right now/i.test(raw)) {
    return translate("Djazzi can't answer right now: the AI service refused the request. Please try again in a moment.");
  }
  if (/rate.?limit|status 429|too many requests/i.test(raw)) {
    return translate('Too many requests at once. Please try again in a moment.');
  }
  const first = (raw.split('\n')[0] ?? '')
    .replace(/\s*\[status[\s\S]*$/, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240);
  return translate('Failed: $1', [first || translate('unknown error')]);
}
