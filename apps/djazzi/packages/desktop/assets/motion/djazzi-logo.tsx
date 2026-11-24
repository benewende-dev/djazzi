// DJAZZI(11/10/2026): Chargement animates the compact D in the sidebar.
import { DjazziMark } from '@/components/djazzi-mark';
import { WORD as SIGN_WORD } from '@/lib/djazzi-d-mark';

// DJAZZI(07/11/2026): the word in Geist SemiBold, one colour (sign C).
const WORD = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${SIGN_WORD.left} 0 ${SIGN_WORD.width - SIGN_WORD.left} ${SIGN_WORD.capHeight}" overflow="visible" role="img" aria-label="Djazzi"><path d="${SIGN_WORD.d}" fill="currentColor"/></svg>`

export function DjazziLogo() {
  return (
    <span className="flex items-center gap-2" aria-label="Djazzi" role="img">
      <DjazziMark size={28} motion="loading" className="text-sidebar-foreground" />
      <span className="h-[14px] text-sidebar-foreground [&>svg]:h-full [&>svg]:w-auto" dangerouslySetInnerHTML={{ __html: WORD }} />
    </span>
  )
}
