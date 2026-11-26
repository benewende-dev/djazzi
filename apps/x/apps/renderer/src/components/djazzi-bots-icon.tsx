// DJAZZI(26/11/2026): the Djazzi Bots icon — the logo's D, drawn in a line as
// the sidebar's other icons (lucide), with its two eyes. In place of the
// briefcase of « Agents ».
export function DjazziBotsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M5 4h6.5a7.5 8 0 0 1 0 16H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="11" cy="11" r="1.25" fill="currentColor" />
      <circle cx="14.6" cy="11" r="1.25" fill="currentColor" />
    </svg>
  )
}
