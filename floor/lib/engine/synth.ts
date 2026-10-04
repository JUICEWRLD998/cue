// Voices are synthesised from the parameters stored in Sanity (pitch, decay, tone, gain).
// There are no audio files anywhere in this project.

export type VoiceDoc = {
  _id: string
  name: string
  kind: 'kick' | 'snare' | 'hat' | 'clap' | 'tom' | 'bass' | 'stab'
  pitch: number
  decay: number
  tone: number
  gain: number
}

const noiseCache = new WeakMap<BaseAudioContext, AudioBuffer>()

function noise(ctx: BaseAudioContext): AudioBuffer {
  let buf = noiseCache.get(ctx)
  if (!buf) {
    buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    noiseCache.set(ctx, buf)
  }
  return buf
}

function env(ctx: BaseAudioContext, dest: AudioNode, when: number, peak: number, decaySec: number) {
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, when)
  g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), when + 0.002)
  g.gain.exponentialRampToValueAtTime(0.0001, when + decaySec)
  g.connect(dest)
  return g
}

export function playVoice(
  ctx: BaseAudioContext,
  dest: AudioNode,
  v: VoiceDoc,
  when: number,
  velocity: number,
): void {
  const decay = v.decay / 1000
  const peak = v.gain * velocity
  const stop = when + decay + 0.05

  if (v.kind === 'kick' || v.kind === 'tom') {
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.setValueAtTime(v.pitch * (v.kind === 'kick' ? 3.2 : 1.8), when)
    o.frequency.exponentialRampToValueAtTime(v.pitch, when + 0.06)
    o.connect(env(ctx, dest, when, peak, decay))
    o.start(when)
    o.stop(stop)
    return
  }

  if (v.kind === 'bass') {
    const o = ctx.createOscillator()
    o.type = v.tone > 0.5 ? 'sawtooth' : 'triangle'
    o.frequency.setValueAtTime(v.pitch, when)
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = 200 + v.tone * 1800
    o.connect(f)
    f.connect(env(ctx, dest, when, peak, decay))
    o.start(when)
    o.stop(stop)
    return
  }

  if (v.kind === 'stab') {
    const g = env(ctx, dest, when, peak * 0.5, decay)
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.setValueAtTime(600 + v.tone * 4000, when)
    f.frequency.exponentialRampToValueAtTime(300, when + decay)
    f.connect(g)
    for (const ratio of [1, 1.25, 1.5]) {
      const o = ctx.createOscillator()
      o.type = 'sawtooth'
      o.frequency.setValueAtTime(v.pitch * ratio, when)
      o.connect(f)
      o.start(when)
      o.stop(stop)
    }
    return
  }

  // snare, hat, clap: filtered noise, the snare adds a tonal body
  const src = ctx.createBufferSource()
  src.buffer = noise(ctx)
  const f = ctx.createBiquadFilter()
  f.type = v.kind === 'hat' ? 'highpass' : 'bandpass'
  f.frequency.value = v.kind === 'hat' ? Math.max(v.pitch, 4000) : v.pitch * (1 + v.tone)
  src.connect(f)

  if (v.kind === 'clap') {
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, when)
    for (const off of [0, 0.011, 0.023]) {
      g.gain.linearRampToValueAtTime(peak, when + off + 0.002)
      g.gain.linearRampToValueAtTime(peak * 0.2, when + off + 0.009)
    }
    g.gain.exponentialRampToValueAtTime(0.0001, when + decay)
    f.connect(g)
    g.connect(dest)
  } else {
    f.connect(env(ctx, dest, when, peak, decay))
  }
  src.start(when)
  src.stop(stop)

  if (v.kind === 'snare') {
    const o = ctx.createOscillator()
    o.type = 'triangle'
    o.frequency.setValueAtTime(v.pitch, when)
    o.frequency.exponentialRampToValueAtTime(v.pitch * 0.6, when + 0.08)
    o.connect(env(ctx, dest, when, peak * 0.6, decay * 0.7))
    o.start(when)
    o.stop(stop)
  }
}
