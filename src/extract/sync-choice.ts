/** Never replace a dirty local save. The player chooses when both sides moved. */

export interface SyncLocal {
  dirty: boolean
  revision: number | null
  progress: boolean
}

export interface SyncRemote {
  revision: number
}

export type SyncChoice = 'upload' | 'download' | 'ask' | 'noop'

export function decideSync(local: SyncLocal, remote: SyncRemote | null): SyncChoice {
  if (!remote) return local.progress || local.dirty ? 'upload' : 'noop'
  if (local.revision == null) return local.progress ? 'ask' : 'download'
  if (local.revision === remote.revision) return local.dirty ? 'upload' : 'noop'
  if (local.dirty) return 'ask'
  return 'download'
}

export function hasLocalProgress(save: { ventures: number; coins: number; depth: number; swordLevel: number; bagSlots: number }): boolean {
  return save.ventures > 0 || save.coins > 0 || save.depth > 1 || save.swordLevel > 1 || save.bagSlots > 12
}
