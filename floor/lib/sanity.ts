import {createClient} from '@sanity/client'
import type {Song} from './engine/clock.ts'
import type {VoiceDoc} from './engine/synth.ts'

export const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? 'jwc6peq5'
export const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production'

// The Floor reads the published perspective of a public dataset with no token.
// Drafts are never reachable from here by design.
export const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: '2025-02-19',
  useCdn: false,
  perspective: 'published',
})

const ROOM_QUERY = `{
  "song": *[_type == "song"] | order(_updatedAt desc)[0]{
    _id, _rev, _updatedAt, title, bpm, "swing": coalesce(swing, 0),
    "sections": coalesce(sections, [])[]{
      title, kind, "bars": coalesce(bars, 1),
      "lanes": coalesce(lanes, [])[]{
        "voiceId": voice._ref,
        "steps": coalesce(steps, [])[]{
          index, "velocity": coalesce(velocity, 0.9),
          "probability": coalesce(probability, 1), "nudge": coalesce(nudge, 0)
        }
      }
    }
  },
  "voices": *[_type == "voice"]{_id, name, kind, pitch, decay, tone, gain}
}`

export type Room = {
  song: (Song & {_id: string; _rev: string; _updatedAt: string}) | null
  voices: VoiceDoc[]
}

export function fetchRoom(): Promise<Room> {
  return client.fetch<Room>(ROOM_QUERY)
}
