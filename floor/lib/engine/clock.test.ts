import {test} from 'node:test'
import assert from 'node:assert/strict'
import {
  EPOCH_MS,
  stepMs,
  barMs,
  swingOffsetMs,
  totalBars,
  positionAt,
  nextBarBoundary,
  hitsAt,
  type Song,
} from './clock.ts'

const song: Song = {
  title: 't',
  bpm: 120,
  swing: 0,
  sections: [
    {
      title: 'a',
      kind: 'intro',
      bars: 2,
      lanes: [{voiceId: 'voice-kick', steps: [{index: 0, velocity: 1, probability: 1, nudge: 0}]}],
    },
    {
      title: 'b',
      kind: 'build',
      bars: 4,
      lanes: [
        {voiceId: 'voice-hat', steps: [{index: 2, velocity: 0.5, probability: 0.5, nudge: -5}]},
      ],
    },
  ],
}

test('stepMs: 120 bpm sixteenth is 125 ms', () => {
  assert.equal(stepMs(120), 125)
})

test('barMs is 16 steps', () => {
  assert.equal(barMs(120), 2000)
})

test('totalBars sums sections', () => {
  assert.equal(totalBars(song), 6)
})

test('swingOffsetMs delays odd steps only', () => {
  assert.equal(swingOffsetMs(0, 120, 0.2), 0)
  assert.equal(swingOffsetMs(1, 120, 0.2), 25)
  assert.equal(swingOffsetMs(2, 120, 0.2), 0)
  assert.equal(swingOffsetMs(3, 120, 0), 0)
})

test('positionAt at epoch is section 0 bar 0 step 0', () => {
  assert.deepEqual(positionAt(song, EPOCH_MS), {
    absStep: 0,
    stepInBar: 0,
    songBar: 0,
    sectionIndex: 0,
    barInSection: 0,
  })
})

test('positionAt walks into the second section', () => {
  const t = EPOCH_MS + 2 * 2000 + 3 * 125
  const p = positionAt(song, t)
  assert.equal(p.sectionIndex, 1)
  assert.equal(p.barInSection, 0)
  assert.equal(p.stepInBar, 3)
})

test('positionAt loops after totalBars', () => {
  const t = EPOCH_MS + 6 * 2000 + 125
  const p = positionAt(song, t)
  assert.equal(p.sectionIndex, 0)
  assert.equal(p.songBar, 0)
  assert.equal(p.stepInBar, 1)
})

test('positionAt tolerates times before the epoch', () => {
  const p = positionAt(song, EPOCH_MS - 125)
  assert.equal(p.stepInBar, 15)
  assert.equal(p.songBar, 5)
})

test('nextBarBoundary is strictly after now and bar-aligned', () => {
  const t = EPOCH_MS + 3 * 2000 + 10
  assert.equal(nextBarBoundary(t, 120), EPOCH_MS + 4 * 2000)
  assert.equal(nextBarBoundary(EPOCH_MS + 4 * 2000, 120), EPOCH_MS + 5 * 2000)
})

test('hitsAt returns lane hits for a step', () => {
  const hits = hitsAt(song.sections[1], 2)
  assert.equal(hits.length, 1)
  assert.deepEqual(hits[0], {voiceId: 'voice-hat', velocity: 0.5, probability: 0.5, nudge: -5})
  assert.equal(hitsAt(song.sections[1], 3).length, 0)
})
