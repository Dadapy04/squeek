export const RPG_SAVE_KEY = 'npcs-burrow-rpg.save.v1'
export const EXTRACTION_SAVE_KEY = 'npcs-burrow-extraction.save.v1'

export interface RpgSave {
  fang: boolean
  edge: boolean
  chestTaken: boolean
  checkpoint: 'shrine' | 'gate'
  bossDefeated: boolean
}

export function emptySave(): RpgSave {
  return { fang: false, edge: false, chestTaken: false, checkpoint: 'shrine', bossDefeated: false }
}

export function loadRpg(storage: Storage | null): RpgSave {
  if (!storage) return emptySave()
  try {
    const raw = storage.getItem(RPG_SAVE_KEY)
    if (!raw) return emptySave()
    return sanitize(JSON.parse(raw) as unknown)
  } catch {
    return emptySave()
  }
}

export function writeRpg(storage: Storage | null, save: RpgSave): boolean {
  if (!storage) return false
  try {
    storage.setItem(RPG_SAVE_KEY, JSON.stringify(sanitize(save)))
    return true
  } catch {
    return false
  }
}

export function sanitize(value: unknown): RpgSave {
  const save = emptySave()
  if (typeof value !== 'object' || value === null) return save
  const row = value as Partial<RpgSave>
  save.fang = row.fang === true
  save.edge = row.edge === true
  save.chestTaken = row.chestTaken === true
  save.checkpoint = row.checkpoint === 'gate' ? 'gate' : 'shrine'
  save.bossDefeated = row.bossDefeated === true
  return save
}
