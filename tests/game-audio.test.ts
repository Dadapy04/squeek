import { describe, expect, it } from 'vitest'
import { SOUND_CUES, allowSound, bedFor, cuesFromDelta, deltaFromSnaps, readAudioPref, writeAudioPref, type CueDelta, type Ear } from '../src/extract/game-audio.ts'

const blank: Ear = {
  hp: 125, stepping: false, swing: 0, dodge: 0, blocking: false, shield: 4, bag: 0, drops: 0,
  slain: 0, bossSlain: false, keys: 0, opened: 0, cracks: 0, vein: 0, veinsBroken: 0, fuse: 0,
  booms: 0, channel: 0, depth: 1, room: 'a', coins: 0, sword: 0, slots: 12, banner: '', wind: 0,
  heard: 0, low: false, hum: false,
}

describe('audio prefs', () => {
  it('keeps the old mute and volume strings and round-trips the split sliders', () => {
    expect(readAudioPref(null)).toMatchObject({ muted: false, music: 0.45, sfx: 0.7 })
    expect(readAudioPref('mute').muted).toBe(true)
    expect(readAudioPref('v:0.80')).toMatchObject({ music: 0.8, sfx: 0.8, volume: 0.8 })
    const stored = writeAudioPref({ muted: false, volume: 0.4, music: 0.3, sfx: 0.4 })
    expect(readAudioPref(stored)).toMatchObject({ music: 0.3, sfx: 0.4, muted: false })
    expect(writeAudioPref({ muted: true, volume: 0, music: 0, sfx: 0 })).toBe('mute')
  })
})

describe('sound hooks', () => {
  it('gives every listed event its own cue', () => {
    const flags: (keyof CueDelta)[] = [
      'step', 'swing', 'flesh', 'glance', 'crit', 'miss', 'dodge', 'block', 'break', 'hurt', 'heart', 'death',
      'heal', 'upgrade', 'alert', 'wind', 'foeHurt', 'foeDie', 'bossRoar', 'bossPhase', 'bossDie',
      'pick', 'veinBreak', 'pop', 'take', 'full', 'chest', 'lock', 'key', 'crate', 'chip', 'crack', 'lever',
      'door', 'tick', 'slam', 'trap', 'hazard', 'stairs', 'hum', 'fanfare', 'fast', 'coin', 'buy', 'hammer',
      'sell', 'tap', 'bag', 'tip', 'err', 'lang', 'charge', 'burst', 'fuse', 'boom',
    ]
    const heard = new Set<string>()
    for (const flag of flags) heard.add(cuesFromDelta({ [flag]: true })[0])
    for (const cue of SOUND_CUES) expect(heard.has(cue)).toBe(true)
  })

  it('maps run changes onto those hooks', () => {
    expect(cuesFromDelta(deltaFromSnaps(blank, { ...blank, stepping: true }))).toContain('player.step')
    expect(cuesFromDelta(deltaFromSnaps(blank, { ...blank, hp: 100 }))).toContain('player.hurt')
    expect(cuesFromDelta(deltaFromSnaps(blank, { ...blank, hp: 0 }))).toContain('player.death')
    expect(cuesFromDelta(deltaFromSnaps(blank, { ...blank, slain: 1 }))).toContain('foe.die')
    expect(cuesFromDelta(deltaFromSnaps(blank, { ...blank, bossSlain: true }))).toContain('boss.die')
    expect(cuesFromDelta(deltaFromSnaps(blank, { ...blank, banner: 'banner.phase' }))).toContain('boss.phase')
    expect(cuesFromDelta(deltaFromSnaps(blank, { ...blank, vein: 1 }))).toContain('world.pick')
    expect(cuesFromDelta(deltaFromSnaps(blank, { ...blank, drops: 1 }))).toContain('world.pop')
    expect(cuesFromDelta(deltaFromSnaps(blank, { ...blank, bag: 1 }))).toContain('world.take')
    expect(cuesFromDelta(deltaFromSnaps(blank, { ...blank, fuse: 1 }))).toContain('fuse.tick')
    expect(cuesFromDelta(deltaFromSnaps(blank, { ...blank, booms: 1 }))).toContain('barrel.boom')
    expect(cuesFromDelta(deltaFromSnaps(blank, { ...blank, channel: 3 }))).toContain('world.fanfare')
    expect(cuesFromDelta(deltaFromSnaps(blank, { ...blank, depth: 2 }))).toContain('world.stairs')
    expect(cuesFromDelta(deltaFromSnaps(blank, { ...blank, room: 'b' }))).toContain('world.door')
    expect(bedFor({ boss: true, combat: true, run: true, depth: 7 })).toBe('boss')
    expect(bedFor({ run: true, depth: 5 })).toBe('d5')
    expect(bedFor({ title: true })).toBe('title')
    expect(bedFor({})).toBe('base')
  })

  it('rate-limits a swarm so the same hit cannot retrigger inside its gap', () => {
    const last = new Map<string, number>()
    expect(allowSound('foe.hurt', 0, last)).toBe(true)
    expect(allowSound('foe.hurt', 20, last)).toBe(false)
    expect(allowSound('foe.hurt', 50, last)).toBe(true)
    expect(allowSound('player.step', 0, last)).toBe(true)
    expect(allowSound('player.step', 100, last)).toBe(false)
  })
})
