/**
 * Pure step math. No DOM, no audio, no dependencies.
 * The Floor and the Deck both derive the playing step from the wall clock, so two
 * tabs stay in sync with no server clock.
 */

export const EPOCH_MS = Date.UTC(2026, 0, 1)
export const STEPS_PER_BAR = 16

export type Step = {index: number; velocity: number; probability: number; nudge: number}
export type Lane = {voiceId: string; steps: Step[]}
export type Section = {title: string; kind: string; bars: number; lanes: Lane[]}
export type Song = {title: string; bpm: number; swing: number; sections: Section[]}
export type Hit = {voiceId: string; velocity: number; probability: number; nudge: number}

export type Position = {
  absStep: number
  stepInBar: number
  songBar: number
  sectionIndex: number
  barInSection: number
}

export function stepMs(bpm: number): number {
  return 60000 / bpm / 4
}

export function barMs(bpm: number): number {
  return stepMs(bpm) * STEPS_PER_BAR
}

/** Odd steps are pushed later by swing * one step. */
export function swingOffsetMs(stepInBar: number, bpm: number, swing: number): number {
  return stepInBar % 2 === 1 ? swing * stepMs(bpm) : 0
}

export function totalBars(song: Song): number {
  return song.sections.reduce((n, s) => n + s.bars, 0)
}

const mod = (n: number, m: number) => ((n % m) + m) % m

export function positionAt(song: Song, nowMs: number, epochMs = EPOCH_MS): Position {
  const absStep = Math.floor((nowMs - epochMs) / stepMs(song.bpm))
  const stepInBar = mod(absStep, STEPS_PER_BAR)
  const absBar = Math.floor(absStep / STEPS_PER_BAR)
  const songBar = mod(absBar, totalBars(song))
  let rest = songBar
  for (let i = 0; i < song.sections.length; i++) {
    if (rest < song.sections[i].bars) {
      return {absStep, stepInBar, songBar, sectionIndex: i, barInSection: rest}
    }
    rest -= song.sections[i].bars
  }
  throw new Error('song has no sections')
}

/** First bar boundary strictly after nowMs. */
export function nextBarBoundary(nowMs: number, bpm: number, epochMs = EPOCH_MS): number {
  const bar = barMs(bpm)
  return epochMs + (Math.floor((nowMs - epochMs) / bar) + 1) * bar
}

export function hitsAt(section: Section, stepInBar: number): Hit[] {
  const out: Hit[] = []
  for (const lane of section.lanes) {
    for (const s of lane.steps) {
      if (s.index === stepInBar) {
        out.push({voiceId: lane.voiceId, velocity: s.velocity, probability: s.probability, nudge: s.nudge})
      }
    }
  }
  return out
}
