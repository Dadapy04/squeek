import { describe, expect, it } from 'vitest'
import { setLocale } from '../src/extract/i18n.ts'

setLocale('en')
import { chooseWeapon, freshAccount, startRun } from '../shared/account.ts'
import { deploy, equipSpear, findSpear, freshSave, stashUsed } from '../src/extract/sim.ts'
import { rollSpear } from '../src/extract/spear.ts'

describe('one weapon slot', () => {
  it('equips a stashed spear in place of the sword and heads out with the thrust', () => {
    const save = freshSave()
    const spear = rollSpear(9)
    save.spears.push(spear)
    const before = stashUsed(save)
    const swords = save.stash.find((stack) => stack.kind === 'sword')?.n ?? 0
    expect(equipSpear(save, spear.id)).toBe(true)
    expect(save.spear?.id).toBe(spear.id)
    expect(save.spears).toEqual([])
    expect(save.stash.some((stack) => stack.kind === 'sword')).toBe(true)
    expect(stashUsed(save)).toBe(before - 1)
    expect(findSpear(save, spear.id)?.id).toBe(spear.id)
    expect(save.stash.find((stack) => stack.kind === 'sword')?.n).toBe(swords)
    expect(deploy(save, [{ kind: 'sword', n: 1 }])).toMatch(/spear|Tombak/i)
    expect(deploy(save, [])).toBeNull()
    expect(save.run?.spear?.id).toBe(spear.id)
    expect(save.run?.sword).toBe(false)
  })

  it('accepts a wallet equip and a spear head-out', () => {
    const account = freshAccount()
    const spear = rollSpear(3)
    account.spears.push({ id: spear.id, rarity: spear.rarity, perks: spear.perks, coins: spear.coins, origin: 'stash' })
    const swords = account.stash.find((stack) => stack.kind === 'sword')?.n ?? 0
    expect(chooseWeapon(account, 'spear', spear.id)).toEqual({ ok: true, weapon: 'spear' })
    expect(account.spear?.id).toBe(spear.id)
    expect(account.stash.find((stack) => stack.kind === 'sword')?.n).toBe(swords)
    const started = startRun(account, [], false, 'run-spear')
    expect(started.ok).toBe(true)
    if (!started.ok) return
    expect(started.carried.spear?.id).toBe(spear.id)
    expect(started.carried.sword).toBe(false)
    expect(chooseWeapon(account, 'sword').ok).toBe(false)
  })

  it('switches back to the sword and returns the spear to the stash', () => {
    const account = freshAccount()
    const spear = rollSpear(8)
    account.spears.push({ id: spear.id, rarity: spear.rarity, perks: spear.perks, coins: spear.coins, origin: 'stash' })
    chooseWeapon(account, 'spear', spear.id)
    expect(chooseWeapon(account, 'sword')).toEqual({ ok: true, weapon: 'sword' })
    expect(account.spear).toBeNull()
    expect(account.spears.map((item) => item.id)).toEqual([spear.id])
    const started = startRun(account, [{ kind: 'sword', n: 1 }], false, 'run-sword')
    expect(started.ok).toBe(true)
    if (!started.ok) return
    expect(started.carried.sword).toBe(true)
    expect(started.carried.spear).toBeNull()
  })
})
