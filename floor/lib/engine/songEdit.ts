import type {Song} from './clock.ts'

// Local edits for the public booth, on the engine shape. Returns a new song and never mutates.
export function toggleSongStep(song: Song, sectionIndex: number, voiceId: string, index: number): Song {
  return {
    ...song,
    sections: song.sections.map((section, si) => {
      if (si !== sectionIndex) return section
      const has = section.lanes.some((l) => l.voiceId === voiceId)
      const flip = (steps: Song['sections'][number]['lanes'][number]['steps']) =>
        steps.some((s) => s.index === index)
          ? steps.filter((s) => s.index !== index)
          : [...steps, {index, velocity: 0.9, probability: 1, nudge: 0}]
      return {
        ...section,
        lanes: has
          ? section.lanes.map((l) => (l.voiceId === voiceId ? {...l, steps: flip(l.steps)} : l))
          : [...section.lanes, {voiceId, steps: flip([])}],
      }
    }),
  }
}
