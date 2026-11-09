import { describe, expect, it } from 'vitest'
import { CHARGE_SECONDS, mixPeak, readAudioPref, soulMix, TAIL_SECONDS } from '../src/extract/soul-audio.ts'

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
})
