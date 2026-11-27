import { useSyncExternalStore } from 'react'
import { COLOR_CHOICES, loadLook, storeLook } from '@/components/djazzi-onboarding/model'

// DJAZZI(27/11/2026): « Your Djazzi, your colour » (the founder's mockup
// « Couleurs Djazzi »). The colour of the person's Djazzi, chosen at the
// onboarding or in Settings › Appearance, becomes the app's accent: the
// main buttons, the page you are on, the send button, focus rings, one's
// own messages. It is set on <html data-djazzi-color>, and djazzi-theme.css
// gives each colour a deeper shade for text and buttons, in light and dark.
// White, the default, keeps the brand's blue.

export type DjazziColor = (typeof COLOR_CHOICES)[number]['id']

const EVENT = 'djazzi-color'

export function currentColor(): DjazziColor {
  return loadLook().color as DjazziColor
}

export function applyColor(color: string): void {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.djazziColor = color
}

/** Keeps the shape, changes the colour, everywhere at once. */
export function setColor(color: DjazziColor): void {
  storeLook({ ...loadLook(), color })
  applyColor(color)
  window.dispatchEvent(new Event(EVENT))
}

function subscribe(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === 'djazzi.look.v1') {
      applyColor(currentColor())
      onChange()
    }
  }
  window.addEventListener(EVENT, onChange)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(EVENT, onChange)
    window.removeEventListener('storage', onStorage)
  }
}

export function useDjazziColor(): DjazziColor {
  return useSyncExternalStore(subscribe, currentColor, () => 'white' as DjazziColor)
}

// The colour kept on this computer, from the first paint.
if (typeof window !== 'undefined') applyColor(currentColor())
