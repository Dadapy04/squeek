import { SHOP } from './balance.ts'
import type { ItemKind, Meta, UpgradeId } from './types.ts'

const KEY = 'npcs-burrow-extraction.save.v1'
const ITEMS: ItemKind[] = ['scrap', 'ore', 'gear', 'bandage', 'tonic', 'core', 'relic']
const UPGRADES: UpgradeId[] = ['damage', 'bag', 'vitality']

export function freshMeta(): Meta {
  return {
    bank: { scrap: 0, ore: 0, gear: 0, bandage: 0, tonic: 0, core: 0, relic: 0 },
    ranks: { damage: 0, bag: 0, vitality: 0 },
  }
}

function clampInt(value: unknown, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0
  return Math.max(0, Math.min(max, Math.floor(value)))
}

export function sanitizeMeta(value: unknown): Meta {
  const meta = freshMeta()
  if (typeof value !== 'object' || value === null) return meta
  const raw = value as { bank?: Record<string, unknown>; ranks?: Record<string, unknown> }
  for (const item of ITEMS) meta.bank[item] = clampInt(raw.bank?.[item], 9999)
  for (const id of UPGRADES) meta.ranks[id] = clampInt(raw.ranks?.[id], SHOP[id].length)
  return meta
}

export function loadMeta(storage: Storage | null): Meta {
  if (!storage) return freshMeta()
  try {
    const raw = storage.getItem(KEY)
    if (!raw) return freshMeta()
    return sanitizeMeta(JSON.parse(raw) as unknown)
  } catch {
    return freshMeta()
  }
}

export function saveMeta(storage: Storage | null, meta: Meta): boolean {
  if (!storage) return false
  try {
    storage.setItem(KEY, JSON.stringify(sanitizeMeta(meta)))
    return true
  } catch {
    return false
  }
}

export function probeStorage(): Storage | null {
  try {
    const key = '__npcs_probe__'
    localStorage.setItem(key, '1')
    localStorage.removeItem(key)
    return localStorage
  } catch {
    return null
  }
}

export function canAfford(meta: Meta, id: UpgradeId): boolean {
  const cost = SHOP[id][meta.ranks[id]]
  if (!cost) return false
  return (
    meta.bank.scrap >= cost.scrap &&
    meta.bank.ore >= cost.ore &&
    meta.bank.gear >= cost.gear &&
    meta.bank.core >= cost.core &&
    meta.bank.relic >= cost.relic
  )
}

/** Spends banked parts for one rank. Fails closed: no partial spend, no rank above the list. */
export function buyUpgrade(meta: Meta, id: UpgradeId): boolean {
  const rank = meta.ranks[id]
  const cost = SHOP[id][rank]
  if (!cost || !canAfford(meta, id)) return false
  meta.bank.scrap -= cost.scrap
  meta.bank.ore -= cost.ore
  meta.bank.gear -= cost.gear
  meta.bank.core -= cost.core
  meta.bank.relic -= cost.relic
  meta.ranks[id] = rank + 1
  return true
}
