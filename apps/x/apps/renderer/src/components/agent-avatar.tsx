import type { AgentAvatarId } from '@x/shared/dist/baarasseur.js'
import original from '@/assets/djazzi-avatars/original.svg'
import bop from '@/assets/djazzi-avatars/bop.png'
import moki from '@/assets/djazzi-avatars/moki.png'
import nova from '@/assets/djazzi-avatars/nova.png'
import tiko from '@/assets/djazzi-avatars/tiko.png'
import nimbo from '@/assets/djazzi-avatars/nimbo.png'
import pixel from '@/assets/djazzi-avatars/pixel.png'
import zest from '@/assets/djazzi-avatars/zest.png'
import ink from '@/assets/djazzi-avatars/ink.png'
import street from '@/assets/djazzi-avatars/street.png'

// DJAZZI(11/10/2026): the same assets and ids as the phone, rendered from
// the saved profile rather than a separate browser preference.
const SOURCES: Record<AgentAvatarId, string> = { original, bop, moki, nova, tiko, nimbo, pixel, zest, ink, street }
export function AgentAvatarImage({ avatar }: { avatar: AgentAvatarId }) {
  return <img src={SOURCES[avatar]} alt="" className="h-full w-full object-contain p-0.5" draggable={false} />
}
