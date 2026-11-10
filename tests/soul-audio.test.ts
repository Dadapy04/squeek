import { describe, expect, it } from 'vitest'
import { CHARGE_SECONDS, mixPeak, playSoulBurst, playSoulCharge, readAudioPref, soulBeat, soulHooks, soulMix, TAIL_SECONDS } from '../src/extract/soul-audio.ts'

describe('soul melter mix', () => {
  it('follows the shared mute flag and master volume without clipping', () => {
    expect(readAudioPref(null)).toEqual({ muted: false, volume: 0.55 })
    expect(readAudioPref('mute').muted).toBe(true)
    expect(readAudioPref('v:0.80').volume).toBeCloseTo(0.8)
    expect(mixPeak(soulMix(readAudioPref('mute')))).toBe(0)
    expect(mixPeak(soulMix(readAudioPref('v:0')))).toBe(0)
    const quiet = soulMix(readAudioPref('v:0.55'))
    const loud = soulMix(readAudioPref('v:1'))
    expect(mixPeak(quiet)).toBeGreaterThan(0)
    expect(mixPeak(quiet)).toBeLessThan(mixPeak(loud))
    expect(mixPeak(loud)).toBeLessThan(0.45)
    expect(CHARGE_SECONDS).toBeCloseTo(0.6)
    expect(TAIL_SECONDS).toBeGreaterThan(1)
  })

  it('calls the charge hook then the burst hook once while the melter is cast', () => {
    const span = 0.9
    let heard = ''
    const wind = soulBeat(heard, 'held', span, span)
    expect(wind.beat).toBe('charge')
    heard = wind.heard
    const mid = soulBeat(heard, 'held', span - 0.4, span)
    expect(mid.beat).toBeNull()
    const boom = soulBeat(mid.heard, 'held', span - 0.6, span)
    expect(boom.beat).toBe('burst')
    expect(soulBeat(boom.heard, 'held', 0.1, span).beat).toBeNull()
    soulHooks.charge = 0
    soulHooks.burst = 0
    playSoulCharge({ muted: false, volume: 0.7 })
    playSoulBurst({ muted: false, volume: 0.7 })
    expect(soulHooks.charge).toBe(1)
    expect(soulHooks.burst).toBe(1)
    playSoulCharge({ muted: true, volume: 0 })
    expect(soulHooks.charge).toBe(2)
    expect(soulMix({ muted: false, volume: 0.7 }).master).toBeGreaterThan(0)
  })
})
