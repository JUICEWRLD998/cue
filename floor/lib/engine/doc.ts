import type {Song} from './clock.ts'

// The shape of a song document as Sanity stores it (voice is a reference, items carry _key).
// The engine plays the flatter shape in clock.ts; toEngineSong converts between them.

export type StepDoc = {_key: string; index: number; velocity?: number; probability?: number; nudge?: number}
export type LaneDoc = {_key: string; voice: {_ref: string}; steps: StepDoc[]}
export type SectionDoc = {_key: string; title: string; kind: string; bars: number; lanes: LaneDoc[]}
export type SongDoc = {
  _id: string
  _type: 'song'
  title: string
  bpm: number
  swing?: number
  sections: SectionDoc[]
}

export function toEngineSong(doc: SongDoc): Song {
  return {
    title: doc.title,
    bpm: doc.bpm,
    swing: doc.swing ?? 0,
    sections: (doc.sections ?? []).map((s) => ({
      title: s.title,
      kind: s.kind,
      bars: s.bars ?? 1,
      lanes: (s.lanes ?? []).map((l) => ({
        voiceId: l.voice._ref,
        steps: (l.steps ?? []).map((st) => ({
          index: st.index,
          velocity: st.velocity ?? 0.9,
          probability: st.probability ?? 1,
          nudge: st.nudge ?? 0,
        })),
      })),
    })),
  }
}

export function hasStep(doc: SongDoc, sectionIndex: number, voiceId: string, index: number): boolean {
  const lane = doc.sections[sectionIndex]?.lanes?.find((l) => l.voice._ref === voiceId)
  return !!lane?.steps?.some((s) => s.index === index)
}

// Returns a new document with the step switched on or off. Never mutates its input.
export function toggleStep(doc: SongDoc, sectionIndex: number, voiceId: string, index: number): SongDoc {
  return {
    ...doc,
    sections: doc.sections.map((section, si) => {
      if (si !== sectionIndex) return section
      const lanes = section.lanes ?? []
      const exists = lanes.some((l) => l.voice._ref === voiceId)
      const toggled = (steps: StepDoc[]): StepDoc[] =>
        steps.some((s) => s.index === index)
          ? steps.filter((s) => s.index !== index)
          : [...steps, {_key: `s${index}`, index, velocity: 0.9, probability: 1, nudge: 0}]
      if (!exists) {
        return {
          ...section,
          lanes: [...lanes, {_key: `lane-${voiceId}`, voice: {_ref: voiceId}, steps: toggled([])}],
        }
      }
      return {
        ...section,
        lanes: lanes.map((l) => (l.voice._ref === voiceId ? {...l, steps: toggled(l.steps ?? [])} : l)),
      }
    }),
  }
}
