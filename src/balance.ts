import type { Cost, ItemKind, UpgradeId } from './types.ts'

export const PLAYER_SPEED = 156
export const PLAYER_RADIUS = 12
export const HP_BASE = 150
export const VITALITY_HP = 30
export const BAG_BASE = 5
export const BAG_PER_RANK = 2
export const ATTACK_BASE = 12
export const ATTACK_PER_RANK = 4
export const HEAVY_CHARGE = 0.34
export const COMBO_WINDOW = 0.58
export const HEAL_AMOUNT = 36
export const TONIC_AMOUNT = 45
export const BOOST_MULT = 1.7
export const BOOST_TIME = 6
export const BOOST_COST = 24
export const SHIELD_TIME = 4
export const SHIELD_COST = 24
export const BONUS_MAX = 80
export const STAMINA_MAX = 100
export const STAMINA_REGEN = 24
export const DODGE_COST = 28
export const DODGE_TIME = 0.18
export const DODGE_COOLDOWN = 1.25
export const DODGE_SPEED = 460
export const EXTRACT_TIME = 2.2
export const STEP_CAP = 0.05

export const ITEM_NAME: Record<ItemKind, string> = {
  scrap: 'skrap',
  ore: 'bijih',
  gear: 'gigi',
  bandage: 'perban',
  tonic: 'tonik',
  core: 'inti',
  relic: 'relik',
}

export const ITEM_USE: Record<ItemKind, string> = {
  scrap: 'bahan bengkel',
  ore: 'bahan bengkel',
  gear: 'bahan bengkel',
  bandage: 'pulihkan nyawa',
  tonic: 'pulihkan napas',
  core: 'bahan langka',
  relic: 'bahan langka',
}

const c = (scrap: number, ore: number, gear: number, core: number, relic: number): Cost => ({ scrap, ore, gear, core, relic })

export const SHOP: Record<UpgradeId, Cost[]> = {
  damage: [c(2, 1, 0, 0, 0), c(1, 2, 1, 0, 0), c(0, 0, 1, 1, 1)],
  bag: [c(2, 2, 0, 0, 0), c(0, 1, 1, 0, 0)],
  vitality: [c(1, 1, 1, 0, 0), c(0, 2, 1, 1, 0)],
}

export const UPGRADE_NAME: Record<UpgradeId, string> = {
  damage: 'Daya',
  bag: 'Tas',
  vitality: 'Badan',
}
