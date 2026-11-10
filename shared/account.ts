/**
 * Wallet-profile mutations. Same prices as the client shop.
 * Guest play does not use this module.
 */
import { mintUnit, type ItemUnit } from '../src/extract/coins.ts'
import { coinFits } from './loot-law.ts'
import {
  FIELD_BANDAGE_CAP,
  FIELD_PRICE,
  MERCHANT,
  bagSlotsOf,
  isRichOre,
  nextBagUpgrade,
  shieldMaxFor,
  upgradeCost,
  upgradeOre,
  type MerchantKind,
} from '../src/extract/economy.ts'

export const STASH_CAP = 20
export const SHIELD_START = 4
export const MEND_SCRAP = 1
export const FORGE_SCRAP = 3
export const FORGE_ORE = 1

export type Kind = 'sword' | 'bandage' | 'tonic' | 'scrap' | 'ore' | 'relic' | 'shard' | 'tombak' | 'bilah' | 'p3k'

export interface Stack {
  kind: Kind
  n: number
  units?: ItemUnit[]
}

export interface SpearRow {
  id: string
  rarity: 'langka' | 'pusaka' | 'legenda'
  perks: string[]
  coins?: number
  origin?: 'stash' | 'loot'
}

export interface BladeRow {
  id: string
  name: string
  damage: number
  rarity: 'pusaka' | 'legenda'
  coins: number
  origin: 'stash' | 'loot'
  depth: number
}

export interface Insured {
  kind: Kind
  unit?: ItemUnit
  spear?: SpearRow
  blade?: BladeRow
}

export interface ActiveRun {
  id: string
  sword: boolean
  shield: number | null
  bag: Stack[]
  spear: SpearRow | null
  blade: BladeRow | null
  insured: Insured | null
  /** Bandages bought from floor stalls this delve. */
  fieldBuys?: number
}

export interface Account {
  coins: number
  stash: Stack[]
  spears: SpearRow[]
  blades: BladeRow[]
  spear: SpearRow | null
  blade: BladeRow | null
  swordLevel: number
  shieldLevel: number
  bagSlots: number
  depth: number
  shield: number | null
  ventures: number
  support: number
  insured: Insured | null
  tutorialSeen: string[]
  tutorialSkip: boolean
  hpScaled: boolean
  shieldGranted: boolean
  chosenDepth: number
  activeRun: ActiveRun | null
}

export type Fail = { ok: false; reason: string }
export type Ok<T> = { ok: true } & T

export { coinFits }

export function rarityFor(coins: number): ItemUnit['rarity'] {
  if (coins >= 60) return 'legenda'
  if (coins >= 36) return 'pusaka'
  if (coins >= 18) return 'langka'
  return 'biasa'
}

function refundSword(account: Account): void {
  const stack = account.stash.find((item) => item.kind === 'sword')
  if (stack) stack.n += 1
  else account.stash.push({ kind: 'sword', n: 1 })
}

/** One weapon on a delve. A found spear is loot, never the carried weapon. */
export function settleOneWeapon(account: Account): boolean {
  let changed = false
  if (account.spear && account.blade) {
    account.blades.push(account.blade)
    account.blade = null
    changed = true
  }
  const run = account.activeRun
  if (!run) return changed
  if (run.spear && run.spear.origin === 'loot') {
    account.spears.push({ ...run.spear, origin: 'stash' })
    run.spear = null
    changed = true
  }
  if (run.spear && run.blade) {
    account.blades.push({ ...run.blade, origin: 'stash' })
    run.blade = null
    changed = true
  }
  if ((run.spear || run.blade) && run.sword) {
    run.sword = false
    refundSword(account)
    changed = true
  }
  return changed
}

export function freshAccount(): Account {
  return {
    coins: 0,
    stash: [
      { kind: 'sword', n: 1 },
      { kind: 'bandage', n: 2, units: [mintUnit('bandage', 11, 'stash'), mintUnit('bandage', 29, 'stash')] },
    ],
    spears: [],
    blades: [],
    spear: null,
    blade: null,
    swordLevel: 1,
    shieldLevel: 1,
    bagSlots: 12,
    depth: 1,
    shield: SHIELD_START,
    ventures: 0,
    support: 0,
    insured: null,
    tutorialSeen: [],
    tutorialSkip: false,
    hpScaled: true,
    shieldGranted: true,
    chosenDepth: 1,
    activeRun: null,
  }
}

function count(list: Stack[], kind: Kind): number {
  return list.filter((stack) => stack.kind === kind).reduce((sum, stack) => sum + stack.n, 0)
}

function stashUsed(account: Account): number {
  let n = 0
  for (const stack of account.stash) if (stack.kind !== 'sword') n += stack.n
  n += account.spears.length
  n += account.blades.length
  return n
}

function addUnits(list: Stack[], kind: Kind, units: ItemUnit[]): void {
  if (kind === 'sword' || units.length === 0) return
  const found = list.find((stack) => stack.kind === kind)
  if (found) {
    found.units = [...(found.units ?? []), ...units]
    found.n = found.units.length
    return
  }
  list.push({ kind, n: units.length, units: [...units] })
}

function spend(list: Stack[], kind: Kind, n: number): ItemUnit[] | null {
  if (n <= 0) return []
  const found = list.find((stack) => stack.kind === kind)
  if (!found || found.n < n) return null
  const taken = kind === 'sword' ? [] : (found.units ?? []).slice(0, n)
  if (kind === 'sword') {
    found.n -= n
  } else {
    found.units = (found.units ?? []).slice(n)
    found.n = found.units.length
  }
  if (found.n <= 0) list.splice(list.indexOf(found), 1)
  return taken
}

function takeRichOre(account: Account): boolean {
  for (const stack of account.stash) {
    if (stack.kind !== 'ore' || !stack.units) continue
    const index = stack.units.findIndex((unit) => isRichOre(unit))
    if (index < 0) continue
    stack.units.splice(index, 1)
    stack.n = stack.units.length
    if (stack.n <= 0) account.stash.splice(account.stash.indexOf(stack), 1)
    return true
  }
  return false
}

export function buyMerchant(account: Account, kind: string): Ok<{ coins: number }> | Fail {
  if (account.activeRun) return { ok: false, reason: 'run-live' }
  if (kind !== 'bandage' && kind !== 'p3k') return { ok: false, reason: 'kind' }
  const offer = MERCHANT[kind as MerchantKind]
  if (account.coins < offer.buy) return { ok: false, reason: 'poor' }
  if (stashUsed(account) >= STASH_CAP) return { ok: false, reason: 'stash-full' }
  account.coins -= offer.buy
  addUnits(account.stash, kind, [{ coins: offer.coins, rarity: offer.rarity, origin: 'stash' }])
  return { ok: true, coins: account.coins }
}

export function fieldBuy(account: Account, kind: string): Ok<{ coins: number }> | Fail {
  const run = account.activeRun
  if (!run) return { ok: false, reason: 'no-run' }
  if (kind !== 'bandage') return { ok: false, reason: 'kind' }
  const bought = run.fieldBuys ?? 0
  if (bought >= FIELD_BANDAGE_CAP) return { ok: false, reason: 'spent' }
  const price = FIELD_PRICE.bandage
  if (account.coins < price) return { ok: false, reason: 'poor' }
  account.coins -= price
  run.fieldBuys = bought + 1
  return { ok: true, coins: account.coins }
}

export function sellUnit(account: Account, kind: string, coins?: number, spearId?: string): Ok<{ gained: number }> | Fail {
  if (account.activeRun) return { ok: false, reason: 'run-live' }
  if (kind === 'sword') return { ok: false, reason: 'kind' }
  if (spearId) {
    const spear = account.spears.find((item) => item.id === spearId)
    if (!spear) return { ok: false, reason: 'missing' }
    account.spears = account.spears.filter((item) => item.id !== spearId)
    const gained = spear.coins ?? 0
    account.coins += gained
    return { ok: true, gained }
  }
  const stack = account.stash.find((item) => item.kind === kind)
  if (!stack?.units?.length) return { ok: false, reason: 'missing' }
  const index = coins == null ? 0 : stack.units.findIndex((unit) => unit.coins === coins)
  if (index < 0) return { ok: false, reason: 'missing' }
  const [unit] = stack.units.splice(index, 1)
  stack.n = stack.units.length
  if (stack.n <= 0) account.stash.splice(account.stash.indexOf(stack), 1)
  const gained = unit?.coins ?? 0
  account.coins += gained
  return { ok: true, gained }
}

export function sellCommon(account: Account): Ok<{ gained: number }> | Fail {
  if (account.activeRun) return { ok: false, reason: 'run-live' }
  let gained = 0
  for (const stack of [...account.stash]) {
    if (stack.kind === 'sword' || !stack.units) continue
    const keep = stack.units.filter((unit) => unit.rarity !== 'biasa')
    const sold = stack.units.filter((unit) => unit.rarity === 'biasa')
    if (sold.length === 0) continue
    gained += sold.reduce((sum, unit) => sum + unit.coins, 0)
    stack.units = keep
    stack.n = keep.length
    if (stack.n <= 0) account.stash.splice(account.stash.indexOf(stack), 1)
  }
  account.coins += gained
  return { ok: true, gained }
}

export function upgradeWeapon(account: Account, which: string): Ok<{ level: number }> | Fail {
  if (account.activeRun) return { ok: false, reason: 'run-live' }
  if (which !== 'sword' && which !== 'shield') return { ok: false, reason: 'kind' }
  const level = which === 'sword' ? account.swordLevel : account.shieldLevel
  const cost = upgradeCost(level)
  if (cost == null) return { ok: false, reason: 'top' }
  const oreNeed = upgradeOre(level)
  if (account.coins < cost) return { ok: false, reason: 'poor' }
  if (oreNeed > 0 && count(account.stash, 'ore') < oreNeed) return { ok: false, reason: 'ore' }
  if (oreNeed > 0 && !spend(account.stash, 'ore', oreNeed)) return { ok: false, reason: 'ore' }
  account.coins -= cost
  const next = level + 1
  if (which === 'sword') account.swordLevel = next
  else account.shieldLevel = next
  return { ok: true, level: next }
}

export function upgradeBag(account: Account): Ok<{ slots: number }> | Fail {
  if (account.activeRun) return { ok: false, reason: 'run-live' }
  const next = nextBagUpgrade(account.bagSlots)
  if (!next) return { ok: false, reason: 'cap' }
  if (account.coins < next.cost) return { ok: false, reason: 'poor' }
  if (next.ore > 0 && !account.stash.some((stack) => stack.kind === 'ore' && (stack.units ?? []).some((unit) => isRichOre(unit)))) {
    return { ok: false, reason: 'ore' }
  }
  if (next.ore > 0 && !takeRichOre(account)) return { ok: false, reason: 'ore' }
  account.coins -= next.cost
  account.bagSlots = next.slots
  return { ok: true, slots: next.slots }
}

export function mendShield(account: Account, mode: string): Ok<{ shield: number }> | Fail {
  if (account.activeRun) return { ok: false, reason: 'run-live' }
  const cap = shieldMaxFor(account.shieldLevel)
  if (mode === 'forge') {
    if (account.shield != null) return { ok: false, reason: 'have-shield' }
    if (count(account.stash, 'scrap') < FORGE_SCRAP) return { ok: false, reason: 'scrap' }
    if (count(account.stash, 'ore') < FORGE_ORE) return { ok: false, reason: 'ore' }
    if (!spend(account.stash, 'scrap', FORGE_SCRAP) || !spend(account.stash, 'ore', FORGE_ORE)) return { ok: false, reason: 'scrap' }
    account.shield = cap
    return { ok: true, shield: cap }
  }
  if (account.shield == null) return { ok: false, reason: 'no-shield' }
  if (account.shield >= cap) return { ok: false, reason: 'full' }
  const cost = mode === 'fill' ? cap - account.shield : MEND_SCRAP
  if (mode !== 'mend' && mode !== 'fill') return { ok: false, reason: 'kind' }
  if (count(account.stash, 'scrap') < cost) return { ok: false, reason: 'scrap' }
  if (!spend(account.stash, 'scrap', cost)) return { ok: false, reason: 'scrap' }
  account.shield = mode === 'mend' ? Math.min(cap, account.shield + 1) : cap
  return { ok: true, shield: account.shield }
}

export interface Pick {
  kind: Kind
  n: number
}

export function startRun(account: Account, picks: Pick[], bringShield: boolean, runId: string): Ok<{ carried: ActiveRun }> | Fail {
  if (account.activeRun) return { ok: false, reason: 'run-live' }
  const sword = picks.find((pick) => pick.kind === 'sword')?.n ?? 0
  if (sword > 1) return { ok: false, reason: 'sword' }
  settleOneWeapon(account)
  if ((account.spear || account.blade) && sword > 0) return { ok: false, reason: 'spear-on' }
  if (bringShield && (account.shield == null || account.shield <= 0)) return { ok: false, reason: 'no-shield' }
  const carriedSlots = picks.filter((pick) => pick.kind !== 'sword').reduce((sum, pick) => sum + pick.n, 0)
  if (carriedSlots + (account.insured ? 1 : 0) > bagSlotsOf(account.bagSlots)) return { ok: false, reason: 'bag' }
  for (const pick of picks) {
    if (pick.n <= 0 || count(account.stash, pick.kind) < pick.n) return { ok: false, reason: 'short' }
  }
  const bag: Stack[] = []
  for (const pick of picks) {
    if (pick.kind === 'sword') {
      spend(account.stash, 'sword', pick.n)
      continue
    }
    const units = spend(account.stash, pick.kind, pick.n)
    if (!units) return { ok: false, reason: 'short' }
    bag.push({ kind: pick.kind, n: units.length, units })
  }
  const carried: ActiveRun = {
    id: runId,
    sword: sword === 1,
    shield: bringShield ? account.shield : null,
    bag,
    spear: account.spear,
    blade: account.blade,
    insured: account.insured,
  }
  if (bringShield) account.shield = null
  if (account.spear) {
    account.spear.origin = 'stash'
    account.spear = null
  }
  if (account.blade) {
    account.blade.origin = 'stash'
    account.blade = null
  }
  account.insured = null
  account.ventures += 1
  account.activeRun = carried
  return { ok: true, carried }
}

function homeInsured(account: Account, held: Insured | null): void {
  if (!held) return
  if (held.blade) {
    held.blade.origin = 'stash'
    account.blades.push(held.blade)
  } else if (held.spear) {
    held.spear.origin = 'stash'
    account.spears.push(held.spear)
  } else if (held.unit && held.kind !== 'sword') {
    addUnits(account.stash, held.kind, [{ ...held.unit, origin: 'stash' }])
  }
}

export interface LootRow {
  kind: string
  coins: number
}

export function undoRun(account: Account): void {
  const run = account.activeRun
  if (!run) return
  if (run.sword) {
    const sword = account.stash.find((stack) => stack.kind === 'sword')
    if (sword) sword.n += 1
    else account.stash.push({ kind: 'sword', n: 1 })
  }
  for (const stack of run.bag) {
    const units = (stack.units ?? []).map((unit) => ({ ...unit, origin: 'stash' as const }))
    if (units.length) addUnits(account.stash, stack.kind, units)
  }
  if (run.shield != null && account.shield == null) account.shield = run.shield
  if (run.spear) account.spear = run.spear
  if (run.blade) account.blade = run.blade
  account.insured = run.insured
  account.activeRun = null
}

export function applyExtract(account: Account, loot: LootRow[], depth: number): Ok<{ value: number }> | Fail {
  const run = account.activeRun
  if (!run) return { ok: false, reason: 'no-run' }
  const floor = Math.max(1, Math.min(7, Math.floor(depth) || 1))
  let value = 0
  for (const row of loot) {
    if (!coinFits(row.kind, row.coins, floor)) return { ok: false, reason: 'coins' }
    value += row.coins
    if (row.kind === 'tombak') {
      const rarity = rarityFor(row.coins)
      if (rarity === 'biasa') return { ok: false, reason: 'coins' }
      account.spears.push({ id: `find-${run.id}-${account.spears.length}`, rarity, perks: [], coins: row.coins, origin: 'stash' })
      continue
    }
    if (row.kind === 'bilah') {
      const rarity = rarityFor(row.coins) === 'legenda' ? 'legenda' : 'pusaka'
      account.blades.push({
        id: `blade-${run.id}-${account.blades.length}`,
        name: 'Find',
        damage: rarity === 'legenda' ? 46 : 36,
        rarity,
        coins: row.coins,
        origin: 'stash',
        depth: floor,
      })
      continue
    }
    addUnits(account.stash, row.kind as Kind, [{ coins: row.coins, rarity: rarityFor(row.coins), origin: 'stash' }])
  }
  if (run.sword) {
    const sword = account.stash.find((stack) => stack.kind === 'sword')
    if (sword) sword.n += 1
    else account.stash.push({ kind: 'sword', n: 1 })
  }
  for (const stack of run.bag) addUnits(account.stash, stack.kind, (stack.units ?? []).map((unit) => ({ ...unit, origin: 'stash' as const })))
  if (run.spear) account.spear = { ...run.spear, origin: 'stash' }
  if (run.blade) account.blade = { ...run.blade, origin: 'stash' }
  homeInsured(account, run.insured)
  if (run.shield != null && run.shield > 0 && account.shield == null) account.shield = run.shield
  account.depth = Math.max(account.depth || 1, floor)
  account.chosenDepth = account.depth
  account.activeRun = null
  return { ok: true, value }
}

export function applyDeath(account: Account, depth: number): Ok<{ depth: number }> | Fail {
  const run = account.activeRun
  if (!run) return { ok: false, reason: 'no-run' }
  const floor = Math.max(1, Math.min(7, Math.floor(depth) || 1))
  homeInsured(account, run.insured)
  account.activeRun = null
  account.depth = Math.max(account.depth || 1, floor)
  account.chosenDepth = account.depth
  if (count(account.stash, 'sword') <= 0) account.stash.push({ kind: 'sword', n: 1 })
  if (count(account.stash, 'bandage') === 0) {
    addUnits(account.stash, 'bandage', [mintUnit('bandage', account.ventures * 19 + 3, 'stash')])
  }
  return { ok: true, depth: account.depth }
}

export function skipTutorial(account: Account): void {
  account.tutorialSkip = true
  account.tutorialSeen = []
}

export function replayTutorialAccount(account: Account): void {
  account.tutorialSkip = false
  account.tutorialSeen = []
}

export function seeTip(account: Account, id: string): void {
  if (!id || account.tutorialSeen.includes(id)) return
  account.tutorialSeen.push(id)
}
