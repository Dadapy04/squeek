/** Original procedural sword-and-burrow effects. No samples, no network. */

export interface CueBus {
  play: (kind: string, now: number) => boolean
  setMuted: (muted: boolean) => void
  release: () => void
  readonly played: string[]
  readonly voices: number
}

const GAP: Record<string, number> = {
  hit: 0.04,
  whiff: 0.07,
  hurt: 0.12,
  kill: 0.08,
  die: 0.2,
  loot: 0.06,
  'loot-rare': 0.08,
  heal: 0.1,
  extract: 0.2,
  'extract-done': 0.2,
  dry: 0.12,
  impact: 0.05,
  reload: 0.2,
  switch: 0.08,
}

export function createCueBus(): CueBus {
  let muted = false
  let voices = 0
  const last = new Map<string, number>()
  const played: string[] = []
  return {
    played,
    get voices() {
      return voices
    },
    setMuted(next: boolean) {
      muted = next
    },
    release() {
      voices = Math.max(0, voices - 1)
    },
    play(kind: string, now: number) {
      if (muted || voices >= 8) return false
      const gap = GAP[kind] ?? (kind.startsWith('whoosh') ? 0.05 : 0.05)
      const prev = last.get(kind) ?? -10
      if (now - prev < gap) return false
      last.set(kind, now)
      voices += 1
      played.push(kind)
      return true
    },
  }
}

type AudioCtor = typeof AudioContext
type AudioHost = {
  AudioContext?: AudioCtor
  webkitAudioContext?: AudioCtor
}

export interface SwordAudio {
  unlock: () => void
  suspend: () => void
  resume: () => void
  setMuted: (muted: boolean) => void
  setVolume: (volume: number) => void
  play: (kind: string) => void
  readonly muted: boolean
  readonly volume: number
  readonly unlocked: boolean
  contextState: () => string
  lastPeak: () => number
  drainPlayed: () => string[]
}

export function createSwordAudio(win: AudioHost | null = typeof window === 'undefined' ? null : window): SwordAudio {
  const Ctx = win?.AudioContext ?? win?.webkitAudioContext
  let ctx: AudioContext | null = null
  let master: GainNode | null = null
  let analyser: AnalyserNode | null = null
  let ambience: AudioBufferSourceNode | null = null
  let muted = false
  let volume = 0.55
  let unlocked = false
  const bus = createCueBus()
  const peak = new Uint8Array(256)

  function ensure(): AudioContext | null {
    if (!Ctx || ctx) return ctx
    try {
      const created = new Ctx()
      ctx = created
      const compressor = created.createDynamicsCompressor()
      compressor.threshold.value = -18
      compressor.knee.value = 12
      compressor.ratio.value = 6
      compressor.attack.value = 0.003
      compressor.release.value = 0.12
      const gain = created.createGain()
      gain.gain.value = muted ? 0 : volume
      master = gain
      const meter = created.createAnalyser()
      meter.fftSize = 256
      analyser = meter
      gain.connect(compressor)
      compressor.connect(meter)
      meter.connect(created.destination)
      return created
    } catch {
      return null
    }
  }

  function noise(duration: number, from: number, to: number, gain: number, q = 4): void {
    if (!ctx || !master) return
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration))
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    let last = 0
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1
      last = last * 0.6 + white * 0.4
      data[i] = last * (1 - i / length)
    }
    const source = ctx.createBufferSource()
    source.buffer = buffer
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.Q.value = q
    filter.frequency.setValueAtTime(from, ctx.currentTime)
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, to), ctx.currentTime + duration)
    const amp = ctx.createGain()
    amp.gain.setValueAtTime(gain, ctx.currentTime)
    amp.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    source.connect(filter)
    filter.connect(amp)
    amp.connect(master)
    source.start()
  }

  function tone(freq: number, duration: number, type: OscillatorType, gain: number, glide = freq): void {
    if (!ctx || !master) return
    const osc = ctx.createOscillator()
    osc.type = type
    osc.frequency.setValueAtTime(freq, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, glide), ctx.currentTime + duration)
    const amp = ctx.createGain()
    amp.gain.setValueAtTime(gain, ctx.currentTime)
    amp.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.connect(amp)
    amp.connect(master)
    osc.start()
    osc.stop(ctx.currentTime + duration + 0.02)
  }

  function startAmbience(): void {
    if (!ctx || !master || ambience || muted) return
    const length = ctx.sampleRate * 2
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    let last = 0
    for (let i = 0; i < length; i++) {
      last = last * 0.98 + (Math.random() * 2 - 1) * 0.02
      data[i] = last
    }
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop = true
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 280
    const amp = ctx.createGain()
    amp.gain.value = 0.03
    source.connect(filter)
    filter.connect(amp)
    amp.connect(master)
    source.start()
    ambience = source
  }

  function stopAmbience(): void {
    try {
      ambience?.stop()
    } catch {
      /* already stopped */
    }
    ambience = null
  }

  function voice(kind: string): void {
    if (kind.startsWith('whoosh-light-1')) noise(0.12, 900, 420, 0.18, 3)
    else if (kind.startsWith('whoosh-light-2')) noise(0.14, 700, 280, 0.2, 2.4)
    else if (kind.startsWith('whoosh-light-3')) {
      noise(0.2, 500, 140, 0.24, 1.6)
      tone(180, 0.16, 'triangle', 0.08, 90)
    } else if (kind === 'whoosh-heavy') {
      noise(0.28, 220, 80, 0.28, 1.2)
      tone(90, 0.22, 'sine', 0.12, 48)
    } else if (kind === 'whoosh-dash') noise(0.1, 1400, 500, 0.16, 5)
    else if (kind === 'charge') tone(140, 0.18, 'sawtooth', 0.04, 280)
    else if (kind === 'hit') {
      noise(0.08, 1800, 400, 0.22, 2)
      tone(220, 0.07, 'square', 0.05, 110)
    } else if (kind === 'whiff') noise(0.06, 1600, 900, 0.05, 6)
    else if (kind === 'impact') noise(0.08, 320, 90, 0.2, 1.2)
    else if (kind === 'hurt') tone(160, 0.12, 'sawtooth', 0.08, 70)
    else if (kind === 'kill') tone(420, 0.18, 'triangle', 0.07, 140)
    else if (kind === 'die') tone(180, 0.4, 'sine', 0.1, 50)
    else if (kind === 'loot') tone(620, 0.08, 'sine', 0.06, 880)
    else if (kind === 'loot-rare') {
      tone(520, 0.12, 'triangle', 0.07, 780)
      tone(780, 0.16, 'sine', 0.04, 1040)
    } else if (kind === 'heal') tone(480, 0.14, 'sine', 0.06, 720)
    else if (kind === 'extract') tone(240, 0.2, 'sine', 0.05, 360)
    else if (kind === 'extract-done') tone(360, 0.28, 'triangle', 0.08, 540)
    else if (kind === 'shot-pistol') {
      noise(0.07, 1800, 240, 0.2, 1.4)
      tone(140, 0.06, 'square', 0.04, 70)
    } else if (kind === 'shot-smg') noise(0.04, 2200, 500, 0.12, 2)
    else if (kind === 'shot-assault') {
      noise(0.06, 1400, 180, 0.16, 1.2)
      tone(110, 0.05, 'sawtooth', 0.03, 60)
    } else if (kind === 'shot-shotgun') noise(0.16, 400, 80, 0.28, 0.8)
    else if (kind === 'shot-marksman') {
      noise(0.12, 2400, 200, 0.22, 1.5)
      tone(180, 0.1, 'triangle', 0.05, 70)
    } else if (kind === 'dry') tone(1800, 0.03, 'square', 0.03, 900)
    else if (kind.startsWith('reload-shotgun')) noise(0.14, 280, 90, 0.16, 1)
    else if (kind.startsWith('reload-marksman')) noise(0.1, 700, 220, 0.1, 2)
    else if (kind.startsWith('reload')) noise(0.08, 1100, 380, 0.09, 3)
    else if (kind === 'step' || kind === 'step-fast' || kind === 'step-soft') {
      const soft = kind === 'step-soft'
      const fast = kind === 'step-fast'
      tone(fast ? 160 : soft ? 90 : 120, fast ? 0.05 : 0.07, 'sine', soft ? 0.08 : 0.16, fast ? 70 : 50)
      noise(fast ? 0.04 : 0.05, fast ? 640 : 420, 140, soft ? 0.1 : 0.22, 0.8)
    }
    else if (kind === 'low') tone(90, 0.16, 'sine', 0.05, 60)
    else if (kind === 'switch') tone(520, 0.04, 'sine', 0.03, 340)
    else if (kind === 'alert') {
      tone(740, 0.08, 'square', 0.05, 520)
      tone(480, 0.1, 'sine', 0.03, 360)
    }
  }

  const api: SwordAudio = {
    get muted() {
      return muted
    },
    get volume() {
      return volume
    },
    get unlocked() {
      return unlocked
    },
    contextState: () => ctx?.state ?? 'unsupported',
    lastPeak: () => {
      if (!analyser) return 0
      analyser.getByteTimeDomainData(peak)
      let max = 0
      for (const sample of peak) max = Math.max(max, Math.abs(sample - 128))
      return max
    },
    setMuted(next: boolean) {
      muted = next
      bus.setMuted(next)
      if (master) master.gain.value = next ? 0 : volume
      if (next) stopAmbience()
      else if (unlocked) startAmbience()
    },
    setVolume(next: number) {
      volume = Math.max(0, Math.min(1, next))
      if (master && !muted) master.gain.value = volume
    },
    unlock() {
      const audio = ensure()
      if (!audio) return
      unlocked = true
      if (!muted && audio.state === 'suspended') void audio.resume().then(() => startAmbience())
      else if (!muted) startAmbience()
    },
    suspend() {
      stopAmbience()
      if (ctx && ctx.state === 'running') void ctx.suspend()
    },
    resume() {
      if (!unlocked || !ctx) return
      const start = () => {
        if (!muted) startAmbience()
      }
      if (ctx.state === 'suspended') void ctx.resume().then(start)
      else start()
    },
    play(kind: string) {
      if (!unlocked) return
      const audio = ensure()
      if (!audio || !bus.play(kind, audio.currentTime)) return
      try {
        voice(kind)
        window.setTimeout(() => bus.release(), 420)
      } catch {
        bus.release()
      }
    },
    drainPlayed() {
      return bus.played.splice(0, bus.played.length)
    },
  }
  return api
}

export async function measureWhooshPeak(): Promise<number> {
  const win = globalThis as unknown as {
    OfflineAudioContext?: typeof OfflineAudioContext
    webkitOfflineAudioContext?: typeof OfflineAudioContext
  }
  const Ctx = win.OfflineAudioContext ?? win.webkitOfflineAudioContext
  if (!Ctx) return 0
  const offline = new Ctx(1, 8000, 22050)
  const master = offline.createGain()
  master.gain.value = 0.8
  master.connect(offline.destination)
  const length = Math.floor(offline.sampleRate * 0.12)
  const buffer = offline.createBuffer(1, length, offline.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length)
  const source = offline.createBufferSource()
  source.buffer = buffer
  const filter = offline.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 700
  source.connect(filter)
  filter.connect(master)
  source.start()
  const rendered = await offline.startRendering()
  let peak = 0
  const channel = rendered.getChannelData(0)
  for (const sample of channel) peak = Math.max(peak, Math.abs(sample))
  return peak
}
