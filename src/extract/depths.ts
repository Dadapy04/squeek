/** Seven mine depths. Bengkel mastery is not applied here: found swords keep a fixed daya. */

import { coinsFor, type CoinRarity, type ItemOrigin } from './coins.ts'
import { t, type MsgKey } from './i18n.ts'

export const DEPTH_CAP = 7

export type AttackKind = 'slam' | 'bolt' | 'charge' | 'burrow' | 'snare' | 'ring'
export type Breed =
  | 'kelabang' | 'moth' | 'burrow' | 'spore' | 'beetle' | 'jelly' | 'swarm' | 'mole'
  | 'web' | 'ember' | 'leech' | 'bomber' | 'wisp' | 'crusher'
  | 'liang' | 'spora' | 'kumbang' | 'mondok' | 'laba' | 'mulut'

export interface BossPattern {
  kind: AttackKind
  damage: number
}

export interface SwordTier {
  id: string
  name: string
  damage: number
  rarity: 'pusaka' | 'legenda'
  coins: number
}

export interface DepthFoe {
  id: string
  kind: string
  breed: Breed
  name: string
  zone: 'tambang' | 'reruntuhan' | 'sarang'
  x: number
  y: number
  hp: number
  damage: number
}

export interface DepthBoss {
  id: string
  breed: Breed
  name: string
  hp: number
  /** Primary hit, shown in the depth table. */
  damage: number
  patterns: [BossPattern, BossPattern, BossPattern]
}

export interface DepthPlan {
  depth: number
  /** Daya you should swing before stepping in. */
  recommend: number
  sword: SwordTier
  boss: DepthBoss
  foes: DepthFoe[]
}

const slam = (damage: number): BossPattern => ({ kind: 'slam', damage })
const bolt = (damage: number): BossPattern => ({ kind: 'bolt', damage })
const charge = (damage: number): BossPattern => ({ kind: 'charge', damage })
const burrow = (damage: number): BossPattern => ({ kind: 'burrow', damage })
const snare = (damage: number): BossPattern => ({ kind: 'snare', damage })
const ring = (damage: number): BossPattern => ({ kind: 'ring', damage })

export const DEPTHS: DepthPlan[] = [
  {
    depth: 1,
    recommend: 24,
    sword: { id: 'taring-liang', name: 'Taring Liang', damage: 36, rarity: 'pusaka', coins: 42 },
    boss: {
      id: 'boss-induk', breed: 'kelabang', name: 'Kelabang Induk', hp: 216, damage: 27,
      patterns: [slam(27), bolt(20), charge(27)],
    },
    foes: [
      { id: 'moth-a', kind: 'moth', breed: 'moth', name: 'Ngengat Gua', zone: 'tambang', x: -88, y: -62, hp: 30, damage: 12 },
    ],
  },
  {
    depth: 2,
    recommend: 36,
    sword: { id: 'cakar-gali', name: 'Cakar Gali', damage: 52, rarity: 'pusaka', coins: 50 },
    boss: {
      id: 'boss-liang', breed: 'liang', name: 'Raja Liang', hp: 432, damage: 48,
      patterns: [burrow(48), bolt(28), charge(62)],
    },
    foes: [
      { id: 'burrow-a', kind: 'burrow', breed: 'burrow', name: 'Penggali', zone: 'tambang', x: -46, y: 24, hp: 110, damage: 22 },
      { id: 'burrow-b', kind: 'burrow', breed: 'burrow', name: 'Penggali', zone: 'tambang', x: 62, y: -36, hp: 110, damage: 22 },
      { id: 'spore-a', kind: 'spore', breed: 'spore', name: 'Pelontar Spora', zone: 'reruntuhan', x: -24, y: 36, hp: 90, damage: 16 },
      { id: 'spore-b', kind: 'spore', breed: 'spore', name: 'Pelontar Spora', zone: 'reruntuhan', x: 48, y: -44, hp: 90, damage: 16 },
    ],
  },
  {
    depth: 3,
    recommend: 52,
    sword: { id: 'mahkota-spora', name: 'Mahkota Spora', damage: 74, rarity: 'pusaka', coins: 54 },
    boss: {
      id: 'boss-spora', breed: 'spora', name: 'Ratu Spora', hp: 624, damage: 58,
      patterns: [ring(58), bolt(36), charge(72)],
    },
    foes: [
      { id: 'beetle-a', kind: 'beetle', breed: 'beetle', name: 'Kumbang Zirah', zone: 'tambang', x: -20, y: -24, hp: 180, damage: 30 },
      { id: 'beetle-b', kind: 'beetle', breed: 'beetle', name: 'Kumbang Zirah', zone: 'reruntuhan', x: 36, y: 20, hp: 180, damage: 30 },
      { id: 'jelly-a', kind: 'jelly', breed: 'jelly', name: 'Lendir Belah', zone: 'tambang', x: 54, y: 48, hp: 100, damage: 24 },
      { id: 'jelly-b', kind: 'jelly', breed: 'jelly', name: 'Lendir Belah', zone: 'reruntuhan', x: -50, y: -28, hp: 100, damage: 24 },
    ],
  },
  {
    depth: 4,
    recommend: 74,
    sword: { id: 'cangkang-leluhur', name: 'Cangkang Leluhur', damage: 100, rarity: 'legenda', coins: 66 },
    boss: {
      id: 'boss-kumbang', breed: 'kumbang', name: 'Kumbang Leluhur', hp: 888, damage: 70,
      patterns: [charge(70), slam(54), charge(86)],
    },
    foes: [
      { id: 'swarm-a', kind: 'swarm', breed: 'swarm', name: 'Kawanan Ngengat', zone: 'tambang', x: -30, y: 10, hp: 70, damage: 14 },
      { id: 'swarm-b', kind: 'swarm', breed: 'swarm', name: 'Kawanan Ngengat', zone: 'tambang', x: 24, y: -46, hp: 70, damage: 14 },
      { id: 'swarm-c', kind: 'swarm', breed: 'swarm', name: 'Kawanan Ngengat', zone: 'reruntuhan', x: -16, y: 52, hp: 70, damage: 14 },
      { id: 'mole-a', kind: 'mole', breed: 'mole', name: 'Pengawal Mondok', zone: 'reruntuhan', x: 40, y: -18, hp: 220, damage: 34 },
      { id: 'mole-b', kind: 'mole', breed: 'mole', name: 'Pengawal Mondok', zone: 'tambang', x: 70, y: 36, hp: 220, damage: 34 },
    ],
  },
  {
    depth: 5,
    recommend: 100,
    sword: { id: 'cakar-mondok', name: 'Cakar Mondok', damage: 130, rarity: 'legenda', coins: 76 },
    boss: {
      id: 'boss-mondok', breed: 'mondok', name: 'Induk Mondok', hp: 1200, damage: 82,
      patterns: [slam(82), burrow(64), charge(96)],
    },
    foes: [
      { id: 'web-a', kind: 'web', breed: 'web', name: 'Perajut Jaring', zone: 'reruntuhan', x: -36, y: -20, hp: 240, damage: 36 },
      { id: 'web-b', kind: 'web', breed: 'web', name: 'Perajut Jaring', zone: 'tambang', x: 18, y: 44, hp: 240, damage: 36 },
      { id: 'ember-a', kind: 'ember', breed: 'ember', name: 'Tikus Bara', zone: 'tambang', x: -58, y: -30, hp: 260, damage: 40 },
      { id: 'ember-b', kind: 'ember', breed: 'ember', name: 'Tikus Bara', zone: 'reruntuhan', x: 52, y: 28, hp: 260, damage: 40 },
    ],
  },
  {
    depth: 6,
    recommend: 130,
    sword: { id: 'taring-jaring', name: 'Taring Jaring', damage: 170, rarity: 'legenda', coins: 84 },
    boss: {
      id: 'boss-laba', breed: 'laba', name: 'Laba Ratu', hp: 1560, damage: 88,
      patterns: [snare(58), bolt(76), ring(108)],
    },
    foes: [
      { id: 'leech-a', kind: 'leech', breed: 'leech', name: 'Pacet Gua', zone: 'tambang', x: -16, y: -40, hp: 300, damage: 48 },
      { id: 'leech-b', kind: 'leech', breed: 'leech', name: 'Pacet Gua', zone: 'reruntuhan', x: 28, y: 36, hp: 300, damage: 48 },
      { id: 'bomber-a', kind: 'bomber', breed: 'bomber', name: 'Penabur Ranjau', zone: 'tambang', x: 48, y: -12, hp: 280, damage: 56 },
      { id: 'bomber-b', kind: 'bomber', breed: 'bomber', name: 'Penabur Ranjau', zone: 'reruntuhan', x: -44, y: 16, hp: 280, damage: 56 },
    ],
  },
  {
    depth: 7,
    recommend: 170,
    sword: { id: 'jantung-bara', name: 'Jantung Bara', damage: 210, rarity: 'legenda', coins: 88 },
    boss: {
      id: 'boss-mulut', breed: 'mulut', name: 'Mulut Tambang', hp: 2040, damage: 92,
      patterns: [slam(92), bolt(84), charge(118)],
    },
    foes: [
      { id: 'wisp-a', kind: 'wisp', breed: 'wisp', name: 'Nyala Gentayangan', zone: 'reruntuhan', x: -22, y: -36, hp: 340, damage: 52 },
      { id: 'wisp-b', kind: 'wisp', breed: 'wisp', name: 'Nyala Gentayangan', zone: 'tambang', x: 36, y: 22, hp: 340, damage: 52 },
      { id: 'crusher-a', kind: 'crusher', breed: 'crusher', name: 'Penghancur Batu', zone: 'tambang', x: -40, y: 50, hp: 420, damage: 76 },
      { id: 'crusher-b', kind: 'crusher', breed: 'crusher', name: 'Penghancur Batu', zone: 'reruntuhan', x: 58, y: -24, hp: 420, damage: 76 },
    ],
  },
]

export function depthPlan(depth: number): DepthPlan {
  const level = Math.max(1, Math.min(DEPTH_CAP, Math.floor(depth) || 1))
  return DEPTHS[level - 1]!
}

export function recommendDamage(depth: number): number {
  return depthPlan(depth).recommend
}

/**
 * Sword power that meets this depth.
 * Depth 1 is the starter (Lv1, daya 24).
 * Depth 2 wants 36: Bengkel stops at Lv6 = 34, so only Taring Liang from the depth-1 chest qualifies.
 * Every later depth wants the previous boss chest sword. Bengkel never catches up.
 */
const FOE_KEY: Partial<Record<Breed, MsgKey>> = {
  moth: 'foe.moth',
  burrow: 'foe.burrow',
  spore: 'foe.spore',
  beetle: 'foe.beetle',
  jelly: 'foe.jelly',
  swarm: 'foe.swarm',
  mole: 'foe.mole',
  web: 'foe.web',
  ember: 'foe.ember',
  leech: 'foe.leech',
  bomber: 'foe.bomber',
  wisp: 'foe.wisp',
  crusher: 'foe.crusher',
}

const BOSS_ID: Record<string, MsgKey> = {
  'boss-induk': 'boss.induk',
  'boss-liang': 'boss.liang',
  'boss-spora': 'boss.spora',
  'boss-kumbang': 'boss.kumbang',
  'boss-mondok': 'boss.mondok',
  'boss-laba': 'boss.laba',
  'boss-mulut': 'boss.mulut',
}

const BOSS_BREED: Partial<Record<Breed, MsgKey>> = {
  kelabang: 'boss.induk',
  liang: 'boss.liang',
  spora: 'boss.spora',
  kumbang: 'boss.kumbang',
  mondok: 'boss.mondok',
  laba: 'boss.laba',
  mulut: 'boss.mulut',
}

const BLADE_ID: Record<string, MsgKey> = {
  'taring-liang': 'blade.taring-liang',
  'cakar-gali': 'blade.cakar-gali',
  'mahkota-spora': 'blade.mahkota-spora',
  'cangkang-leluhur': 'blade.cangkang-leluhur',
  'cakar-mondok': 'blade.cakar-mondok',
  'taring-jaring': 'blade.taring-jaring',
  'jantung-bara': 'blade.jantung-bara',
}

/** Saved names stay put. What the player reads follows the language. */
export function bossDisplay(id: string, fallback: string): string {
  const key = BOSS_ID[id]
  return key ? t(key) : fallback
}

export function bladeDisplay(id: string, fallback: string): string {
  const key = BLADE_ID[id]
  return key ? t(key) : fallback
}

export function foeName(breed: Breed, fallback: string): string {
  const key = FOE_KEY[breed] ?? BOSS_BREED[breed]
  return key ? t(key) : fallback
}

export function reachNote(depth: number): string {
  if (depth <= 1) return t('reach.starter')
  const prev = depthPlan(depth - 1).sword
  return t('reach.chest', { name: bladeDisplay(prev.id, prev.name), dmg: prev.damage, depth: depth - 1 })
}

/** Below the line, a hit keeps at least a tenth, then falls with the cube of the shortfall. At the line, full damage. */
export function gearFactor(power: number, need: number): number {
  if (!(need > 0) || power >= need) return 1
  return Math.max(0.1, (Math.max(0, power) / need) ** 3)
}

/** Boss glance. Five minutes of sword swings (two a second) stay under 70% of the bar. */
export function bossChip(power: number, need: number, hp: number): number {
  if (!(need > 0) || power >= need) return power
  const glanced = power * gearFactor(power, need)
  const cap = (Math.max(1, hp) * 0.7) / 600
  return Math.min(glanced, cap)
}

/** Depth 2+ trash. Noticeably softer for a short sword, still a room you can clear. */
export function foeChip(power: number, need: number, depth: number): number {
  if (depth <= 1 || !(need > 0) || power >= need) return power
  const factor = Math.max(0.45, Math.min(1, power / need))
  return Math.max(1, Math.round(power * factor))
}

export const BOSS_RAGE_SEC = 90

export function rageMul(fought: number): number {
  return fought >= BOSS_RAGE_SEC ? 1.5 : 1
}

export function bossPhaseOf(hp: number, maxHp: number): 0 | 1 {
  if (maxHp <= 0) return 0
  return hp <= maxHp * 0.5 ? 1 : 0
}

export function bossPattern(breed: string, index: number, phase: number): BossPattern {
  const plan = DEPTHS.find((row) => row.boss.breed === breed)
  const patterns = plan?.boss.patterns ?? DEPTHS[0]!.boss.patterns
  const list = phase >= 1 ? patterns : patterns.slice(0, 2)
  const at = ((Math.floor(index) % list.length) + list.length) % list.length
  return list[at]!
}

/** Front arc blocks part of a hit. Ancestor beetle and mole matriarch drop the plate at half health. */
export function frontGuarded(breed: string | undefined, phase = 0): boolean {
  if (breed === 'beetle' || breed === 'mole') return true
  if ((breed === 'kumbang' || breed === 'mondok') && phase < 1) return true
  return false
}

export const GUARD_FACTOR = 0.45

export interface Blade {
  id: string
  name: string
  damage: number
  rarity: 'pusaka' | 'legenda'
  coins: number
  origin: ItemOrigin
  depth: number
}

export function makeBlade(depth: number, salt: number): Blade {
  const sword = depthPlan(depth).sword
  return {
    id: `${sword.id}-${Math.abs(Math.floor(salt)) || 1}`,
    name: sword.name,
    damage: sword.damage,
    rarity: sword.rarity,
    coins: sword.coins,
    origin: 'loot',
    depth: depthPlan(depth).depth,
  }
}

export function asBlade(value: unknown): Blade | null {
  if (typeof value !== 'object' || value === null) return null
  const raw = value as Partial<Blade>
  if (typeof raw.id !== 'string' || typeof raw.name !== 'string') return null
  const rarity: CoinRarity = raw.rarity === 'legenda' ? 'legenda' : 'pusaka'
  const damage = Math.max(1, Math.floor(Number(raw.damage)) || 1)
  const coins = Number.isFinite(Number(raw.coins)) ? Math.max(0, Math.floor(Number(raw.coins))) : coinsFor(rarity, raw.id.length)
  const depth = Math.max(1, Math.min(DEPTH_CAP, Math.floor(Number(raw.depth)) || 1))
  return { id: raw.id, name: raw.name, damage, rarity, coins, origin: raw.origin === 'stash' ? 'stash' : 'loot', depth }
}

export function bladesOf(value: unknown): Blade[] {
  if (!Array.isArray(value)) return []
  return value.map(asBlade).filter((blade): blade is Blade => blade != null)
}

export function lineup(): DepthFoe[] {
  const seen = new Set<string>()
  const rows: DepthFoe[] = []
  for (const plan of DEPTHS) {
    for (const foe of plan.foes) {
      if (seen.has(foe.kind)) continue
      seen.add(foe.kind)
      rows.push(foe)
    }
  }
  return rows
}

/** How many clean hits the recommended sword needs, versus a sword from two depths earlier. */
export function bossHitRatio(depth: number): { fair: number; behind: number } {
  const plan = depthPlan(depth)
  const fairSword = plan.recommend
  const behindSword = depth <= 2 ? 24 : depthPlan(depth - 2).recommend
  return { fair: plan.boss.hp / fairSword, behind: plan.boss.hp / behindSword }
}
