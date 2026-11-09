import { coinsFor, hashText, RARITY_NAME, type ItemOrigin } from './coins.ts'
import { t, type MsgKey } from './i18n.ts'

/** Unique boss spears. A drop rolls once. It is not a weapon until it is extracted and equipped. */

export type SpearRarity = 'langka' | 'pusaka' | 'legenda'
export type SpearPerk = 'reach' | 'pierce' | 'lunge' | 'crit' | 'bleed'

export interface Spear {
  id: string
  rarity: SpearRarity
  perks: SpearPerk[]
  /** Koin rolled with the spear. Missing on old saves until load fills it. */
  coins?: number
  /** stash: carried out of simpanan. loot: found this run. */
  origin?: ItemOrigin
}

export const SPEAR_REACH = 78
export const SPEAR_EXTRA_REACH = 14
export const SPEAR_ARC = 0.55
/** Pull the shaft back, then a short full-length lunge, then a brief recovery. */
export const SPEAR_WIND = 0.1
export const SPEAR_ACTIVE = 0.12
export const SPEAR_TOTAL = 0.38
export const SWORD_REACH = 46
export const SWORD_POWER = 24

const PERKS: SpearPerk[] = ['reach', 'pierce', 'lunge', 'crit', 'bleed']
const RARITIES: SpearRarity[] = ['langka', 'pusaka', 'legenda']

const PERK_KEY: Record<SpearPerk, MsgKey> = {
  reach: 'perk.reach',
  pierce: 'perk.pierce',
  lunge: 'perk.lunge',
  crit: 'perk.crit',
  bleed: 'perk.bleed',
}

export const PERK_LABEL: Record<SpearPerk, string> = new Proxy({} as Record<SpearPerk, string>, {
  get: (_target, prop: string) => t(PERK_KEY[prop as SpearPerk]),
})

export const RARITY_LABEL: Record<SpearRarity, string> = new Proxy({} as Record<SpearRarity, string>, {
  get: (_target, prop: string) => RARITY_NAME[prop as SpearRarity],
})

export function spearRgb(rarity: SpearRarity): string {
  if (rarity === 'legenda') return '242, 192, 74'
  if (rarity === 'pusaka') return '179, 136, 255'
  return '126, 200, 196'
}

export function spearHex(rarity: SpearRarity): string {
  if (rarity === 'legenda') return '#f2c04a'
  if (rarity === 'pusaka') return '#b388ff'
  return '#7ec8c4'
}

export function spearReach(spear: Spear): number {
  return SPEAR_REACH + (spear.perks.includes('reach') ? SPEAR_EXTRA_REACH : 0)
}

export function spearPower(spear: Spear): number {
  if (spear.rarity === 'legenda') return 46
  if (spear.rarity === 'pusaka') return 38
  return 32
}

/** Extra damage on the kelabang. Regular foes stay on spearPower. */
export function spearBossBonus(spear: Spear): number {
  if (spear.rarity === 'legenda') return 28
  if (spear.rarity === 'pusaka') return 22
  return 16
}

export function spearStatLine(spear: Spear): string {
  return t('spear.line', { dmg: spearPower(spear), reach: spearReach(spear), boss: spearPower(spear) + spearBossBonus(spear) })
}

/** 1 is a fully extended lunge. Rest sits a little past halfway. */
export function spearExtension(elapsed: number, thrusting: boolean): number {
  const rest = 0.58
  const back = 0.18
  if (!thrusting || elapsed <= 0) return rest
  if (elapsed < SPEAR_WIND) return rest + (back - rest) * (elapsed / SPEAR_WIND)
  if (elapsed < SPEAR_WIND + SPEAR_ACTIVE) {
    const k = (elapsed - SPEAR_WIND) / SPEAR_ACTIVE
    const snap = 1 - (1 - k) ** 3
    return back + (1 - back) * snap
  }
  const span = Math.max(0.01, SPEAR_TOTAL - SPEAR_WIND - SPEAR_ACTIVE)
  const k = Math.min(1, (elapsed - SPEAR_WIND - SPEAR_ACTIVE) / span)
  return 1 + (rest - 1) * k * k
}

/** Body slides back on the wind-up and forward with the lunge, in world pixels. */
export function spearBodyShift(elapsed: number, thrusting: boolean): number {
  if (!thrusting || elapsed <= 0) return 0
  if (elapsed < SPEAR_WIND) return -4 * (elapsed / SPEAR_WIND)
  if (elapsed < SPEAR_WIND + SPEAR_ACTIVE) {
    const k = (elapsed - SPEAR_WIND) / SPEAR_ACTIVE
    const snap = 1 - (1 - k) ** 3
    return -4 + 12 * snap
  }
  const span = Math.max(0.01, SPEAR_TOTAL - SPEAR_WIND - SPEAR_ACTIVE)
  const k = Math.min(1, (elapsed - SPEAR_WIND - SPEAR_ACTIVE) / span)
  return 8 * (1 - k)
}

/** Crit is about 30%. The salt is the caller's choice so tests can force either result. */
export function critLands(spear: Spear, salt: number): boolean {
  if (!spear.perks.includes('crit')) return false
  return Math.abs(Math.floor(salt)) % 100 < 30
}

export function spearLabel(spear: Spear): string {
  const perks = spear.perks.map((perk) => PERK_LABEL[perk]).join(', ')
  return t('spear.label', { rarity: RARITY_LABEL[spear.rarity], perks })
}

function next(state: { n: number }): number {
  state.n = (Math.imul(state.n, 1103515245) + 12345) % 2147483647
  if (state.n < 0) state.n += 2147483647
  return state.n
}

/** Same seed always rolls the same spear. Different seeds spread rarity and perks. */
export function rollSpear(seed: number): Spear {
  const state = { n: Math.abs(Math.floor(seed)) || 1 }
  const roll = next(state) % 100
  const rarity: SpearRarity = roll < 55 ? 'langka' : roll < 85 ? 'pusaka' : 'legenda'
  const want = rarity === 'langka' ? 1 : rarity === 'pusaka' ? 2 : 3
  const perks: SpearPerk[] = []
  let guard = 0
  while (perks.length < want && guard < 20) {
    const perk = PERKS[next(state) % PERKS.length]!
    if (!perks.includes(perk)) perks.push(perk)
    guard += 1
  }
  const id = `tombak-${Math.abs(Math.floor(seed)) || 1}-${next(state) % 100000}`
  return { id, rarity, perks, coins: coinsFor(rarity, next(state)), origin: 'loot' }
}

export function spearValue(spear: Spear): number {
  if (spear.rarity === 'legenda') return 36
  if (spear.rarity === 'pusaka') return 24
  return 16
}

export function asSpear(value: unknown): Spear | null {
  if (typeof value !== 'object' || value === null) return null
  const raw = value as { id?: unknown; rarity?: unknown; perks?: unknown; coins?: unknown; origin?: unknown }
  if (typeof raw.id !== 'string' || !raw.id) return null
  if (!RARITIES.includes(raw.rarity as SpearRarity)) return null
  const perks: SpearPerk[] = []
  if (Array.isArray(raw.perks)) {
    for (const perk of raw.perks) {
      if (PERKS.includes(perk as SpearPerk) && !perks.includes(perk as SpearPerk)) perks.push(perk as SpearPerk)
    }
  }
  if (perks.length === 0) perks.push('reach')
  const rarity = raw.rarity as SpearRarity
  const coins = typeof raw.coins === 'number' && Number.isFinite(raw.coins) ? Math.max(0, Math.floor(raw.coins)) : coinsFor(rarity, hashText(raw.id))
  const origin: ItemOrigin = raw.origin === 'stash' ? 'stash' : 'loot'
  return { id: raw.id, rarity, perks, coins, origin }
}
