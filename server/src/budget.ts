import { DEPTHS } from '../../src/extract/depths.ts'
import { generateFloor } from '../../src/extract/dungeon.ts'

/** Depth-1 roster ids. Kept here so the worker does not import the whole sim. */
const CLASSIC_FOES = ['crab-a', 'crab-b', 'crab-d', 'brute-a', 'crab-c', 'spit-a', 'spit-b', 'lurker-a', 'boss-induk']

export interface RunBudget {
  /** New loot rows a bag can physically hold. */
  maxLoot: number
  /** Spawned foes, doubled so a split jelly does not look forged. */
  maxKills: number
  foeIds: Set<string>
  sourceIds: Set<string>
}

/**
 * What this seed can contain. Coin rolls that depend on where a drop landed
 * are not reproduced here; the count and the ids are.
 */
export function runBudget(seed: number, depth: number): RunBudget {
  const level = Math.max(1, Math.min(7, Math.floor(depth) || 1))
  const foeIds = new Set<string>()
  const sourceIds = new Set<string>()
  let kills = 0
  for (let floor = 1; floor <= level; floor += 1) {
    const chart = generateFloor(floor, seed)
    for (const vein of chart.veins) sourceIds.add(vein.id)
    for (const prop of chart.props) sourceIds.add(prop.id)
    const plan = DEPTHS[floor - 1]
    for (const foe of plan?.foes ?? []) foeIds.add(foe.id)
    if (plan?.boss) foeIds.add(plan.boss.id)
    kills += (plan?.foes.length ?? 0) + (plan?.boss ? 1 : 0)
    if (floor === 1) {
      for (const id of CLASSIC_FOES) foeIds.add(id)
      kills += CLASSIC_FOES.length
    }
  }
  return { maxLoot: 20, maxKills: Math.max(kills, 1) * 2, foeIds, sourceIds }
}
