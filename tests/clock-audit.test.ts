import { describe, expect, it } from 'vitest'
import { SIM_STEP, takeFrames } from '../src/extract/clock.ts'
import { frameDecay } from '../src/extract/view.ts'
import { deploy, freshSave, step, type Input } from '../src/extract/sim.ts'

const still: Input = { moveX: 0, moveY: 0, attack: false, dodge: false, interact: false, block: false, use: null }

function play(raw: number, frames: number, run: NonNullable<ReturnType<typeof freshSave>['run']>, bank = 0): number {
  for (let i = 0; i < frames; i += 1) {
    const clock = takeFrames(bank, raw)
    bank = clock.bank
    for (let s = 0; s < clock.steps; s += 1) step(run, still, SIM_STEP)
  }
  return bank
}

function chase(): NonNullable<ReturnType<typeof freshSave>['run']> {
  const save = freshSave()
  deploy(save, [{ kind: 'sword', n: 1 }])
  const run = save.run!
  const boss = run.foes.find((foe) => foe.kind === 'boss')!
  run.zone = boss.zone
  run.x = boss.x + 90
  run.y = boss.y
  boss.heard = 0
  boss.wind = 0
  boss.dash = 0
  boss.cd = 9
  return run
}

describe('fixed step across refresh rates', () => {
  it('banks 120Hz, catches up 30Hz, and refuses a long stall', () => {
    expect(takeFrames(0, 1 / 60).steps).toBe(1)
    expect(takeFrames(0, 1 / 120).steps).toBe(0)
    expect(takeFrames(1 / 120, 1 / 120).steps).toBe(1)
    expect(takeFrames(0, 1 / 30).steps).toBe(2)
    expect(takeFrames(0, 2).steps).toBe(3)
    expect(takeFrames(0, 0).steps).toBe(0)
    expect(takeFrames(0, Number.NaN).steps).toBe(0)
    const sixty = takeFrames(0, 1 / 60)
    const oneTwenty = takeFrames(takeFrames(0, 1 / 120).bank, 1 / 120)
    expect(sixty.steps).toBe(oneTwenty.steps)
  })

  it('moves a boss the same distance at 30, 60, and 120 fps, and barely at all through a stall', () => {
    function travel(raw: number, frames: number): number {
      const run = chase()
      const boss = run.foes.find((foe) => foe.kind === 'boss')!
      const x0 = boss.x
      const y0 = boss.y
      play(raw, frames, run)
      return Math.hypot(boss.x - x0, boss.y - y0)
    }
    const at60 = travel(1 / 60, 60)
    const at120 = travel(1 / 120, 120)
    const at30 = travel(1 / 30, 30)
    expect(Math.abs(at60 - at120)).toBeLessThan(1.5)
    expect(Math.abs(at60 - at30)).toBeLessThan(1.5)
    expect(at60).toBeGreaterThan(10)
    expect(at60).toBeLessThan(22)
    expect(travel(2, 1)).toBeLessThan(3)
  })

  it('burns a one-second fuse on the clock, not on a stalled frame', () => {
    function fuseLeft(raw: number, frames: number): number {
      const save = freshSave()
      deploy(save, [{ kind: 'sword', n: 1 }])
      const run = save.run!
      run.chart!.props.push({
        id: 'audit-barrel', room: run.roomId ?? '', zone: run.zone, kind: 'barrel', x: 0, y: 180,
        state: 'live', loot: [], lock: 'none', fuse: 1, fuseMax: 1, tickAt: 9,
      })
      play(raw, frames, run)
      const barrel = run.chart!.props.find((prop) => prop.id === 'audit-barrel')!
      return barrel.state === 'live' ? barrel.fuse ?? 0 : 0
    }
    expect(fuseLeft(1 / 60, 60)).toBeLessThanOrEqual(0)
    expect(fuseLeft(1 / 120, 120)).toBeLessThanOrEqual(0)
    expect(fuseLeft(2, 1)).toBeGreaterThan(0.9)
  })

  it('keeps the boss death flash on wall time at 60 and 120 fps', () => {
    let slow = 1.55
    let fast = 1.55
    for (let i = 0; i < 60; i += 1) slow -= frameDecay(0.016, 1 / 60)
    for (let i = 0; i < 120; i += 1) fast -= frameDecay(0.016, 1 / 120)
    expect(fast).toBeCloseTo(slow, 5)
    expect(slow).toBeCloseTo(1.55 - 0.96, 5)
    expect(frameDecay(0.016, 2)).toBeCloseTo(0.016 * 3, 5)
  })
})
