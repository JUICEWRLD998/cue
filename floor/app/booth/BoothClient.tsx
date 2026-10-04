'use client'

import {useCallback, useEffect, useRef, useState} from 'react'
import {Roll} from '../../components/Roll'
import {positionAt, type Song} from '../../lib/engine/clock.ts'
import {Player} from '../../lib/engine/player.ts'
import {toggleSongStep} from '../../lib/engine/songEdit.ts'
import type {VoiceDoc} from '../../lib/engine/synth.ts'
import {rollLanes} from '../../lib/roll-lanes'
import {fetchRoom} from '../../lib/sanity.ts'
import styles from './booth.module.css'

export default function BoothClient() {
  const [draft, setDraft] = useState<Song | null>(null)
  const [voices, setVoices] = useState<VoiceDoc[]>([])
  const [section, setSection] = useState(0)
  const [step, setStep] = useState(-1)
  const [cue, setCue] = useState(false)
  const [edits, setEdits] = useState(0)
  const [error, setError] = useState('')
  const player = useRef<Player | null>(null)

  const load = useCallback(async () => {
    try {
      const room = await fetchRoom()
      if (!room.song) throw new Error('No published song in the dataset.')
      setVoices(room.voices)
      setDraft(room.song)
      setEdits(0)
      if (player.current) {
        player.current.setVoices(room.voices)
        player.current.setSong(room.song)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const toggleCue = useCallback(() => {
    if (!draft) return
    if (cue) {
      player.current?.stop()
      setCue(false)
      setStep(-1)
      return
    }
    if (!player.current) player.current = new Player(new AudioContext())
    player.current.setVoices(voices)
    player.current.setSong(draft)
    player.current.start()
    setCue(true)
  }, [cue, draft, voices])

  const onToggle = useCallback(
    (voiceId: string, index: number) => {
      setDraft((d) => {
        if (!d) return d
        const next = toggleSongStep(d, section, voiceId, index)
        if (cue) player.current?.setSong(next)
        return next
      })
      setEdits((n) => n + 1)
    },
    [section, cue],
  )

  useEffect(() => {
    if (!cue) return
    let raf = 0
    let last = -1
    const loop = () => {
      const s = player.current?.song
      if (s) {
        const pos = positionAt(s, Date.now())
        if (pos.absStep !== last) {
          last = pos.absStep
          setStep(pos.stepInBar)
        }
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [cue])

  useEffect(() => () => player.current?.stop(), [])

  const current = draft?.sections[Math.min(section, (draft?.sections.length ?? 1) - 1)]

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>The booth</h1>
      <p className={styles.lede}>
        Punch holes into a copy of the room&apos;s song and hear your draft in your own headphones. Nothing here is saved,
        and the room cannot hear it. Only the DJ can drop, because publishing needs a Sanity login in the Deck.
      </p>

      {error && <p className={styles.err}>Could not load the song: {error}</p>}

      {draft && (
        <>
          <div className={styles.bar}>
            <button className={styles.primary} aria-pressed={cue} onClick={toggleCue}>
              {cue ? 'Stop my draft' : 'Hear my draft'}
            </button>
            <button className={styles.secondary} onClick={() => void load()} disabled={edits === 0}>
              Reset to the room
            </button>
            <span className={styles.count} aria-live="polite">
              {edits === 0 ? 'Same as the room.' : edits + (edits === 1 ? ' change' : ' changes') + ' from the room.'}
            </span>
          </div>

          <div className={styles.tabs} role="group" aria-label="Sections">
            {draft.sections.map((s, i) => (
              <button key={i} aria-pressed={i === section} onClick={() => setSection(i)}>
                {s.title}
              </button>
            ))}
          </div>

          <Roll
            label={'Your draft of ' + (current?.title ?? 'the song')}
            lanes={rollLanes(current, voices)}
            step={cue ? step : -1}
            channel="cue"
            dropId={0}
            dropping={false}
            onToggle={onToggle}
          />
        </>
      )}
    </main>
  )
}
