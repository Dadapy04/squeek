import { describe, expect, it } from 'vitest'
import { createCueBus, createSwordAudio } from '../src/audio.ts'
import { createRun, step, type Input } from '../src/run.ts'
import { freshMeta } from '../src/save.ts'
import type { World } from '../src/types.ts'

const quiet: Input = { moveX: 0, moveY: 0, dodge: false, attack: false, boost: false, shield: false }

function pit(): World {
  return {
    w: 420,
    h: 300,
    safeY: 20,
    spawn: { x: 80, y: 150 },
    extract: { x: 40, y: 40, r: 16 },
    obstacles: [],
    loots: [],
    enemies: [{ kind: 'biter', x: 130, y: 150, hp: 200, touch: 10 }],
  }
}

function release(run: ReturnType<typeof createRun>, dt = 0.02): void {
  step(run, 0.02, { ...quiet, attack: true, moveX: 1 })
  step(run, dt, quiet)
}

describe('sword feel', () => {
  it('resolves a light cut once, after the windup, not on the press', () => {
    const run = createRun(freshMeta(), pit())
    run.facingX = 1
    run.facingY = 0
    const enemy = run.enemies[0]
    if (!enemy) return
    step(run, 0.05, { ...quiet, attack: true, moveX: 1 })
    expect(enemy.hp).toBe(200)
    expect(run.swingT).toBeLessThan(0)
    release(run, 0.02)
    expect(run.lastSwing).toBe('light-1')
    expect(enemy.hp).toBe(200)
    expect(run.hitResolved).toBe(false)
    step(run, 0.04, quiet)
    expect(enemy.hp).toBeLessThan(200)
    const after = enemy.hp
    step(run, 0.2, quiet)
    expect(enemy.hp).toBe(after)
    expect(run.cues.some((cue) => cue.startsWith('whoosh-light-1'))).toBe(true)
    expect(run.cues.includes('hit')).toBe(true)
  })

  it('keeps attack and dodge timers moving through hitstop', () => {
    const run = createRun(freshMeta(), pit())
    run.facingX = 1
    run.facingY = 0
    const enemy = run.enemies[0]
    if (enemy) enemy.x = 112
    release(run, 0.05)
    expect(run.hitStop).toBeGreaterThan(0)
    expect(enemy?.hp).toBeLessThan(200)
    const attack = run.attackCd
    run.dodgeCd = 0.8
    step(run, 0.05, quiet)
    expect(run.attackCd).toBeCloseTo(attack - 0.05, 2)
    expect(run.dodgeCd).toBeCloseTo(0.75, 2)
  })

  it('buffers the next light cut and lets a follow-through dodge cancel it', () => {
    const run = createRun(freshMeta(), pit())
    run.facingX = 1
    run.facingY = 0
    release(run, 0.05)
    step(run, 0.05, { ...quiet, attack: true })
    step(run, 0.02, quiet)
    expect(run.buffered).toBe(true)
    step(run, 0.4, quiet)
    expect(run.lastSwing).toBe('light-2')

    const finisher = createRun(freshMeta(), pit())
    finisher.facingX = 1
    finisher.swingT = 0.2
    finisher.windup = 0.04
    finisher.active = 0.05
    finisher.follow = 0.5
    finisher.slashKind = 'light'
    finisher.lastSwing = 'light-3'
    finisher.attackCd = 0.5
    finisher.stamina = 100
    step(finisher, 0.05, { ...quiet, dodge: true })
    expect(finisher.dodgeLeft).toBe(0)
    expect(finisher.attackCd).toBeCloseTo(0.45, 2)

    const opener = createRun(freshMeta(), pit())
    opener.facingX = 1
    opener.swingT = 0.2
    opener.windup = 0.028
    opener.active = 0.05
    opener.follow = 0.2
    opener.slashKind = 'light'
    opener.lastSwing = 'light-1'
    opener.attackCd = 0.2
    opener.stamina = 100
    step(opener, 0.05, { ...quiet, dodge: true })
    expect(opener.dodgeLeft).toBeGreaterThan(0)
    expect(opener.swingT).toBeLessThan(0)
    expect(opener.attackCd).toBeLessThanOrEqual(0.06)
  })

  it('skips hitstop when reduced motion is on and whiffs without damage', () => {
    const run = createRun(freshMeta(), pit())
    run.reduced = true
    run.facingX = -1
    run.facingY = 0
    release(run, 0.05)
    expect(run.enemies[0]?.hp).toBe(200)
    expect(run.hitStop).toBe(0)
    expect(run.cues.includes('whiff')).toBe(true)
  })
})

describe('audio bus', () => {
  it('rate-limits, caps voices, and mutes', () => {
    const bus = createCueBus()
    expect(bus.play('hit', 1)).toBe(true)
    expect(bus.play('hit', 1.01)).toBe(false)
    expect(bus.play('whiff', 1.2)).toBe(true)
    bus.setMuted(true)
    expect(bus.play('loot', 3)).toBe(false)
    bus.setMuted(false)
    for (let i = 0; i < 8; i++) expect(bus.play(`whoosh-${i}`, 10 + i)).toBe(i < 6)
    expect(bus.voices).toBeLessThanOrEqual(8)
  })

  it('does not throw when the browser has no AudioContext', () => {
    const audio = createSwordAudio({} as Window)
    audio.unlock()
    audio.play('hit')
    audio.setMuted(true)
    audio.suspend()
    audio.resume()
    expect(audio.contextState()).toBe('unsupported')
    expect(audio.unlocked).toBe(false)
  })
})
