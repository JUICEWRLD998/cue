import {test} from 'node:test'
import assert from 'node:assert/strict'
import {toggleSongStep} from './songEdit.ts'
import type {Song} from './clock.ts'

const song = (): Song => ({
  title: 't',
  bpm: 120,
  swing: 0,
  sections: [
    {
      title: 'a',
      kind: 'intro',
      bars: 1,
      lanes: [{voiceId: 'voice-kick', steps: [{index: 0, velocity: 0.9, probability: 1, nudge: 0}]}],
    },
  ],
})

test('adds a step', () => {
  const s = toggleSongStep(song(), 0, 'voice-kick', 4)
  assert.deepEqual(s.sections[0].lanes[0].steps.map((x) => x.index), [0, 4])
})

test('removes a step', () => {
  const s = toggleSongStep(song(), 0, 'voice-kick', 0)
  assert.equal(s.sections[0].lanes[0].steps.length, 0)
})

test('creates the lane for a new voice', () => {
  const s = toggleSongStep(song(), 0, 'voice-hat', 2)
  assert.equal(s.sections[0].lanes[1].voiceId, 'voice-hat')
})

test('does not mutate its input', () => {
  const d = song()
  const before = JSON.stringify(d)
  toggleSongStep(d, 0, 'voice-kick', 8)
  assert.equal(JSON.stringify(d), before)
})
