export type ItemKind = 'scrap' | 'ore' | 'gear' | 'bandage' | 'tonic' | 'core' | 'relic'
export type UpgradeId = 'damage' | 'bag' | 'vitality'
export type EnemyKind = 'biter' | 'spitter' | 'guard'
export type Phase = 'explore' | 'extracting' | 'dead' | 'extracted'

export interface Cost {
  scrap: number
  ore: number
  gear: number
  core: number
  relic: number
}

export interface Meta {
  bank: Record<ItemKind, number>
  ranks: Record<UpgradeId, number>
}

export interface Obstacle {
  x: number
  y: number
  w: number
  h: number
}

export interface World {
  w: number
  h: number
  safeY: number
  spawn: { x: number; y: number }
  extract: { x: number; y: number; r: number }
  obstacles: Obstacle[]
  loots: { kind: ItemKind; x: number; y: number; extra?: ItemKind[] }[]
  enemies: { kind: EnemyKind; x: number; y: number; hp: number; touch: number }[]
}
