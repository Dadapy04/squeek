import { describe, expect, it } from 'vitest'
import { setLocale } from '../src/extract/i18n.ts'

setLocale('en')
import { COIN_BAND } from '../src/extract/coins.ts'
import { upgradeOre } from '../src/extract/economy.ts'
import { EXTRACT_SAVE_KEY, loadExtract } from '../src/extract/save.ts'
import { generateFloor } from '../src/extract/dungeon.ts'
import { count, deploy, freshSave, miningNoise, sellOne, step, upgradeGear, type Input } from '../src/extract/sim.ts'

const still: Input = { moveX: 0, moveY: 0, attack: false, dodge: false, interact: false, block: false, use: null, soul: false }

function memory(): Storage {
  const data = new Map<string, string>()
  return {
    get length() { return data.size },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => { data.delete(key) },
    setItem: (key, value) => { data.set(key, value) },
  }
}

describe('mining', () => {
  it('breaks a vein into banded ore and refuses a full bag', () => {
    const save = freshSave()
    deploy(save, [{ kind: 'sword', n: 1 }])
    const run = save.run!
    const vein = run.chart!.veins[0]!
    expect(vein.max).toBeGreaterThanOrEqual(4)
    run.zone = vein.zone
    run.roomId = vein.room
    run.x = Math.max(-80, Math.min(80, vein.x + (vein.x > 0 ? -36 : 36)))
    run.y = vein.y
    run.facing = vein.x > 0 ? 0 : Math.PI
    const pulls: number[] = []
    while (vein.hp > 0 && pulls.length < 12) {
      run.attackCd = 0
      run.swing = 0
      run.stam = 100
      step(run, { ...still, attack: true }, 0.05)
      for (let i = 0; i < 6; i += 1) step(run, still, 0.05)
      pulls.push(vein.hp)
    }
    expect(vein.hp).toBe(0)
    expect(pulls.length).toBeGreaterThanOrEqual(4)
    const stack = run.bag.find((item) => item.kind === 'ore')
    expect(stack?.n).toBeGreaterThan(0)
    const unit = stack?.units?.[0]
    expect(unit?.rarity).toBe(vein.rarity)
    expect(unit?.coins).toBeGreaterThanOrEqual(COIN_BAND[vein.rarity].min)
    expect(unit?.coins).toBeLessThanOrEqual(COIN_BAND[vein.rarity].max)
    const blocked = run.chart!.veins[0]!
    blocked.hp = 1
    run.bag = Array.from({ length: 12 }, () => ({ kind: 'scrap' as const, n: 1, units: [{ coins: 4, rarity: 'biasa' as const, origin: 'loot' as const }] }))
    run.zone = blocked!.zone
    run.roomId = blocked!.room
    run.x = Math.max(-80, Math.min(80, blocked!.x + (blocked!.x > 0 ? -36 : 36)))
    run.y = blocked!.y
    run.facing = blocked!.x > 0 ? 0 : Math.PI
    run.attackCd = 0
    run.swing = 0
    step(run, { ...still, attack: true }, 0.05)
    for (let i = 0; i < 6; i += 1) step(run, still, 0.05)
    expect(blocked!.hp).toBe(1)
    expect(count(run.bag, 'scrap')).toBe(12)
  })

  it('pulls a nearby foe when the pick strikes', () => {
    const save = freshSave()
    deploy(save, [{ kind: 'sword', n: 1 }])
    const run = save.run!
    const foe = run.foes.find((item) => item.zone === 'tambang' && item.hp > 0)!
    run.zone = 'tambang'
    run.roomId = 'room-mine'
    foe.x = 10
    foe.y = 70
    run.x = 70
    run.y = 10
    const before = Math.hypot(foe.x - run.x, foe.y - run.y)
    expect(miningNoise(run, run.x, run.y)).toBeGreaterThan(0)
    expect(foe.heard).toBeGreaterThan(2)
    for (let i = 0; i < 30; i += 1) step(run, still, 0.05)
    expect(Math.hypot(foe.x - run.x, foe.y - run.y)).toBeLessThan(before)
  })

  it('sells ore for its coin value and spends stash ore only on later upgrades', () => {
    const save = freshSave()
    save.stash.push({ kind: 'ore', n: 1, units: [{ coins: 22, rarity: 'langka', origin: 'loot' }] })
    expect(sellOne(save, 'ore', 22)).toBe(22)
    expect(save.coins).toBe(22)
    expect(count(save.stash, 'ore')).toBe(0)
    save.coins = 20000
    expect(upgradeOre(1)).toBe(0)
    expect(upgradeGear(save, 'sword')).toMatchObject({ ok: true, level: 2 })
    expect(upgradeOre(2)).toBe(1)
    const broke = upgradeGear(save, 'sword')
    expect(broke.ok).toBe(false)
    expect(save.swordLevel).toBe(2)
    expect(save.coins).toBe(20000 - 1500)
    save.stash.push({ kind: 'ore', n: 1, units: [{ coins: 8, rarity: 'biasa', origin: 'stash' }] })
    expect(upgradeGear(save, 'sword')).toMatchObject({ ok: true, level: 3 })
    expect(count(save.stash, 'ore')).toBe(0)
    const store = memory()
    store.setItem(EXTRACT_SAVE_KEY, JSON.stringify({ coins: 9, stash: [{ kind: 'ore', n: 1, units: [{ coins: 9, rarity: 'biasa', origin: 'stash' }] }], shieldGranted: true }))
    const loaded = loadExtract(store)
    expect(sellOne(loaded, 'ore', 9)).toBe(9)
    expect(loaded.coins).toBe(18)
  })

  it('puts the big vein only on deeper elite or secret rooms', () => {
    let bigShallow = 0
    let bigDeep = 0
    for (let seed = 1; seed <= 16; seed += 1) {
      const early = generateBig(1, seed)
      const late = generateBig(5, seed)
      if (early) bigShallow += 1
      if (late) {
        bigDeep += 1
        expect(late.big).toBe(true)
        expect(late.max).toBe(7)
        expect(['elite', 'secret', 'fast']).toContain(late.role)
      }
    }
    expect(bigShallow).toBe(0)
    expect(bigDeep).toBeGreaterThan(0)
  })
})

function generateBig(depth: number, seed: number): { big: boolean; max: number; role: string } | null {
  const chart = generateFloor(depth, seed)
  const vein = chart.veins.find((item) => item.big)
  if (!vein) return null
  const role = chart.rooms.find((room) => room.id === vein.room)?.role ?? ''
  return { big: vein.big, max: vein.max, role }
}
