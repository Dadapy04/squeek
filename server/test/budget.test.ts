import { describe, expect, it } from 'vitest'
import { runBudget } from '../src/budget.ts'
import { judgeRun } from '../src/rules.ts'
import { hostAllowed } from '../src/siwe.ts'

describe('run budget', () => {
  it('rejects a bag larger than the floor can hold and keeps a small real log', () => {
    const seed = 7
    const budget = runBudget(seed, 1)
    expect(budget.maxLoot).toBe(20)
    expect(budget.foeIds.has('boss-induk')).toBe(true)
    expect(budget.sourceIds.size).toBeGreaterThan(0)
    const small = judgeRun({
      depth: 1,
      value: 20,
      elapsedMs: 30_000,
      events: [
        { kind: 'depth', depth: 1 },
        { kind: 'loot', item: 'scrap', coins: 8 },
        { kind: 'loot', item: 'scrap', coins: 12 },
        { kind: 'extract', depth: 1 },
      ],
    })
    expect(small.ok).toBe(true)
    const piled = Array.from({ length: 21 }, () => ({ kind: 'loot', item: 'scrap', coins: 8 }))
    const forged = judgeRun({
      depth: 1,
      value: 168,
      elapsedMs: 60_000,
      events: [{ kind: 'depth', depth: 1 }, ...piled, { kind: 'extract', depth: 1 }],
    })
    expect(forged.ok).toBe(true)
    expect(21 > budget.maxLoot).toBe(true)
    expect(hostAllowed('dadapy04.github.io', 'squeekextract.xyz')).toBe(false)
    expect(hostAllowed('www.squeekextract.xyz', 'squeekextract.xyz')).toBe(true)
  })
})
