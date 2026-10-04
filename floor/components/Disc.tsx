// A pressed record drawn in SVG. Rotation is set by the parent from the song position, so it
// turns once per loop of the song and stops when the room is silent.
export function Disc({turn, label}: {turn: number; label: string}) {
  const grooves = Array.from({length: 22}, (_, i) => 24 + i * 1.9)
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label={label} width="100%" height="100%">
      <defs>
        <radialGradient id="vinyl" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="oklch(0.2 0.03 265)" />
          <stop offset="1" stopColor="oklch(0.13 0.03 265)" />
        </radialGradient>
        <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0.35" stopColor="oklch(1 0 0)" stopOpacity="0" />
          <stop offset="0.5" stopColor="oklch(1 0 0)" stopOpacity="0.16" />
          <stop offset="0.65" stopColor="oklch(1 0 0)" stopOpacity="0" />
        </linearGradient>
        <filter id="soft" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="0.25" />
        </filter>
      </defs>
      <g filter="url(#soft)">
        <circle cx="50" cy="50" r="48" fill="url(#vinyl)" stroke="var(--line)" strokeWidth="1" />
        <g style={{transformOrigin: '50px 50px', transform: `rotate(${turn}deg)`}}>
          {grooves.map((r, i) => (
            <circle key={i} cx="50" cy="50" r={r} fill="none" stroke="oklch(0.3 0.03 265)" strokeWidth="0.25" opacity={i % 3 === 0 ? 0.9 : 0.5} />
          ))}
          <circle cx="50" cy="50" r="16" fill="var(--room)" />
          <path d="M50 34 A16 16 0 0 1 66 50" fill="none" stroke="var(--on-room)" strokeWidth="1.2" opacity="0.5" />
          <circle cx="50" cy="50" r="2" fill="var(--ground)" />
        </g>
        <circle cx="50" cy="50" r="48" fill="url(#sheen)" />
      </g>
    </svg>
  )
}
