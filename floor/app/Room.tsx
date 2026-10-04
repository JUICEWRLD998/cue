'use client'

import {useCallback, useEffect, useRef, useState} from 'react'
import {positionAt, STEPS_PER_BAR, type Song} from '../lib/engine/clock.ts'
import {Player} from '../lib/engine/player.ts'
import type {VoiceDoc} from '../lib/engine/synth.ts'
import {client, fetchRoom} from '../lib/sanity.ts'
import styles from './room.module.css'

type Drop = {title: string; at: number; heardMs: number}

export default function Room() {
  const [state, setState] = useState<'idle' | 'loading' | 'live' | 'error'>('idle')
  const [error, setError] = useState('')
  const [muted, setMuted] = useState(false)
  const [song, setSong] = useState<Song | null>(null)
  const [voices, setVoices] = useState<Record<string, VoiceDoc>>({})
  const [step, setStep] = useState(0)
  const [sectionIndex, setSectionIndex] = useState(0)
  const [queued, setQueued] = useState<number | null>(null)
  const [drop, setDrop] = useState<Drop | null>(null)
  const player = useRef<Player | null>(null)
  const rev = useRef<string>('')
  const noteAt = useRef<{rev: string; heard: number; updated: number} | null>(null)

  const refresh = useCallback(async () => {
    const room = await fetchRoom()
    const p = player.current
    if (!p || !room.song) return
    p.setVoices(room.voices)
    setVoices(Object.fromEntries(room.voices.map((v) => [v._id, v])))
    if (room.song._rev === rev.current) return
    rev.current = room.song._rev
    noteAt.current = {
      rev: room.song._rev,
      heard: Date.now(),
      updated: Date.parse(room.song._updatedAt),
    }
    const at = p.setSong(room.song)
    setQueued(p.queuedAt ?? at)
  }, [])

  const start = useCallback(async () => {
    setState('loading')
    try {
      const ctx = new AudioContext()
      const p = new Player(ctx)
      player.current = p
      p.onSwap = (next, atMs) => {
        const n = noteAt.current
        setSong(next)
        setQueued(null)
        setDrop({
          title: next.title,
          at: atMs,
          heardMs: n ? Math.max(0, n.heard - n.updated) : 0,
        })
      }
      const room = await fetchRoom()
      if (!room.song) throw new Error('No published song in the dataset.')
      p.setVoices(room.voices)
      setVoices(Object.fromEntries(room.voices.map((v) => [v._id, v])))
      rev.current = room.song._rev
      p.setSong(room.song)
      setSong(room.song)
      p.start()
      setState('live')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setState('error')
    }
  }, [])

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

  // playhead
  useEffect(() => {
    if (state !== 'live') return
    let raf = 0
    const loop = () => {
      const s = player.current?.song
      if (s) {
        const pos = positionAt(s, Date.now())
        setStep(pos.stepInBar)
        setSectionIndex(pos.sectionIndex)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [state])

  useEffect(() => {
    player.current?.setMuted(muted)
  }, [muted])

  const section = song?.sections[sectionIndex]

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Cue · the Floor</h1>
      <p className={styles.sub}>Plays the published song from a Sanity dataset. Draft edits stay in the headphones.</p>

      {state === 'idle' && (
        <button className={styles.start} onClick={start}>
          Start the room
        </button>
      )}
      {state === 'loading' && <p>Opening the room…</p>}
      {state === 'error' && <p className={styles.err}>Could not open the room: {error}</p>}

      {state === 'live' && song && (
        <section aria-label="Now playing">
          <div className={styles.row}>
            <strong>{song.title}</strong>
            <span>{song.bpm} bpm</span>
            <span>
              {section?.title} · {section?.kind}
            </span>
            <button className={styles.mute} onClick={() => setMuted((m) => !m)}>
              {muted ? 'Unmute' : 'Mute'}
            </button>
          </div>
          <div className={styles.grid} role="table" aria-label="Pattern">
            {section?.lanes.map((lane) => (
              <div className={styles.lane} role="row" key={lane.voiceId}>
                <span className={styles.laneName}>{voices[lane.voiceId]?.name ?? lane.voiceId}</span>
                {Array.from({length: STEPS_PER_BAR}, (_, i) => {
                  const hit = lane.steps.some((s) => s.index === i)
                  const cls = [styles.cell, hit ? styles.hit : '', i === step ? styles.now : ''].join(' ')
                  return <span key={i} className={cls} role="cell" />
                })}
              </div>
            ))}
          </div>
          <p className={styles.status} aria-live="polite">
            {queued
              ? `A new published song is queued. It drops at the next bar (${new Date(queued).toLocaleTimeString()}).`
              : drop
                ? `Last drop: "${drop.title}" at ${new Date(drop.at).toLocaleTimeString()}, heard ${drop.heardMs} ms after publish.`
                : 'No drop yet. Publish a change to the song to hear one.'}
          </p>
        </section>
      )}
    </main>
  )
}
