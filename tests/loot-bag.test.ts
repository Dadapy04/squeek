import { describe, expect, it } from 'vitest'
import { setLocale, t } from '../src/extract/i18n.ts'
import { ITEM_NAME } from '../src/extract/coins.ts'
import { upgradeOre } from '../src/extract/economy.ts'

setLocale('en')
import {
  BAG_SLOTS,
  BLAST_RADIUS,
  EXTRACT_TIME,
  ZONE_H,
  ZONE_W,
  bankRun,
  claimLoot,
  claimTarget,
  count,
  deploy,
  fieldBuy,
  freshSave,
  give,
  sellOne,
  step,
  upgradeGear,
  warpFloor,
  type Input,
  type Run,
} from '../src/extract/sim.ts'
import type { PropNode, VeinNode } from '../src/extract/dungeon.ts'

const still: Input = { moveX: 0, moveY: 0, attack: false, dodge: false, interact: false, block: false, use: null, soul: false }

function start(): { save: ReturnType<typeof freshSave>; run: Run } {
  const save = freshSave()
  expect(deploy(save, [{ kind: 'sword', n: 1 }])).toBeNull()
  return { save, run: save.run! }
}

function press(run: Run): void {
  step(run, { ...still, interact: true }, 0.05)
}

function stand(run: Run, x: number, y: number, zone: Run['zone'], room: string): void {
  run.x = x
  run.y = y
  run.zone = zone
  run.roomId = room
}

function quiet(run: Run): void {
  for (const prop of run.chart?.props ?? []) prop.state = 'spent'
  for (const vein of run.chart?.veins ?? []) vein.hp = 0
}

function place(run: Run, kind: PropNode['kind'], loot: PropNode['loot'], extra: Partial<PropNode> = {}): PropNode {
  quiet(run)
  const prop: PropNode = {
    id: `loot-${kind}-${run.chart!.props.length}`,
    room: run.roomId ?? 'room-start',
    zone: run.zone,
    kind,
    x: run.x + 24,
    y: run.y,
    state: 'live',
    loot,
    lock: 'none',
    ...extra,
  }
  run.chart!.props.push(prop)
  return prop
}

function take(run: Run, id: string): void {
  const drop = run.drops.find((item) => item.id === id)!
  run.age = (drop.born ?? 0) + 1
  run.x = drop.x
  run.y = drop.y
  expect(claimTarget(run)?.id).toBe(id)
  expect(claimLoot(run, id, 'local')).toBe('ok')
}

function onFloor(x: number, y: number): void {
  expect(Math.abs(x)).toBeLessThanOrEqual(ZONE_W / 2 - 28)
  expect(Math.abs(y)).toBeLessThanOrEqual(ZONE_H / 2 - 28)
}

describe('activity loot drops for Take', () => {
  it('drops vein ore on the floor and Take puts it in the bag', () => {
    const { run } = start()
    const vein = run.chart!.veins[0]!
    quiet(run)
    vein.hp = 1
    vein.ore = 'copper'
    stand(run, vein.x - 20, vein.y, vein.zone, vein.room)
    press(run)
    expect(vein.hp).toBe(0)
    expect(run.bag.some((stack) => stack.kind === 'ore')).toBe(false)
    const drop = run.drops.find((item) => item.kind === 'ore')!
    expect(drop.ore).toBe('copper')
    expect(drop.hover).toBeGreaterThan(0)
    expect(drop.fromX).toBe(vein.x)
    onFloor(drop.x, drop.y)
    expect(claimTarget(run)).toBeNull()
    take(run, drop.id)
    const stack = run.bag.find((item) => item.kind === 'ore')
    expect(stack?.n).toBe(1)
    expect(stack?.units?.[0]?.origin).toBe('loot')
    expect(ITEM_NAME.ore).toBe('Ore')
    expect(run.floats.some((item) => item.text === t('loot.got', { name: 'Copper ore' }))).toBe(true)
    expect(run.bagPulse ?? 0).toBeGreaterThan(0)
  })

  it('spreads a big gold vein into three ground drops and refuses a full bag', () => {
    const { run } = start()
    quiet(run)
    for (let i = 0; i < BAG_SLOTS; i += 1) expect(give(run, 'scrap')).toBe(true)
    const vein: VeinNode = {
      id: 'vein-big-test',
      room: run.roomId ?? 'room-start',
      zone: run.zone,
      x: run.x + 20,
      y: run.y,
      hp: 1,
      max: 7,
      rarity: 'langka',
      ore: 'gold',
      big: true,
    }
    run.chart!.veins.push(vein)
    press(run)
    expect(vein.hp).toBe(0)
    const ore = run.drops.filter((drop) => drop.kind === 'ore')
    expect(ore).toHaveLength(3)
    expect(new Set(ore.map((drop) => `${drop.x},${drop.y}`)).size).toBe(3)
    ore.forEach((drop) => onFloor(drop.x, drop.y))
    run.age = (ore[0]!.born ?? 0) + 1
    run.x = ore[0]!.x
    run.y = ore[0]!.y
    expect(claimTarget(run)?.id).toBe(ore[0]!.id)
    expect(claimLoot(run, ore[0]!.id, 'local')).toBe('full')
    expect(count(run.bag, 'scrap')).toBe(BAG_SLOTS)
    expect(run.drops.some((drop) => drop.id === ore[0]!.id)).toBe(true)
    expect(run.floats.some((item) => item.text === 'Bag full')).toBe(true)
  })

  it('drops crate, chest, secret chest, and barrel loot for Take', () => {
    const wood = start()
    const crate = place(wood.run, 'crate', ['scrap', 'bandage'])
    press(wood.run)
    expect(crate.state).toBe('spent')
    expect(wood.run.drops.map((drop) => drop.kind).sort()).toEqual(['bandage', 'scrap'])
    take(wood.run, wood.run.drops[0]!.id)
    expect(count(wood.run.bag, wood.run.drops.length ? 'scrap' : 'scrap') + count(wood.run.bag, 'bandage')).toBe(1)

    const locked = start()
    const chest = place(locked.run, 'chest', ['relic'], { lock: 'key' })
    press(locked.run)
    expect(chest.state).toBe('live')
    locked.run.keys = 1
    press(locked.run)
    expect(chest.state).toBe('open')
    expect(locked.run.drops.some((drop) => drop.kind === 'relic')).toBe(true)
    take(locked.run, locked.run.drops[0]!.id)
    expect(count(locked.run.bag, 'relic')).toBe(1)

    const hidden = start()
    warpFloor(hidden.run, 2)
    const room = hidden.run.chart!.rooms.find((item) => item.role === 'secret')!
    const secret = hidden.run.chart!.props.find((item) => item.kind === 'chest' && item.room === room.id)!
    for (const prop of hidden.run.chart!.props) if (prop.id !== secret.id) prop.state = 'spent'
    stand(hidden.run, secret.x - 16, secret.y, secret.zone, secret.room)
    press(hidden.run)
    expect(secret.state).toBe('open')
    expect(hidden.run.drops.map((drop) => drop.kind).sort()).toEqual([...secret.loot].sort())
    hidden.run.drops.forEach((drop) => onFloor(drop.x, drop.y))

    const blast = start()
    const barrel = place(blast.run, 'barrel', ['shard'])
    const hp = blast.run.hp
    press(blast.run)
    expect(barrel.state).toBe('live')
    expect(blast.run.hp).toBe(hp)
    expect(blast.run.drops).toHaveLength(0)
    for (let i = 0; i < 24 && barrel.state === 'live'; i += 1) step(blast.run, still, 0.05)
    expect(barrel.state).toBe('spent')
    expect(blast.run.hp).toBe(hp - 18)
    expect(blast.run.booms?.[0]?.life).toBe(0.5)
    expect(blast.run.shake ?? 0).toBeGreaterThan(0)
    const shard = blast.run.drops.find((drop) => drop.kind === 'shard')!
    expect(Math.hypot(shard.x - barrel.x, shard.y - barrel.y)).toBeLessThan(BLAST_RADIUS)
    take(blast.run, shard.id)
    expect(count(blast.run.bag, 'shard')).toBe(1)
  })

  it('keeps a vendor purchase in the bag', () => {
    const shop = start()
    place(shop.run, 'vendor', [], { x: shop.run.x + 16, y: shop.run.y })
    shop.save.coins = 40
    expect(fieldBuy(shop.save, 'bandage')).toBe('')
    expect(shop.save.coins).toBe(0)
    expect(count(shop.run.bag, 'bandage')).toBe(1)
    expect(shop.run.drops).toHaveLength(0)
    expect(shop.run.floats.some((item) => item.text === '+ Bandage')).toBe(true)
  })

  it('drops the boss chest and Take collects the spear, bonus, and blade', () => {
    const { run } = start()
    const boss = run.foes.find((foe) => foe.kind === 'boss')!
    boss.hp = 10
    run.zone = 'sarang'
    run.x = boss.x + 20
    run.y = boss.y
    run.facing = Math.PI
    step(run, { ...still, attack: true }, 0.05)
    for (let i = 0; i < 8; i += 1) step(run, still, 0.05)
    const chest = run.rewards.find((item) => item.id.startsWith('boss-chest'))!
    for (const prop of run.chart?.props ?? []) prop.state = 'spent'
    stand(run, chest.x, chest.y, chest.zone, 'room-boss')
    press(run)
    expect(run.found).toHaveLength(0)
    expect(run.foundBlades ?? []).toHaveLength(0)
    const ids = [...run.drops.map((drop) => drop.id)]
    expect(ids.length).toBe(3)
    for (const id of ids) take(run, id)
    expect(run.found.some((spear) => spear.id === chest.spear?.id)).toBe(true)
    expect(run.foundBlades?.some((blade) => blade.id === chest.blade?.id)).toBe(true)
    expect(count(run.bag, chest.loot.find((kind) => kind !== 'tombak')!)).toBe(1)
  })

  it('clamps a drop that would have landed in the wall', () => {
    const { run } = start()
    quiet(run)
    const prop = place(run, 'crate', ['scrap', 'ore', 'bandage'], { x: ZONE_W / 2 - 6, y: 10 })
    stand(run, prop.x - 30, prop.y, prop.zone, prop.room)
    press(run)
    expect(run.drops.length).toBe(3)
    run.drops.forEach((drop) => onFloor(drop.x, drop.y))
  })

  it('keeps taken ore through extraction, sale, and the workshop', () => {
    const { save, run } = start()
    quiet(run)
    const vein: VeinNode = {
      id: 'vein-home',
      room: run.roomId ?? 'room-start',
      zone: run.zone,
      x: run.x + 18,
      y: run.y,
      hp: 1,
      max: 4,
      rarity: 'biasa',
      ore: 'copper',
      big: false,
    }
    run.chart!.veins.push(vein)
    press(run)
    const drop = run.drops.find((item) => item.kind === 'ore')!
    const coins = drop.unit!.coins
    take(run, drop.id)
    run.zone = 'pangkalan'
    run.x = 0
    run.y = -80
    run.channel = EXTRACT_TIME
    expect(bankRun(save)).toBe(true)
    expect(count(save.stash, 'ore')).toBe(1)
    expect(sellOne(save, 'ore', coins)).toBe(coins)
    expect(save.coins).toBe(coins)
    save.stash.push({ kind: 'ore', n: 1, units: [{ coins: 9, rarity: 'biasa', origin: 'stash' }] })
    save.coins = 20000
    expect(upgradeOre(1)).toBe(0)
    expect(upgradeGear(save, 'sword')).toMatchObject({ ok: true, level: 2 })
    expect(count(save.stash, 'ore')).toBe(1)
    expect(upgradeGear(save, 'sword')).toMatchObject({ ok: true, level: 3 })
    expect(count(save.stash, 'ore')).toBe(0)
  })

  it('says + Bijih tembaga when the ore is taken in Indonesian', () => {
    setLocale('id')
    const { run } = start()
    const vein = run.chart!.veins[0]!
    quiet(run)
    vein.hp = 1
    vein.ore = 'copper'
    stand(run, vein.x - 20, vein.y, vein.zone, vein.room)
    press(run)
    const drop = run.drops.find((item) => item.kind === 'ore')!
    take(run, drop.id)
    expect(run.floats.some((item) => item.text === '+ Bijih tembaga')).toBe(true)
    setLocale('en')
  })
})
