// Mirrors styles/tokens.css. Change both together. Motion takes seconds, CSS takes milliseconds.
export const dur = {micro: 0.12, short: 0.2, punch: 0.26} as const
export const ease = {
  out: [0.23, 1, 0.32, 1],
  inOut: [0.77, 0, 0.175, 1],
} as const

// The Drop: 16 columns at 40 ms each, plus one punch, lands inside 900 ms.
export const COLUMN_STAGGER = 0.04
