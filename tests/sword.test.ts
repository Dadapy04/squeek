import { describe, expect, it } from 'vitest'
import { HEAL_AMOUNT } from '../src/balance.ts'
import { createRun, step, takeBank, useBanked, useCarried, type Input } from '../src/run.ts'
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
    obstacles: [{ x: 180, y: 80, w: 28, h: 140 }],
    loots: [],
    enemies: [{ kind: 'biter', x: 130, y: 150, hp: 200, touch: 10 }],
  }
}

function tap(run: ReturnType<typeof createRun>): void {
  step(run, 0.05, { ...quiet, attack: true, moveX: 1 })
  step(run, 0.05, quiet)
}

describe('sword', () => {
  it('chains three different cuts and the finisher hits harder', () => {
    const run = createRun(freshMeta(), pit())
    run.facingX = 1
    run.facingY = 0
    const enemy = run.enemies[0]
    expect(enemy).toBeTruthy()
    if (!enemy) return
    tap(run)
    expect(run.lastSwing).toBe('light-1')
    const first = 200 - enemy.hp
    step(run, 0.28, quiet)
    tap(run)
    expect(run.lastSwing).toBe('light-2')
    step(run, 0.3, quiet)
    const beforeFinish = enemy.hp
    tap(run)
    expect(run.lastSwing).toBe('light-3')
    expect(200 - enemy.hp).toBeGreaterThan(first)
    expect(beforeFinish - enemy.hp).toBeGreaterThan(first)
    expect(run.attackCd).toBeGreaterThan(0.4)
    const during = enemy.hp
    tap(run)
    expect(enemy.hp).toBe(during)
  })

  it('charges a heavy cleave and spends stamina', () => {
    const run = createRun(freshMeta(), pit())
    run.facingX = 1
    run.facingY = 0
    const enemy = run.enemies[0]
    if (!enemy) return
    step(run, 0.4, { ...quiet, attack: true })
    expect(run.lastSwing).toBe('')
    const stamina = run.stamina
    step(run, 0.05, quiet)
    expect(run.lastSwing).toBe('heavy')
    expect(enemy.hp).toBeLessThan(200)
    expect(run.stamina).toBeLessThan(stamina)
    expect(run.slashArc).toBeGreaterThan(2)
  })

  it('dash-slashes only while the dodge is active', () => {
    const run = createRun(freshMeta(), pit())
    run.facingX = 1
    run.facingY = 0
    run.dodgeLeft = 0.12
    step(run, 0.05, { ...quiet, attack: true, moveX: 1 })
    expect(run.lastSwing).toBe('dash')
    const run2 = createRun(freshMeta(), pit())
    run2.facingX = 1
    step(run2, 0.05, { ...quiet, attack: true })
    step(run2, 0.05, quiet)
    expect(run2.lastSwing).toBe('light-1')
  })

  it('does not cut an enemy through a wall', () => {
    const run = createRun(freshMeta(), pit())
    run.x = 160
    run.y = 150
    run.facingX = 1
    run.facingY = 0
    const enemy = run.enemies[0]
    if (!enemy) return
    enemy.x = 230
    enemy.y = 150
    step(run, 0.4, { ...quiet, attack: true })
    step(run, 0.05, quiet)
    expect(run.lastSwing).toBe('heavy')
    expect(enemy.hp).toBe(200)
  })
})

describe('consumables', () => {
  it('heals from the bag without passing max health, and banks the rest once', () => {
    const meta = freshMeta()
    const run = createRun(meta, pit())
    run.hp = 40
    run.bag = ['bandage', 'bandage', 'tonic']
    expect(useCarried(run, 'bandage')).toBe(true)
    expect(run.hp).toBe(40 + HEAL_AMOUNT)
    expect(run.bag.filter((item) => item === 'bandage')).toHaveLength(1)
    run.hp = run.maxHp
    expect(useCarried(run, 'bandage')).toBe(false)
    expect(run.bag.filter((item) => item === 'bandage')).toHaveLength(1)
    run.x = run.world.extract.x
    run.y = run.world.extract.y
    run.enemies.forEach((enemy) => {
      enemy.hp = 0
    })
    step(run, 3, quiet)
    expect(takeBank(meta, run)).toEqual(['bandage', 'tonic'])
    expect(takeBank(meta, run)).toBeNull()
    expect(meta.bank.bandage).toBe(1)
    expect(meta.bank.tonic).toBe(1)
    expect(useBanked(meta, run, 'tonic')).toBe(false)
    run.y = 10
    run.stamina = 10
    expect(useBanked(meta, run, 'tonic')).toBe(true)
    expect(meta.bank.tonic).toBe(0)
    expect(run.stamina).toBeGreaterThan(10)
  })
})
