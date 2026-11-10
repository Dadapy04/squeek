/** In-game koin. Rarity bands do not overlap, and a rolled value stays on the item. */

import type { ItemKind } from './sim.ts'
import { t, type MsgKey } from './i18n.ts'

export type CoinRarity = 'biasa' | 'langka' | 'pusaka' | 'legenda'
export type ItemOrigin = 'stash' | 'loot'

export interface ItemUnit {
  coins: number
  rarity: CoinRarity
  origin: ItemOrigin
  /** Vein metal, when this unit is ore. Missing on older saves. */
  metal?: 'copper' | 'silver' | 'gold' | 'spore' | 'gem' | 'abyss'
}

export const COIN_RARITIES: CoinRarity[] = ['biasa', 'langka', 'pusaka', 'legenda']

/** Each tier starts above the previous tier's maximum. */
export const COIN_BAND: Record<CoinRarity, { min: number; max: number }> = {
  biasa: { min: 4, max: 14 },
  langka: { min: 18, max: 32 },
  pusaka: { min: 36, max: 54 },
  legenda: { min: 60, max: 88 },
}

export const RARITY_COLOR: Record<CoinRarity, string> = {
  biasa: '#c4b8a4',
  langka: '#7ec8c4',
  pusaka: '#b388ff',
  legenda: '#f2c04a',
}

function liveName(prefix: string): Record<string, string> {
  return new Proxy({} as Record<string, string>, {
    get: (_target, prop: string) => t(`${prefix}.${prop}` as MsgKey),
  })
}

export const RARITY_NAME = liveName('rarity') as Record<CoinRarity, string>

export const ITEM_NAME = liveName('item') as Record<ItemKind, string>

export const STASH_SLOTS = 20

const ROLL: Record<ItemKind, CoinRarity[]> = {
  sword: ['biasa'],
  bandage: ['biasa', 'biasa', 'biasa', 'biasa', 'langka'],
  tonic: ['biasa', 'biasa', 'biasa', 'langka'],
  scrap: ['biasa', 'biasa', 'biasa', 'biasa', 'langka'],
  ore: ['biasa', 'langka', 'langka'],
  shard: ['langka', 'langka', 'pusaka'],
  relic: ['pusaka', 'pusaka', 'legenda'],
  tombak: ['langka'],
  bilah: ['legenda'],
  p3k: ['biasa'],
}

export function mixSeed(seed: number): number {
  let n = (Math.floor(Math.abs(seed)) || 1) >>> 0
  n = Math.imul(n ^ (n >>> 16), 0x7feb352d) >>> 0
  n = Math.imul(n ^ (n >>> 15), 0x846ca68b) >>> 0
  return n >>> 0
}

export function coinsFor(rarity: CoinRarity, seed: number): number {
  const band = COIN_BAND[rarity]
  const span = band.max - band.min + 1
  return band.min + (mixSeed(seed) % span)
}

export function rarityForKind(kind: ItemKind, seed: number): CoinRarity {
  const table = ROLL[kind]
  return table[mixSeed(seed) % table.length]!
}

export function mintUnit(kind: ItemKind, seed: number, origin: ItemOrigin): ItemUnit {
  const rarity = rarityForKind(kind, seed)
  return { rarity, coins: coinsFor(rarity, seed ^ 0x9e3779b9), origin }
}

export function hashText(text: string): number {
  let n = 2166136261
  for (let i = 0; i < text.length; i += 1) n = Math.imul(n ^ text.charCodeAt(i), 16777619) >>> 0
  return n || 1
}

export function readUnit(value: unknown, kind: ItemKind, salt: number): ItemUnit {
  if (typeof value === 'object' && value !== null) {
    const raw = value as { coins?: unknown; rarity?: unknown; origin?: unknown }
    const rarity = COIN_RARITIES.includes(raw.rarity as CoinRarity) ? raw.rarity as CoinRarity : rarityForKind(kind, salt)
    const coins = typeof raw.coins === 'number' && Number.isFinite(raw.coins) ? Math.max(0, Math.floor(raw.coins)) : coinsFor(rarity, salt)
    const origin: ItemOrigin = raw.origin === 'loot' ? 'loot' : 'stash'
    const metal = (raw as { metal?: unknown }).metal
    const known = metal === 'copper' || metal === 'silver' || metal === 'gold' || metal === 'spore' || metal === 'gem' || metal === 'abyss'
    return known ? { coins, rarity, origin, metal } : { coins, rarity, origin }
  }
  return mintUnit(kind, salt, 'stash')
}
