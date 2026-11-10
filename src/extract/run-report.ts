import type { Run } from './sim.ts'

export interface RunEvent {
  kind: 'loot' | 'depth' | 'extract'
  coins?: number
  depth?: number
}

export interface RunReport {
  depth: number
  value: number
  events: RunEvent[]
}

function pushLoot(events: RunEvent[], coins: number | undefined, origin: string | undefined): void {
  if (origin != null && origin !== 'loot') return
  const value = Math.floor(coins ?? 0)
  if (value >= 4 && value <= 88) events.push({ kind: 'loot', coins: value })
}

/** The extract log the server re-adds. It only lists loot already on the run. */
export function reportFromRun(run: Run): RunReport {
  const depth = Math.max(1, Math.min(7, Math.floor(run.depth) || 1))
  const events: RunEvent[] = []
  for (let floor = 1; floor <= depth; floor += 1) events.push({ kind: 'depth', depth: floor })
  for (const stack of run.bag) {
    for (const unit of stack.units ?? []) pushLoot(events, unit.coins, unit.origin)
  }
  for (const spear of run.found ?? []) pushLoot(events, spear.coins, spear.origin ?? 'loot')
  for (const blade of run.foundBlades ?? []) pushLoot(events, blade.coins, blade.origin)
  const held = run.insured
  if (held?.unit) pushLoot(events, held.unit.coins, held.unit.origin)
  if (held?.spear) pushLoot(events, held.spear.coins, held.spear.origin ?? 'loot')
  if (held?.blade) pushLoot(events, held.blade.coins, held.blade.origin)
  events.push({ kind: 'extract', depth })
  const value = events.reduce((sum, event) => sum + (event.kind === 'loot' ? event.coins ?? 0 : 0), 0)
  return { depth, value, events }
}
