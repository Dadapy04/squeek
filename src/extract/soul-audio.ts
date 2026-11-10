/** Layered Pelebur Jiwa cast. Shares the legacy mute key and stays under a limiter. */

export const AUDIO_KEY = 'npcs-burrow-extraction.audio'
export const CHARGE_SECONDS = 0.6
export const TAIL_SECONDS = 1.2

export interface AudioPref {
  muted: boolean
  volume: number
}

export interface SoulMix {
  master: number
  drone: number
  whisper: number
  thump: number
  crack: number
  shriek: number
  tail: number
}

export function readAudioPref(raw: string | null): AudioPref {
  if (raw === 'mute') return { muted: true, volume: 0 }
  if (raw && raw.startsWith('v:')) {
    const n = Number(raw.slice(2))
    const volume = Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0.55
    return { muted: volume <= 0, volume }
  }
  return { muted: false, volume: 0.55 }
}

/** Peaks are sized so the loudest instant, times the master, stays under 0.45. */
export function soulMix(pref: AudioPref): SoulMix {
  if (pref.muted || pref.volume <= 0) {
    return { master: 0, drone: 0, whisper: 0, thump: 0, crack: 0, shriek: 0, tail: 0 }
  }
  const master = Math.min(0.62, Math.max(0, Math.min(1, pref.volume)))
  return { master, drone: 0.07, whisper: 0.045, thump: 0.18, crack: 0.08, shriek: 0.04, tail: 0.06 }
}

export function mixPeak(mix: SoulMix): number {
  const charge = mix.drone * 2 + mix.whisper
  const burst = mix.thump + mix.crack + mix.shriek + mix.tail
  return Math.max(charge, burst) * mix.master
}

type AudioCtor = typeof AudioContext
type AudioHost = { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor }

let shared: AudioContext | null = null
let master: GainNode | null = null
let tailBuffer: AudioBuffer | null = null

function context(host: AudioHost | null): AudioContext | null {
  const Ctx = host?.AudioContext ?? host?.webkitAudioContext
  if (!Ctx) return null
  if (shared) return shared
  try {
    const ctx = new Ctx()
    const gain = ctx.createGain()
    gain.gain.value = 0.55
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -16
    comp.knee.value = 6
    comp.ratio.value = 12
    comp.attack.value = 0.002
    comp.release.value = 0.2
    const ceiling = ctx.createGain()
    ceiling.gain.value = 0.85
    gain.connect(comp)
    comp.connect(ceiling)
    ceiling.connect(ctx.destination)
    master = gain
    shared = ctx
    return ctx
  } catch {
    return null
  }
}

function noise(ctx: AudioContext, seconds: number): AudioBuffer {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds))
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1
  return buffer
}

function impulse(ctx: AudioContext): AudioBuffer {
  if (tailBuffer && tailBuffer.sampleRate === ctx.sampleRate) return tailBuffer
  const length = Math.floor(ctx.sampleRate * TAIL_SECONDS)
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate)
  for (let channel = 0; channel < 2; channel += 1) {
    const data = buffer.getChannelData(channel)
    for (let i = 0; i < length; i += 1) {
      const t = i / length
      data[i] = (Math.random() * 2 - 1) * (1 - t) ** 2.6
    }
  }
  tailBuffer = buffer
  return buffer
}

function envGain(ctx: AudioContext, mixGain: GainNode, peak: number, attack: number, sustain: number, release: number, when: number): GainNode {
  const gain = ctx.createGain()
  const top = Math.max(0.0001, peak)
  gain.gain.setValueAtTime(0.0001, when)
  gain.gain.exponentialRampToValueAtTime(top, when + attack)
  gain.gain.setValueAtTime(top, when + attack + sustain)
  gain.gain.exponentialRampToValueAtTime(0.0001, when + attack + sustain + release)
  gain.connect(mixGain)
  return gain
}

function applyMaster(mix: SoulMix): void {
  if (!master) return
  master.gain.value = mix.master
}

export function resumeAudio(host: AudioHost | null = typeof window === 'undefined' ? null : window): void {
  const ctx = context(host)
  if (ctx && ctx.state === 'suspended') void ctx.resume()
}

function release(node: AudioNode): void {
  const ended = node as AudioNode & { onended: (() => void) | null }
  ended.onended = () => {
    try { node.disconnect() } catch { /* already stopped */ }
  }
}

export function playSoulCharge(pref: AudioPref, host: AudioHost | null = typeof window === 'undefined' ? null : window, when?: number): void {
  const mix = soulMix(pref)
  if (mix.master <= 0) return
  const ctx = context(host)
  if (!ctx || !master) return
  applyMaster(mix)
  if (ctx.state === 'suspended') void ctx.resume()
  const now = when ?? ctx.currentTime
  for (const detune of [-16, 12]) {
    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(46, now)
    osc.frequency.exponentialRampToValueAtTime(128, now + CHARGE_SECONDS)
    osc.detune.value = detune
    const low = ctx.createBiquadFilter()
    low.type = 'lowpass'
    low.frequency.setValueAtTime(160, now)
    low.frequency.exponentialRampToValueAtTime(780, now + CHARGE_SECONDS)
    const gain = envGain(ctx, master, mix.drone, 0.05, 0.28, 0.27, now)
    osc.connect(low)
    low.connect(gain)
    osc.start(now)
    osc.stop(now + CHARGE_SECONDS + 0.02)
    release(osc)
  }
  const src = ctx.createBufferSource()
  src.buffer = noise(ctx, CHARGE_SECONDS)
  const band = ctx.createBiquadFilter()
  band.type = 'bandpass'
  band.Q.value = 0.8
  band.frequency.setValueAtTime(220, now)
  band.frequency.exponentialRampToValueAtTime(1800, now + CHARGE_SECONDS)
  const gain = envGain(ctx, master, mix.whisper, 0.08, 0.22, 0.3, now)
  src.connect(band)
  band.connect(gain)
  src.start(now)
  src.stop(now + CHARGE_SECONDS)
  release(src)
}

export function playSoulBurst(pref: AudioPref, host: AudioHost | null = typeof window === 'undefined' ? null : window, when?: number): void {
  const mix = soulMix(pref)
  if (mix.master <= 0) return
  const ctx = context(host)
  if (!ctx || !master) return
  applyMaster(mix)
  if (ctx.state === 'suspended') void ctx.resume()
  const now = when ?? ctx.currentTime
  const thump = ctx.createOscillator()
  thump.type = 'sine'
  thump.frequency.setValueAtTime(56, now)
  thump.frequency.exponentialRampToValueAtTime(34, now + 0.46)
  const thumpGain = envGain(ctx, master, mix.thump, 0.012, 0.05, 0.42, now)
  thump.connect(thumpGain)
  thump.start(now)
  thump.stop(now + 0.5)
  release(thump)
  const crack = ctx.createBufferSource()
  crack.buffer = noise(ctx, 0.18)
  const shape = ctx.createWaveShaper()
  const curve = new Float32Array(64)
  for (let i = 0; i < curve.length; i += 1) {
    const x = (i / (curve.length - 1)) * 2 - 1
    curve[i] = Math.tanh(x * 5)
  }
  shape.curve = curve
  const high = ctx.createBiquadFilter()
  high.type = 'highpass'
  high.frequency.value = 700
  const crackGain = envGain(ctx, master, mix.crack, 0.005, 0.02, 0.1, now)
  crack.connect(shape)
  shape.connect(high)
  high.connect(crackGain)
  crack.start(now)
  crack.stop(now + 0.18)
  release(crack)
  const shriek = ctx.createOscillator()
  shriek.type = 'triangle'
  shriek.frequency.setValueAtTime(1480, now)
  shriek.frequency.exponentialRampToValueAtTime(2360, now + 0.08)
  shriek.frequency.exponentialRampToValueAtTime(880, now + 0.42)
  const shriekGain = envGain(ctx, master, mix.shriek, 0.02, 0.04, 0.36, now)
  shriek.connect(shriekGain)
  shriek.start(now)
  shriek.stop(now + 0.46)
  release(shriek)
  const verb = ctx.createBufferSource()
  verb.buffer = noise(ctx, 0.12)
  const convolver = ctx.createConvolver()
  convolver.buffer = impulse(ctx)
  const dark = ctx.createBiquadFilter()
  dark.type = 'lowpass'
  dark.frequency.value = 900
  const tail = envGain(ctx, master, mix.tail, 0.02, 0.08, TAIL_SECONDS - 0.1, now)
  verb.connect(convolver)
  convolver.connect(dark)
  dark.connect(tail)
  verb.start(now)
  verb.stop(now + 0.12)
  release(verb)
}

/** One accelerating click while a fuse is burning. */
export function playFuseTick(pref: AudioPref, host: AudioHost | null = typeof window === 'undefined' ? null : window): void {
  if (pref.muted || pref.volume <= 0) return
  const ctx = context(host)
  if (!ctx || !master) return
  if (ctx.state === 'suspended') void ctx.resume()
  const now = ctx.currentTime
  const loud = Math.min(0.16, 0.1 * Math.max(0, Math.min(1, pref.volume)))
  const click = ctx.createOscillator()
  click.type = 'square'
  click.frequency.setValueAtTime(880, now)
  click.frequency.exponentialRampToValueAtTime(420, now + 0.04)
  const gain = envGain(ctx, master, loud, 0.002, 0.008, 0.04, now)
  const band = ctx.createBiquadFilter()
  band.type = 'highpass'
  band.frequency.value = 500
  click.connect(band)
  band.connect(gain)
  click.start(now)
  click.stop(now + 0.06)
  release(click)
}

/** Short barrel blast. A low thump plus a noise crack, under the same limiter. */
export function playBoom(pref: AudioPref, host: AudioHost | null = typeof window === 'undefined' ? null : window): void {
  if (pref.muted || pref.volume <= 0) return
  const ctx = context(host)
  if (!ctx || !master) return
  if (ctx.state === 'suspended') void ctx.resume()
  const now = ctx.currentTime
  const loud = Math.min(0.34, 0.22 * Math.max(0, Math.min(1, pref.volume)))
  const thump = ctx.createOscillator()
  thump.type = 'sine'
  thump.frequency.setValueAtTime(150, now)
  thump.frequency.exponentialRampToValueAtTime(42, now + 0.28)
  const thumpGain = envGain(ctx, master, loud, 0.008, 0.04, 0.26, now)
  thump.connect(thumpGain)
  thump.start(now)
  thump.stop(now + 0.34)
  release(thump)
  const crack = ctx.createBufferSource()
  crack.buffer = noise(ctx, 0.18)
  const band = ctx.createBiquadFilter()
  band.type = 'lowpass'
  band.frequency.setValueAtTime(1400, now)
  band.frequency.exponentialRampToValueAtTime(240, now + 0.16)
  const crackGain = envGain(ctx, master, loud * 0.7, 0.004, 0.02, 0.14, now)
  crack.connect(band)
  band.connect(crackGain)
  crack.start(now)
  crack.stop(now + 0.18)
  release(crack)
}
