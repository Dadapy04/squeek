import { describe, expect, it } from 'vitest'
import { cardSignature } from '../src/arena/pick.ts'

describe('upgrade card identity', () => {
  it('keeps the same signature across frames so a tap is not retargeted', () => {
    const offers = ['apron', 'boots', 'handle']
    const stacks = { apron: 0, boots: 0, handle: 0 }
    const first = cardSignature('pick', offers, stacks)
    const again = cardSignature('pick', offers, stacks)
    expect(again).toBe(first)
    expect(first).not.toBe('')
  })

  it('changes only when the offer or the stack changes, and clears outside the pick', () => {
    const offers = ['apron', 'boots', 'handle']
    const stacks = { apron: 0, boots: 0, handle: 0 }
    const open = cardSignature('pick', offers, stacks)
    expect(cardSignature('fight', offers, stacks)).toBe('')
    expect(cardSignature('pick', offers, { ...stacks, apron: 1 })).not.toBe(open)
    expect(cardSignature('pick', ['apron', 'boots', 'wind'], stacks)).not.toBe(open)
  })
})
