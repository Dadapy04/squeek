import { describe, expect, it } from 'vitest'
import { DEPTHS, depthPlan, makeBlade } from '../src/extract/depths.ts'
import { generateFloor, oreRoll } from '../src/extract/dungeon.ts'
import { deploy, freshSave, step, warpFloor, type Input } from '../src/extract/sim.ts'

const SIGNATURE = ['root', 'cloud', 'pod', 'cart', 'cocoon', 'vent'] as const
const RANK: Record<string, number> = { biasa: 0, langka: 1, pusaka: 2, legenda: 3 }

const still: Input = { moveX: 0, moveY: 0, attack: false, dodge: false, interact: false, block: false, use: null, soul: false }

function fightBoss(depth: number): { won: boolean; hp: number; left: number; time: number } {
  const save = freshSave()
  save.depth = depth
  expect(deploy(save, [{ kind: 'sword', n: 1 }], true, 11 + depth)).toBeNull()
  const run = save.run!
  const plan = depthPlan(depth)
  const blade = makeBlade(depth, 3)
  blade.damage = plan.recommend
  blade.origin = 'stash'
  run.blade = blade
  run.sword = false
  warpFloor(run, depth)
  const boss = run.foes.find((foe) => foe.kind === 'boss')!
  const nest = run.chart!.rooms.find((room) => room.role === 'boss')!
  run.zone = 'sarang'
  run.roomId = nest.id
  run.x = boss.x
  run.y = boss.y + 40
  run.hp = 125
  let time = 0
  for (let i = 0; i < 4500 && run.hp > 0 && boss.hp > 0 && run.depth === depth; i += 1) {
    const dx = boss.x - run.x
    const dy = boss.y - run.y
    const dist = Math.hypot(dx, dy) || 1
    const ux = dx / dist
    const uy = dy / dist
    run.facing = Math.atan2(dy, dx)
    const telling = boss.wind > 0 || boss.dash > 0 || !!boss.hidden
    const boltNear = !!boss.bolt && Math.hypot(boss.bolt.x - run.x, boss.bolt.y - run.y) < 36
    const close = dist > 24 && dist < 46 && !telling && !boltNear
    let moveX = close ? 0 : telling ? -ux : ux
    let moveY = close ? 0 : telling ? -uy : uy
    if (boss.hidden && boss.lurk) {
      const lx = run.x - boss.lurk.x
      const ly = run.y - boss.lurk.y
      const span = Math.hypot(lx, ly) || 1
      moveX = lx / span
      moveY = ly / span
    }
    if (boltNear && boss.bolt) {
      moveX = -(boss.bolt.y - run.y)
      moveY = boss.bolt.x - run.x
    }
    const dodge = (boss.dash > 0 || boltNear || (boss.wind > 0 && boss.wind < 0.22 && dist < 56)) && run.stam >= 26
    step(run, { ...still, moveX, moveY, attack: close, dodge }, 1 / 30)
    time += 1 / 30
  }
  return { won: boss.hp <= 0, hp: run.hp, left: boss.hp, time, slain: run.slain.join(',') }
}

describe('depth 2-7 polish', () => {
  it('gives every depth a floor, a harder kit than the last, and a signature hazard', () => {
    let ore = -1
    for (let depth = 1; depth <= 7; depth += 1) {
      const chart = generateFloor(depth, 5)
      expect(chart.rooms.length).toBeGreaterThanOrEqual(6)
      expect(chart.rooms.some((room) => room.role === 'boss')).toBe(true)
      expect(chart.rooms.some((room) => room.role === 'extract')).toBe(true)
      const kinds = new Set(chart.props.map((prop) => prop.kind))
      if (depth === 1) {
        for (const kind of SIGNATURE) expect(kinds.has(kind)).toBe(false)
      } else {
        expect(kinds.has(SIGNATURE[depth - 2]!), `hazard d${depth}`).toBe(true)
      }
      const plan = DEPTHS[depth - 1]!
      if (depth > 1) {
        const prev = DEPTHS[depth - 2]!
        expect(plan.boss.hp).toBeGreaterThan(prev.boss.hp)
        expect(plan.boss.damage).toBeGreaterThan(prev.boss.damage)
        expect(Math.max(...plan.boss.patterns.map((row) => row.damage))).toBeGreaterThan(Math.max(...prev.boss.patterns.map((row) => row.damage)))
        expect(Math.max(...plan.foes.map((foe) => foe.hp))).toBeGreaterThan(Math.max(...prev.foes.map((foe) => foe.hp)))
        expect(Math.max(...plan.foes.map((foe) => foe.damage))).toBeGreaterThan(Math.max(...prev.foes.map((foe) => foe.damage)))
      }
      let best = 0
      for (let salt = 0; salt < 5; salt += 1) best = Math.max(best, RANK[oreRoll(depth, salt, true).rarity] ?? 0)
      expect(best).toBeGreaterThanOrEqual(ore)
      ore = best
    }
    expect(oreRoll(1, 0, true).ore === 'gold').toBe(false)
    expect(oreRoll(3, 1, false).ore).toBe('gold')
    expect(oreRoll(4, 2, false).rarity).toBe('pusaka')
    expect(oreRoll(6, 1, false).rarity).toBe('pusaka')
    expect(oreRoll(6, 1, true).rarity).toBe('legenda')
  })

  it('lets a scripted fighter with the recommended sword beat each boss', () => {
    for (let depth = 1; depth <= 7; depth += 1) {
      const result = fightBoss(depth)
      expect(result.won, `d${depth} left ${result.left} hp ${result.hp} t ${result.time.toFixed(1)} slain ${result.slain}`).toBe(true)
      expect(result.hp).toBeGreaterThan(0)
    }
  })
})
