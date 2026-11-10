import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { STASH_SLOTS } from '../src/extract/coins.ts'
import { bankRun, deploy, freshSave, give, stashUsed } from '../src/extract/sim.ts'
import { applyDeath, applyExtract, freshAccount, sellUnit, STALE_RUN_MS, STASH_CAP, staleDelve, startRun } from '../shared/account.ts'

function ore(n: number) {
  return {
    kind: 'ore' as const,
    n,
    units: Array.from({ length: n }, () => ({ coins: 8, rarity: 'biasa' as const, origin: 'stash' as const })),
  }
}

describe('stash cap', () => {
  it('keeps an over-cap wallet stash and refuses new loot', () => {
    const account = freshAccount()
    account.stash = [ore(25), { kind: 'sword', n: 1 }]
    expect(startRun(account, [{ kind: 'sword', n: 1 }], false, 'run-full').ok).toBe(true)
    const home = applyExtract(account, [{ kind: 'scrap', coins: 8 }], 1)
    expect(home.ok).toBe(true)
    if (!home.ok) return
    expect(home.left).toBe(1)
    expect(home.kept).toBe(0)
    expect(account.activeRun).toBeNull()
    expect(account.stash.find((stack) => stack.kind === 'ore')?.n).toBe(25)
    expect(account.stash.find((stack) => stack.kind === 'scrap')).toBeUndefined()
    expect(STASH_CAP).toBe(STASH_SLOTS)
  })

  it('holds slots for gear that is only out for the run', () => {
    const account = freshAccount()
    account.stash = [
      ore(18),
      { kind: 'sword', n: 1 },
      { kind: 'bandage', n: 2, units: [
        { coins: 8, rarity: 'biasa', origin: 'stash' },
        { coins: 8, rarity: 'biasa', origin: 'stash' },
      ] },
    ]
    expect(startRun(account, [{ kind: 'bandage', n: 2 }, { kind: 'sword', n: 1 }], false, 'run-home').ok).toBe(true)
    const home = applyExtract(account, [{ kind: 'scrap', coins: 8 }], 1)
    expect(home.ok).toBe(true)
    if (!home.ok) return
    expect(home.left).toBe(1)
    expect(account.activeRun).toBeNull()
    expect(account.stash.find((stack) => stack.kind === 'ore')?.n).toBe(18)
    expect(account.stash.find((stack) => stack.kind === 'scrap')).toBeUndefined()
    expect(account.stash.find((stack) => stack.kind === 'bandage')?.n).toBe(2)
  })

  it('keeps the best new loot that fits in the same 20 the base counter uses', () => {
    const account = freshAccount()
    account.stash = [ore(14), { kind: 'sword', n: 1 }]
    expect(startRun(account, [{ kind: 'sword', n: 1 }], false, 'run-room').ok).toBe(true)
    const loot = [8, 9, 10, 11, 12, 13, 14, 8].map((coins) => ({ kind: 'scrap', coins }))
    const home = applyExtract(account, loot, 1)
    expect(home.ok).toBe(true)
    if (!home.ok) return
    expect(home.kept).toBe(6)
    expect(home.left).toBe(2)
    expect(account.activeRun).toBeNull()
    const scrap = account.stash.find((stack) => stack.kind === 'scrap')
    expect(scrap?.n).toBe(6)
    expect(scrap?.units?.some((unit) => unit.coins === 8)).toBe(false)
    expect(account.stash.find((stack) => stack.kind === 'ore')?.n).toBe(14)
  })

  it('closes a stale base delve without returning unbanked loot', () => {
    expect(staleDelve(true, 50, 50)).toBe(true)
    expect(staleDelve(false, 0, STALE_RUN_MS - 1)).toBe(false)
    expect(staleDelve(false, 0, STALE_RUN_MS)).toBe(true)
    const account = freshAccount()
    account.stash = [ore(14), { kind: 'sword', n: 1 }]
    expect(startRun(account, [{ kind: 'sword', n: 1 }], false, 'run-stuck').ok).toBe(true)
    account.activeRun?.bag.push({ kind: 'relic', n: 1, units: [{ coins: 40, rarity: 'pusaka', origin: 'loot' }] })
    const before = account.stash.find((stack) => stack.kind === 'ore')?.n
    expect(applyDeath(account, 1).ok).toBe(true)
    expect(account.activeRun).toBeNull()
    expect(account.stash.find((stack) => stack.kind === 'ore')?.n).toBe(before)
    expect(account.stash.find((stack) => stack.kind === 'relic')).toBeUndefined()
    const sold = sellUnit(account, 'ore', 8)
    expect(sold.ok).toBe(true)
    if (!sold.ok) return
    expect(sold.gained).toBe(8)
    expect(account.stash.find((stack) => stack.kind === 'ore')?.n).toBe(13)
  })

  it('lets a guest extract finish and leave overflow behind', () => {
    const save = freshSave()
    save.stash.push({
      kind: 'ore',
      n: 17,
      units: Array.from({ length: 17 }, () => ({ coins: 8, rarity: 'biasa' as const, origin: 'stash' as const })),
    })
    expect(stashUsed(save)).toBe(19)
    expect(deploy(save, [{ kind: 'sword', n: 1 }])).toBeNull()
    const run = save.run
    if (!run) return
    for (let i = 0; i < 5; i += 1) expect(give(run, 'scrap', i + 3)).toBe(true)
    run.channel = 3
    expect(bankRun(save)).toBe(true)
    expect(save.run).toBeNull()
    expect(stashUsed(save)).toBe(20)
    expect(save.stash.find((stack) => stack.kind === 'scrap')?.n).toBe(1)
  })

  it('counts the same units the cap uses', () => {
    const save = freshSave()
    save.stash = [ore(25)]
    save.blades = [{ id: 'b', name: 'Bilah', damage: 36, rarity: 'pusaka', coins: 40, origin: 'stash', depth: 1 }]
    expect(stashUsed(save)).toBe(26)
  })

  it('wraps the stash grid by a fixed tile size in landscape', () => {
    const css = readFileSync(new URL('../src/extract/extract.css', import.meta.url), 'utf8')
    expect(css).toContain('grid-template-columns: repeat(auto-fill, 72px)')
    expect(css).toContain('grid-template-columns: repeat(auto-fill, 64px)')
    expect(css).not.toContain('minmax(58px, 1fr)')
    expect(css).toContain('.inv-gear { display: flex; flex-wrap: wrap;')
    expect(css).toContain('height: 40px;')
    expect(css).toContain('.inv-detail .inv-actions { display: flex;')
    expect(css).toContain('#carryHint, #loadoutTitle { display: none; }')
  })
})
