import {test} from 'node:test'
import assert from 'node:assert/strict'
import {hasStep, toEngineSong, toggleStep, type SongDoc} from './doc.ts'

const doc = (): SongDoc => ({
  _id: 'song-warmup',
  _type: 'song',
  title: 'T',
  bpm: 120,
  swing: 0.1,
  sections: [
    {
      _key: 'a',
      title: 'A',
      kind: 'intro',
      bars: 2,
      lanes: [
        {
          _key: 'lane-voice-kick',
          voice: {_ref: 'voice-kick'},
          steps: [{_key: 's0', index: 0, velocity: 0.9, probability: 1, nudge: 0}],
        },
      ],
    },
  ],
})

test('toggleStep adds a step with defaults and a stable key', () => {
  const next = toggleStep(doc(), 0, 'voice-kick', 4)
  const steps = next.sections[0].lanes[0].steps
  assert.equal(steps.length, 2)
  assert.deepEqual(steps[1], {_key: 's4', index: 4, velocity: 0.9, probability: 1, nudge: 0})
})

test('toggleStep removes a step that is present', () => {
  const next = toggleStep(doc(), 0, 'voice-kick', 0)
  assert.equal(next.sections[0].lanes[0].steps.length, 0)
})

test('toggleStep creates the lane when the voice has none', () => {
  const next = toggleStep(doc(), 0, 'voice-hat', 2)
  const lane = next.sections[0].lanes[1]
  assert.equal(lane.voice._ref, 'voice-hat')
  assert.equal(lane.steps[0].index, 2)
  assert.equal(lane._key, 'lane-voice-hat')
})

test('toggleStep never mutates its input', () => {
  const d = doc()
  const before = JSON.stringify(d)
  toggleStep(d, 0, 'voice-kick', 8)
  assert.equal(JSON.stringify(d), before)
})

test('hasStep reports presence', () => {
  assert.equal(hasStep(doc(), 0, 'voice-kick', 0), true)
  assert.equal(hasStep(doc(), 0, 'voice-kick', 1), false)
  assert.equal(hasStep(doc(), 0, 'voice-none', 0), false)
})

test('toEngineSong maps references to voice ids and fills defaults', () => {
  const d = doc()
  delete (d.sections[0].lanes[0].steps[0] as Partial<{velocity: number}>).velocity
  const s = toEngineSong(d)
  assert.equal(s.sections[0].lanes[0].voiceId, 'voice-kick')
  assert.equal(s.sections[0].lanes[0].steps[0].velocity, 0.9)
  assert.equal(s.bpm, 120)
  assert.equal(s.swing, 0.1)
})
