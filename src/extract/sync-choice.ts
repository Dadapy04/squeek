/** Never replace a dirty local save. The player chooses when both sides moved. */

export interface SyncLocal {
  dirty: boolean
  revision: number | null
  progress: boolean
  /** A conflict is already on screen. Do not upload over it. */
  hold?: boolean
}

export interface SyncRemote {
  revision: number
}

export type SyncChoice = 'upload' | 'download' | 'ask' | 'noop'

export function decideSync(local: SyncLocal, remote: SyncRemote | null): SyncChoice {
  if (local.hold && remote) return 'ask'
  if (!remote) return local.progress || local.dirty ? 'upload' : 'noop'
  if (local.revision == null) return local.progress ? 'ask' : 'download'
  if (local.revision === remote.revision) return local.dirty ? 'upload' : 'noop'
  if (local.dirty) return 'ask'
  return 'download'
}

export function hasLocalProgress(save: { ventures: number; coins: number; depth: number; swordLevel: number; bagSlots: number }): boolean {
  return save.ventures > 0 || save.coins > 0 || save.depth > 1 || save.swordLevel > 1 || save.bagSlots > 12
}

export interface ProgressSide {
  coins: number
  stash: number
  depth: number
  ventures: number
  updatedAt: number
}

/** Higher means more kept progress. Depth first, then ventures, then stash value, then loose coins. */
export function progressScore(side: ProgressSide): number {
  return side.depth * 1_000_000 + side.ventures * 10_000 + side.stash + side.coins
}

export function recommendSide(local: ProgressSide, remote: ProgressSide): 'local' | 'cloud' {
  const gap = progressScore(local) - progressScore(remote)
  if (gap === 0) return local.updatedAt >= remote.updatedAt ? 'local' : 'cloud'
  return gap > 0 ? 'local' : 'cloud'
}
