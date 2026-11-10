/** In-game koin shop, upgrades, and sell rules. No token, no SQK. */

import type { CoinRarity } from './coins.ts'
import { t } from './i18n.ts'

/** Cost to leave the level at this index. Index 0 is Lv1 → Lv2. Cap is length + 1. */
export const UPGRADE_COSTS = [1500, 2500, 4000, 6000, 9000] as const
export const UPGRADE_CAP = UPGRADE_COSTS.length + 1

export const BAG_BASE = 12
export const BAG_CAP = 20
/** Coin price of the 13th slot through the 20th. One purchase adds one slot. */
export const BAG_SLOT_COST = [1000, 1300, 1700, 2200, 2800, 3500, 4300, 5200] as const

const RICH_METAL = new Set(['gold', 'spore', 'gem', 'abyss'])

/** Gold, spore, gem, and abyss. Untagged heirloom or legendary ore still counts. */
export function isRichOre(unit: { rarity?: string; metal?: string } | undefined): boolean {
  if (!unit) return false
  if (unit.metal === 'copper' || unit.metal === 'silver') return false
  if (unit.metal && RICH_METAL.has(unit.metal)) return true
  return !unit.metal && (unit.rarity === 'pusaka' || unit.rarity === 'legenda')
}

/** Field stall. Higher than the base shop, and only a bandage. */
export const FIELD_PRICE = { bandage: 40, tonic: 32 } as const
export const FIELD_BANDAGE_CAP = 7

/** Buy price stays above the coins stored on the item, so resale cannot profit. */
export const MERCHANT = {
  bandage: { buy: 24, coins: 8, rarity: 'biasa' as const },
  p3k: { buy: 18, coins: 6, rarity: 'biasa' as const },
} as const

export type MerchantKind = keyof typeof MERCHANT

const SHIELD_MAX_BY_LEVEL = [4, 5, 6, 8, 10, 12] as const

export function clampLevel(level: number): number {
  if (!Number.isFinite(level)) return 1
  return Math.max(1, Math.min(UPGRADE_CAP, Math.floor(level)))
}

export function upgradeCost(level: number): number | null {
  const lv = clampLevel(level)
  if (lv >= UPGRADE_CAP) return null
  return UPGRADE_COSTS[lv - 1] ?? null
}

/** Extra stash ore for upgrades past the first. Level 1 stays coin-only so a fresh sword can still be raised. */
export function upgradeOre(level: number): number {
  const lv = clampLevel(level)
  if (lv <= 1 || lv >= UPGRADE_CAP) return 0
  return lv - 1
}

/** +8% of the base 24 for each level past 1, cumulative, rounded to the nearest hit. */
export function swordDamage(level: number): number {
  const lv = clampLevel(level)
  return Math.round(24 * (1 + 0.08 * (lv - 1)))
}

export function swordBonusPct(level: number): number {
  return (clampLevel(level) - 1) * 8
}

/** HUD label. Same integer strikeDamage uses for a sword swing. */
export function swordReadout(level: number): string {
  return `${t('item.sword')} ${swordDamage(level)}`
}

export function shieldMaxFor(level: number): number {
  return SHIELD_MAX_BY_LEVEL[clampLevel(level) - 1] ?? 4
}

/** Level 1 matches the old frontal block arc. Later levels open it a little. */
export function blockArc(level: number): number {
  return 1.05 + (clampLevel(level) - 1) * 0.04
}

export function bagSlotsOf(slots: number | undefined): number {
  const n = Math.floor(Number(slots))
  if (!Number.isFinite(n) || n < BAG_BASE) return BAG_BASE
  return Math.min(BAG_CAP, n)
}

export function nextBagUpgrade(slots: number | undefined): { slots: number; cost: number; ore: number } | null {
  const now = bagSlotsOf(slots)
  if (now >= BAG_CAP) return null
  const cost = BAG_SLOT_COST[now - BAG_BASE]
  if (cost == null) return null
  const next = now + 1
  return { slots: next, cost, ore: next >= 17 ? 1 : 0 }
}

export function needsSellConfirm(rarity: CoinRarity | undefined): boolean {
  return rarity == null || rarity === 'biasa' || rarity === 'langka' || rarity === 'pusaka' || rarity === 'legenda'
}
