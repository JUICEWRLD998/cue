import {useCallback, useEffect, useRef, useState} from 'react'
import {Player} from '../../floor/lib/engine/player.ts'
import type {VoiceDoc} from '../../floor/lib/engine/synth.ts'
import {toEngineSong, type SongDoc} from '../../floor/lib/engine/doc.ts'

// The Cue channel plays the DRAFT locally, on the same wall-clock grid as the Floor.
// Every edit re-queues the draft for the next bar, like a DJ hearing the next track in headphones.
export function useCue(draft: SongDoc | null | undefined, voices: VoiceDoc[]) {
  const [on, setOn] = useState(false)
  const player = useRef<Player | null>(null)

  useEffect(() => {
    if (!on || !player.current || !draft) return
    player.current.setVoices(voices)
    player.current.setSong(toEngineSong(draft))
  }, [on, draft, voices])

  const toggle = useCallback(() => {
    if (on) {
      player.current?.stop()
      setOn(false)
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

  return {on, toggle}
}
