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
  return { muted: false, volume: 0.7, music: 0.45, sfx: 0.7 }
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
  'player.step': 160,
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
  'player.heart': 700,
  'world.hum': 0,
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
  if (next.stepping && !prev.stepping) d.step = true
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
  if (next.slain > prev.slain) d.foeDie = true
  if (next.bossSlain && !prev.bossSlain) d.bossDie = true
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
  if (next.low) d.heart = true
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
  if (id.includes('step') || id.includes('pick') || id.includes('coin')) return { wave: 'square', freq: 140 + (n % 8) * 20, dur: 0.05, slide: 0.6, noise: 0.4, gain: 0.08 }
  if (id.includes('wind') || id.includes('swing') || id.includes('dodge')) return { wave: 'sawtooth', freq: 520, dur: 0.12, slide: 0.4, noise: 0.25, gain: 0.08 }
  if (id.includes('hurt') || id.includes('hazard')) return { wave: 'square', freq: 180, dur: 0.1, slide: 0.5, noise: 0.3, gain: 0.1 }
  return { wave: 'square', freq, dur: 0.08, slide: 0.8, noise: id.includes('tick') || id.includes('tap') ? 0.15 : 0, gain: 0.09 }
}

type AudioCtor = typeof AudioContext
type AudioHost = { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor }

let ctx: AudioContext | null = null
let musicGain: GainNode | null = null
let sfxGain: GainNode | null = null
let bedNodes: { oscs: OscillatorNode[]; noise: AudioBufferSourceNode | null; gain: GainNode } | null = null
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
  const when = audio.currentTime
  const jitter = 0.94 + Math.random() * 0.12
  while (voices.length >= MAX_VOICES) {
    const old = voices.shift()
    try { old?.gain.disconnect() } catch { /* already ended */ }
  }
  const gain = audio.createGain()
  const peak = tone.gain * pref.sfx
  gain.gain.setValueAtTime(0.0001, when)
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), when + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.0001, when + tone.dur)
  gain.connect(sfxGain)
  voices.push({ gain, at: now })
  const osc = audio.createOscillator()
  osc.type = tone.wave
  osc.frequency.setValueAtTime(tone.freq * jitter, when)
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, tone.freq * tone.slide * jitter), when + tone.dur)
  osc.connect(gain)
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

const BEDS: Record<BedId, { freqs: number[]; noise: number }> = {
  title: { freqs: [196, 247], noise: 0.02 },
  base: { freqs: [164, 220], noise: 0.015 },
  d1: { freqs: [82, 123], noise: 0.05 },
  d2: { freqs: [98, 146], noise: 0.03 },
  d3: { freqs: [130, 196], noise: 0.04 },
  d4: { freqs: [110, 220], noise: 0.02 },
  d5: { freqs: [87, 174], noise: 0.06 },
  d6: { freqs: [73, 156], noise: 0.035 },
  d7: { freqs: [55, 110], noise: 0.07 },
  combat: { freqs: [98, 147, 196], noise: 0.04 },
  boss: { freqs: [49, 73, 98], noise: 0.05 },
}

export function playBed(id: BedId, pref: AudioPref, host: AudioHost | null = typeof window === 'undefined' ? null : window): void {
  const audio = context(host)
  if (!audio || !musicGain) return
  const want = pref.muted ? 0 : pref.music * (id === 'boss' ? 0.22 : id === 'combat' ? 0.16 : 0.12)
  if (id === currentBed && bedNodes) {
    musicGain.gain.cancelScheduledValues(audio.currentTime)
    musicGain.gain.linearRampToValueAtTime(want, audio.currentTime + 0.2)
    return
  }
  if (bedNodes) {
    const old = bedNodes
    old.gain.gain.cancelScheduledValues(audio.currentTime)
    old.gain.gain.linearRampToValueAtTime(0.0001, audio.currentTime + 0.45)
    window.setTimeout(() => {
      old.oscs.forEach((osc) => { try { osc.stop() } catch { /* ended */ } })
      try { old.noise?.stop() } catch { /* ended */ }
    }, 500)
  }
  currentBed = id
  const spec = BEDS[id]
  const bus = audio.createGain()
  bus.gain.value = 0.0001
  bus.connect(musicGain)
  const oscs = spec.freqs.map((freq, index) => {
    const osc = audio.createOscillator()
    osc.type = index === 0 ? 'sine' : 'triangle'
    osc.frequency.value = freq
    const g = audio.createGain()
    g.gain.value = index === 0 ? 0.7 : 0.28
    osc.connect(g)
    g.connect(bus)
    osc.start()
    return osc
  })
  const src = audio.createBufferSource()
  src.buffer = noiseBuffer(audio)
  src.loop = true
  const ng = audio.createGain()
  ng.gain.value = spec.noise
  src.connect(ng)
  ng.connect(bus)
  src.start()
  bus.gain.linearRampToValueAtTime(1, audio.currentTime + 0.45)
  musicGain.gain.cancelScheduledValues(audio.currentTime)
  musicGain.gain.linearRampToValueAtTime(want, audio.currentTime + 0.45)
  bedNodes = { oscs, noise: src, gain: bus }
}
