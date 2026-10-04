import {
  EPOCH_MS,
  hitsAt,
  nextBarBoundary,
  positionAt,
  stepMs,
  swingOffsetMs,
  type Song,
} from './clock.ts'
import {playVoice, type VoiceDoc} from './synth.ts'

const TICK_MS = 25
const LOOKAHEAD_MS = 120

// Look-ahead scheduler. Steps sit on the wall-clock grid (EPOCH + n * stepMs), so every
// open tab plays the same step at the same moment. A new song takes over on the next bar
// boundary: that is the Drop.
export class Player {
  private ctx: AudioContext
  private out: GainNode
  private voices = new Map<string, VoiceDoc>()
  private active: Song | null = null
  private pending: {song: Song; atMs: number} | null = null
  private cursorWall = 0
  private timer: ReturnType<typeof setInterval> | null = null
  onSwap: ((song: Song, atMs: number) => void) | null = null

  constructor(ctx: AudioContext) {
    this.ctx = ctx
    this.out = ctx.createGain()
    this.out.gain.value = 0.9
    this.out.connect(ctx.destination)
  }

  get song(): Song | null {
    return this.active
  }

  get queuedAt(): number | null {
    return this.pending ? this.pending.atMs : null
  }

  setVoices(voices: VoiceDoc[]): void {
    this.voices = new Map(voices.map((v) => [v._id, v]))
  }

  // The first song starts at once; later songs wait for the next bar boundary.
  setSong(song: Song): number {
    if (!this.active) {
      this.active = song
      this.cursorWall = this.nextStepWall(song)
      return Date.now()
    }
    const base = this.pending ? this.pending.atMs : Date.now() + LOOKAHEAD_MS
    const atMs = nextBarBoundary(base, this.active.bpm)
    this.pending = {song, atMs}
    return atMs
  }

  start(): void {
    if (this.timer) return
    void this.ctx.resume()
    if (this.active) this.cursorWall = this.nextStepWall(this.active)
    this.timer = setInterval(() => this.tick(), TICK_MS)
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  setMuted(muted: boolean): void {
    this.out.gain.setTargetAtTime(muted ? 0 : 0.9, this.ctx.currentTime, 0.02)
  }

  private nextStepWall(song: Song): number {
    const sm = stepMs(song.bpm)
    return EPOCH_MS + Math.ceil((Date.now() - EPOCH_MS) / sm) * sm
  }

  private tick(): void {
    if (!this.active) return
    const horizon = Date.now() + LOOKAHEAD_MS
    while (this.cursorWall < horizon) {
      if (this.pending && this.cursorWall >= this.pending.atMs) {
        const {song, atMs} = this.pending
        this.active = song
        this.pending = null
        const sm = stepMs(song.bpm)
        this.cursorWall = EPOCH_MS + Math.ceil((atMs - EPOCH_MS) / sm) * sm
        this.onSwap?.(song, atMs)
        continue
      }
      this.scheduleStep(this.active, this.cursorWall)
      this.cursorWall += stepMs(this.active.bpm)
    }
  }

  private scheduleStep(song: Song, wallMs: number): void {
    const pos = positionAt(song, wallMs + 0.5)
    const section = song.sections[pos.sectionIndex]
    const swing = swingOffsetMs(pos.stepInBar, song.bpm, song.swing)
    for (const hit of hitsAt(section, pos.stepInBar)) {
      if (Math.random() > hit.probability) continue
      const voice = this.voices.get(hit.voiceId)
      if (!voice) continue
      const when = this.ctx.currentTime + (wallMs + swing + hit.nudge - Date.now()) / 1000
      playVoice(this.ctx, this.out, voice, Math.max(when, this.ctx.currentTime), hit.velocity)
    }
  }
}
