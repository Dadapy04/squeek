import { describe, expect, it } from 'vitest'
import { setLocale, t } from '../src/extract/i18n.ts'

setLocale('en')
import { BAG_CAP, BAG_SLOT_COST, bagSlotsOf, nextBagUpgrade } from '../src/extract/economy.ts'
import { EXTRACT_SAVE_KEY, loadExtract } from '../src/extract/save.ts'
import { freshSave, upgradeBag } from '../src/extract/sim.ts'
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

describe('bag slot prices', () => {
  it('sells one slot at a time up to 20 for 22000 koin', () => {
    expect([...BAG_SLOT_COST]).toEqual([1000, 1300, 1700, 2200, 2800, 3500, 4300, 5200])
    expect(BAG_SLOT_COST.reduce((sum, n) => sum + n, 0)).toBe(22000)
    expect(nextBagUpgrade(12)).toEqual({ slots: 13, cost: 1000, ore: 0 })
    expect(nextBagUpgrade(16)).toEqual({ slots: 17, cost: 2800, ore: 1 })
    expect(nextBagUpgrade(19)).toEqual({ slots: 20, cost: 5200, ore: 1 })
    expect(nextBagUpgrade(20)).toBeNull()
    const save = freshSave()
    save.coins = 22000
    save.stash.push({
      kind: 'ore',
      n: 4,
      units: [
        { coins: 20, rarity: 'langka', origin: 'stash', metal: 'gold' },
        { coins: 40, rarity: 'pusaka', origin: 'stash', metal: 'spore' },
        { coins: 40, rarity: 'pusaka', origin: 'stash', metal: 'gem' },
        { coins: 70, rarity: 'legenda', origin: 'stash', metal: 'abyss' },
      ],
    })
    for (let slot = 13; slot <= 20; slot += 1) {
      expect(upgradeBag(save)).toMatchObject({ ok: true, slots: slot })
    }
    expect(save.bagSlots).toBe(BAG_CAP)
    expect(save.coins).toBe(0)
    expect(save.stash.some((stack) => stack.kind === 'ore')).toBe(false)
    expect(upgradeBag(save)).toMatchObject({ ok: false, reason: t('err.bag20') })
  })

  it('keeps an old 16 or 20 bag and prices the next slot from that count', () => {
    const wide = memory()
    wide.setItem(EXTRACT_SAVE_KEY, JSON.stringify({ bagSlots: 16, shieldGranted: true, coins: 0, stash: [] }))
    const sixteen = loadExtract(wide)
    expect(sixteen.bagSlots).toBe(16)
    expect(bagSlotsOf(sixteen.bagSlots)).toBe(16)
    expect(nextBagUpgrade(sixteen.bagSlots)?.cost).toBe(2800)
    const full = memory()
    full.setItem(EXTRACT_SAVE_KEY, JSON.stringify({ bagSlots: 20, shieldGranted: true, coins: 9000, stash: [] }))
    const twenty = loadExtract(full)
    expect(twenty.bagSlots).toBe(20)
    expect(upgradeBag(twenty).ok).toBe(false)
    expect(twenty.bagSlots).toBe(20)
    expect(twenty.coins).toBe(9000)
  })

  it('refuses a slot without the coins, and slots 17–20 without gold-tier ore', () => {
    const save = freshSave()
    save.coins = 999
    expect(upgradeBag(save)).toMatchObject({ ok: false, reason: t('shop.poor') })
    expect(save.bagSlots).toBe(12)
    save.coins = 1000
    expect(upgradeBag(save)).toMatchObject({ ok: true, slots: 13 })
    save.bagSlots = 16
    save.coins = 2800
    save.stash.push({ kind: 'ore', n: 2, units: [
      { coins: 8, rarity: 'biasa', origin: 'stash', metal: 'copper' },
      { coins: 22, rarity: 'langka', origin: 'stash', metal: 'silver' },
    ] })
    expect(upgradeBag(save)).toMatchObject({ ok: false, reason: t('shop.bagOre') })
    expect(save.bagSlots).toBe(16)
    expect(save.coins).toBe(2800)
    save.stash.push({ kind: 'ore', n: 1, units: [{ coins: 24, rarity: 'langka', origin: 'stash', metal: 'gold' }] })
    const view = workshopView(save).bag
    expect(view.slots).toBe(16)
    expect(view.cap).toBe(20)
    expect(view.cost).toBe(2800)
    expect(view.ore).toBe(1)
    expect(view.detail).toContain('16/20')
    expect(view.detail).toContain('2800')
    expect(view.detail).toContain('gold ore')
    expect(view.enabled).toBe(true)
    expect(upgradeBag(save)).toMatchObject({ ok: true, slots: 17 })
    expect(save.coins).toBe(0)
    expect(save.stash.find((stack) => stack.kind === 'ore')?.units?.some((unit) => unit.metal === 'gold')).toBe(false)
    expect(save.stash.find((stack) => stack.kind === 'ore')?.units?.some((unit) => unit.metal === 'copper')).toBe(true)
  })
})
