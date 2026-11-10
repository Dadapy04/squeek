import { describe, expect, it } from 'vitest'
import { judgeRun } from '../src/rules.ts'

function claim(depth: number, coins: number[], elapsedMs: number) {
  return {
    depth,
    value: coins.reduce((sum, coin) => sum + coin, 0),
    elapsedMs,
    events: [
      ...Array.from({ length: depth }, (_, index) => ({ kind: 'depth', depth: index + 1 })),
      ...coins.map((coin) => ({ kind: 'loot', coins: coin })),
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
  })

  it('flags a haul that is legal but suspiciously rich', () => {
    const rich = judgeRun(claim(1, Array.from({ length: 10 }, () => 70), 60_000))
    expect(rich.ok).toBe(true)
    if (rich.ok) expect(rich.flagged).toBe(true)
  })
})
