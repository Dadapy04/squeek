import { describe, expect, it } from 'vitest'
import { setLocale } from '../src/extract/i18n.ts'

setLocale('id')
import { loadExtract } from '../src/extract/save.ts'
import {
  BAG_SLOTS,
  CRATES,
  bagCount,
  claimLoot,
  claimTarget,
  deploy,
  freshSave,
  give,
  step,
  type Input,
} from '../src/extract/sim.ts'

const still: Input = { moveX: 0, moveY: 0, attack: false, dodge: false, interact: false, block: false, use: null }

function runAt(x: number, y: number) {
  const save = freshSave()
  expect(deploy(save, [{ kind: 'sword', n: 1 }], false)).toBeNull()
  const run = save.run!
  run.x = x
  run.y = y
  run.age = 5
  return run
}

describe('manual loot claim', () => {
  it('does not pick loot up by walking over it', () => {
    const run = runAt(0, 0)
    run.drops.push({ id: 'scrap-1', kind: 'scrap', x: 4, y: 0 })
    step(run, { ...still, moveX: 1 }, 0.05)
    expect(run.drops.map((drop) => drop.id)).toContain('scrap-1')
    expect(run.bag.some((stack) => stack.kind === 'scrap')).toBe(false)
  })

  it('claims the nearest landed item inside the pickup radius', () => {
    const run = runAt(0, 0)
    run.drops.push({ id: 'near', kind: 'relic', x: 10, y: 0 })
    run.drops.push({ id: 'far', kind: 'ore', x: 40, y: 0 })
    expect(claimTarget(run)?.id).toBe('near')
    expect(claimLoot(run, 'far', 'local')).toBe('far')
    expect(claimLoot(run, 'near', 'local')).toBe('ok')
    expect(run.bag.some((stack) => stack.kind === 'relic')).toBe(true)
    expect(run.drops.map((drop) => drop.id)).toEqual(['far'])
  })

  it('refuses a claim while the item is still hovering', () => {
    const run = runAt(0, 0)
    run.age = 0.4
    run.drops.push({ id: 'hover', kind: 'shard', x: 0, y: 8, born: 0, hover: 1.5, fromX: 0, fromY: 0 })
    expect(claimLoot(run, 'hover', 'local')).toBe('hover')
    expect(run.drops).toHaveLength(1)
    run.age = 2
    expect(claimLoot(run, 'hover', 'local')).toBe('ok')
    expect(run.bag.some((stack) => stack.kind === 'shard')).toBe(true)
  })

  it('says the bag is full and leaves the item on the ground', () => {
    const run = runAt(0, 0)
    for (let i = 0; i < BAG_SLOTS; i += 1) expect(give(run, 'bandage')).toBe(true)
    expect(bagCount(run.bag)).toBe(12)
    run.drops.push({ id: 'extra', kind: 'shard', x: 2, y: 2 })
    expect(claimLoot(run, 'extra', 'local')).toBe('full')
    expect(run.drops.map((drop) => drop.id)).toEqual(['extra'])
    expect(run.floats.some((item) => item.text === 'tas penuh')).toBe(true)
  })

  it('gives the item to the first claimant only', () => {
    const run = runAt(0, 0)
    run.drops.push({ id: 'race', kind: 'ore', x: 4, y: 0, claimedBy: 'ada' })
    expect(claimLoot(run, 'race', 'bara')).toBe('taken')
    expect(run.bag.some((stack) => stack.kind === 'ore')).toBe(false)
    run.drops[0]!.claimedBy = undefined
    expect(claimLoot(run, 'race', 'ada')).toBe('ok')
    expect(claimLoot(run, 'race', 'bara')).toBe('missing')
  })

  it('spills every chest item into a hover and loads an old drop without hover fields', () => {
    const run = runAt(CRATES[0]!.x, CRATES[0]!.y)
    run.zone = CRATES[0]!.zone
    step(run, { ...still, interact: true }, 0.05)
    expect(run.opened).toContain(CRATES[0]!.id)
    expect(run.drops).toHaveLength(CRATES[0]!.loot.length)
    expect(run.drops.every((drop) => (drop.hover ?? 0) >= 1.2)).toBe(true)
    expect(run.bag).toHaveLength(0)
    const store = {
      get length() { return 1 },
      clear() {},
      getItem: () => JSON.stringify({ stash: [], support: 0, shield: null, shieldGranted: true, run: { ...run, drops: [{ id: 'old', kind: 'scrap', x: 1, y: 2 }], explored: undefined } }),
      key: () => null,
      removeItem() {},
      setItem() {},
    }
    const loaded = loadExtract(store as Storage)
    expect(loaded.run?.drops[0]).toMatchObject({ id: 'old', kind: 'scrap', x: 1, y: 2 })
    expect(loaded.run?.drops[0]?.hover).toBeUndefined()
  })

  it('blocks every pickup path at 12 and still lets a full bag open a chest', () => {
    const run = runAt(CRATES[0]!.x, CRATES[0]!.y)
    run.zone = CRATES[0]!.zone
    for (let i = 0; i < BAG_SLOTS; i += 1) expect(give(run, i % 2 === 0 ? 'scrap' : 'ore')).toBe(true)
    expect(bagCount(run.bag)).toBe(12)
    expect(give(run, 'relic')).toBe(false)
    expect(give(run, 'bandage')).toBe(false)
    expect(give(run, 'tonic')).toBe(false)
    expect(give(run, 'shard')).toBe(false)
    const before = bagCount(run.bag)
    step(run, { ...still, interact: true }, 0.05)
    expect(run.opened).toContain(CRATES[0]!.id)
    expect(run.drops.length).toBe(CRATES[0]!.loot.length)
    expect(bagCount(run.bag)).toBe(before)
    const foe = run.foes.find((item) => item.zone === run.zone && item.hp > 0)!
    foe.hp = 1
    run.x = foe.x
    run.y = foe.y
    run.facing = 0
    run.attackCd = 0
    run.swing = 0
    run.stam = 100
    step(run, { ...still, attack: true }, 0.05)
    for (let i = 0; i < 8; i += 1) step(run, still, 0.05)
    const monsterDrop = run.drops.find((drop) => drop.id === `drop-${foe.id}`)
    expect(monsterDrop).toBeTruthy()
    expect(bagCount(run.bag)).toBe(before)
    if (monsterDrop) {
      run.x = monsterDrop.x
      run.y = monsterDrop.y
      run.age = 10
      expect(claimLoot(run, monsterDrop.id, 'local')).toBe('full')
    }
    const store = {
      get length() { return 1 },
      clear() {},
      getItem: () => JSON.stringify({
        stash: [{ kind: 'bandage', n: 2 }],
        support: 0,
        shield: 4,
        shieldGranted: true,
        run: { zone: 'pangkalan', x: 0, y: 0, hp: 90, sword: true, bag: [{ kind: 'scrap', n: 5 }, { kind: 'relic', n: 9 }] },
      }),
      key: () => null,
      removeItem() {},
      setItem() {},
    }
    const loaded = loadExtract(store as Storage)
    expect(bagCount(loaded.run!.bag)).toBe(12)
    expect(loaded.run!.bag.some((stack) => stack.kind === 'relic' && stack.n === 7)).toBe(true)
  })
})
