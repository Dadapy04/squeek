import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { STASH_SLOTS } from '../src/extract/coins.ts'
import { freshSave, stashUsed } from '../src/extract/sim.ts'
import { applyExtract, freshAccount, STASH_CAP, startRun } from '../shared/account.ts'

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
    const blocked = applyExtract(account, [{ kind: 'scrap', coins: 8 }], 1)
    expect(blocked.ok).toBe(false)
    if (!blocked.ok) expect(blocked.reason).toBe('stash-full')
    expect(account.activeRun?.id).toBe('run-full')
    expect(account.stash.find((stack) => stack.kind === 'ore')?.n).toBe(25)
    const home = applyExtract(account, [], 1)
    expect(home.ok).toBe(true)
    expect(account.stash.find((stack) => stack.kind === 'ore')?.n).toBe(25)
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
    const blocked = applyExtract(account, [{ kind: 'scrap', coins: 8 }], 1)
    expect(blocked.ok).toBe(false)
    expect(account.stash.find((stack) => stack.kind === 'ore')?.n).toBe(18)
    expect(account.stash.find((stack) => stack.kind === 'bandage')).toBeUndefined()
    const home = applyExtract(account, [], 1)
    expect(home.ok).toBe(true)
    expect(account.stash.find((stack) => stack.kind === 'bandage')?.n).toBe(2)
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
  })
})
