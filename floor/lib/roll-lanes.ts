import type {Section} from './engine/clock.ts'
import type {VoiceDoc} from './engine/synth.ts'
import type {RollLane} from '../components/Roll'

const KIT_ORDER = ["kick", "snare", "clap", "tom", "hat", "bass", "stab"]

// One roll row per voice in the kit, in kit order, whether or not the section uses it.
export function rollLanes(section: Section | undefined, voices: VoiceDoc[]): RollLane[] {
  return [...voices]
    .sort((a, b) => KIT_ORDER.indexOf(a.kind) - KIT_ORDER.indexOf(b.kind))
    .map((v) => ({
    voiceId: v._id,
    name: v.name,
    steps: (section?.lanes ?? []).filter((l) => l.voiceId === v._id).flatMap((l) => l.steps.map((s) => s.index)),
  }))
}
