import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { setColor, useDjazziColor } from '@/lib/djazzi-color'
import { COLOR_CHOICES } from '@/components/djazzi-onboarding/model'
import { fillOf } from '@/components/djazzi-onboarding/shape'

// DJAZZI(27/11/2026): Settings › Appearance, the colour of your Djazzi,
// which the whole app follows (lib/djazzi-color.ts).
export function DjazziColorSetting() {
  const color = useDjazziColor()
  return (
    <div>
      <h4 className="mb-3 text-sm font-medium">Colour of your Djazzi</h4>
      <p className="mb-4 text-xs text-muted-foreground">The app takes it on: buttons, the page you are on, your messages. White keeps Djazzi blue.</p>
      <div role="radiogroup" aria-label="Colour of your Djazzi" className="flex flex-wrap gap-2.5">
        {COLOR_CHOICES.map((c) => (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={color === c.id}
            aria-label={c.label}
            title={c.label}
            onClick={() => setColor(c.id)}
            className={cn(
              'relative flex size-10 items-center justify-center rounded-full border transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              color === c.id ? 'shadow-[0_0_0_2px_var(--background),0_0_0_4px_var(--foreground)]' : 'border-border',
            )}
            style={{ background: fillOf(c.id) }}
          >
            {color === c.id && <Check className="size-4 text-[#0A0A0A]" strokeWidth={3} aria-hidden="true" />}
          </button>
        ))}
      </div>
    </div>
  )
}
