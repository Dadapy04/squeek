import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { setLocale } from '../src/extract/i18n.ts'
import { isCommonUnit } from '../src/extract/coins.ts'
import { needsSellConfirm } from '../src/extract/economy.ts'
import { freshSave, sellCommon as sellCommonSave, sellOne, stashUsed } from '../src/extract/sim.ts'
import { freshAccount, sellCommon, sellUnit } from '../shared/account.ts'

setLocale('en')

function unit(rarity: 'biasa' | 'langka' | 'pusaka' | 'legenda' | undefined, coins: number) {
  return rarity ? { rarity, coins, origin: 'stash' as const } : { coins, origin: 'stash' as const }
}

describe('stash sales', () => {
  it('sells every rarity and still sells when the stash is over the cap', () => {
    const account = freshAccount()
    account.stash = [{
      kind: 'scrap',
      n: 22,
      units: [
        unit('biasa', 5),
        unit('langka', 26),
        unit('pusaka', 46),
        unit('legenda', 70),
        ...Array.from({ length: 18 }, (_, i) => unit('biasa', 6 + (i % 4))),
      ],
    }]
    expect(stashUsed({ ...freshSave(), stash: account.stash, spears: [], blades: [] })).toBeGreaterThan(20)
    for (const coins of [26, 46, 70, 5]) {
      const before = account.coins
      const sold = sellUnit(account, 'scrap', coins)
      expect(sold).toEqual({ ok: true, gained: coins })
      expect(account.coins).toBe(before + coins)
    }
    expect(account.stash[0]?.n).toBe(18)
    const bulk = sellCommon(account)
    expect(bulk.ok).toBe(true)
    if (!bulk.ok) return
    expect(bulk.gained).toBeGreaterThan(0)
    expect(account.stash.find((stack) => stack.kind === 'scrap')).toBeUndefined()
  })

  it('sells untagged common coins and leaves rare goods', () => {
    const account = freshAccount()
    account.stash = [{
      kind: 'ore',
      n: 3,
      units: [unit(undefined, 8), unit('langka', 22), unit(undefined, 40)],
    }]
    expect(isCommonUnit(account.stash[0]!.units![0]!)).toBe(true)
    expect(isCommonUnit(account.stash[0]!.units![1]!)).toBe(false)
    expect(isCommonUnit(account.stash[0]!.units![2]!)).toBe(false)
    const sold = sellCommon(account)
    expect(sold).toEqual({ ok: true, gained: 8 })
    expect(account.stash[0]?.units?.map((item) => item.coins).sort()).toEqual([22, 40])
    const save = freshSave()
    save.stash = [{ kind: 'shard', n: 2, units: [unit('biasa', 9), unit('pusaka', 46)] }]
    expect(sellCommonSave(save)).toBe(9)
    expect(sellOne(save, 'shard', 46)).toBe(46)
    expect(save.coins).toBe(55)
  })

  it('asks before selling each rarity and presses the stash buttons in place', () => {
    for (const rarity of ['biasa', 'langka', 'pusaka', 'legenda'] as const) {
      expect(needsSellConfirm(rarity)).toBe(true)
    }
    const css = readFileSync(new URL('../src/extract/extract.css', import.meta.url), 'utf8')
    const boot = readFileSync(new URL('../src/extract/boot.ts', import.meta.url), 'utf8')
    expect(css).toContain('button.stash-press:active')
    expect(css).toContain('transform: translateY(2px)')
    expect(css).toContain('@keyframes stash-flash')
    expect(boot).toContain('saleAsk = { kind, coins, spearId, rarity }')
    expect(boot).toContain("t('merchant.sellAsk'")
    expect(boot).toContain('saleError = saleReason(result.reason)')
  })
})
