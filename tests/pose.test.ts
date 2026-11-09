import { describe, expect, it } from 'vitest'
import { armMode, poseTarget, strideScale, swingArc } from '../src/pose.ts'
import { createRun, step } from '../src/run.ts'
import { freshMeta } from '../src/save.ts'

const quiet = { moveX: 0, moveY: 0, dodge: false, attack: false, boost: false, shield: false }

describe('pose and feedback', () => {
  it('blends gait, aim, and death without stacking sprint over a corpse', () => {
    const walk = poseTarget({ moving: 0.4, sprint: false, crouch: false, aim: false, muzzle: 0, reloading: false, dodge: false, hurt: false, dead: false, swinging: false })
    const sprint = poseTarget({ moving: 1, sprint: true, crouch: false, aim: false, muzzle: 0, reloading: false, dodge: false, hurt: false, dead: false, swinging: false })
    const dead = poseTarget({ moving: 1, sprint: true, crouch: true, aim: true, muzzle: 1, reloading: true, dodge: true, hurt: true, dead: true, swinging: true })
    expect(sprint.gait).toBeGreaterThan(walk.gait)
    expect(dead.gait).toBe(0)
    expect(dead.dead).toBe(1)
    expect(dead.swing).toBe(0)
    const aim = poseTarget({ moving: 1, sprint: true, crouch: false, aim: true, muzzle: 0, reloading: false, dodge: false, hurt: false, dead: false, swinging: false })
    expect(aim.aim).toBe(1)
    expect(aim.gait).toBeLessThan(sprint.gait)
    const busy = { ...sprint, reload: 1, swing: 1, dead: 0 }
    expect(armMode(busy)).toBe('reload')
    expect(armMode({ ...sprint, dead: 1, reload: 1 })).toBe('dead')
    expect(armMode({ ...sprint, swing: 1, aim: 1, fire: 1 })).toBe('swing')
    expect(strideScale(sprint)).toBeGreaterThan(0.8)
    expect(strideScale({ ...sprint, dodge: 1 })).toBeLessThan(0.2)
    expect(strideScale({ ...sprint, swing: 1 })).toBe(0)
    expect(swingArc(-1, 0.02, 0.06, 0.2)).toBe(0)
    expect(swingArc(0.05, 0.02, 0.06, 0.2)).toBeGreaterThan(0.9)
    expect(swingArc(0.16, 0.02, 0.06, 0.2)).toBeGreaterThan(0.4)
    expect(swingArc(0.4, 0.02, 0.06, 0.2)).toBe(0)
  })

  it('steps while moving and pulses when health is low', () => {
    const run = createRun(freshMeta())
    run.slideX = 0
    run.slideY = 180
    run.grounded = true
    run.stepCd = 0
    step(run, 0.05, { ...quiet, mode: 'tactical', moveY: 1, yaw: Math.PI })
    expect(run.cues.some((cue) => cue.startsWith('step'))).toBe(true)
    run.hp = 40
    run.lowCd = 0
    step(run, 0.05, quiet)
    expect(run.cues).toContain('low')
    const again = run.cues.filter((cue) => cue === 'low').length
    step(run, 0.05, quiet)
    expect(run.cues.filter((cue) => cue === 'low').length).toBe(again)
  })
})
