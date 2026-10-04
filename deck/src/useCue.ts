import {useCallback, useEffect, useRef, useState} from 'react'
import {positionAt} from '../../floor/lib/engine/clock.ts'
import {Player} from '../../floor/lib/engine/player.ts'
import type {VoiceDoc} from '../../floor/lib/engine/synth.ts'
import {toEngineSong, type SongDoc} from '../../floor/lib/engine/doc.ts'

// The Cue channel plays the DRAFT locally, on the same wall-clock grid as the Floor.
// Every edit re-queues the draft for the next bar, like a DJ hearing the next track in headphones.
export function useCue(draft: SongDoc | null | undefined, voices: VoiceDoc[]) {
  const [on, setOn] = useState(false)
  const [step, setStep] = useState(-1)
  const [sectionIndex, setSectionIndex] = useState(0)
  const player = useRef<Player | null>(null)

  useEffect(() => {
    if (!on || !player.current || !draft) return
    player.current.setVoices(voices)
    player.current.setSong(toEngineSong(draft))
  }, [on, draft, voices])

  useEffect(() => {
    if (!on) return
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
        }
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [on])

  const toggle = useCallback(() => {
    if (on) {
      player.current?.stop()
      setOn(false)
      setStep(-1)
      return
    }
    if (!player.current) player.current = new Player(new AudioContext())
    if (draft) {
      player.current.setVoices(voices)
      player.current.setSong(toEngineSong(draft))
    }
    player.current.start()
    setOn(true)
  }, [on, draft, voices])

  useEffect(() => () => player.current?.stop(), [])

  return {on, toggle, step, sectionIndex}
}
