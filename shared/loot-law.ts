import { COIN_BAND, MINT_RARITIES, type CoinRarity } from '../src/extract/coins.ts'
import type { ItemKind } from '../src/extract/sim.ts'
import { oreRoll } from '../src/extract/dungeon.ts'

/** Boss chests and depth 2+ foe drops use this, not the mint table. */
export function bossLootRarity(depth: number): CoinRarity {
  return depth >= 4 ? 'legenda' : 'pusaka'
}

const FOE_DROP: ItemKind[] = ['scrap', 'ore', 'shard']
const SPEAR: CoinRarity[] = ['langka', 'pusaka', 'legenda']
const BLADE: CoinRarity[] = ['pusaka', 'legenda']

function veinRarities(depth: number): CoinRarity[] {
  const found = new Set<CoinRarity>()
  for (let salt = 0; salt < 5; salt += 1) {
    found.add(oreRoll(depth, salt, false).rarity)
    found.add(oreRoll(depth, salt, true).rarity)
  }
  return [...found]
}

/** Every rarity a real drop of this kind can roll on this floor. */
export function legalRarities(kind: string, depth: number): CoinRarity[] {
  const floor = Math.max(1, Math.min(7, Math.floor(depth) || 1))
  const found = new Set<CoinRarity>()
  const minted = MINT_RARITIES[kind as ItemKind]
  if (minted) for (const rarity of minted) found.add(rarity)
  const boss = bossLootRarity(floor)
  if (floor >= 2 && FOE_DROP.includes(kind as ItemKind)) found.add(boss)
  if (kind === 'ore') found.add(boss)
  if (kind === 'relic' && floor >= 2) found.add(boss)
  if (kind === 'ore') for (const rarity of veinRarities(floor)) found.add(rarity)
  if (kind === 'tombak') for (const rarity of SPEAR) found.add(rarity)
  if (kind === 'bilah') for (const rarity of BLADE) found.add(rarity)
  return [...found]
}

export function coinFits(kind: string, coins: number, depth = 1): boolean {
  if (!Number.isInteger(coins)) return false
  return legalRarities(kind, depth).some((rarity) => {
    const band = COIN_BAND[rarity]
    return coins >= band.min && coins <= band.max
  })
}
