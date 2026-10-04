import {
  publishDocument,
  discardDocument,
  useApplyDocumentActions,
  useDocument,
  useEditDocument,
  useQuery,
} from '@sanity/sdk-react'
import {MotionConfig} from 'motion/react'
import {useEffect, useMemo, useRef, useState} from 'react'
import {Roll} from '../../floor/components/Roll'
import {toEngineSong, toggleStep, type SongDoc} from '../../floor/lib/engine/doc.ts'
import type {VoiceDoc} from '../../floor/lib/engine/synth.ts'
import {rollLanes} from '../../floor/lib/roll-lanes'
import {DATASET, PROJECT_ID} from './App'
import styles from './Deck.module.css'
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
  const [dropId, setDropId] = useState(0)
  const [dropping, setDropping] = useState(false)
  const [lastDrop, setLastDrop] = useState<number | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), [])

  if (!draft) return <p className={styles.boot}>The song document does not exist yet.</p>

  const changed = strip(draft) !== strip(published)
  const index = Math.min(section, draft.sections.length - 1)
  const draftSong = toEngineSong(draft)
  const roomSong = published ? toEngineSong(published) : null
  const mutate = (fn: (d: SongDoc) => SongDoc) => void edit((prev) => fn(prev as unknown as SongDoc) as never)

  const drop = async () => {
    setBusy('drop')
    try {
      await apply(publishDocument({...handle}))
      setDropId((n) => n + 1)
      setDropping(true)
      setLastDrop(Date.now())
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setDropping(false), 1000)
    } finally {
      setBusy(null)
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <main className={styles.deck}>
        <header className={styles.top}>
          <h1 className={styles.title}>The Deck</h1>
          <p className={styles.state} aria-live="polite">
            {busy === 'drop'
              ? 'Dropping the draft into the room.'
              : changed
                ? 'The draft differs from the room. Only you can hear it. Press Drop to publish.'
                : lastDrop
                  ? 'Dropped. The room now plays your draft.'
                  : 'Draft and room are identical.'}
          </p>
        </header>

        <div className={styles.controls}>
          <label className={styles.bpm}>
            <span>Tempo</span>
            <input
              type="number"
              inputMode="numeric"
              min={60}
              max={200}
              value={draft.bpm}
              onChange={(e) => mutate((d) => ({...d, bpm: Number(e.target.value) || d.bpm}))}
            />
            <span>bpm</span>
          </label>
          <button className={styles.cue} data-on={cue.on} onClick={cue.toggle}>
            {cue.on ? 'Cue is on' : 'Cue off'}
          </button>
          <button
            className={styles.quiet}
            disabled={!changed || busy !== null}
            onClick={async () => {
              setBusy('discard')
              try {
                await apply(discardDocument({...handle}))
              } finally {
                setBusy(null)
              }
            }}
          >
            Discard draft
          </button>
          <button className={styles.drop} disabled={!changed || busy !== null} onClick={drop}>
            {busy === 'drop' ? 'Dropping' : 'Drop'}
          </button>
        </div>

        <div className={styles.tabs} role="group" aria-label="Sections">
          {draft.sections.map((s, i) => (
            <button key={s._key} aria-pressed={i === index} onClick={() => setSection(i)}>
              {s.title}
            </button>
          ))}
        </div>

        <section className={styles.block} aria-label="Your draft">
          <h2>In your headphones</h2>
          <Roll
            label={'Your draft of ' + draft.sections[index].title}
            lanes={rollLanes(draftSong.sections[index], voices)}
            step={cue.on && cue.sectionIndex === index ? cue.step : -1}
            channel="cue"
            dropId={0}
            dropping={false}
            onToggle={(voiceId, i) => mutate((d) => toggleStep(d, index, voiceId, i))}
          />
        </section>

        {roomSong && (
          <section className={styles.block} aria-label="The room">
            <h2>In the room right now</h2>
            <Roll
              label={'The room plays ' + roomSong.sections[Math.min(index, roomSong.sections.length - 1)].title}
              lanes={rollLanes(roomSong.sections[Math.min(index, roomSong.sections.length - 1)], voices)}
              step={-1}
              channel="room"
              dropId={dropId}
              dropping={dropping}
            />
          </section>
        )}
      </main>
    </MotionConfig>
  )
}
