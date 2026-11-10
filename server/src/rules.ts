import { coinFits } from '../../shared/account.ts'

/** Plausibility bounds. Generous enough for a real clear, tight enough to drop invented totals. */

export const DEPTH_CAP = 7
export const MAX_RUN_MS = 6 * 60 * 60 * 1000
/** Wall-clock floor. Depth 1 is a walk to the circle plus the 3s channel, so 8s rejected real clears. */
export const MIN_SECONDS = [0, 3, 10, 18, 28, 40, 55, 75]
const HARD_CAP = [0, 800, 1200, 1600, 2000, 2600, 3200, 4000]
const MAX_LOOT = 48

export interface RunEvent {
  kind: string
  item?: string
  coins?: number
  depth?: number
}

export interface RunClaim {
  depth: number
  value: number
  events: RunEvent[]
  elapsedMs: number
}

export type Verdict =
  | { ok: true; value: number; depth: number; flagged: boolean; reason?: string }
  | { ok: false; reason: string }

export function judgeRun(claim: RunClaim): Verdict {
  const depth = Math.floor(claim.depth)
  if (depth < 1 || depth > DEPTH_CAP) return { ok: false, reason: 'depth' }
  if (!Array.isArray(claim.events) || claim.events.length < 2 || claim.events.length > MAX_LOOT + DEPTH_CAP + 2) {
    return { ok: false, reason: 'log' }
  }
  if (!Number.isFinite(claim.elapsedMs) || claim.elapsedMs < 0 || claim.elapsedMs > MAX_RUN_MS) {
    return { ok: false, reason: 'time' }
  }
  const elapsedSec = claim.elapsedMs / 1000
  if (elapsedSec < (MIN_SECONDS[depth] ?? 9999)) return { ok: false, reason: 'too-fast' }

  let value = 0
  let loot = 0
  let sawExtract = false
  let maxDepth = 0
  for (const event of claim.events) {
    if (!event || typeof event.kind !== 'string') return { ok: false, reason: 'log' }
    if (event.kind === 'loot') {
      const coins = event.coins
      const item = event.item
      if (typeof coins !== 'number' || typeof item !== 'string' || !coinFits(item, coins, depth)) {
        return { ok: false, reason: 'coins' }
      }
      value += coins
      loot += 1
    } else if (event.kind === 'depth') {
      const floor = event.depth
      if (typeof floor !== 'number' || floor < 1 || floor > depth) return { ok: false, reason: 'depth' }
      maxDepth = Math.max(maxDepth, floor)
    } else if (event.kind === 'extract') {
      if (event.depth !== depth) return { ok: false, reason: 'depth' }
      sawExtract = true
    } else {
      return { ok: false, reason: 'log' }
    }
  }
  if (!sawExtract || maxDepth !== depth) return { ok: false, reason: 'depth' }
  if (loot > MAX_LOOT) return { ok: false, reason: 'log' }
  if (!Number.isInteger(claim.value) || claim.value !== value) return { ok: false, reason: 'total' }
  const cap = HARD_CAP[depth] ?? 0
  if (value > cap) return { ok: false, reason: 'cap' }
  const flagged = value > Math.floor(cap * 0.85)
  return flagged
    ? { ok: true, value, depth, flagged: true, reason: 'suspicious' }
    : { ok: true, value, depth, flagged: false }
}

export function weekKey(now: number): string {
  const date = new Date(now)
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = utc.getUTCDay() || 7
  utc.setUTCDate(utc.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}
