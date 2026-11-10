import { describe, expect, it } from 'vitest'
import { coinFits } from '../shared/loot-law.ts'
import { coinsFor, mintUnit, type ItemKind } from '../src/extract/coins.ts'
import { oreRoll, oreValue } from '../src/extract/dungeon.ts'
import { makeBlade } from '../src/extract/depths.ts'
import { rollSpear } from '../src/extract/spear.ts'
import { bossLootRarity } from '../shared/loot-law.ts'

const KINDS: ItemKind[] = ['bandage', 'tonic', 'scrap', 'ore', 'relic', 'shard', 'tombak', 'bilah', 'p3k']
const FOE: ItemKind[] = ['scrap', 'ore', 'shard']

describe('coin bands follow the real drop tables', () => {
  it('accepts every minted, boss, vein, spear, blade, and chest coin at depths 1-7', () => {
    for (let depth = 1; depth <= 7; depth += 1) {
      for (const kind of KINDS) {
        for (let seed = 1; seed <= 240; seed += 1) {
          const unit = mintUnit(kind, seed, 'loot')
          expect(coinFits(kind, unit.coins, depth), `${kind} mint ${unit.coins} d${depth}`).toBe(true)
        }
      }
      const boss = bossLootRarity(depth)
      for (const kind of FOE) {
        if (depth < 2 && kind !== 'ore') continue
        for (let salt = 1; salt <= 40; salt += 1) {
          const coins = coinsFor(boss, salt)
          expect(coinFits(kind, coins, depth), `${kind} boss ${coins} d${depth}`).toBe(true)
        }
      }
      if (depth >= 2) {
        for (let salt = 1; salt <= 20; salt += 1) {
          expect(coinFits('relic', coinsFor(boss, salt), depth)).toBe(true)
        }
      }
      for (let salt = 0; salt < 8; salt += 1) {
        for (const big of [false, true]) {
          const rolled = oreRoll(depth, salt, big)
          const coins = oreValue(rolled.rarity, salt + 9)
          expect(coinFits('ore', coins, depth), `vein ${rolled.rarity} ${coins} d${depth}`).toBe(true)
        }
      }
      for (let seed = 1; seed <= 80; seed += 1) {
        const spear = rollSpear(seed + depth * 100)
        expect(coinFits('tombak', spear.coins ?? 0, depth)).toBe(true)
      }
      const blade = makeBlade(depth, depth * 17)
      expect(coinFits('bilah', blade.coins, depth)).toBe(true)
      for (const kind of ['scrap', 'ore', 'shard', 'relic'] as ItemKind[]) {
        const rarity = kind === 'relic' ? 'pusaka' : kind === 'shard' ? 'langka' : 'biasa'
        expect(coinFits(kind, coinsFor(rarity, depth * 3 + kind.length), depth)).toBe(true)
      }
      expect(coinFits('bandage', 8, depth)).toBe(true)
      expect(coinFits('tonic', 6, depth)).toBe(true)
    }
  })

  it('still rejects a depth-1 scrap priced like a deep foe drop', () => {
    expect(coinFits('scrap', 42, 1)).toBe(false)
    expect(coinFits('scrap', 42, 2)).toBe(true)
    expect(coinFits('scrap', 3, 2)).toBe(false)
    expect(coinFits('scrap', 100, 7)).toBe(false)
  })
})
