export const ARENA_SAVE_KEY = 'npcs-battle-arena.save.v1'
export const LIVE_SAVE_KEY = 'npcs-battle-arena.live.v1'
export const MODE_SAVE_KEY = 'npcs-battle-arena.mode.v1'
export const VIEW_SAVE_KEY = 'npcs-battle-arena.view.v1'
export const PIXEL_VIEW_KEY = 'npcs-battle-arena.view.v2'
export const RPG_SAVE_KEY = 'npcs-burrow-rpg.save.v1'
export const EXTRACTION_SAVE_KEY = 'npcs-burrow-extraction.save.v1'

export interface ArenaSave {
  bestWave: number
}

export function emptyArenaSave(): ArenaSave {
  return { bestWave: 0 }
}

export function loadArena(storage: Storage | null): ArenaSave {
  if (!storage) return emptyArenaSave()
  try {
    const raw = storage.getItem(ARENA_SAVE_KEY)
    if (!raw) return emptyArenaSave()
    const parsed = JSON.parse(raw) as { bestWave?: unknown }
    const best = typeof parsed.bestWave === 'number' && Number.isFinite(parsed.bestWave) ? Math.max(0, Math.min(10, Math.floor(parsed.bestWave))) : 0
    return { bestWave: best }
  } catch {
    return emptyArenaSave()
  }
}

export function writeArena(storage: Storage | null, save: ArenaSave): boolean {
  if (!storage) return false
  try {
    storage.setItem(ARENA_SAVE_KEY, JSON.stringify({ bestWave: Math.max(0, Math.min(10, Math.floor(save.bestWave))) }))
    return true
  } catch {
    return false
  }
}

export function loadLiveBest(storage: Storage | null): number {
  return loadArenaKey(storage, LIVE_SAVE_KEY)
}

export function writeLiveBest(storage: Storage | null, bestWave: number): boolean {
  if (!storage) return false
  try {
    storage.setItem(LIVE_SAVE_KEY, JSON.stringify({ bestWave: Math.max(0, Math.min(10, Math.floor(bestWave))) }))
    return true
  } catch {
    return false
  }
}

export function loadBonusMode(storage: Storage | null): 'storm' | 'shield' {
  if (!storage) return 'storm'
  return storage.getItem(MODE_SAVE_KEY) === 'shield' ? 'shield' : 'storm'
}

export function writeBonusMode(storage: Storage | null, mode: 'storm' | 'shield'): void {
  if (!storage) return
  try { storage.setItem(MODE_SAVE_KEY, mode) } catch { /* ignore */ }
}

function loadArenaKey(storage: Storage | null, key: string): number {
  if (!storage) return 0
  try {
    const raw = storage.getItem(key)
    if (!raw) return 0
    const parsed = JSON.parse(raw) as { bestWave?: unknown }
    return typeof parsed.bestWave === 'number' && Number.isFinite(parsed.bestWave) ? Math.max(0, Math.min(10, Math.floor(parsed.bestWave))) : 0
  } catch {
    return 0
  }
}
