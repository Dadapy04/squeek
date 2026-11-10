import { describe, expect, it } from 'vitest'
import { applyDeath, buyMerchant, freshAccount, startRun, upgradeBag } from '../../shared/account.ts'
import { BAG_SLOT_COST, UPGRADE_COSTS } from '../../src/extract/economy.ts'

describe('wallet account rules', () => {
  it('starts at zero and rejects forged or unaffordable buys', () => {
    const account = freshAccount()
    expect(account.coins).toBe(0)
    expect(account.bagSlots).toBe(12)
    expect(buyMerchant(account, 'bandage').ok).toBe(false)
    account.coins = 10
    expect(buyMerchant(account, 'bandage').ok).toBe(false)
    expect(account.coins).toBe(10)
    account.coins = 24
    expect(buyMerchant(account, 'bandage').ok).toBe(true)
    expect(account.coins).toBe(0)
  })

  it('requires a rich ore and the listed price for bag slots 17-20', () => {
    const account = freshAccount()
    account.bagSlots = 16
    account.coins = BAG_SLOT_COST[16 - 12]!
    expect(upgradeBag(account).ok).toBe(false)
    account.stash.push({ kind: 'ore', n: 1, units: [{ coins: 40, rarity: 'pusaka', origin: 'stash', metal: 'gold' }] })
    const bought = upgradeBag(account)
    expect(bought.ok).toBe(true)
    if (bought.ok) expect(bought.slots).toBe(17)
    expect(account.coins).toBe(0)
  })

  it('refuses a second run while one is open', () => {
    const account = freshAccount()
    expect(startRun(account, [{ kind: 'sword', n: 1 }], false, 'run-1').ok).toBe(true)
    expect(startRun(account, [], false, 'run-2').ok).toBe(false)
  })

  it('keeps only the insured item when the run is lost', () => {
    const account = freshAccount()
    const started = startRun(account, [{ kind: 'bandage', n: 1 }, { kind: 'sword', n: 1 }], false, 'run-dead')
    expect(started.ok).toBe(true)
    if (!started.ok || !account.activeRun) return
    const stack = account.activeRun.bag[0]
    const unit = stack?.units?.[0]
    if (!unit) return
    account.activeRun.insured = { kind: 'bandage', unit }
    applyDeath(account, 1)
    expect(account.activeRun).toBeNull()
    expect(account.stash.some((stack) => stack.kind === 'sword')).toBe(true)
    expect(account.insured ?? null).toBeNull()
    expect(account.stash.filter((stack) => stack.kind === 'bandage').reduce((sum, stack) => sum + stack.n, 0)).toBe(2)
  })

  it('uses the same upgrade prices as the client', () => {
    expect(UPGRADE_COSTS).toEqual([1500, 2500, 4000, 6000, 9000])
    expect(BAG_SLOT_COST[0]).toBe(1000)
  })
})
