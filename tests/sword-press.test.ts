import { describe, expect, it } from 'vitest'
import { playCue, playRejectClick, readAudioPref, resetMix } from '../src/extract/game-audio.ts'
import { onSwordPress } from '../src/extract/sword-press.ts'
import { SWING_TOTAL, deploy, freshSave, trySwing } from '../src/extract/sim.ts'

describe('sword press', () => {
  it('starts the swing and the whoosh in the press, and drops a mash', () => {
    const order: string[] = []
    let swinging = false
    const first = onSwordPress({
      begin() {
        if (swinging) return false
        swinging = true
        order.push('begin')
        return true
      },
      whoosh() { order.push('whoosh') },
      reject() { order.push('reject') },
      show() { order.push('show') },
    })
    expect(first).toBe('whoosh')
    expect(order).toEqual(['begin', 'whoosh', 'show'])
    const second = onSwordPress({
      begin() { return false },
      whoosh() { order.push('late') },
      reject() { order.push('reject') },
      show() { order.push('show') },
    })
    expect(second).toBe('drop')
    expect(order).not.toContain('late')
    expect(order.at(-1)).toBe('reject')
  })

  it('keeps the sword cooldown and poses the swing before the next step', () => {
    const save = freshSave()
    deploy(save, [{ kind: 'sword', n: 1 }])
    const run = save.run!
    const stam = run.stam
    expect(trySwing(run)).toBe(true)
    expect(run.swing).toBe(SWING_TOTAL)
    expect(run.attackCd).toBe(0.5)
    expect(run.stam).toBe(stam - 10)
    expect(trySwing(run)).toBe(false)
    expect(run.attackCd).toBe(0.5)
    expect(run.swing).toBe(SWING_TOTAL)
  })

  it('plays the whoosh at the audio clock and drops extra presses', () => {
    resetMix()
    const starts: number[] = []
    let hint = ''
    let later = 0
    class AudioContext {
      currentTime = 1.25
      state = 'running'
      destination = {}
      sampleRate = 8000
      constructor(options?: { latencyHint?: string }) { hint = options?.latencyHint ?? '' }
      createGain() {
        return {
          gain: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} },
          connect() {},
          disconnect() {},
        }
      }
      createDynamicsCompressor() { return { threshold: { value: 0 }, ratio: { value: 1 }, connect() {} } }
      createBiquadFilter() { return { type: '', frequency: { value: 0 }, connect() {} } }
      createBuffer() { return { getChannelData: () => new Float32Array(8) } }
      createBufferSource() {
        return { connect() {}, start(when: number) { starts.push(when) }, stop() {}, buffer: null }
      }
      createOscillator() {
        return {
          type: 'sine',
          frequency: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} },
          connect() {},
          start(when: number) {
            starts.push(when)
            if (when > 1.25) later += 1
          },
          stop() {},
        }
      }
      resume() { return Promise.resolve() }
    }
    const host = { AudioContext }
    const pref = readAudioPref(null)
    const orig = globalThis.setTimeout
    let queued = 0
    globalThis.setTimeout = ((fn: TimerHandler, ms?: number, ...rest: unknown[]) => {
      queued += 1
      return orig(fn as never, ms as never, ...rest as never[])
    }) as typeof setTimeout
    try {
      expect(playCue('player.swing', pref, 5000, host as never)).toBe(true)
      expect(playCue('player.swing', pref, 5010, host as never)).toBe(false)
      expect(playCue('player.swing', pref, 5080, host as never)).toBe(false)
      expect(playRejectClick(pref, 5000, host as never)).toBe(true)
      expect(playRejectClick(pref, 5010, host as never)).toBe(false)
    } finally {
      globalThis.setTimeout = orig
      resetMix()
    }
    expect(hint).toBe('interactive')
    expect(starts.length).toBeGreaterThan(0)
    expect(starts.every((when) => when === 1.25)).toBe(true)
    expect(later).toBe(0)
    expect(queued).toBe(0)
  })
})
