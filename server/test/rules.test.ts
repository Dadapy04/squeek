import { describe, expect, it } from 'vitest'
import { judgeRun } from '../src/rules.ts'

function itemFor(coin: number): string {
  if (coin >= 60) return 'tombak'
  if (coin >= 36) return 'relic'
  if (coin >= 18) return 'shard'
  return 'scrap'
}

function claim(depth: number, coins: number[], elapsedMs: number) {
  return {
    depth,
    value: coins.reduce((sum, coin) => sum + coin, 0),
    elapsedMs,
    events: [
      ...Array.from({ length: depth }, (_, index) => ({ kind: 'depth', depth: index + 1 })),
      ...coins.map((coin) => ({ kind: 'loot', item: itemFor(coin), coins: coin })),
      { kind: 'extract', depth },
    ],
  }
}

describe('anti-cheat', () => {
  it('accepts a plausible extract and rejects a rushed or inflated one', () => {
    const ok = judgeRun(claim(1, [8, 12], 30_000))
    expect(ok.ok).toBe(true)
    if (ok.ok) expect(ok.flagged).toBe(false)
    expect(judgeRun(claim(7, [8], 5_000)).ok).toBe(false)
    expect(judgeRun(claim(1, [88, 88, 88, 88, 88, 88, 88, 88, 88, 88], 60_000)).ok).toBe(false)
    const lied = claim(1, [8], 30_000)
    lied.value = 999
    expect(judgeRun(lied).ok).toBe(false)
    expect(judgeRun(claim(1, [3], 30_000)).ok).toBe(false)
    const beeline = judgeRun(claim(1, [8], 5_000))
    expect(beeline.ok).toBe(true)
    if (beeline.ok) expect(beeline.flagged).toBe(false)
    expect(judgeRun(claim(1, [8], 1_000)).ok).toBe(false)
    expect(judgeRun({
      depth: 2,
      value: 42,
      elapsedMs: 20_000,
      events: [
        { kind: 'depth', depth: 1 },
        { kind: 'depth', depth: 2 },
        { kind: 'loot', item: 'scrap', coins: 42 },
        { kind: 'extract', depth: 2 },
      ],
    }).ok).toBe(true)
    expect(judgeRun({
      depth: 1,
      value: 42,
      elapsedMs: 30_000,
      events: [
        { kind: 'depth', depth: 1 },
        { kind: 'loot', item: 'scrap', coins: 42 },
        { kind: 'extract', depth: 1 },
      ],
    }).ok).toBe(false)
  })

  it('flags a haul that is legal but suspiciously rich', () => {
    const rich = judgeRun(claim(1, Array.from({ length: 10 }, () => 70), 60_000))
    expect(rich.ok).toBe(true)
    if (rich.ok) expect(rich.flagged).toBe(true)
  })
})
