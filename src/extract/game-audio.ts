/** Procedural WebAudio for the delve. No sampled assets. */

export interface AudioPref {
  muted: boolean
  /** Legacy master used by the soul-melter mix. Tracks the effects slider. */
  volume: number
  music: number
  sfx: number
}

export function readAudioPref(raw: string | null): AudioPref {
  if (raw === 'mute') return { muted: true, volume: 0, music: 0, sfx: 0 }
  if (raw && raw.startsWith('v:')) {
    const n = Number(raw.slice(2))
    const volume = Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0.55
    return { muted: volume <= 0, volume, music: volume, sfx: volume }
  }
  if (raw && raw.startsWith('a:')) {
    const bits = Object.fromEntries(raw.slice(2).split(',').map((part) => part.split(':')))
    const music = clamp01(Number(bits.m))
    const sfx = clamp01(Number(bits.s))
    const muted = bits.u === '1' || (music <= 0 && sfx <= 0)
    return { muted, volume: sfx, music, sfx }
  }
  return { muted: false, volume: 0.7, music: 0.35, sfx: 0.7 }
}

export function writeAudioPref(pref: AudioPref): string {
  if (pref.muted || (pref.music <= 0 && pref.sfx <= 0)) return 'mute'
  return `a:m:${clamp01(pref.music).toFixed(2)},s:${clamp01(pref.sfx).toFixed(2)},u:0`
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(1, n))
}

const GAP: Record<string, number> = {
  'player.step': 320,
  'player.swing': 90,
  'player.hit': 40,
  'player.glance': 80,
  'foe.hurt': 45,
  'foe.die': 70,
  'foe.alert': 280,
  'foe.wind': 220,
  'world.pick': 90,
  'world.hazard': 180,
  'world.coin': 40,
  'player.heart': 1600,
  'world.hum': 2000,
}

export function allowSound(id: string, now: number, last: Map<string, number>): boolean {
  const gap = GAP[id] ?? 30
  const prev = last.get(id) ?? -Infinity
  if (now - prev < gap) return false
  last.set(id, now)
  return true
}

/** Every gameplay and UI event that must own a sound hook. */
export const SOUND_CUES = [
  'player.step', 'player.swing', 'player.hit', 'player.glance', 'player.crit', 'player.miss',
  'player.dodge', 'player.block', 'player.break', 'player.hurt', 'player.heart', 'player.death',
  'player.heal', 'player.upgrade',
  'foe.alert', 'foe.wind', 'foe.hurt', 'foe.die', 'boss.roar', 'boss.phase', 'boss.die',
  'world.pick', 'world.break', 'world.pop', 'world.take', 'world.full', 'world.chest', 'world.lock',
  'world.key', 'world.crate', 'world.chip', 'world.crack', 'world.lever', 'world.door', 'world.tick',
  'world.slam', 'world.trap', 'world.hazard', 'world.stairs', 'world.hum', 'world.fanfare', 'world.fast',
  'world.coin', 'world.buy', 'world.hammer', 'world.sell',
  'ui.tap', 'ui.bag', 'ui.tip', 'ui.err', 'ui.lang',
  'soul.charge', 'soul.burst', 'fuse.tick', 'barrel.boom',
] as const

export type SoundCue = (typeof SOUND_CUES)[number]

export interface CueDelta {
  step?: boolean
  swing?: boolean
  flesh?: boolean
  glance?: boolean
  crit?: boolean
  miss?: boolean
  dodge?: boolean
  block?: boolean
  break?: boolean
  hurt?: boolean
  heart?: boolean
  death?: boolean
  heal?: boolean
  upgrade?: boolean
  alert?: boolean
  wind?: boolean
  foeHurt?: boolean
  foeDie?: boolean
  bossRoar?: boolean
  bossPhase?: boolean
  bossDie?: boolean
  pick?: boolean
  veinBreak?: boolean
  pop?: boolean
  take?: boolean
  full?: boolean
  chest?: boolean
  lock?: boolean
  key?: boolean
  crate?: boolean
  chip?: boolean
  crack?: boolean
  lever?: boolean
  door?: boolean
  tick?: boolean
  slam?: boolean
  trap?: boolean
  hazard?: boolean
  stairs?: boolean
  hum?: boolean
  fanfare?: boolean
  fast?: boolean
  coin?: boolean
  buy?: boolean
  hammer?: boolean
  sell?: boolean
  tap?: boolean
  bag?: boolean
  tip?: boolean
  err?: boolean
  lang?: boolean
  charge?: boolean
  burst?: boolean
  fuse?: boolean
  boom?: boolean
}

const CUE_OF: Record<keyof CueDelta, SoundCue> = {
  step: 'player.step', swing: 'player.swing', flesh: 'player.hit', glance: 'player.glance', crit: 'player.crit',
  miss: 'player.miss', dodge: 'player.dodge', block: 'player.block', break: 'player.break', hurt: 'player.hurt',
  heart: 'player.heart', death: 'player.death', heal: 'player.heal', upgrade: 'player.upgrade',
  alert: 'foe.alert', wind: 'foe.wind', foeHurt: 'foe.hurt', foeDie: 'foe.die',
  bossRoar: 'boss.roar', bossPhase: 'boss.phase', bossDie: 'boss.die',
  pick: 'world.pick', veinBreak: 'world.break', pop: 'world.pop', take: 'world.take', full: 'world.full',
  chest: 'world.chest', lock: 'world.lock', key: 'world.key', crate: 'world.crate', chip: 'world.chip',
  crack: 'world.crack', lever: 'world.lever', door: 'world.door', tick: 'world.tick', slam: 'world.slam',
  trap: 'world.trap', hazard: 'world.hazard', stairs: 'world.stairs', hum: 'world.hum', fanfare: 'world.fanfare',
  fast: 'world.fast', coin: 'world.coin', buy: 'world.buy', hammer: 'world.hammer', sell: 'world.sell',
  tap: 'ui.tap', bag: 'ui.bag', tip: 'ui.tip', err: 'ui.err', lang: 'ui.lang',
  charge: 'soul.charge', burst: 'soul.burst', fuse: 'fuse.tick', boom: 'barrel.boom',
}

export interface Ear {
  hp: number
  stepping: boolean
  swing: number
  dodge: number
  blocking: boolean
  shield: number | null
  bag: number
  drops: number
  slain: number
  bossSlain: boolean
  keys: number
  opened: number
  cracks: number
  vein: number
  veinsBroken: number
  fuse: number
  booms: number
  channel: number
  depth: number
  room: string
  coins: number
  sword: number
  slots: number
  banner: string
  wind: number
  heard: number
  low: boolean
  hum: boolean
}

export function deltaFromSnaps(prev: Ear | null, next: Ear): CueDelta {
  if (!prev) return next.hum ? { hum: true } : {}
  const d: CueDelta = {}
  if (next.stepping) d.step = true
  if (next.swing > prev.swing + 0.05) d.swing = true
  if (next.dodge > prev.dodge) d.dodge = true
  if (next.blocking && !prev.blocking) d.block = true
  if ((prev.shield ?? 0) > 0 && (next.shield ?? 0) <= 0) d.break = true
  if (next.hp < prev.hp - 0.5 && next.hp > 0) d.hurt = true
  if (prev.hp > 0 && next.hp <= 0) d.death = true
  if (next.hp > prev.hp + 0.5) d.heal = true
  if (next.low && !prev.low) d.heart = true
  if (next.sword > prev.sword || next.slots > prev.slots) d.upgrade = true
  if (next.wind > prev.wind + 0.05) d.wind = true
  if (next.heard > 0 && prev.heard <= 0) d.alert = true
  if (next.bossSlain && !prev.bossSlain) d.bossDie = true
  const bossPart = next.bossSlain && !prev.bossSlain ? 1 : 0
  if (next.slain > prev.slain + bossPart) d.foeDie = true
  if (next.banner !== prev.banner && next.banner.includes('phase')) d.bossPhase = true
  if (next.banner !== prev.banner && next.banner.includes('rage')) d.bossRoar = true
  if (next.vein > prev.vein) d.pick = true
  if (next.veinsBroken > prev.veinsBroken) d.veinBreak = true
  if (next.drops > prev.drops) d.pop = true
  if (next.bag > prev.bag) d.take = true
  if (next.keys > prev.keys) d.key = true
  if (next.opened > prev.opened) d.chest = true
  if (next.cracks > prev.cracks) d.crack = true
  if (next.fuse > prev.fuse) d.fuse = true
  if (next.booms > prev.booms) d.boom = true
  if (next.channel > 0.2 && prev.channel <= 0.2) d.hum = true
  if (next.channel >= 3 && prev.channel < 3) d.fanfare = true
  if (next.depth > prev.depth) d.stairs = true
  if (next.coins > prev.coins) d.coin = true
  if (next.room !== prev.room) d.door = true
  return d
}

export function cuesFromDelta(delta: CueDelta): SoundCue[] {
  const out: SoundCue[] = []
  for (const key of Object.keys(CUE_OF) as (keyof CueDelta)[]) {
    if (delta[key]) out.push(CUE_OF[key])
  }
  return out
}

export type BedId = 'title' | 'base' | 'd1' | 'd2' | 'd3' | 'd4' | 'd5' | 'd6' | 'd7' | 'combat' | 'boss'

export function bedFor(where: { title?: boolean; run?: boolean; depth?: number; combat?: boolean; boss?: boolean }): BedId {
  if (where.boss) return 'boss'
  if (where.combat) return 'combat'
  if (!where.run) return where.title ? 'title' : 'base'
  const depth = Math.max(1, Math.min(7, Math.floor(where.depth || 1)))
  return `d${depth}` as BedId
}

type Recipe = { wave: OscillatorType; freq: number; dur: number; slide: number; noise: number; gain: number }

const RECIPE: Record<SoundCue, Recipe> = Object.fromEntries(SOUND_CUES.map((id) => [id, recipe(id)])) as Record<SoundCue, Recipe>

function recipe(id: string): Recipe {
  const n = id.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
  const freq = 90 + (n % 28) * 18
  if (id.includes('boom') || id.includes('death') || id.includes('break')) return { wave: 'sawtooth', freq: 70 + (n % 5) * 12, dur: 0.28, slide: 0.35, noise: 0.7, gain: 0.22 }
  if (id.includes('fanfare') || id.includes('upgrade') || id.includes('take')) return { wave: 'square', freq: 440 + (n % 6) * 40, dur: 0.22, slide: 1.4, noise: 0, gain: 0.12 }
  if (id === 'player.step') return { wave: 'sine', freq: 190, dur: 0.07, slide: 0.78, noise: 0.04, gain: 0.04 }
  if (id.includes('pick') || id.includes('coin')) return { wave: 'square', freq: 140 + (n % 8) * 20, dur: 0.05, slide: 0.6, noise: 0.4, gain: 0.08 }
  if (id.includes('wind') || id.includes('swing') || id.includes('dodge')) return { wave: 'sawtooth', freq: 520, dur: 0.12, slide: 0.4, noise: 0.25, gain: 0.08 }
  if (id.includes('hurt') || id.includes('hazard')) return { wave: 'square', freq: 180, dur: 0.1, slide: 0.5, noise: 0.3, gain: 0.1 }
  return { wave: 'square', freq, dur: 0.08, slide: 0.8, noise: id.includes('tick') || id.includes('tap') ? 0.15 : 0, gain: 0.09 }
}

type AudioCtor = typeof AudioContext
type AudioHost = { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor }

let ctx: AudioContext | null = null
let musicGain: GainNode | null = null
let sfxGain: GainNode | null = null
let currentBed = ''
const voices: { gain: GainNode; at: number }[] = []
const last = new Map<string, number>()
const MAX_VOICES = 8

function context(host: AudioHost | null): AudioContext | null {
  const Ctor = host?.AudioContext ?? host?.webkitAudioContext
  if (!Ctor) return null
  if (ctx) return ctx
  try {
    ctx = new Ctor()
    const master = ctx.createGain()
    master.gain.value = 0.8
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -14
    comp.ratio.value = 8
    master.connect(comp)
    comp.connect(ctx.destination)
    musicGain = ctx.createGain()
    sfxGain = ctx.createGain()
    musicGain.connect(master)
    sfxGain.connect(master)
    return ctx
  } catch {
    return null
  }
}

export function unlockAudio(host: AudioHost | null = typeof window === 'undefined' ? null : window): void {
  const audio = context(host)
  if (audio && audio.state === 'suspended') void audio.resume()
}

function noiseBuffer(audio: AudioContext): AudioBuffer {
  const buffer = audio.createBuffer(1, Math.floor(audio.sampleRate * 0.4), audio.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1
  return buffer
}

export function playCue(id: SoundCue, pref: AudioPref, now = typeof performance === 'undefined' ? Date.now() : performance.now(), host: AudioHost | null = typeof window === 'undefined' ? null : window): boolean {
  if (pref.muted || pref.sfx <= 0) return false
  if (!allowSound(id, now, last)) return false
  const audio = context(host)
  if (!audio || !sfxGain) return false
  if (audio.state === 'suspended') void audio.resume()
  const tone = RECIPE[id]
  const step = id === 'player.step'
  const when = audio.currentTime
  const jitter = step ? 0.84 + Math.random() * 0.3 : 0.94 + Math.random() * 0.12
  while (voices.length >= MAX_VOICES) {
    const old = voices.shift()
    try { old?.gain.disconnect() } catch { /* already ended */ }
  }
  const gain = audio.createGain()
  const peak = tone.gain * pref.sfx
  gain.gain.setValueAtTime(0.0001, when)
  gain.gain.linearRampToValueAtTime(Math.max(0.0002, peak), when + (step ? 0.03 : 0.008))
  gain.gain.exponentialRampToValueAtTime(0.0001, when + tone.dur)
  gain.connect(sfxGain)
  voices.push({ gain, at: now })
  const osc = audio.createOscillator()
  osc.type = tone.wave
  osc.frequency.setValueAtTime(tone.freq * jitter, when)
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, tone.freq * tone.slide * jitter), when + tone.dur)
  if (step) {
    const filter = audio.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 420
    osc.connect(filter)
    filter.connect(gain)
  } else osc.connect(gain)
  osc.start(when)
  osc.stop(when + tone.dur + 0.02)
  if (tone.noise > 0) {
    const src = audio.createBufferSource()
    src.buffer = noiseBuffer(audio)
    const ng = audio.createGain()
    ng.gain.value = tone.noise * peak
    src.connect(ng)
    ng.connect(gain)
    src.start(when)
    src.stop(when + tone.dur)
  }
  return true
}

/** Soft fifths and a slow pentatonic line. Sine only, no noise loop, no tick. */
const PHRASE: Record<BedId, number[]> = {
  title: [392, 440, 494, 392],
  base: [330, 392, 440, 330],
  d1: [196, 247, 220, 196, 165],
  d2: [220, 262, 294, 220, 175],
  d3: [233, 294, 349, 233, 196],
  d4: [262, 330, 392, 262, 220],
  d5: [175, 220, 262, 175, 147],
  d6: [156, 196, 233, 156, 131],
  d7: [147, 185, 220, 147, 123],
  combat: [220, 262, 330, 220],
  boss: [110, 165, 220, 147],
}

const PAD: Record<BedId, [number, number]> = {
  title: [392, 494],
  base: [330, 440],
  d1: [196, 247],
  d2: [220, 262],
  d3: [233, 294],
  d4: [262, 330],
  d5: [175, 220],
  d6: [156, 196],
  d7: [147, 185],
  combat: [220, 277],
  boss: [110, 165],
}

let generation = 0
let liveOsc = 0
let timers = 0
let stopPhrase: (() => void) | null = null
const padOscs: OscillatorNode[] = []
const noteOscs = new Set<OscillatorNode>()
let bedBus: GainNode | null = null

export function mixLedger(): { oscillators: number; timers: number; beds: number } {
  return { oscillators: liveOsc, timers, beds: currentBed ? 1 : 0 }
}

function watchOsc(osc: OscillatorNode): void {
  liveOsc += 1
  let released = false
  const release = () => {
    if (released) return
    released = true
    liveOsc = Math.max(0, liveOsc - 1)
    noteOscs.delete(osc)
  }
  const orig = osc.stop.bind(osc)
  const hasEnded = typeof osc.addEventListener === 'function'
  if (hasEnded) osc.addEventListener('ended', release)
  osc.stop = ((when?: number) => {
    try { orig(when as number) } catch { release() }
    if (!hasEnded) release()
  }) as OscillatorNode['stop']
}

function stopOsc(osc: OscillatorNode): void {
  try { osc.stop() } catch { /* already scheduled */ }
  try { osc.disconnect() } catch { /* already */ }
}

function silenceBed(): void {
  generation += 1
  if (stopPhrase) stopPhrase()
  stopPhrase = null
  while (padOscs.length) {
    const osc = padOscs.pop()
    if (osc) stopOsc(osc)
  }
  for (const osc of [...noteOscs]) stopOsc(osc)
  noteOscs.clear()
  bedBus = null
  currentBed = ''
}

let finaleArmed = false
let duckUntil = 0
let crackleAt = -Infinity

export function armBossFinale(): boolean {
  if (finaleArmed) return false
  finaleArmed = true
  return true
}

/** Depth 1 stays at pitch 1. Each later floor sits a little lower. */
export function bossPitch(depth: number): number {
  const level = Math.max(1, Math.min(7, Math.floor(depth) || 1))
  return 1 - (level - 1) * 0.035
}

export function resetMix(): void {
  silenceBed()
  ctx = null
  musicGain = null
  sfxGain = null
  liveOsc = 0
  timers = 0
  finaleArmed = false
  duckUntil = 0
  crackleAt = -Infinity
}

function phraseVoice(audio: AudioContext, dest: GainNode, freq: number, gen: number): void {
  if (gen !== generation) return
  const osc = audio.createOscillator()
  osc.type = 'sine'
  osc.frequency.value = freq
  const filter = audio.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 680
  const gain = audio.createGain()
  const when = audio.currentTime
  gain.gain.setValueAtTime(0.0001, when)
  gain.gain.linearRampToValueAtTime(0.07, when + 0.08)
  gain.gain.linearRampToValueAtTime(0.0001, when + 1.05)
  osc.connect(filter)
  filter.connect(gain)
  gain.connect(dest)
  noteOscs.add(osc)
  watchOsc(osc)
  osc.start(when)
  osc.stop(when + 1.1)
}

export function playBed(id: BedId, pref: AudioPref, host: AudioHost | null = typeof window === 'undefined' ? null : window): void {
  const audio = context(host)
  if (!audio || !musicGain) return
  const ducked = audio.currentTime < duckUntil
  const want = pref.muted ? 0 : pref.music * (ducked ? 0.03 : 0.22)
  if (id === currentBed && bedBus) {
    musicGain.gain.cancelScheduledValues(audio.currentTime)
    musicGain.gain.linearRampToValueAtTime(want, audio.currentTime + 0.2)
    return
  }
  silenceBed()
  currentBed = id
  generation += 1
  const gen = generation
  const bus = audio.createGain()
  bus.gain.value = 1
  const filter = audio.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 520
  filter.connect(bus)
  bus.connect(musicGain)
  bedBus = bus
  const pair = PAD[id]
  for (const freq of pair) {
    const osc = audio.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = freq
    const gain = audio.createGain()
    gain.gain.value = 0.06
    osc.connect(gain)
    gain.connect(filter)
    watchOsc(osc)
    osc.start()
    padOscs.push(osc)
  }
  const line = PHRASE[id]
  let step = 0
  phraseVoice(audio, filter, line[0]!, gen)
  const handle = setInterval(() => {
    if (gen !== generation) return
    step = (step + 1) % line.length
    phraseVoice(audio, filter, line[step]!, gen)
  }, 1700)
  timers += 1
  stopPhrase = () => {
    clearInterval(handle)
    timers = Math.max(0, timers - 1)
    stopPhrase = null
  }
  musicGain.gain.cancelScheduledValues(audio.currentTime)
  musicGain.gain.linearRampToValueAtTime(want, audio.currentTime + 0.4)
}

function slideSine(audio: AudioContext, dest: AudioNode, when: number, freq: number, dur: number, peak: number): void {
  const osc = audio.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(Math.max(40, freq), when)
  osc.frequency.exponentialRampToValueAtTime(Math.max(36, freq * 0.5), when + dur)
  const filter = audio.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 480
  const gain = audio.createGain()
  gain.gain.setValueAtTime(0.0001, when)
  gain.gain.linearRampToValueAtTime(Math.max(0.0002, peak), when + 0.03)
  gain.gain.exponentialRampToValueAtTime(0.0001, when + dur)
  osc.connect(filter)
  filter.connect(gain)
  gain.connect(dest)
  watchOsc(osc)
  osc.start(when)
  osc.stop(when + dur + 0.02)
}

function softNoise(audio: AudioContext, dest: AudioNode, when: number, dur: number, peak: number, cutoff: number): void {
  const src = audio.createBufferSource()
  src.buffer = noiseBuffer(audio)
  const filter = audio.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(cutoff, when)
  filter.frequency.exponentialRampToValueAtTime(140, when + dur)
  const gain = audio.createGain()
  gain.gain.setValueAtTime(0.0001, when)
  gain.gain.linearRampToValueAtTime(Math.max(0.0002, peak), when + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, when + dur)
  src.connect(filter)
  filter.connect(gain)
  gain.connect(dest)
  src.start(when)
  src.stop(when + dur)
}

/** Killing blow. One crunch, a slowed roar, then a short sting. Returns false if it already played. */
export function playBossFinale(depth: number, pref: AudioPref, host: AudioHost | null = typeof window === 'undefined' ? null : window): boolean {
  if (!armBossFinale()) return false
  const audio = context(host)
  const voices = sfxGain
  const music = musicGain
  if (!audio || !voices || !music || pref.muted || pref.sfx <= 0) return true
  const pitch = bossPitch(depth)
  const now = audio.currentTime
  duckUntil = now + 2.3
  music.gain.cancelScheduledValues(now)
  music.gain.linearRampToValueAtTime(pref.music * 0.03, now + 0.06)
  const body = pref.sfx
  slideSine(audio, voices, now, 92 * pitch, 0.34, 0.2 * body)
  softNoise(audio, voices, now, 0.3, 0.1 * body, 700)
  slideSine(audio, voices, now + 0.32, 148 * pitch, 0.7, 0.12 * body)
  softNoise(audio, voices, now + 0.32, 0.75, 0.07 * body, 320)
  const sting = [392, 494, 587]
  sting.forEach((freq, index) => {
    slideSine(audio, voices, now + 1.15 + index * 0.14, freq * pitch, 0.22, 0.08 * body)
  })
  return true
}

/** Quiet filtered crackle. At most once every 1.4s, and only through the effects slider. */
export function playTorchCrackle(pref: AudioPref, now = typeof performance === 'undefined' ? Date.now() : performance.now(), host: AudioHost | null = typeof window === 'undefined' ? null : window): boolean {
  if (pref.muted || pref.sfx <= 0) return false
  if (now - crackleAt < 1400) return false
  const audio = context(host)
  if (!audio || !sfxGain) return false
  crackleAt = now
  const when = audio.currentTime
  const src = audio.createBufferSource()
  src.buffer = noiseBuffer(audio)
  const filter = audio.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 380
  const gain = audio.createGain()
  const peak = 0.015 * pref.sfx
  gain.gain.setValueAtTime(0.0001, when)
  gain.gain.linearRampToValueAtTime(Math.max(0.0002, peak), when + 0.04)
  gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.18)
  src.connect(filter)
  filter.connect(gain)
  gain.connect(sfxGain)
  src.start(when)
  src.stop(when + 0.2)
  return true
}
