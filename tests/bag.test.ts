import { describe, expect, it } from 'vitest'
import { BAG_SLOTS, claimLoot, claimTarget, count, deploy, dropFoundSpear, dropFromBag, freshSave, give, step, type Input } from '../src/extract/sim.ts'
import { rollSpear } from '../src/extract/spear.ts'

const still: Input = { moveX: 0, moveY: 0, attack: false, dodge: false, interact: false, block: false, use: null }

function carrying() {
  const save = freshSave()
  save.stash.push({ kind: 'scrap', n: 3 })
  expect(deploy(save, [{ kind: 'sword', n: 1 }, { kind: 'scrap', n: 3 }, { kind: 'bandage', n: 2 }], false)).toBeNull()
  return save.run!
}

describe('bag drop', () => {
  it('drops a stack onto the ground and frees the slot without touching the equipped sword', () => {
    const run = carrying()
    expect(run.sword).toBe(true)
    expect(count(run.bag, 'scrap')).toBe(3)
    const dropped = dropFromBag(run, 'scrap', 1)
    expect(dropped).toMatchObject({ ok: true, left: 2, dropped: 1 })
    expect(count(run.bag, 'scrap')).toBe(2)
    expect(run.sword).toBe(true)
    expect(run.drops.some((drop) => drop.kind === 'scrap' && drop.handsOff)).toBe(true)
    expect(claimTarget(run)).toBeNull()
    expect(dropFromBag(run, 'sword', 1).ok).toBe(false)
    expect(run.sword).toBe(true)
  })

  it('drops a whole stack, then allows Ambil only after stepping away', () => {
    const run = carrying()
    expect(dropFromBag(run, 'bandage', 99)).toMatchObject({ ok: true, left: 0, dropped: 2 })
    expect(count(run.bag, 'bandage')).toBe(0)
    expect(run.drops.filter((drop) => drop.kind === 'bandage')).toHaveLength(2)
    expect(claimTarget(run)).toBeNull()
    const spot = { x: run.drops.find((drop) => drop.kind === 'bandage')!.x, y: run.drops.find((drop) => drop.kind === 'bandage')!.y }
    run.x += 40
    step(run, still, 0.05)
    run.x = spot.x
    run.y = spot.y
    const prize = claimTarget(run)
    expect(prize?.kind).toBe('bandage')
    expect(claimLoot(run, prize!.id, 'local')).toBe('ok')
    expect(count(run.bag, 'bandage')).toBe(1)
  })

  it('frees a full bag so a better drop can be taken', () => {
    const run = carrying()
    while (count(run.bag, 'scrap') + count(run.bag, 'bandage') < BAG_SLOTS) give(run, 'scrap')
    expect(count(run.bag, 'scrap') + count(run.bag, 'bandage')).toBe(BAG_SLOTS)
    run.drops.push({ id: 'relic-ground', kind: 'relic', x: run.x, y: run.y })
    expect(claimLoot(run, 'relic-ground', 'local')).toBe('full')
    expect(dropFromBag(run, 'scrap', 1).ok).toBe(true)
    expect(claimTarget(run)?.id).toBe('relic-ground')
    expect(claimLoot(run, 'relic-ground', 'local')).toBe('ok')
    expect(count(run.bag, 'relic')).toBe(1)
  })

  it('returns a carried spear to the ground and keeps the equipped one', () => {
    const run = carrying()
    const spare = rollSpear(4)
    const worn = rollSpear(9)
    run.found = [spare]
    run.spear = worn
    expect(dropFoundSpear(run, spare.id).ok).toBe(true)
    expect(run.found).toHaveLength(0)
    expect(run.spear?.id).toBe(worn.id)
    expect(run.drops.some((drop) => drop.kind === 'tombak' && drop.spear?.id === spare.id && drop.handsOff)).toBe(true)
    expect(claimTarget(run)).toBeNull()
  })
})
