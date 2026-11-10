import { describe, expect, it } from 'vitest'
import { setLocale, t } from '../src/extract/i18n.ts'
import { ITEM_NAME } from '../src/extract/coins.ts'
import { upgradeOre } from '../src/extract/economy.ts'

setLocale('en')
import {
  BAG_SLOTS,
  EXTRACT_TIME,
  bankRun,
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

function fill(run: Run): void {
  for (let i = 0; i < BAG_SLOTS; i += 1) expect(give(run, 'scrap')).toBe(true)
}

function pocketText(name: string): string {
  return t('loot.pocket', { name })
}

describe('activity loot goes into the bag', () => {
  it('pockets a broken vein and names the ore', () => {
    const { run } = start()
    const vein = run.chart!.veins[0]!
    quiet(run)
    vein.hp = 1
    vein.ore = 'copper'
    stand(run, vein.x - 20, vein.y, vein.zone, vein.room)
    press(run)
    expect(vein.hp).toBe(0)
    const stack = run.bag.find((item) => item.kind === 'ore')
    expect(stack?.n).toBe(1)
    expect(stack?.units?.[0]?.origin).toBe('loot')
    expect(stack?.units?.[0]?.rarity).toBe(vein.rarity)
    expect(ITEM_NAME.ore).toBe('Ore')
    expect(run.drops).toHaveLength(0)
    expect(run.floats.some((item) => item.text === pocketText(t('loot.oreName', { metal: 'Copper' })))).toBe(true)
    expect(run.bagPulse ?? 0).toBeGreaterThan(0)
  })

  it('pockets three pieces from a big gold vein and spills only the overflow', () => {
    const { run } = start()
    quiet(run)
    for (let i = 0; i < BAG_SLOTS - 1; i += 1) expect(give(run, 'scrap')).toBe(true)
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
    expect(count(run.bag, 'ore')).toBe(1)
    expect(run.drops.filter((drop) => drop.kind === 'ore')).toHaveLength(2)
    expect(Math.hypot(run.drops[0]!.x - run.x, run.drops[0]!.y - run.y)).toBeLessThan(28)
    expect(run.floats.some((item) => item.text === pocketText(t('loot.oreName', { metal: 'Gold' })))).toBe(true)
    expect(run.floats.some((item) => item.text === t('hud.bagFull'))).toBe(true)
  })

  it('pockets a crate, a chest, a secret chest, and a barrel drop', () => {
    const wood = start()
    const crate = place(wood.run, 'crate', ['scrap', 'bandage'])
    press(wood.run)
    expect(crate.state).toBe('spent')
    expect(count(wood.run.bag, 'scrap')).toBe(1)
    expect(count(wood.run.bag, 'bandage')).toBe(1)
    expect(wood.run.drops).toHaveLength(0)
    expect(wood.run.floats.some((item) => item.text === pocketText(t('item.scrap')))).toBe(true)

    const locked = start()
    const chest = place(locked.run, 'chest', ['relic'], { lock: 'key' })
    press(locked.run)
    expect(chest.state).toBe('live')
    locked.run.keys = 1
    press(locked.run)
    expect(chest.state).toBe('open')
    expect(count(locked.run.bag, 'relic')).toBe(1)
    expect(locked.run.drops).toHaveLength(0)

    const hidden = start()
    warpFloor(hidden.run, 2)
    const room = hidden.run.chart!.rooms.find((item) => item.role === 'secret')!
    const secret = hidden.run.chart!.props.find((item) => item.kind === 'chest' && item.room === room.id)!
    for (const prop of hidden.run.chart!.props) if (prop.id !== secret.id) prop.state = 'spent'
    stand(hidden.run, secret.x - 16, secret.y, secret.zone, secret.room)
    press(hidden.run)
    expect(secret.state).toBe('open')
    expect(secret.loot.every((kind) => count(hidden.run.bag, kind) > 0)).toBe(true)
    expect(hidden.run.drops).toHaveLength(0)

    const blast = start()
    const barrel = place(blast.run, 'barrel', ['shard', 'ore'])
    const hp = blast.run.hp
    press(blast.run)
    expect(barrel.state).toBe('spent')
    expect(blast.run.hp).toBe(hp - 18)
    expect(count(blast.run.bag, 'shard')).toBe(1)
    expect(count(blast.run.bag, 'ore')).toBe(1)
    expect(blast.run.drops).toHaveLength(0)
    expect(blast.run.floats.some((item) => item.text === pocketText(t('item.shard')))).toBe(true)
  })

  it('pockets a vendor purchase and drops it beside the player when the bag is full', () => {
    const shop = start()
    const vendor = place(shop.run, 'vendor', [], { x: shop.run.x + 16, y: shop.run.y })
    shop.save.coins = 40
    expect(fieldBuy(shop.save, 'bandage')).toBe('')
    expect(shop.save.coins).toBe(0)
    expect(vendor.state).toBe('spent')
    const bought = shop.run.bag.find((stack) => stack.kind === 'bandage')?.units?.[0]
    expect(bought?.coins).toBe(8)
    expect(shop.run.floats.some((item) => item.text === pocketText(t('item.bandage')))).toBe(true)

    const packed = start()
    place(packed.run, 'vendor', [], { x: packed.run.x + 16, y: packed.run.y })
    fill(packed.run)
    packed.save.coins = 32
    expect(fieldBuy(packed.save, 'tonic')).toBe('')
    expect(packed.save.coins).toBe(0)
    expect(count(packed.run.bag, 'tonic')).toBe(0)
    const drop = packed.run.drops.find((item) => item.kind === 'tonic')
    expect(drop?.unit?.coins).toBe(6)
    expect(Math.hypot(drop!.x - packed.run.x, drop!.y - packed.run.y)).toBeLessThan(28)
    expect(packed.run.floats.some((item) => item.text === t('hud.bagFull'))).toBe(true)
  })

  it('pockets the boss chest spear, bonus, and blade', () => {
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
    expect(run.opened).toContain(chest.id)
    expect(run.found.some((spear) => spear.id === chest.spear?.id)).toBe(true)
    expect(run.foundBlades.some((blade) => blade.id === chest.blade?.id)).toBe(true)
    expect(count(run.bag, chest.loot.find((kind) => kind !== 'tombak')!)).toBe(1)
    expect(run.drops).toHaveLength(0)
    expect(run.floats.some((item) => item.text === pocketText(t('item.tombak')))).toBe(true)
    expect((run.bagPulse ?? 0) > 0).toBe(true)
  })

  it('keeps mined ore through extraction, sale, and the workshop', () => {
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
    const coins = run.bag.find((stack) => stack.kind === 'ore')!.units![0]!.coins
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
    expect(upgradeOre(2)).toBe(1)
    expect(upgradeGear(save, 'sword')).toMatchObject({ ok: true, level: 3 })
    expect(count(save.stash, 'ore')).toBe(0)
  })

  it('says Bijih tembaga in Indonesian', () => {
    setLocale('id')
    const { run } = start()
    const vein = run.chart!.veins[0]!
    quiet(run)
    vein.hp = 1
    vein.ore = 'copper'
    stand(run, vein.x - 20, vein.y, vein.zone, vein.room)
    press(run)
    expect(run.floats.some((item) => item.text === '+ Bijih tembaga → Tas')).toBe(true)
    while (give(run, 'scrap')) { /* fill the remaining slots */ }
    const again = vein
    again.hp = 1
    again.x = run.x + 18
    again.y = run.y
    press(run)
    expect(run.floats.some((item) => item.text === 'Tas penuh')).toBe(true)
    setLocale('en')
  })
})
