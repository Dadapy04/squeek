import { shieldMaxFor, swordBonusPct, swordDamage, upgradeCost, upgradeOre } from './economy.ts'
import { t } from './i18n.ts'
import { addUnits, count, spendStack, type ExtractSave } from './sim.ts'

export const MEND_SCRAP = 1
export const FORGE_SCRAP = 3
export const FORGE_ORE = 1

export type WorkshopAction = 'mend' | 'fill' | 'forge'

export interface WorkshopOffer {
  action: WorkshopAction
  label: string
  scrap: number
  ore: number
  enabled: boolean
  reason: string
}

export interface UpgradeCard {
  which: 'sword' | 'shield'
  title: string
  now: string
  next: string
  cost: number | null
  ore: number
  enabled: boolean
  reason: string
}

export interface WorkshopView {
  duringRun: boolean
  shield: number | null
  cap: number
  state: string
  scrap: number
  ore: number
  coins: number
  offers: WorkshopOffer[]
  upgrades: UpgradeCard[]
}

export type WorkshopResult = { ok: true; shield: number; note: string } | { ok: false; reason: string }

function held(save: ExtractSave, cap = shieldMaxFor(save.shieldLevel || 1)): number | null {
  const n = save.shield
  if (n == null || n <= 0) return null
  return Math.min(cap, Math.floor(n))
}

function spend(list: Parameters<typeof spendStack>[0], kind: Parameters<typeof spendStack>[1], n: number) {
  return spendStack(list, kind, n)
}

function offer(action: WorkshopAction, label: string, scrap: number, ore: number, reason: string): WorkshopOffer {
  return { action, label, scrap, ore, enabled: reason === '', reason }
}

function capOf(save: ExtractSave): number {
  return shieldMaxFor(save.shieldLevel || 1)
}

export function workshopView(save: ExtractSave): WorkshopView {
  const shield = held(save, capOf(save))
  const cap = capOf(save)
  const scrap = count(save.stash, 'scrap')
  const ore = count(save.stash, 'ore')
  const duringRun = save.run != null
  const gap = shield == null ? cap : Math.max(0, cap - shield)
  const run = duringRun ? t('shop.running') : ''

  let mendReason = run
  if (!mendReason && shield == null) mendReason = t('shop.noShield')
  else if (!mendReason && shield != null && shield >= cap) mendReason = t('shop.full', { n: cap, cap })
  else if (!mendReason && scrap < MEND_SCRAP) mendReason = t('shop.needScrap')

  let fillReason = run
  if (!fillReason && shield == null) fillReason = t('shop.noShield')
  else if (!fillReason && gap <= 0) fillReason = t('shop.full', { n: cap, cap })
  else if (!fillReason && scrap < gap) fillReason = t('shop.needScrap')

  let forgeReason = run
  if (!forgeReason && shield != null) forgeReason = t('shop.haveShield')
  else if (!forgeReason && scrap < FORGE_SCRAP && ore < FORGE_ORE) forgeReason = t('shop.needBoth')
  else if (!forgeReason && scrap < FORGE_SCRAP) forgeReason = t('shop.needScrap')
  else if (!forgeReason && ore < FORGE_ORE) forgeReason = t('shop.needOre')

  return {
    duringRun,
    shield,
    state: shield == null ? t('shop.broken') : t('shop.state', { n: shield, cap }),
    scrap,
    ore,
    coins: save.coins,
    cap,
    offers: [
      offer('mend', t('shop.mend'), MEND_SCRAP, 0, mendReason),
      offer('fill', t('shop.fill', { n: gap }), gap, 0, fillReason),
      offer('forge', t('shop.forge'), FORGE_SCRAP, FORGE_ORE, forgeReason),
    ],
    upgrades: [swordCard(save, run), shieldCard(save, run, cap)],
  }
}

function swordCard(save: ExtractSave, run: string): UpgradeCard {
  const level = save.swordLevel || 1
  const cost = upgradeCost(level)
  const now = t('shop.swordNow', { lv: level, dmg: swordDamage(level), pct: swordBonusPct(level) })
  if (cost == null) return { which: 'sword', title: t('shop.upSword'), now, next: t('shop.maxLv'), cost: null, ore: 0, enabled: false, reason: t('shop.maxReason') }
  const nextLv = level + 1
  const ore = upgradeOre(level)
  const reason = run || (ore > 0 && count(save.stash, 'ore') < ore ? t('shop.oreUp', { n: ore }) : save.coins < cost ? t('shop.poor') : '')
  return {
    which: 'sword',
    title: t('shop.upSword'),
    now,
    next: t('shop.swordNow', { lv: nextLv, dmg: swordDamage(nextLv), pct: swordBonusPct(nextLv) }),
    cost,
    ore,
    enabled: reason === '',
    reason,
  }
}

function shieldCard(save: ExtractSave, run: string, cap: number): UpgradeCard {
  const level = save.shieldLevel || 1
  const cost = upgradeCost(level)
  const now = t('shop.shieldNow', { lv: level, cap })
  if (cost == null) return { which: 'shield', title: t('shop.upShield'), now, next: t('shop.maxLv'), cost: null, ore: 0, enabled: false, reason: t('shop.maxReason') }
  const nextLv = level + 1
  const ore = upgradeOre(level)
  const reason = run || (ore > 0 && count(save.stash, 'ore') < ore ? t('shop.oreUp', { n: ore }) : save.coins < cost ? t('shop.poor') : '')
  return {
    which: 'shield',
    title: t('shop.upShield'),
    now,
    next: t('shop.shieldNext', { lv: nextLv, cap: shieldMaxFor(nextLv) }),
    cost,
    ore,
    enabled: reason === '',
    reason,
  }
}

export function workshopAsk(save: ExtractSave, action: WorkshopAction): string {
  const chosen = workshopView(save).offers.find((item) => item.action === action)!
  if (!chosen.enabled) return chosen.reason
  if (action === 'mend') return t('shop.askMend')
  if (action === 'fill') return t('shop.askFill', { n: chosen.scrap })
  return t('shop.askForge')
}

export function applyWorkshop(save: ExtractSave, action: WorkshopAction): WorkshopResult {
  const view = workshopView(save)
  const chosen = view.offers.find((item) => item.action === action)!
  if (!chosen.enabled) return { ok: false, reason: chosen.reason }
  const before = held(save)
  if (action === 'forge') {
    const scrap = spend(save.stash, 'scrap', FORGE_SCRAP)
    if (!scrap) return { ok: false, reason: t('shop.needScrap') }
    const ore = spend(save.stash, 'ore', FORGE_ORE)
    if (!ore) {
      addUnits(save.stash, 'scrap', scrap)
      return { ok: false, reason: t('shop.needOre') }
    }
    save.shield = view.cap
    return { ok: true, shield: view.cap, note: t('shop.noteForge', { n: view.cap, cap: view.cap }) }
  }
  if (before == null) return { ok: false, reason: t('shop.noShield') }
  const cost = action === 'mend' ? MEND_SCRAP : view.cap - before
  if (!spend(save.stash, 'scrap', cost)) return { ok: false, reason: t('shop.needScrap') }
  const next = action === 'mend' ? Math.min(view.cap, before + 1) : view.cap
  save.shield = next
  const note = cost === 1 ? t('shop.noteMend1', { n: next, cap: view.cap }) : t('shop.noteMendN', { n: next, cap: view.cap, cost })
  return { ok: true, shield: next, note }
}
