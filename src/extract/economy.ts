/** In-game koin shop, upgrades, and sell rules. No token, no SQK. */

import type { CoinRarity } from './coins.ts'
import { t } from './i18n.ts'

/** Cost to leave the level at this index. Index 0 is Lv1 → Lv2. Cap is length + 1. */
export const UPGRADE_COSTS = [1500, 2500, 4000, 6000, 9000] as const
export const UPGRADE_CAP = UPGRADE_COSTS.length + 1

export const BAG_BASE = 12
export const BAG_UPGRADES = [
  { slots: 16, cost: 750 },
  { slots: 20, cost: 1500 },
] as const

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
  if (slots === 16 || slots === 20) return slots
  return BAG_BASE
}

export function nextBagUpgrade(slots: number | undefined): { slots: number; cost: number } | null {
  const now = bagSlotsOf(slots)
  return BAG_UPGRADES.find((step) => step.slots > now) ?? null
}

export function needsSellConfirm(rarity: CoinRarity | undefined): boolean {
  return rarity === 'pusaka' || rarity === 'legenda'
}
