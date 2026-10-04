import {
  publishDocument,
  discardDocument,
  useApplyDocumentActions,
  useDocument,
  useEditDocument,
  useQuery,
} from '@sanity/sdk-react'
import {useMemo, useState} from 'react'
import {STEPS_PER_BAR} from '../../floor/lib/engine/clock.ts'
import {hasStep, toggleStep, type SongDoc} from '../../floor/lib/engine/doc.ts'
import type {VoiceDoc} from '../../floor/lib/engine/synth.ts'
import {DATASET, PROJECT_ID} from './App'
import {useCue} from './useCue'

const handle = {
  documentId: 'song-warmup',
  documentType: 'song',
  projectId: PROJECT_ID,
  dataset: DATASET,
} as const

const strip = (d: unknown) => {
  const {_rev, _updatedAt, _createdAt, ...rest} = (d ?? {}) as Record<string, unknown>
  return JSON.stringify(rest)
}

export function Deck() {
  const {data: draft} = useDocument({...handle}) as unknown as {data: SongDoc | null | undefined}
  const {data: published} = useDocument({...handle, perspective: 'published'}) as unknown as {
    data: SongDoc | null | undefined
  }
  const {data: voiceList} = useQuery<VoiceDoc[]>({
    query: '*[_type == "voice"] | order(_id)',
    projectId: PROJECT_ID,
    dataset: DATASET,
  })
  const voices = useMemo(() => voiceList ?? [], [voiceList])
  const edit = useEditDocument({...handle})
  const apply = useApplyDocumentActions()
  const cue = useCue(draft, voices)
  const [section, setSection] = useState(0)
  const [busy, setBusy] = useState<'drop' | 'discard' | null>(null)

  if (!draft) return <p className="boot">The song document does not exist yet.</p>

  const changed = strip(draft) !== strip(published)
  const current = draft.sections[Math.min(section, draft.sections.length - 1)]

  const mutate = (fn: (d: SongDoc) => SongDoc) => void edit((prev) => fn(prev as unknown as SongDoc) as never)

  return (
    <main className="deck">
      <header className="bar">
        <h1>Cue · the Deck</h1>
        <label>
          bpm
          <input
            type="number"
            min={60}
            max={200}
            value={draft.bpm}
            onChange={(e) => mutate((d) => ({...d, bpm: Number(e.target.value) || d.bpm}))}
          />
        </label>
        <button aria-pressed={cue.on} onClick={cue.toggle}>
          {cue.on ? 'Cue on (headphones)' : 'Cue off'}
        </button>
        <button
          disabled={!changed || busy !== null}
          onClick={async () => {
            setBusy('discard')
            await apply(discardDocument({...handle}))
            setBusy(null)
          }}
        >
          Discard
        </button>
        <button
          className="drop"
          disabled={!changed || busy !== null}
          onClick={async () => {
            setBusy('drop')
            await apply(publishDocument({...handle}))
            setBusy(null)
          }}
        >
          {busy === 'drop' ? 'Dropping…' : 'Drop'}
        </button>
      </header>

      <p className="state" aria-live="polite">
        {changed ? 'Draft differs from the room. Press Drop to publish it.' : 'Draft and room are identical.'}
      </p>

      <nav className="tabs" aria-label="Sections">
        {draft.sections.map((s, i) => (
          <button key={s._key} aria-pressed={i === section} onClick={() => setSection(i)}>
            {s.title} · {s.bars} bars
          </button>
        ))}
      </nav>

      <div className="grid" role="table" aria-label={`Pattern for ${current.title}`}>
        {voices.map((v) => (
          <div className="lane" role="row" key={v._id}>
            <span className="name">{v.name}</span>
            {Array.from({length: STEPS_PER_BAR}, (_, i) => {
              const on = hasStep(draft, section, v._id, i)
              return (
                <button
                  key={i}
                  role="cell"
                  className={`cell ${on ? 'on' : ''} ${i % 4 === 0 ? 'beat' : ''}`}
                  aria-pressed={on}
                  aria-label={`${v.name} step ${i + 1}`}
                  onClick={() => mutate((d) => toggleStep(d, section, v._id, i))}
                />
              )
            })}
          </div>
        ))}
      </div>
    </main>
  )
}
