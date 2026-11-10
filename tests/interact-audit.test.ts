import { describe, expect, it } from 'vitest'
import { setLocale } from '../src/extract/i18n.ts'

setLocale('en')
import { FOE_MOTIFS, foeInkCount } from '../src/extract/foe-sprites.ts'
import { deploy, fieldBuy, freshSave, nearestVein, onStairs, PROP_REACH, stairsOpen, step, usableProp, type Input, type Run } from '../src/extract/sim.ts'
import type { PropNode } from '../src/extract/dungeon.ts'

const still: Input = { moveX: 0, moveY: 0, attack: false, dodge: false, interact: false, block: false, use: null, soul: false }

function runOf(): { save: ReturnType<typeof freshSave>; run: Run } {
  const save = freshSave()
  expect(deploy(save, [{ kind: 'sword', n: 1 }])).toBeNull()
  return { save, run: save.run! }
}

function put(run: Run, kind: PropNode['kind'], extra: Partial<PropNode> = {}): PropNode {
  const prop: PropNode = {
    id: `audit-${kind}-${run.chart!.props.length}`,
    room: run.roomId ?? 'room-start',
    zone: run.zone,
    kind,
    x: run.x + 30,
    y: run.y,
    state: 'live',
    loot: ['scrap'],
    lock: 'none',
    hp: kind === 'crack' ? 3 : undefined,
    ...extra,
  }
  run.chart!.props.push(prop)
  return prop
}

function press(run: Run): void {
  step(run, { ...still, interact: true }, 0.05)
}

describe('interact audit', () => {
  it('uses every prop the way the button promises', () => {
    const shrine = runOf()
    const pool = put(shrine.run, 'shrine')
    shrine.run.hp = 40
    press(shrine.run)
    expect(shrine.run.hp).toBe(48)
    expect(pool.state).toBe('spent')

    const wood = runOf()
    const crate = put(wood.run, 'crate')
    press(wood.run)
    expect(crate.state).toBe('spent')
    expect(wood.run.drops.length).toBeGreaterThan(0)

    const bar = runOf()
    const lever = put(bar.run, 'lever')
    press(bar.run)
    expect(lever.state).toBe('spent')
    expect(bar.run.flags).toContain(`lever:${bar.run.roomId}`)

    const locked = runOf()
    const chest = put(locked.run, 'chest', { lock: 'key' })
    press(locked.run)
    expect(chest.state).toBe('live')
    expect(locked.run.floats.some((item) => item.text === 'The chest is locked')).toBe(true)
    locked.run.keys = 1
    press(locked.run)
    expect(chest.state).toBe('open')
    expect(locked.run.keys).toBe(0)
    expect(locked.run.drops.length).toBeGreaterThan(0)

    const boom = runOf()
    const barrel = put(boom.run, 'barrel')
    const hp = boom.run.hp
    press(boom.run)
    expect(barrel.state).toBe('spent')
    expect(boom.run.hp).toBe(hp - 18)

    const wall = runOf()
    const crack = put(wall.run, 'crack')
    press(wall.run)
    expect(crack.hp).toBe(2)
    expect(crack.state).toBe('live')

    const shop = runOf()
    const vendor = put(shop.run, 'vendor', { x: shop.run.x + 20, y: shop.run.y })
    shop.save.coins = 40
    expect(fieldBuy(shop.save, 'bandage')).toContain('40')
    expect(shop.save.coins).toBe(0)
    expect(vendor.state).toBe('spent')

    const wet = runOf()
    put(wet.run, 'puddle', { x: wet.run.x, y: wet.run.y })
    const before = wet.run.hp
    step(wet.run, still, 0.05)
    expect(wet.run.hp).toBeLessThan(before)
    expect(usableProp(wet.run)).toBeNull()

    const ore = runOf()
    const vein = ore.run.chart!.veins[0]!
    vein.hp = 4
    vein.room = ore.run.roomId!
    vein.zone = ore.run.zone
    vein.x = ore.run.x + 24
    vein.y = ore.run.y
    expect(nearestVein(ore.run)?.id).toBe(vein.id)
    press(ore.run)
    expect(vein.hp).toBe(3)
    expect(Math.hypot(vein.x - ore.run.x, vein.y - ore.run.y)).toBeLessThan(PROP_REACH)

    const far = runOf()
    expect(onStairs(far.run)).toBe(false)
    expect(stairsOpen(far.run)).toBe(false)
  })
})

describe('foe sprites', () => {
  it('gives every special breed and boss a multi-color two-frame body', () => {
    for (const breed of Object.keys(FOE_MOTIFS)) {
      expect(foeInkCount(breed), breed).toBeGreaterThanOrEqual(3)
      const [a, b] = FOE_MOTIFS[breed]!
      expect(a.rows.join()).not.toBe(b.rows.join())
    }
    expect(FOE_MOTIFS.liang).toBeTruthy()
    expect(FOE_MOTIFS.mulut).toBeTruthy()
  })
})
