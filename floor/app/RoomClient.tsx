'use client'

import {useCallback, useEffect, useRef, useState} from 'react'
import {Disc} from '../components/Disc'
import {Roll} from '../components/Roll'
import {positionAt, totalBars, type Song} from '../lib/engine/clock.ts'
import {Player} from '../lib/engine/player.ts'
import type {VoiceDoc} from '../lib/engine/synth.ts'
import {rollLanes} from '../lib/roll-lanes'
import {client, fetchRoom, type Room as RoomData} from '../lib/sanity.ts'
import styles from './room.module.css'

type Drop = {title: string; at: number; heardMs: number}
const DROP_MS = 1000

const fmt = (ms: number) =>
  new Date(ms).toLocaleTimeString([], {hour: 'numeric', minute: '2-digit', second: '2-digit'})

export default function RoomClient() {
  const [state, setState] = useState<'preview' | 'loading' | 'live' | 'error'>('preview')
  const [error, setError] = useState('')
  const [muted, setMuted] = useState(false)
  const [song, setSong] = useState<Song | null>(null)
  const [voices, setVoices] = useState<VoiceDoc[]>([])
  const [step, setStep] = useState(-1)
  const [sectionIndex, setSectionIndex] = useState(0)
  const [turn, setTurn] = useState(0)
  const [queued, setQueued] = useState<number | null>(null)
  const [drop, setDrop] = useState<Drop | null>(null)
  const [dropId, setDropId] = useState(0)
  const [dropping, setDropping] = useState(false)
  const player = useRef<Player | null>(null)
  const rev = useRef('')
  const noteAt = useRef<{heard: number; updated: number} | null>(null)
  const dropTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const adopt = useCallback((room: RoomData) => {
    if (!room.song) return false
    setVoices(room.voices)
    player.current?.setVoices(room.voices)
    return true
  }, [])

  // preview: show the published song before anyone presses start
  useEffect(() => {
    let alive = true
    fetchRoom()
      .then((room) => {
        if (!alive || !adopt(room) || !room.song) return
        rev.current = room.song._rev
        setSong(room.song)
      })
      .catch((e) => {
        if (!alive) return
        setError(String(e.message ?? e))
        setState('error')
      })
    return () => {
      alive = false
    }
  }, [adopt])

  const refresh = useCallback(async () => {
    const room = await fetchRoom()
    const p = player.current
    if (!p || !adopt(room) || !room.song) return
    if (room.song._rev === rev.current) return
    rev.current = room.song._rev
    noteAt.current = {heard: Date.now(), updated: Date.parse(room.song._updatedAt)}
    const at = p.setSong(room.song)
    setQueued(p.queuedAt ?? at)
  }, [adopt])

  const start = useCallback(async () => {
    if (!song) return
    setState('loading')
    try {
      // start from the song that is published now, not the one the preview loaded earlier
      const fresh = await fetchRoom()
      if (!fresh.song) throw new Error('No published song in the dataset.')
      rev.current = fresh.song._rev
      setVoices(fresh.voices)
      setSong(fresh.song)
      const p = new Player(new AudioContext())
      player.current = p
      p.onSwap = (next, atMs) => {
        const n = noteAt.current
        setSong(next)
        setQueued(null)
        setDropId((d) => d + 1)
        setDropping(true)
        if (dropTimer.current) clearTimeout(dropTimer.current)
        dropTimer.current = setTimeout(() => setDropping(false), DROP_MS)
        setDrop({title: next.title, at: atMs, heardMs: n ? Math.max(0, n.heard - n.updated) : 0})
      }
      p.setVoices(fresh.voices)
      p.setSong(fresh.song)
      p.start()
      setState('live')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setState('error')
    }
  }, [song])

  // live updates: listen for published changes, with a slow poll as the fallback
  useEffect(() => {
    if (state !== 'live') return
    const sub = client
      .listen('*[_type in ["song", "voice"]]', {}, {includeResult: false, visibility: 'query'})
      .subscribe({next: () => void refresh(), error: () => undefined})
    const poll = setInterval(() => void refresh(), 2000)
    return () => {
      sub.unsubscribe()
      clearInterval(poll)
    }
  }, [state, refresh])

  // playhead and record turn, both read from the wall clock
  useEffect(() => {
    if (state !== 'live') return
    let raf = 0
    let last = -1
    const loop = () => {
      const s = player.current?.song
      if (s) {
        const pos = positionAt(s, Date.now())
        if (pos.absStep !== last) {
          last = pos.absStep
          setStep(pos.stepInBar)
          setSectionIndex(pos.sectionIndex)
          setTurn(((pos.songBar * 16 + pos.stepInBar) / (totalBars(s) * 16)) * 360)
        }
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [state])

  useEffect(() => {
    player.current?.setMuted(muted)
  }, [muted])

  const section = song?.sections[Math.min(sectionIndex, (song?.sections.length ?? 1) - 1)]
  const live = state === 'live'

  return (
    <main id="main" className={styles.main}>
      <section className={styles.intro}>
        <div className={styles.copy}>
          <h1 className={styles.title}>{song ? song.title : 'The room'}</h1>
          <p className={styles.meta}>
            {song
              ? live
                ? <><span className={styles.num}>{song.bpm}</span> bpm. {section?.title}, {section?.kind}.</>
                : <><span className={styles.num}>{song.bpm}</span> bpm. Published in Sanity.</>
              : 'Reading the published song from Sanity.'}
          </p>
          <div className={styles.actions}>
            {state === 'preview' && (
              <button className={styles.primary} onClick={start} disabled={!song}>
                Start the room
              </button>
            )}
            {state === 'loading' && <span className={styles.note}>Opening the room.</span>}
            {live && (
              <button className={styles.secondary} data-on={muted} onClick={() => setMuted((m) => !m)}>
                {muted ? 'Unmute' : 'Mute'}
              </button>
            )}
          </div>
          {state === 'error' && <p className={styles.err}>Could not open the room: {error}. Check your connection and reload the page.</p>}
        </div>
        <div className={styles.disc}>
          <Disc turn={turn} label="A record that turns once per loop of the song" />
        </div>
      </section>

      {song && (
        <Roll
          label={'Pattern for ' + (section?.title ?? 'the song')}
          lanes={rollLanes(section, voices)}
          step={live ? step : -1}
          channel="room"
          dropId={dropId}
          dropping={dropping}
        />
      )}

      <p className={styles.status} aria-live="polite">
        {!live && 'Press start to hear the published song. Your speakers play exactly what is in the dataset.'}
        {live && queued && 'A newer published song is queued. It drops at the next bar, ' + fmt(queued) + '.'}
        {live &&
          !queued &&
          drop &&
          'Dropped at ' + fmt(drop.at) + '. That is the bar line after the publish, so the beat never stumbled.'}
        {live && !queued && !drop && 'No drop yet. Publish a change to the song and it lands here on the next bar.'}
      </p>

      <section className={styles.how} aria-label="How it works">
        <div>
          <h2>Published is the room</h2>
          <p>This page reads the published song from a public Sanity dataset. It never sees a draft.</p>
        </div>
        <div>
          <h2>Drafts are the headphones</h2>
          <p>The DJ edits the draft in the Deck and hears it first. The room hears nothing yet.</p>
        </div>
        <div>
          <h2>Publish is the drop</h2>
          <p>One publish swaps the song. It takes over on the next bar, so the beat never stumbles.</p>
        </div>
      </section>
    </main>
  )
}
