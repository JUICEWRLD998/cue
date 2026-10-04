'use client'

import {MotionConfig} from 'motion/react'

// Reduced motion at the root: Motion drops transform animation and keeps opacity,
// so the Drop becomes a crossfade that still lands on the same pattern.
export function MotionProvider({children}: {children: React.ReactNode}) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
