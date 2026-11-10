import { describe, expect, it } from 'vitest'
import { setLocale } from '../src/extract/i18n.ts'

setLocale('id')
import { mintUnit } from '../src/extract/coins.ts'
import { MERCHANT, UPGRADE_COSTS, shieldMaxFor, swordBonusPct, swordDamage, swordReadout, upgradeCost } from '../src/extract/economy.ts'
import { EXTRACT_SAVE_KEY, loadExtract, writeExtract } from '../src/extract/save.ts'
import {
  buyGoods,
  deploy,
  freshSave,
  insureHeld,
  insureStash,
  killRun,
  sellOne,
  stashValue,
  step,
  strikeDamage,
  uninsure,
  upgradeBag,
  upgradeGear,
  type Input,
} from '../src/extract/sim.ts'
import { workshopView } from '../src/extract/workshop.ts'

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

describe('koin wallet, bengkel, and asuransi', () => {
  it('starts old saves at 0 koin and keeps upgrades through death', () => {
    const store = memory()
    store.setItem(EXTRACT_SAVE_KEY, JSON.stringify({ stash: [{ kind: 'sword', n: 1 }], shield: 4, shieldGranted: true }))
    const loaded = loadExtract(store)
    expect(loaded.coins).toBe(0)
    expect(loaded.swordLevel).toBe(1)
    expect(loaded.bagSlots).toBe(12)
    loaded.coins = 20000
    expect(upgradeGear(loaded, 'sword')).toMatchObject({ ok: true, level: 2 })
    expect(loaded.coins).toBe(20000 - 1500)
    expect(swordDamage(2)).toBe(26)
    expect(swordBonusPct(2)).toBe(8)
    expect(upgradeGear(loaded, 'shield')).toMatchObject({ ok: true, level: 2 })
    expect(shieldMaxFor(2)).toBe(5)
    deploy(loaded, [{ kind: 'sword', n: 1 }], true)
    killRun(loaded)
    expect(loaded.swordLevel).toBe(2)
    expect(loaded.shieldLevel).toBe(2)
    expect(upgradeCost(6)).toBeNull()
    expect([...UPGRADE_COSTS]).toEqual([1500, 2500, 4000, 6000, 9000])
  })

  it('sells stash goods into the wallet and refuses the sword', () => {
    const save = freshSave()
    const relic = mintUnit('relic', 3, 'stash')
    save.stash.push({ kind: 'relic', n: 1, units: [relic] })
    const before = stashValue(save)
    expect(sellOne(save, 'sword')).toBeNull()
    expect(sellOne(save, 'relic', relic.coins)).toBe(relic.coins)
    expect(save.coins).toBe(relic.coins)
    expect(stashValue(save)).toBe(before - relic.coins)
    expect(save.stash.some((stack) => stack.kind === 'relic')).toBe(false)
  })

  it('buys perban and P3K below resale and grows the bag', () => {
    const save = freshSave()
    save.coins = 100
    expect(MERCHANT.bandage.buy).toBeGreaterThan(MERCHANT.bandage.coins)
    expect(MERCHANT.p3k.buy).toBeGreaterThan(MERCHANT.p3k.coins)
    expect(buyGoods(save, 'bandage').ok).toBe(true)
    expect(buyGoods(save, 'p3k').ok).toBe(true)
    const bandage = save.stash.find((stack) => stack.kind === 'bandage')!
    expect(bandage.units?.some((unit) => unit.coins === MERCHANT.bandage.coins)).toBe(true)
    expect(save.stash.find((stack) => stack.kind === 'p3k')?.units?.[0]?.coins).toBe(MERCHANT.p3k.coins)
    expect(save.coins).toBe(100 - MERCHANT.bandage.buy - MERCHANT.p3k.buy)
    save.coins = 0
    expect(buyGoods(save, 'p3k')).toMatchObject({ ok: false, reason: 'Koin kurang.' })
    save.coins = 1000
    expect(upgradeBag(save)).toMatchObject({ ok: true, slots: 13 })
    expect(save.coins).toBe(0)
  })

  it('swaps the insured item back only when there is room, and death returns it', () => {
    const save = freshSave()
    const home = mintUnit('relic', 8, 'stash')
    const other = mintUnit('shard', 9, 'stash')
    save.stash.push({ kind: 'relic', n: 1, units: [home] }, { kind: 'shard', n: 1, units: [other] })
    expect(insureStash(save, 'relic', home.coins)).toBeNull()
    expect(save.stash.some((stack) => stack.kind === 'relic')).toBe(false)
    expect(insureStash(save, 'shard', other.coins)).toBeNull()
    expect(save.insured?.kind).toBe('shard')
    expect(save.stash.some((stack) => stack.kind === 'relic')).toBe(true)
    deploy(save, [])
    const run = save.run!
    expect(run.insured?.kind).toBe('shard')
    expect(save.insured).toBeNull()
    const loot = mintUnit('bilah', 4, 'loot')
    run.bag.push({ kind: 'bilah', n: 1, units: [loot] })
    expect(insureHeld(run, 'bilah', loot.coins)).toBeNull()
    expect(run.insured?.kind).toBe('bilah')
    expect(run.bag.some((stack) => stack.kind === 'shard')).toBe(true)
    run.bagSlots = 12
    run.bag = Array.from({ length: 12 }, (_, index) => ({ kind: 'scrap' as const, n: 1, units: [mintUnit('scrap', index + 20, 'loot')] }))
    const blocked = uninsure(run)
    expect(blocked).toBe('Tas penuh. Kosongkan satu slot dulu.')
    expect(run.insured?.kind).toBe('bilah')
    run.bagSlots = 12
    killRun(save)
    expect(save.stash.some((stack) => stack.kind === 'bilah')).toBe(true)
    expect(save.run).toBeNull()
  })

  it('lands the upgraded sword damage on a crab, matching Bengkel and the HUD', () => {
    expect([1, 2, 3, 4, 5, 6].map((level) => swordDamage(level))).toEqual([24, 26, 28, 30, 32, 34])
    expect([1, 2, 3, 4, 5, 6].map((level) => swordBonusPct(level))).toEqual([0, 8, 16, 24, 32, 40])
    const store = memory()
    store.setItem(EXTRACT_SAVE_KEY, JSON.stringify({ swordLevel: 3, shield: 4, shieldGranted: true, stash: [{ kind: 'sword', n: 1 }] }))
    const kept = loadExtract(store)
    expect(kept.swordLevel).toBe(3)
    expect(swordDamage(kept.swordLevel)).toBe(28)
    const still: Input = { moveX: 0, moveY: 0, attack: false, dodge: false, interact: false, block: false, use: null }
    const hits = [1, 3].map((level) => {
      const save = freshSave()
      save.swordLevel = level
      const dmg = swordDamage(level)
      const card = workshopView(save).upgrades.find((item) => item.which === 'sword')!
      expect(card.now).toBe(`Lv${level} · daya ${dmg} (+${swordBonusPct(level)}%)`)
      expect(swordReadout(level)).toBe(`Pedang ${dmg}`)
      deploy(save, [{ kind: 'sword', n: 1 }])
      const run = save.run!
      expect(run.swordLevel).toBe(level)
      expect(strikeDamage(run)).toBe(dmg)
      run.zone = 'tambang'
      run.x = 10
      run.y = 10
      run.facing = 0
      const foe = run.foes.find((item) => item.id === 'crab-a')!
      const before = foe.hp
      step(run, { ...still, attack: true }, 0.05)
      for (let i = 0; i < 4; i += 1) step(run, still, 0.05)
      expect(foe.hp).toBe(before - dmg)
      expect(run.floats.some((item) => item.text === String(dmg))).toBe(true)
      return { level, before, after: foe.hp, dealt: dmg }
    })
    console.log(`pedang kena Lv1 ${hits[0]!.before}→${hits[0]!.after} (−${hits[0]!.dealt}) · Lv3 ${hits[1]!.before}→${hits[1]!.after} (−${hits[1]!.dealt})`)
  })

  it('estimates how many ordinary extracts buy the first sword upgrade', () => {
    const seeds = Array.from({ length: 40 }, (_, index) => index + 1)
    const totals = seeds.map((seed) => {
      const kinds = ['scrap', 'bandage', 'ore', 'tonic', 'relic', 'shard', 'scrap', 'scrap', 'ore'] as const
      return kinds.reduce((sum, kind, index) => sum + mintUnit(kind, seed * 50 + index * 3, 'loot').coins, 0)
    })
    const average = totals.reduce((sum, value) => sum + value, 0) / totals.length
    const runs = 1500 / average
    console.log(`rata ekstrak ${average.toFixed(1)} koin · lari ke 1500 ≈ ${runs.toFixed(1)}`)
    expect(average).toBeGreaterThan(0)
    expect(runs).toBeGreaterThan(0)
  })
})
