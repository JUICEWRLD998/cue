import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-02-19'})

const voices = [
  {_id: 'voice-kick', name: 'Kick', kind: 'kick', pitch: 52, decay: 380, tone: 0.3, gain: 0.95},
  {_id: 'voice-snare', name: 'Snare', kind: 'snare', pitch: 190, decay: 170, tone: 0.6, gain: 0.7},
  {_id: 'voice-hat', name: 'Closed hat', kind: 'hat', pitch: 7200, decay: 55, tone: 0.9, gain: 0.35},
  {_id: 'voice-clap', name: 'Clap', kind: 'clap', pitch: 1500, decay: 140, tone: 0.7, gain: 0.55},
  {_id: 'voice-bass', name: 'Sub bass', kind: 'bass', pitch: 55, decay: 260, tone: 0.2, gain: 0.8},
  {_id: 'voice-stab', name: 'Chord stab', kind: 'stab', pitch: 330, decay: 210, tone: 0.55, gain: 0.4},
].map((v) => ({_type: 'voice', ...v}))

type Hit = number | [number, number]

function lane(voiceId: string, hits: Hit[]) {
  return {
    _type: 'lane',
    _key: `lane-${voiceId}`,
    voice: {_type: 'reference', _ref: voiceId},
    steps: hits.map((h) => {
      const [index, velocity] = Array.isArray(h) ? h : [h, 0.9]
      return {_type: 'step', _key: `s${index}`, index, velocity, probability: 1, nudge: 0}
    }),
  }
}

function section(key: string, title: string, kind: string, bars: number, lanes: ReturnType<typeof lane>[]) {
  return {_type: 'section', _key: key, title, kind, bars, lanes}
}

const song = {
  _id: 'song-warmup',
  _type: 'song',
  title: 'Warm-up',
  bpm: 118,
  swing: 0.08,
  sections: [
    section('intro', 'Warm-up', 'intro', 2, [
      lane('voice-kick', [0, 8]),
      lane('voice-hat', [[2, 0.5], [6, 0.5], [10, 0.5], [14, 0.5]]),
    ]),
    section('groove', 'Groove', 'build', 4, [
      lane('voice-kick', [0, 4, 8, 12]),
      lane('voice-hat', [[2, 0.6], [6, 0.6], [10, 0.6], [14, 0.6]]),
      lane('voice-clap', [4, 12]),
      lane('voice-bass', [[3, 0.7], [7, 0.7], [11, 0.7]]),
    ]),
  ],
}

async function main() {
  const tx = client.transaction()
  for (const v of voices) tx.createOrReplace(v)
  tx.createOrReplace(song)
  const res = await tx.commit()
  console.log('seeded', res.results.length, 'documents, transaction', res.transactionId)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
