import { describe, expect, it } from 'vitest'
import { armAttack, attackLive, ATTACK_BUFFER_MS, blockSecondTap, disarmAttack, holdReleased } from '../src/extract/input-lock.ts'
import { deploy, freshSave, step, type Input } from '../src/extract/sim.ts'

const still: Input = { moveX: 0, moveY: 0, attack: false, dodge: false, interact: false, block: false, use: null }

describe('attack buffer and holds', () => {
  it('blocks a second tap on the HUD and lets a modal body scroll', () => {
    expect(blockSecondTap(120, false)).toBe(true)
    expect(blockSecondTap(120, true)).toBe(false)
    expect(blockSecondTap(400, false)).toBe(false)
  })

  it('lets ten rapid taps swing only on cooldown, plus one buffered swing, then stops', () => {
    const save = freshSave()
    expect(deploy(save, [{ kind: 'sword', n: 1 }], false)).toBeNull()
    const run = save.run!
    let buffer = armAttack(0)
    const taps = new Set([0, 100, 200, 300, 400, 500, 600, 700, 800, 900])
    const swingAt: number[] = []
    for (let ms = 0; ms <= 2200; ms += 50) {
      if (taps.has(ms)) buffer = armAttack(ms)
      const before = run.attackCd
      step(run, { ...still, attack: attackLive(buffer, ms) }, 0.05)
      const started = run.attackCd > before
      if (started) swingAt.push(ms)
      buffer = disarmAttack(buffer, started, ms)
    }
    const lastTap = 900
    const after = swingAt.filter((ms) => ms > lastTap)
    expect(after.length).toBeLessThanOrEqual(1)
    if (after[0] != null) expect(after[0] - lastTap).toBeLessThanOrEqual(ATTACK_BUFFER_MS)
    const idleFrom = (after[0] ?? lastTap) + 50
    expect(swingAt.filter((ms) => ms >= idleFrom && ms < idleFrom + 1000)).toEqual([])
    expect(swingAt.length).toBeLessThanOrEqual(3)
    expect(swingAt.length).toBeGreaterThan(0)
  })

  it('clears a hold on pointercancel', () => {
    expect(holdReleased('pointercancel')).toBe(true)
    expect(holdReleased('pointerup')).toBe(true)
    expect(holdReleased('touchend')).toBe(true)
    expect(holdReleased('visibilitychange')).toBe(true)
    let blocking = true
    if (holdReleased('pointercancel')) blocking = false
    expect(blocking).toBe(false)
  })
})
