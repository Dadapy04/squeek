/** First-delve hints. Skippable, remembered, and quiet while a foe is winding up. */

export const TIP_IDS = [
  'move', 'sword', 'dodge', 'block', 'vein', 'take', 'open', 'barrel', 'bagfull', 'map',
  'extract', 'fast', 'stairs', 'death', 'workshop', 'bagslot', 'sell',
] as const

export type TipId = (typeof TIP_IDS)[number]

export interface TutorialFlags {
  seen: string[]
  skip: boolean
}

export interface TutorialWorld {
  inRun: boolean
  calm: boolean
  nearVein: boolean
  nearLoot: boolean
  nearOpen: boolean
  nearBarrel: boolean
  bagFull: boolean
  onExtract: boolean
  fastRoom: boolean
  bossRoom: boolean
  lowHp: boolean
  workshopOpen: boolean
}

const ORDER: TipId[] = [...TIP_IDS]

export function blankTutorial(): TutorialFlags {
  return { seen: [], skip: false }
}

export function normalizeTutorial(seen: unknown, skip: unknown, ventures: number): TutorialFlags {
  const list = Array.isArray(seen) ? seen.filter((item): item is string => typeof item === 'string' && (TIP_IDS as readonly string[]).includes(item)) : []
  if (skip === true) return { seen: list, skip: true }
  if (skip === false) return { seen: list, skip: false }
  return { seen: list, skip: ventures > 0 }
}

export function skipTutorial(flags: TutorialFlags): TutorialFlags {
  return { seen: flags.seen, skip: true }
}

export function replayTutorial(): TutorialFlags {
  return { seen: [], skip: false }
}

export function markSeen(flags: TutorialFlags, id: TipId): TutorialFlags {
  if (flags.seen.includes(id)) return flags
  return { seen: [...flags.seen, id], skip: flags.skip }
}

/** The one hint that should be on screen, or null. */
export function tipToShow(flags: TutorialFlags, world: TutorialWorld): TipId | null {
  if (flags.skip) return null
  if (world.inRun && !world.calm) return null
  for (const id of ORDER) {
    if (flags.seen.includes(id)) continue
    if (world.inRun && (id === 'workshop' || id === 'bagslot' || id === 'sell')) continue
    if (!world.inRun && id !== 'workshop' && id !== 'bagslot' && id !== 'sell') continue
    if (id === 'vein' && !world.nearVein) continue
    if (id === 'take' && !world.nearLoot) continue
    if (id === 'open' && !world.nearOpen) continue
    if (id === 'barrel' && !world.nearBarrel) continue
    if (id === 'bagfull' && !world.bagFull) continue
    if (id === 'extract' && !world.onExtract) continue
    if (id === 'fast' && !world.fastRoom) continue
    if (id === 'stairs' && !world.bossRoom) continue
    if (id === 'death' && !world.lowHp) continue
    if (id === 'bagslot' && !world.workshopOpen) continue
    if (id === 'sell' && !flags.seen.includes('workshop')) continue
    return id
  }
  return null
}

/** Where the arrow should point. */
export function tipAnchor(id: TipId): string {
  if (id === 'move') return 'stick'
  if (id === 'sword' || id === 'vein') return 'attack'
  if (id === 'dodge') return 'dodge'
  if (id === 'block') return 'block'
  if (id === 'take') return 'claim'
  if (id === 'open' || id === 'barrel') return 'open'
  if (id === 'bagfull' || id === 'death') return 'bag'
  if (id === 'map') return 'map'
  if (id === 'workshop' || id === 'bagslot') return 'workshop'
  if (id === 'sell') return 'sell'
  return 'center'
}
