import { describe, expect, it } from 'vitest'
import { setLocale } from '../src/extract/i18n.ts'

setLocale('en')
import { FIELD_BANDAGE_CAP, FIELD_PRICE } from '../src/extract/economy.ts'
import { fieldBuy as stall } from '../shared/account.ts'
import { freshAccount } from '../shared/account.ts'
import { deploy, fieldBuy, freshSave } from '../src/extract/sim.ts'

describe('field stall', () => {
  it('charges the stall price only while the vendor is open', () => {
    const save = freshSave()
    deploy(save, [{ kind: 'sword', n: 1 }])
    save.coins = 40
    for (const prop of save.run!.chart!.props) if (prop.kind === 'vendor') prop.state = 'spent'
    expect(fieldBuy(save, 'bandage')).toBe('')
    expect(save.coins).toBe(40)
    const run = save.run!
    const vendor = run.chart!.props.find((item) => item.kind === 'vendor') ?? run.chart!.props[0]!
    vendor.kind = 'vendor'
    vendor.state = 'live'
    vendor.room = run.roomId!
    vendor.zone = run.zone
    vendor.x = run.x
    vendor.y = run.y
    expect(fieldBuy(save, 'bandage')).toBe('')
    expect(save.coins).toBe(0)
    expect(run.bag.some((stack) => stack.kind === 'bandage')).toBe(true)
    expect(fieldBuy(save, 'bandage', true)).toBe('')
  })

  it('bills a wallet stall at the same price and stops after the floor cap', () => {
    const account = freshAccount()
    account.coins = 40
    account.activeRun = { id: 'run', sword: true, shield: null, bag: [], spear: null, blade: null, insured: null }
    expect(stall(account, 'p3k').ok).toBe(false)
    expect(account.coins).toBe(40)
    expect(stall(account, 'bandage')).toEqual({ ok: true, coins: 0 })
    account.coins = FIELD_PRICE.bandage * FIELD_BANDAGE_CAP
    account.activeRun.fieldBuys = 0
    for (let i = 0; i < FIELD_BANDAGE_CAP; i += 1) expect(stall(account, 'bandage').ok).toBe(true)
    expect(stall(account, 'bandage')).toEqual({ ok: false, reason: 'spent' })
    expect(account.coins).toBe(0)
  })
})
