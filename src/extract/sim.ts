import { coinsFor, hashText, mintUnit, mixSeed, readUnit, type CoinRarity, type ItemOrigin, type ItemUnit } from './coins.ts'
import { currentLocale, t, type MsgKey } from './i18n.ts'
import { BOSS_RAGE_SEC, DEPTH_CAP, DEPTHS, bladeDisplay, bossChip, bossDisplay, bossPattern, bossPhaseOf, depthPlan, foeChip, frontGuarded, GUARD_FACTOR, makeBlade, rageMul, recommendDamage, type Blade, type Breed } from './depths.ts'
import { bagSlotsOf, blockArc, MERCHANT, nextBagUpgrade, shieldMaxFor, swordBonusPct, swordDamage, upgradeCost, upgradeOre, type MerchantKind } from './economy.ts'
import { SPEAR_ACTIVE, SPEAR_ARC, SPEAR_TOTAL, SPEAR_WIND, critLands, rollSpear, spearBossBonus, spearPower, spearReach, type Spear } from './spear.ts'
import { doorPad, generateFloor, layoutShift, nearPad, oreValue, roomAt, spineRoom, type FloorChart, type PropNode, type RoomNode, type SpawnNode, type VeinNode } from './dungeon.ts'

/** Pixel extraction run. Local item counts only. Not SQK, not a wave arena. */

export const BAG_SLOTS = 12
export const EXTRACT_TIME = 3
/** Previous cap. Saves from that era are scaled once up to HP_MAX. */
export const HP_OLD = 100
export const HP_MAX = 125
export const BANDAGE_HEAL = 50
export const FIELD_HEAL = 20
export const STAM_MAX = 100
export const ZONE_W = 220
export const ZONE_H = 300
export const PLAYER_R = 12
export const SWING_REACH = 46
/** Barrel blast, in world pixels. The painted ring uses this same radius. */
export const BLAST_RADIUS = 52
/** A slash or a shove lights the barrel for this long before it blows. */
export const FUSE_TIME = 1
/** A barrel inside another blast uses this shorter fuse. */
export const CHAIN_FUSE = 0.3
/** Extra reach so a swing connects with the centipede's head, not only a point. */
export const BOSS_RADIUS = 18
export const CENTIPEDE_LINKS = 10
export const CENTIPEDE_GAP = 14
/** Keeps the head, and the body that trails it, inside the nest. */
export const BOSS_INSET = 36
export const SWING_TOTAL = 0.34
export const SWING_WIND = 0.08
export const SWING_ACTIVE = 0.13
export const SHIELD_MAX = 4
export const SOUL_MIN = 45
export const SOUL_SPAN = 75
export const SOUL_RADIUS = 150
export const SOUL_DAMAGE = 70
export const SOUL_BOSS_FRACTION = 0.25
export const SOUL_STUN = 1.2
export const SOUL_GUARD = 0.6
export const SOUL_CAST = 0.9
export const SOUL_BURST_AT = 0.35
export const SOUL_STAM = 10
export function soulLow(): string {
  return t('soul.low')
}

export function refreshBanner(run: Run): void {
  const banner = run.banner
  if (!banner?.key) return
  banner.text = t(banner.key, banner.vars)
}
export const BLOCK_ARC = 1.05
export const IDLE_AIM = -Math.PI / 2

export type ZoneId = 'pangkalan' | 'tambang' | 'reruntuhan' | 'sarang' | 'kamar'
export type ItemKind = 'sword' | 'bandage' | 'tonic' | 'scrap' | 'ore' | 'relic' | 'shard' | 'tombak' | 'bilah' | 'p3k'
export type FoeKind = 'crab' | 'spitter' | 'brute' | 'lurker' | 'boss' | 'moth' | 'burrow' | 'spore' | 'beetle' | 'jelly' | 'swarm' | 'mole' | 'web' | 'ember' | 'leech' | 'bomber' | 'wisp' | 'crusher'

export interface Stack {
  kind: ItemKind
  n: number
  /** One entry per counted item. Sword stays empty. Missing entries are filled once on load. */
  units?: ItemUnit[]
}

export type { ItemOrigin, ItemUnit }

export interface Drop {
  id: string
  kind: ItemKind
  x: number
  y: number
  /** World time the drop appeared. Missing on old saves means it is already on the ground. */
  born?: number
  /** Seconds of hover before the item can be claimed. Missing or 0 means it has landed. */
  hover?: number
  /** Set by the first successful claimant. A later claim loses. */
  claimedBy?: string
  /** Chest the item spilled from, used only for the reveal motion. */
  fromX?: number
  fromY?: number
  /** Present when the drop is a unique spear. */
  spear?: Spear
  /** Present when the drop is a named boss sword. */
  blade?: Blade
  /** Coin roll kept on this drop so a reload does not reroll it. */
  unit?: ItemUnit
  /** Metal name for ore that spilled out of a vein. */
  ore?: string
  /** Just dropped at the player's feet. Ignored by Ambil until they step away. */
  handsOff?: boolean
}

export type ClaimResult = 'ok' | 'missing' | 'hover' | 'taken' | 'full' | 'far'

export const PICKUP_RADIUS = 16

export interface Run {
  zone: ZoneId
  x: number
  y: number
  hp: number
  stam: number
  facing: number
  sword: boolean
  shield: number | null
  blocking: boolean
  breakFx: number
  bag: Stack[]
  opened: string[]
  slain: string[]
  drops: Drop[]
  foes: Foe[]
  channel: number
  attackCd: number
  swing: number
  swingHit: string[]
  gait: number
  cape: number
  age: number
  stepping: boolean
  dodge: number
  dodgeCd: number
  hurt: number
  floats: { text: string; life: number; dim?: boolean }[]
  /** Seconds the bag button stays lit after loot lands in the bag. Not stored. */
  bagPulse?: number
  /** Explored minimap tiles, `zone:col:row`. Optional on old saves. */
  explored: string[]
  /** Depth this run was started at. Old saves default to 1. */
  depth: number
  /** Changes each new run so the mine is not the previous layout. */
  seed: number
  /** Chests spawned during the run, such as the boss reward. */
  rewards: Crate[]
  /** Spears found this run. They take bag slots and are not usable until extracted. */
  found: Spear[]
  /** Spear equipped at base and brought as the main weapon. Null means the sword, if any, is the weapon. */
  spear: Spear | null
  /** Named sword brought from the stash. Lost on death. Null means the starter sword, if carried. */
  blade: Blade | null
  /** Named swords found this run. They take bag slots until extracted. */
  foundBlades: Blade[]
  /** Seconds of web slow. Not stored. */
  snare?: number
  /** Boss intro already shown this visit. Not stored. */
  bossTold?: boolean
  /** Seconds left on the floor-change card. Not stored. */
  floorCue?: number
  /** Sword and shield levels copied in at deploy so a resumed run keeps them. */
  swordLevel?: number
  shieldLevel?: number
  bagSlots?: number
  /** One bag item that returns to the stash if the run ends in death. */
  insured?: Insured | null
  /** Pelebur Jiwa. Missing on old saves until the run is loaded. */
  soul?: SoulRite
  /** Short message across the top of the run. Not stored. */
  banner?: { text: string; life: number; tone?: 'weak'; key?: MsgKey; vars?: Record<string, string | number> }
  /** Seeded floor graph. Missing on old saves until the run is loaded. */
  chart?: FloorChart
  roomId?: string
  seenRooms?: string[]
  flags?: string[]
  keys?: number
  roomClock?: number
  /** 1 while the current room event is darkness. Not stored. */
  gloom?: number
  /** Chip debris and barrel bursts. Not stored. */
  bits?: { x: number; y: number; vx: number; vy: number; life: number }[]
  booms?: { x: number; y: number; life: number }[]
  /** Seconds of blast shake. Not stored. */
  shake?: number
  /** Counts barrel blasts so the boom can play once. Not stored. */
  boomPing?: number
  /** Counts fuse ticks so the click can play once per beat. Not stored. */
  fuseTick?: number
}

export interface ExtractSave {
  stash: Stack[]
  support: number
  /** Durability of the shield waiting in the stash. Null means there is no shield there. */
  shield: number | null
  /** True after the one free starter shield has been issued. Stops a reload from granting another. */
  shieldGranted: boolean
  /** Highest depth the player may enter. Old saves default to 1. */
  depth: number
  /** How many runs have been started. Used as the next map seed. */
  ventures: number
  /** Spears waiting in the stash. Equip one to bring it instead of the sword. */
  spears: Spear[]
  /** The spear currently chosen as the main weapon. Taken out of the stash while a run is in progress. */
  spear: Spear | null
  /** Named swords waiting in the stash. */
  blades: Blade[]
  /** Named sword chosen as the main weapon. Starter mastery does not apply to it. */
  blade: Blade | null
  /** Depth the next deploy enters. Never above `depth`. */
  chosenDepth?: number
  run: Run | null
  /** One stash item set aside before a run. It rides in the bag's insurance slot. */
  insured?: Insured | null
  /** Set after a save is lifted from the old 100 HP cap. */
  hpScaled?: boolean
  /** Spendable koin. Old saves start at 0. */
  coins: number
  swordLevel: number
  shieldLevel: number
  bagSlots: number
}

export interface Input {
  moveX: number
  moveY: number
  attack: boolean
  dodge: boolean
  interact: boolean
  block: boolean
  use: ItemKind | null
  /** Q, or the Pelebur Jiwa button. Optional so older call sites stay valid. */
  soul?: boolean
}

export interface Foe {
  id: string
  zone: ZoneId
  kind: FoeKind
  x: number
  y: number
  hp: number
  wind: number
  aim: number
  cd: number
  bolt: { x: number; y: number; vx: number; vy: number } | null
  flash: number
  /** Seconds left in a committed dash. */
  dash: number
  /** Alternates boss attacks. */
  pattern: number
  /** Seconds of bleed left. Optional on old foes. */
  bleed?: number
  /** Seconds a soul-burst holds this foe still. */
  stun?: number
  breed?: Breed | string
  maxHp?: number
  damage?: number
  /** 1 after a boss drops under half health. */
  phase?: number
  /** Underground ambusher. */
  hidden?: boolean
  /** Where a burrow will surface. */
  lurk?: { x: number; y: number }
  /** Split jelly, or a planted mine / ember. */
  child?: boolean
  marks?: { x: number; y: number; life: number }[]
  /** Seconds the player has shared this boss's room. */
  fought?: number
  /** Armor glance sparks. */
  glance?: number
  /** Annex room that owns this foe. Classic roster foes omit it. */
  room?: string
  /** Seconds of mining noise. Not stored. */
  heard?: number
  elite?: boolean
}

export interface SoulRite {
  /** Run age when the shrine appears. */
  at: number
  /** Second seeded roll, used only to pick the tile. */
  salt: number
  zone: ZoneId
  x: number
  y: number
  phase: 'wait' | 'live' | 'held' | 'spent'
  told: boolean
  /** Seconds left in the cast. 0 means not casting. */
  cast: number
  /** Seconds of invulnerability left. */
  guard: number
  /** True after the burst damage has landed. */
  burst: boolean
  /** Seconds of fading embers. */
  embers: number
}

export interface Crate {
  id: string
  zone: ZoneId
  x: number
  y: number
  loot: ItemKind[]
  /** Rolled when the boss chest appears, so a reload keeps the same spear. */
  spear?: Spear
  /** Named sword packed in a boss chest. */
  blade?: Blade
}

export const CRATES: Crate[] = [
  { id: 'crate-mine', zone: 'tambang', x: -40, y: -20, loot: ['scrap', 'bandage'] },
  { id: 'crate-ore', zone: 'reruntuhan', x: 50, y: 30, loot: ['ore', 'tonic'] },
  { id: 'crate-relic', zone: 'reruntuhan', x: -20, y: -70, loot: ['relic', 'shard'] },
]

export const NEST_DOOR = 36
export const CRAB_HP = 44
export const BOSS_HP_MULT = 4
export const BOSS_BASE_HP = CRAB_HP * BOSS_HP_MULT

export const FOE_SPOTS: Array<Omit<Foe, 'wind' | 'aim' | 'cd' | 'bolt' | 'flash' | 'dash' | 'pattern'>> = [
  { id: 'crab-a', zone: 'tambang', kind: 'crab', x: 48, y: 10, hp: CRAB_HP },
  { id: 'crab-b', zone: 'tambang', kind: 'crab', x: -55, y: 60, hp: CRAB_HP },
  { id: 'crab-d', zone: 'tambang', kind: 'crab', x: 70, y: -40, hp: CRAB_HP },
  { id: 'brute-a', zone: 'tambang', kind: 'brute', x: -18, y: -48, hp: 58 },
  { id: 'crab-c', zone: 'reruntuhan', kind: 'crab', x: -30, y: 40, hp: CRAB_HP },
  { id: 'spit-a', zone: 'reruntuhan', kind: 'spitter', x: 30, y: -30, hp: 30 },
  { id: 'spit-b', zone: 'reruntuhan', kind: 'spitter', x: -60, y: -15, hp: 30 },
  { id: 'lurker-a', zone: 'reruntuhan', kind: 'lurker', x: 18, y: 78, hp: 36 },
  { id: 'boss-induk', zone: 'sarang', kind: 'boss', x: 0, y: -40, hp: BOSS_BASE_HP },
]

export function nestGap(zone: ZoneId): 'north' | 'south' | null {
  if (zone === 'reruntuhan') return 'south'
  if (zone === 'sarang') return 'north'
  return null
}

export function throughNestDoor(x: number): boolean {
  return Math.abs(x) <= NEST_DOOR
}

export function depthMods(depth: number): { depth: number; foeHp: number; foeDamage: number; bossHp: number } {
  const level = Math.max(1, Math.min(8, Math.floor(depth) || 1))
  return {
    depth: level,
    foeHp: 1 + (level - 1) * 0.2,
    foeDamage: 1 + (level - 1) * 0.12,
    bossHp: Math.round(BOSS_BASE_HP * (1 + (level - 1) * 0.25)),
  }
}

export function spawnRoster(depth = 1, seed = 1): Foe[] {
  const mods = depthMods(depth)
  const level = mods.depth > DEPTH_CAP ? DEPTH_CAP : mods.depth
  const jitter = (Math.abs(Math.floor(seed)) % 17) - 8
  const classic = level <= 1
    ? FOE_SPOTS.map((spot) => ({ ...spot, breed: spot.kind === 'boss' ? 'kelabang' : spot.kind, damage: undefined as number | undefined, native: false }))
    : []
  const extra = level <= 1 ? DEPTHS[0]!.foes : DEPTHS[level - 1]!.foes
  const boss = level <= 1 ? [] : [DEPTHS[level - 1]!.boss]
  const spots = [
    ...classic,
    ...extra.map((foe) => ({ id: foe.id, zone: foe.zone as ZoneId, kind: foe.kind as FoeKind, x: foe.x, y: foe.y, hp: foe.hp, breed: foe.breed, damage: foe.damage, native: true })),
    ...boss.map((foe) => ({ id: foe.id, zone: 'sarang' as ZoneId, kind: 'boss' as FoeKind, x: 0, y: -40, hp: foe.hp, breed: foe.breed, damage: foe.damage, native: true })),
  ]
  return spots.map((spot) => {
    const base = spot.native ? spot.hp : spot.kind === 'boss' ? mods.bossHp : Math.round(spot.hp * mods.foeHp)
    const slide = spot.id === 'crab-a' || spot.kind === 'boss' ? 0 : jitter
    return {
      id: spot.id,
      zone: spot.zone,
      kind: spot.kind,
      x: spot.x + slide,
      y: spot.y,
      hp: base,
      maxHp: base,
      damage: spot.damage,
      breed: spot.breed,
      wind: 0,
      aim: 0,
      cd: 0.7,
      bolt: null,
      flash: 0,
      dash: 0,
      pattern: 0,
      phase: 0,
    }
  })
}

export function selectDepth(save: ExtractSave, depth: number): string | null {
  const want = Math.floor(depth)
  if (want < 1 || want > DEPTH_CAP) return t('err.noDepth')
  if (want > Math.max(1, Math.min(DEPTH_CAP, save.depth || 1))) return t('err.locked')
  save.chosenDepth = want
  return null
}

export function chosenDepth(save: Pick<ExtractSave, 'depth' | 'chosenDepth'>): number {
  const cap = Math.max(1, Math.min(DEPTH_CAP, Math.floor(save.depth) || 1))
  const want = Math.floor(save.chosenDepth ?? cap) || cap
  return Math.max(1, Math.min(cap, want))
}

export { recommendDamage }

export function cratesFor(depth: number): Crate[] {
  const level = depthMods(depth).depth
  return CRATES.map((crate) => {
    if (level >= 2 && crate.id === 'crate-mine') return { ...crate, loot: [...crate.loot, 'shard' as ItemKind] }
    if (level >= 3 && crate.id === 'crate-ore') return { ...crate, loot: [...crate.loot, 'relic' as ItemKind] }
    return crate
  })
}

export function strikeDamage(run: Run): number {
  if (run.spear) return spearPower(run.spear)
  if (run.blade) return run.blade.damage
  if (count(run.bag, 'bilah') > 0) return 32
  return swordDamage(run.swordLevel ?? 1)
}

export function carriedCount(run: Run): number {
  return bagCount(run.bag) + (run.found?.length ?? 0) + (run.foundBlades?.length ?? 0) + (run.insured ? 1 : 0)
}

function spoken(kind: ItemKind): string {
  return t(`item.short.${kind}` as 'item.short.sword')
}

/** Name shown on a ground drop and in the pickup float. */
export function lootTitle(drop: Pick<Drop, 'kind' | 'ore' | 'blade'>): string {
  if (drop.blade) return bladeDisplay(drop.blade.id, drop.blade.name)
  if (drop.kind === 'tombak') return t('item.tombak')
  if (drop.kind === 'ore' && drop.ore) {
    const metal = t(`ore.${drop.ore}` as 'ore.copper')
    const shown = currentLocale() === 'id' ? metal.toLowerCase() : metal
    return t('loot.oreName', { metal: shown })
  }
  return t(`item.${drop.kind}` as 'item.scrap')
}

function notePickup(run: Run, name: string): void {
  pulseBag(run)
  float(run, t('loot.got', { name }))
}

export const LOCAL_VALUE: Record<ItemKind, number> = {
  sword: 0,
  bandage: 0,
  tonic: 0,
  scrap: 2,
  ore: 5,
  relic: 12,
  shard: 3,
  tombak: 16,
  bilah: 20,
  p3k: 0,
}

const EXTRACT = { x: 0, y: -80, r: 42 }
/** Hole in the nest. Sealed until this floor's boss is dead. */
export const STAIRS = { x: 0, y: 56, r: 26 }
export function stairHint(): string {
  return t('stairs.hint')
}
export const FLOOR_HEAL = 0.25

export function freshSave(): ExtractSave {
  return {
    stash: [
      { kind: 'sword', n: 1 },
      { kind: 'bandage', n: 2, units: [mintUnit('bandage', 11, 'stash'), mintUnit('bandage', 29, 'stash')] },
    ],
    support: 0,
    shield: SHIELD_MAX,
    shieldGranted: true,
    depth: 1,
    ventures: 0,
    spears: [],
    spear: null,
    blades: [],
    blade: null,
    chosenDepth: 1,
    run: null,
    hpScaled: true,
    coins: 0,
    swordLevel: 1,
    shieldLevel: 1,
    bagSlots: 12,
  }
}

export function count(list: Stack[], kind: ItemKind): number {
  return list.filter((stack) => stack.kind === kind).reduce((sum, stack) => sum + stack.n, 0)
}

const PRICED = new Set<ItemKind>(['bandage', 'tonic', 'scrap', 'ore', 'relic', 'shard', 'tombak', 'bilah', 'p3k'])

/** A missing or corrupt coin count becomes 0. Sums never propagate NaN. */
export function finiteCoins(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
}

export function localValue(list: Stack[]): number {
  let sum = 0
  for (const stack of list) {
    if (!stack || !PRICED.has(stack.kind)) continue
    for (const unit of repairStack(stack)) sum += unit.coins
  }
  return sum
}

export function stashValue(save: ExtractSave): number {
  let sum = localValue(save.stash)
  for (const spear of save.spears) sum += finiteCoins(spear?.coins)
  if (!save.run && save.spear) sum += finiteCoins(save.spear.coins)
  for (const blade of save.blades) sum += finiteCoins(blade?.coins)
  if (!save.run && save.blade) sum += finiteCoins(save.blade.coins)
  return sum
}

/** Koin from items found this run. Brought-in stash goods are not included. */
export function freshValue(run: Run): number {
  let sum = 0
  for (const stack of run.bag) {
    if (!stack || !PRICED.has(stack.kind)) continue
    for (const unit of repairStack(stack)) if (unit.origin === 'loot') sum += unit.coins
  }
  for (const spear of run.found ?? []) if ((spear?.origin ?? 'loot') === 'loot') sum += finiteCoins(spear?.coins)
  for (const blade of run.foundBlades ?? []) if (blade?.origin === 'loot') sum += finiteCoins(blade?.coins)
  const insured = run.insured
  if (insured?.unit && insured.unit.origin === 'loot') sum += finiteCoins(insured.unit.coins)
  if (insured?.spear && (insured.spear.origin ?? 'loot') === 'loot') sum += finiteCoins(insured.spear.coins)
  if (insured?.blade && insured.blade.origin === 'loot') sum += finiteCoins(insured.blade.coins)
  return sum
}

export function stashUsed(save: ExtractSave): number {
  let n = 0
  for (const stack of save.stash) if (stack.kind !== 'sword') n += stack.n
  n += save.spears.length
  n += save.blades.length
  return n
}

export function sellOne(save: ExtractSave, kind: ItemKind, coins?: number, spearId?: string): number | null {
  if (kind === 'sword' || save.run) return null
  if (spearId) {
    const spear = save.spears.find((item) => item.id === spearId)
    if (!spear) return null
    save.spears = save.spears.filter((item) => item.id !== spearId)
    const gained = spear.coins ?? 0
    save.coins += gained
    return gained
  }
  const stack = save.stash.find((item) => item.kind === kind)
  if (!stack?.units?.length) return null
  const index = coins == null ? 0 : stack.units.findIndex((unit) => unit.coins === coins)
  if (index < 0) return null
  const [unit] = stack.units.splice(index, 1)
  stack.n = stack.units.length
  if (stack.n <= 0) save.stash.splice(save.stash.indexOf(stack), 1)
  save.coins += unit?.coins ?? 0
  return unit?.coins ?? 0
}

export function sellCommon(save: ExtractSave): number {
  if (save.run) return 0
  let gained = 0
  for (const stack of [...save.stash]) {
    if (stack.kind === 'sword' || !stack.units) continue
    const keep = stack.units.filter((unit) => unit.rarity !== 'biasa')
    const sold = stack.units.filter((unit) => unit.rarity === 'biasa')
    if (sold.length === 0) continue
    gained += sold.reduce((sum, unit) => sum + unit.coins, 0)
    stack.units = keep
    stack.n = keep.length
    if (stack.n <= 0) save.stash.splice(save.stash.indexOf(stack), 1)
  }
  save.coins += gained
  return gained
}

export function buyGoods(save: ExtractSave, kind: MerchantKind): { ok: true; coins: number } | { ok: false; reason: string } {
  if (save.run) return { ok: false, reason: t('err.runShop') }
  const offer = MERCHANT[kind]
  if (save.coins < offer.buy) return { ok: false, reason: t('shop.poor') }
  if (stashUsed(save) >= 20) return { ok: false, reason: t('err.stashFullShort') }
  save.coins -= offer.buy
  addUnits(save.stash, kind, [{ coins: offer.coins, rarity: offer.rarity, origin: 'stash' }])
  return { ok: true, coins: save.coins }
}

export function upgradeGear(save: ExtractSave, which: 'sword' | 'shield'): { ok: true; level: number; note: string } | { ok: false; reason: string } {
  if (save.run) return { ok: false, reason: t('err.runShop') }
  const level = which === 'sword' ? save.swordLevel : save.shieldLevel
  const cost = upgradeCost(level)
  if (cost == null) return { ok: false, reason: t('err.top') }
  const oreNeed = upgradeOre(level)
  if (oreNeed > 0 && count(save.stash, 'ore') < oreNeed) return { ok: false, reason: t('shop.oreUp', { n: oreNeed }) }
  if (save.coins < cost) return { ok: false, reason: t('shop.poor') }
  if (oreNeed > 0 && !spendStack(save.stash, 'ore', oreNeed)) return { ok: false, reason: t('shop.oreUp', { n: oreNeed }) }
  save.coins -= cost
  const next = level + 1
  if (which === 'sword') {
    save.swordLevel = next
    return { ok: true, level: next, note: t('shop.swordDone', { lv: next, dmg: swordDamage(next), pct: swordBonusPct(next) }) }
  }
  save.shieldLevel = next
  return { ok: true, level: next, note: t('shop.shieldDone', { lv: next, cap: shieldMaxFor(next) }) }
}

export function upgradeBag(save: ExtractSave): { ok: true; slots: number; note: string } | { ok: false; reason: string } {
  if (save.run) return { ok: false, reason: t('err.runShop') }
  const next = nextBagUpgrade(save.bagSlots)
  if (!next) return { ok: false, reason: t('err.bag20') }
  if (save.coins < next.cost) return { ok: false, reason: t('shop.poor') }
  save.coins -= next.cost
  save.bagSlots = next.slots
  return { ok: true, slots: next.slots, note: t('note.bagSlots', { n: next.slots }) }
}

export type Insured = { kind: ItemKind; unit?: ItemUnit; spear?: Spear; blade?: Blade }

function stashRoom(save: ExtractSave): boolean {
  return stashUsed(save) < 20
}

function putInsuredHome(save: ExtractSave, held: Insured): void {
  if (held.blade) {
    held.blade.origin = 'stash'
    save.blades.push(held.blade)
  } else if (held.spear) {
    held.spear.origin = 'stash'
    save.spears.push(held.spear)
  } else if (held.unit && held.kind !== 'sword') {
    addUnits(save.stash, held.kind, [{ ...held.unit, origin: 'stash' }])
  }
}

function putInsuredInBag(run: Run, held: Insured): void {
  if (held.blade) run.foundBlades = [...(run.foundBlades ?? []), held.blade]
  else if (held.spear) run.found = [...(run.found ?? []), held.spear]
  else if (held.unit) addUnits(run.bag, held.kind, [held.unit])
}

export function insureHeld(run: Run, kind: ItemKind, coins?: number, spearId?: string, bladeId?: string): string | null {
  if (!bladeId && kind === 'sword') return t('err.swordBox')
  const incoming = takeCarried(run, kind, coins, spearId, bladeId)
  if (!incoming) return t('err.notInBag')
  if (run.insured) {
    const held = run.insured
    run.insured = null
    if (carriedCount(run) >= bagLimit(run)) {
      run.insured = held
      giveBackCarried(run, incoming)
      return t('err.bagFull')
    }
    putInsuredInBag(run, held)
  }
  run.insured = incoming
  return null
}

export function uninsure(run: Run): string | null {
  const held = run.insured
  if (!held) return t('err.boxEmpty')
  run.insured = null
  if (carriedCount(run) >= bagLimit(run)) {
    run.insured = held
    return t('err.bagFull')
  }
  putInsuredInBag(run, held)
  return null
}

export function insureStash(save: ExtractSave, kind: ItemKind, coins?: number, spearId?: string, bladeId?: string): string | null {
  if (save.run) return t('err.insureRun')
  if (!bladeId && kind === 'sword') return t('err.swordBox')
  const incoming = takeStashed(save, kind, coins, spearId, bladeId)
  if (!incoming) return t('err.notInStash')
  if (save.insured) {
    if (!stashRoom(save)) {
      giveBackStash(save, incoming)
      return t('err.stashFull')
    }
    putInsuredHome(save, save.insured)
  }
  save.insured = incoming
  return null
}

export function uninsureStash(save: ExtractSave): string | null {
  const held = save.insured
  if (!held) return t('err.boxEmpty')
  if (!stashRoom(save)) return t('err.stashFull')
  putInsuredHome(save, held)
  save.insured = null
  return null
}

function takeCarried(run: Run, kind: ItemKind, coins?: number, spearId?: string, bladeId?: string): Insured | null {
  if (bladeId) {
    const blade = (run.foundBlades ?? []).find((item) => item.id === bladeId)
    if (!blade) return null
    run.foundBlades = (run.foundBlades ?? []).filter((item) => item.id !== bladeId)
    return { kind: 'sword', blade }
  }
  if (spearId) {
    const spear = (run.found ?? []).find((item) => item.id === spearId)
    if (!spear) return null
    run.found = (run.found ?? []).filter((item) => item.id !== spearId)
    return { kind: 'tombak', spear }
  }
  const stack = run.bag.find((item) => item.kind === kind)
  if (!stack?.units?.length) return null
  const index = coins == null ? 0 : stack.units.findIndex((unit) => unit.coins === coins)
  if (index < 0) return null
  const [unit] = stack.units.splice(index, 1)
  stack.n = stack.units.length
  if (stack.n <= 0) run.bag.splice(run.bag.indexOf(stack), 1)
  return unit ? { kind, unit } : null
}

function giveBackCarried(run: Run, held: Insured): void {
  putInsuredInBag(run, held)
}

function takeStashed(save: ExtractSave, kind: ItemKind, coins?: number, spearId?: string, bladeId?: string): Insured | null {
  if (bladeId) {
    const blade = save.blades.find((item) => item.id === bladeId)
    if (!blade) return null
    save.blades = save.blades.filter((item) => item.id !== bladeId)
    return { kind: 'sword', blade }
  }
  if (spearId) {
    const spear = save.spears.find((item) => item.id === spearId)
    if (!spear) return null
    save.spears = save.spears.filter((item) => item.id !== spearId)
    return { kind: 'tombak', spear }
  }
  const stack = save.stash.find((item) => item.kind === kind)
  if (!stack?.units?.length) return null
  const index = coins == null ? 0 : stack.units.findIndex((unit) => unit.coins === coins)
  if (index < 0) return null
  const [unit] = stack.units.splice(index, 1)
  stack.n = stack.units.length
  if (stack.n <= 0) save.stash.splice(save.stash.indexOf(stack), 1)
  return unit ? { kind, unit } : null
}

function giveBackStash(save: ExtractSave, held: Insured): void {
  putInsuredHome(save, held)
}

export function ensureUnits(stack: Stack, salt: number): ItemUnit[] {
  if (!stack || stack.kind === 'sword' || !PRICED.has(stack.kind)) {
    if (stack?.kind === 'sword') stack.units = undefined
    return []
  }
  const listed = Array.isArray(stack.units) ? stack.units : []
  const wanted = Number.isFinite(stack.n) && stack.n > 0 ? Math.floor(stack.n) : listed.length
  const units: ItemUnit[] = []
  for (let i = 0; i < wanted; i += 1) units.push(readUnit(listed[i], stack.kind, salt + i * 17))
  stack.n = units.length
  stack.units = units
  return units
}

/** Fills a missing coin roll once. The same kind and slot always mint the same number. */
export function repairStack(stack: Stack): ItemUnit[] {
  return ensureUnits(stack, hashText(stack?.kind || 'barang'))
}

export function addUnits(list: Stack[], kind: ItemKind, units: ItemUnit[]): void {
  if (kind === 'sword' || units.length === 0) return
  const found = list.find((stack) => stack.kind === kind)
  if (found) {
    found.units = [...(found.units ?? []), ...units]
    found.n = found.units.length
    return
  }
  list.push({ kind, n: units.length, units: [...units] })
}

function add(list: Stack[], kind: ItemKind, n: number, salt = 1): void {
  if (n <= 0) return
  if (kind === 'sword') {
    const found = list.find((stack) => stack.kind === kind)
    if (found) found.n += n
    else list.push({ kind, n })
    return
  }
  const units = Array.from({ length: n }, (_, index) => mintUnit(kind, salt + index * 97, 'loot'))
  addUnits(list, kind, units)
}

/** Removes n items and returns their coin rows. Null when there are not enough. */
export function spendStack(list: Stack[], kind: ItemKind, n: number): ItemUnit[] | null {
  if (n <= 0) return []
  const found = list.find((stack) => stack.kind === kind)
  if (!found || found.n < n) return null
  if (kind !== 'sword') ensureUnits(found, mixSeed(kind.length + n))
  const taken = kind === 'sword' ? [] : (found.units ?? []).slice(0, n)
  if (found.units) found.units = found.units.slice(n)
  found.n -= n
  if (found.n <= 0) list.splice(list.indexOf(found), 1)
  return taken
}

function take(list: Stack[], kind: ItemKind, n: number): boolean {
  return spendStack(list, kind, n) != null
}

function pullUnits(list: Stack[], kind: ItemKind, n: number): ItemUnit[] {
  const taken = spendStack(list, kind, n)
  if (!taken) return []
  return taken.map((unit) => ({ ...unit, origin: 'stash' as const }))
}

export function equipSpear(save: ExtractSave, id: string): boolean {
  if (save.run) return false
  const spear = save.spears.find((item) => item.id === id)
  if (!spear) return false
  if (save.spear) save.spears.push(save.spear)
  if (save.blade) {
    save.blades.push(save.blade)
    save.blade = null
  }
  save.spear = spear
  save.spears = save.spears.filter((item) => item.id !== id)
  return true
}

export function equipBlade(save: ExtractSave, id: string): boolean {
  if (save.run) return false
  const blade = save.blades.find((item) => item.id === id)
  if (!blade) return false
  if (save.blade) save.blades.push(save.blade)
  if (save.spear) {
    save.spears.push(save.spear)
    save.spear = null
  }
  save.blade = blade
  save.blades = save.blades.filter((item) => item.id !== id)
  return true
}

export function unequipBlade(save: ExtractSave): boolean {
  if (save.run || !save.blade) return false
  save.blades.push(save.blade)
  save.blade = null
  return true
}

export function unequipSpear(save: ExtractSave): boolean {
  if (save.run || !save.spear) return false
  save.spears.push(save.spear)
  save.spear = null
  return true
}

export function deploy(save: ExtractSave, picks: Stack[], bringShield = false): string | null {
  if (save.run) return t('err.runLive')
  const sword = count(picks, 'sword')
  if (sword > 1) return t('err.oneSword')
  if (save.spear && sword > 0) return t('err.spearOn')
  if (bringShield && (save.shield == null || save.shield <= 0)) return t('err.noShield')
  const insuredSlot = save.insured ? 1 : 0
  if (carriedSlots(picks) + insuredSlot > bagSlotsOf(save.bagSlots)) return t('err.bagSlots', { n: bagSlotsOf(save.bagSlots) })
  for (const stack of picks) {
    if (stack.n <= 0 || count(save.stash, stack.kind) < stack.n) return t('err.stashShort')
  }
  const bag: Stack[] = []
  for (const stack of picks) {
    if (stack.kind === 'sword') {
      take(save.stash, 'sword', stack.n)
      continue
    }
    const units = pullUnits(save.stash, stack.kind, stack.n)
    if (units.length > 0) bag.push({ kind: stack.kind, n: units.length, units })
  }
  const carriedShield = bringShield ? save.shield : null
  if (bringShield) save.shield = null
  const carriedSpear = save.spear
  if (carriedSpear) {
    carriedSpear.origin = 'stash'
    if (carriedSpear.coins == null) carriedSpear.coins = coinsFor(carriedSpear.rarity, mixSeed(carriedSpear.id.length * 13))
    save.spear = null
  }
  const carriedBlade = save.blade
  if (carriedBlade) {
    carriedBlade.origin = 'stash'
    save.blade = null
  }
  save.run = {
    zone: 'pangkalan',
    x: 0,
    y: 70,
    hp: HP_MAX,
    stam: STAM_MAX,
    facing: Math.PI / 2,
    sword: sword === 1,
    shield: carriedShield,
    blocking: false,
    breakFx: 0,
    bag,
    opened: [],
    slain: [],
    drops: [],
    foes: spawnRoster(1, save.ventures + 1),
    channel: 0,
    attackCd: 0,
    swing: 0,
    swingHit: [],
    gait: 0,
    cape: Math.PI / 2 + Math.PI,
    age: 0,
    stepping: false,
    dodge: 0,
    dodgeCd: 0,
    hurt: 0,
    floats: [],
    explored: [],
    depth: 1,
    seed: save.ventures + 1,
    rewards: [],
    found: [],
    spear: carriedSpear,
    blade: carriedBlade,
    foundBlades: [],
    swordLevel: save.swordLevel,
    shieldLevel: save.shieldLevel,
    bagSlots: bagSlotsOf(save.bagSlots),
    insured: save.insured ?? null,
    soul: (() => {
      const rite = scheduleSoul(save.ventures + 1)
      rite.told = true
      return rite
    })(),
    banner: { text: t('soul.start'), life: 4.5, key: 'soul.start' },
  }
  ensureChart(save.run)
  save.insured = null
  save.ventures += 1
  return null
}

function noteDeepest(save: ExtractSave): void {
  const run = save.run
  if (!run) return
  save.depth = Math.max(save.depth || 1, Math.min(DEPTH_CAP, run.depth || 1))
}

export function bankRun(save: ExtractSave): boolean {
  const run = save.run
  if (!run || run.channel < EXTRACT_TIME) return false
  noteDeepest(save)
  if (run.sword) add(save.stash, 'sword', 1)
  if (run.spear) {
    run.spear.origin = 'stash'
    save.spear = run.spear
  }
  if (run.blade) {
    run.blade.origin = 'stash'
    save.blade = run.blade
  }
  for (const spear of run.found ?? []) {
    spear.origin = 'stash'
    save.spears.push(spear)
  }
  for (const blade of run.foundBlades ?? []) {
    blade.origin = 'stash'
    save.blades.push(blade)
  }
  for (const stack of run.bag) {
    if (stack.kind === 'sword') continue
    const units = (stack.units ?? []).map((unit) => ({ ...unit, origin: 'stash' as const }))
    addUnits(save.stash, stack.kind, units)
  }
  keepInsured(save, run)
  if (run.shield != null && run.shield > 0 && save.shield == null) save.shield = run.shield
  save.run = null
  return true
}

export function addSupport(save: ExtractSave, energy: number): void {
  if (!Number.isFinite(energy) || energy <= 0) return
  save.support = Math.min(100, save.support + energy)
}

export function spendSupport(save: ExtractSave): boolean {
  if (!save.run || save.support < 24) return false
  save.support -= 24
  save.run.hp = Math.min(HP_MAX, save.run.hp + FIELD_HEAL)
  save.run.stam = Math.min(STAM_MAX, save.run.stam + 30)
  return true
}

export function killRun(save: ExtractSave): void {
  noteDeepest(save)
  if (save.run) keepInsured(save, save.run)
  save.run = null
  if (count(save.stash, 'sword') > 0) return
  add(save.stash, 'sword', 1)
  if (count(save.stash, 'bandage') === 0) add(save.stash, 'bandage', 1, save.ventures * 19 + 3)
}

function keepInsured(save: ExtractSave, run: Run): void {
  const held = run.insured
  if (!held) return
  if (held.blade) {
    held.blade.origin = 'stash'
    save.blades.push(held.blade)
  } else if (held.spear) {
    held.spear.origin = 'stash'
    save.spears.push(held.spear)
  } else if (held.unit && held.kind !== 'sword') {
    addUnits(save.stash, held.kind, [{ ...held.unit, origin: 'stash' }])
  }
  run.insured = null
}

function float(run: Run, text: string, dim = false): void {
  const once = text === t('room.shut') || text === t('hud.bagFull')
  if (once && run.floats.some((item) => item.text === text && item.life > 0.35)) return
  run.floats.push({ text, life: 0.8, dim })
  run.floats = run.floats.slice(-6)
}

function landHit(run: Run, foe: Foe, raw: number): { amount: number; kebal: boolean } {
  const need = recommendDamage(run.depth || 1)
  const plate = foe.kind === 'boss' && raw >= need ? raw : softened(run, foe, raw)
  if (foe.kind === 'boss' && raw < need) return { amount: bossChip(raw, need, foe.maxHp ?? foe.hp), kebal: true }
  if (foe.kind !== 'boss' && (run.depth || 1) >= 2 && raw < need) return { amount: foeChip(plate, need, run.depth || 1), kebal: false }
  return { amount: plate, kebal: false }
}

function noteHit(run: Run, hit: { amount: number; kebal: boolean }): void {
  if (!hit.kebal) {
    float(run, String(Math.max(0, Math.round(hit.amount))))
    return
  }
  const shown = Math.round(hit.amount)
  float(run, shown >= 1 ? String(shown) : '0', true)
  float(run, t('hit.glance'), true)
  float(run, t('hit.weak'), true)
}

export function bagCount(list: Stack[]): number {
  return list.reduce((sum, stack) => sum + stack.n, 0)
}

export function bagLimit(run: Run): number {
  return bagSlotsOf(run.bagSlots)
}

export function bagFull(run: Run): boolean {
  return carriedCount(run) >= bagLimit(run)
}

function carriedSlots(picks: Stack[]): number {
  return bagCount(picks.filter((stack) => stack.kind !== 'sword'))
}

function slotFree(run: Run): boolean {
  return carriedCount(run) < bagLimit(run)
}

export function give(run: Run, kind: ItemKind, seed?: number): boolean {
  if (!slotFree(run) || kind === 'sword') return false
  const salt = seed ?? mixSeed(run.seed * 1000 + carriedCount(run) * 17 + Math.floor(run.age * 10) + kind.length)
  addUnits(run.bag, kind, [mintUnit(kind, salt, 'loot')])
  return true
}

export function useItem(run: Run, kind: ItemKind): boolean {
  if (kind !== 'bandage' && kind !== 'tonic' && kind !== 'p3k') return false
  if (!take(run.bag, kind, 1)) return false
  if (kind === 'bandage') {
    run.hp = Math.min(HP_MAX, run.hp + BANDAGE_HEAL)
    float(run, t('item.short.bandage'))
  } else if (kind === 'p3k') {
    run.hp = Math.min(HP_MAX, run.hp + FIELD_HEAL)
    float(run, t('item.short.p3k'))
  } else {
    run.stam = Math.min(STAM_MAX, run.stam + 45)
    float(run, t('item.short.tonic'))
  }
  return true
}

function foeState(run: Run, id: string): Foe | null {
  return run.foes.find((foe) => foe.id === id) ?? null
}

/** Blade angle relative to facing. Wind-up pulls back, the active sweep covers the front semicircle, then the wrist follows through. */
export function bladeOffset(elapsed: number): number {
  if (elapsed <= 0) return -0.4
  if (elapsed < SWING_WIND) return lerp(-0.35, -Math.PI / 2, elapsed / SWING_WIND)
  if (elapsed < SWING_WIND + SWING_ACTIVE) {
    const k = smooth((elapsed - SWING_WIND) / SWING_ACTIVE)
    return lerp(-Math.PI / 2, Math.PI / 2, k)
  }
  const k = Math.min(1, (elapsed - SWING_WIND - SWING_ACTIVE) / (SWING_TOTAL - SWING_WIND - SWING_ACTIVE))
  return lerp(Math.PI / 2, -0.4, k)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function smooth(t: number): number {
  const x = Math.max(0, Math.min(1, t))
  return x * x * (3 - 2 * x)
}

export function swordAim(facing: number, swingRemaining: number): number {
  if (swingRemaining <= 0) return IDLE_AIM
  const elapsed = SWING_TOTAL - swingRemaining
  if (elapsed < SWING_WIND) return lerpAngle(IDLE_AIM, facing + bladeOffset(SWING_WIND), smooth(elapsed / SWING_WIND))
  if (elapsed < SWING_WIND + SWING_ACTIVE) return facing + bladeOffset(elapsed)
  const k = smooth((elapsed - SWING_WIND - SWING_ACTIVE) / (SWING_TOTAL - SWING_WIND - SWING_ACTIVE))
  return lerpAngle(facing + Math.PI / 2, IDLE_AIM, k)
}

function lerpAngle(from: number, to: number, t: number): number {
  const gap = Math.atan2(Math.sin(to - from), Math.cos(to - from))
  return from + gap * t
}

/** Gameplay hit arc is the front semicircle centered on body facing. */
export function slashArcCenter(facing: number): number {
  return facing
}

/** Gameplay block arc is centered on body facing. */
export function blockArcCenter(facing: number): number {
  return facing
}

function connectSwing(run: Run, from: number, to: number): void {
  const a0 = bladeOffset(from)
  const a1 = bladeOffset(to)
  const active = to > SWING_WIND && from < SWING_WIND + SWING_ACTIVE
  if (!active) return
  const lo = Math.min(a0, a1) - 0.18
  const hi = Math.max(a0, a1) + 0.18
  for (const foe of run.foes) {
    if (foe.zone !== run.zone || foe.hp <= 0 || run.slain.includes(foe.id) || run.swingHit.includes(foe.id)) continue
    const dx = foe.x - run.x
    const dy = foe.y - run.y
    const dist = bodyDist(foe, dx, dy)
    if (dist > SWING_REACH) continue
    const sample = Math.atan2(Math.sin(Math.atan2(dy, dx) - run.facing), Math.cos(Math.atan2(dy, dx) - run.facing))
    const inArc = dist <= 8 ? Math.abs(sample) <= Math.PI / 2 || dist < 1 : sample >= lo && sample <= hi && Math.abs(sample) <= Math.PI / 2 + 0.05
    if (!inArc) continue
    const hit = landHit(run, foe, strikeDamage(run))
    run.swingHit.push(foe.id)
    foe.hp -= hit.amount
    foe.flash = 0.14
    if (hit.kebal) foe.glance = 0.4
    const push = Math.atan2(dy, dx)
    foe.x += Math.cos(push) * (hit.kebal ? 2 : 8)
    foe.y += Math.sin(push) * (hit.kebal ? 2 : 8)
    noteHit(run, hit)
    if (foe.hp <= 0) slayFoe(run, foe)
  }
  strikeVeins(run)
  strikeBarrels(run, lo, hi)
  strikeCracks(run, lo, hi)
}

function connectThrust(run: Run, from: number, to: number): void {
  const spear = run.spear
  if (!spear) return
  const active = to > SPEAR_WIND && from < SPEAR_WIND + SPEAR_ACTIVE
  if (!active) return
  const reach = spearReach(spear)
  const hits: Array<{ foe: Foe; dist: number }> = []
  for (const foe of run.foes) {
    if (foe.zone !== run.zone || foe.hp <= 0 || run.slain.includes(foe.id) || run.swingHit.includes(foe.id)) continue
    const dx = foe.x - run.x
    const dy = foe.y - run.y
    const dist = bodyDist(foe, dx, dy)
    if (dist > reach) continue
    const sample = Math.atan2(Math.sin(Math.atan2(dy, dx) - run.facing), Math.cos(Math.atan2(dy, dx) - run.facing))
    if (dist > 10 && Math.abs(sample) > SPEAR_ARC) continue
    hits.push({ foe, dist })
  }
  hits.sort((a, b) => a.dist - b.dist)
  for (const { foe } of hits) {
    const crit = critLands(spear, Math.floor(run.age * 17) + Math.floor(foe.x))
    const kelabang = foe.id === 'boss-induk' || foe.breed === 'kelabang'
    const boss = kelabang ? spearBossBonus(spear) : 0
    const hit = landHit(run, foe, spearPower(spear) + boss + (crit ? 12 : 0))
    run.swingHit.push(foe.id)
    foe.hp -= hit.amount
    foe.flash = 0.16
    if (hit.kebal) foe.glance = 0.4
    if (spear.perks.includes('bleed') && !hit.kebal) foe.bleed = 2.4
    const knock = hit.kebal ? 4 : foe.kind === 'boss' ? 16 : 12
    foe.x += Math.cos(run.facing) * knock
    foe.y += Math.sin(run.facing) * knock
    if (crit && !hit.kebal) float(run, t('hit.crit'))
    else noteHit(run, hit)
    if (foe.hp <= 0) slayFoe(run, foe)
  }
  strikeVeins(run)
  strikeBarrels(run, -SPEAR_ARC, SPEAR_ARC)
  strikeCracks(run, -SPEAR_ARC, SPEAR_ARC)
}

function isKelabang(foe: Foe): boolean {
  return foe.kind === 'boss' && (foe.id === 'boss-induk' || foe.breed === 'kelabang' || !foe.breed)
}

export function isSpecial(foe: Foe): boolean {
  if (foe.kind === 'crab' || foe.kind === 'spitter' || foe.kind === 'brute' || foe.kind === 'lurker') return false
  if (isKelabang(foe)) return false
  return true
}

function bodyDist(foe: Foe, dx: number, dy: number): number {
  const reach = Math.hypot(dx, dy) - (isKelabang(foe) ? BOSS_RADIUS : foe.kind === 'boss' ? 16 : 0)
  if (!isKelabang(foe)) return Math.max(0, reach)
  const px = foe.x - dx
  const py = foe.y - dy
  let best = reach
  for (const link of syncCentipede(foe)) {
    const gap = Math.hypot(link.x - px, link.y - py) - 14
    if (gap < best) best = gap
  }
  return Math.max(0, best)
}

type CentipedePoint = { x: number; y: number }
const centipedeTrails = new Map<string, CentipedePoint[]>()

function nestPoint(x: number, y: number): CentipedePoint {
  const edge = BOSS_INSET
  return {
    x: Math.max(-ZONE_W / 2 + edge, Math.min(ZONE_W / 2 - edge, x)),
    y: Math.max(-ZONE_H / 2 + edge, Math.min(ZONE_H / 2 - edge, y)),
  }
}

function seedCentipede(x: number, y: number, aim: number): CentipedePoint[] {
  const pts: CentipedePoint[] = [nestPoint(x, y)]
  let dir = aim + Math.PI
  for (let i = 1; i < CENTIPEDE_LINKS; i += 1) {
    const prev = pts[i - 1]!
    let next = nestPoint(prev.x + Math.cos(dir) * CENTIPEDE_GAP, prev.y + Math.sin(dir) * CENTIPEDE_GAP)
    if (Math.hypot(next.x - prev.x, next.y - prev.y) < CENTIPEDE_GAP * 0.6) {
      dir += Math.PI / 2
      next = nestPoint(prev.x + Math.cos(dir) * CENTIPEDE_GAP, prev.y + Math.sin(dir) * CENTIPEDE_GAP)
    }
    pts.push(next)
  }
  return pts
}

/** Head at index 0. Every segment is held at a fixed distance from the one in front, so a short frame or a hitch cannot open a gap. */
export function syncCentipede(foe: { id: string; x: number; y: number; aim: number }): CentipedePoint[] {
  const trail = centipedeTrails.get(foe.id)
  const head = nestPoint(foe.x, foe.y)
  if (!trail) {
    const seeded = seedCentipede(head.x, head.y, foe.aim || 0)
    centipedeTrails.set(foe.id, seeded)
    return seeded
  }
  const next: CentipedePoint[] = [head]
  for (let i = 1; i < CENTIPEDE_LINKS; i += 1) {
    const prev = next[i - 1]!
    const cur = trail[i] ?? trail[trail.length - 1]!
    let dx = cur.x - prev.x
    let dy = cur.y - prev.y
    let span = Math.hypot(dx, dy)
    if (span < 0.001) {
      dx = -Math.cos(foe.aim || 0)
      dy = -Math.sin(foe.aim || 0)
      span = 1
    }
    next.push(nestPoint(prev.x + (dx / span) * CENTIPEDE_GAP, prev.y + (dy / span) * CENTIPEDE_GAP))
  }
  centipedeTrails.set(foe.id, next)
  return next
}

export function resetCentipede(id?: string): void {
  if (id) centipedeTrails.delete(id)
  else centipedeTrails.clear()
}

function slayFoe(run: Run, foe: Foe): void {
  if (run.slain.includes(foe.id)) return
  foe.hp = 0
  run.slain.push(foe.id)
  if (foe.kind === 'boss') spawnBossChest(run, foe)
  else {
    if (foe.elite) {
      run.keys = (run.keys ?? 0) + 1
      float(run, t('room.key'))
    }
    const loot: ItemKind = foe.kind === 'spitter' || foe.kind === 'lurker' || foe.kind === 'spore' || foe.kind === 'web' ? 'ore' : foe.kind === 'beetle' || foe.kind === 'mole' || foe.kind === 'crusher' ? 'shard' : 'scrap'
    const drop: Drop = { id: `drop-${foe.id}`, kind: loot, x: foe.x, y: foe.y + 16 }
    if ((run.depth || 1) >= 2 && !foe.child) drop.unit = bossUnit(run, loot, foe.id.length)
    run.drops.push(drop)
    if (foe.kind === 'jelly' && !foe.child) {
      const childHp = Math.max(24, Math.round((foe.maxHp ?? foe.hp) * 0.45))
      run.foes.push({
        ...foe,
        id: `${foe.id}-pecah`,
        hp: childHp,
        maxHp: childHp,
        child: true,
        x: foe.x + 16,
        y: foe.y + 6,
        wind: 0,
        bolt: null,
        dash: 0,
        marks: [],
        hidden: false,
      })
    }
  }
}

export function threatInFront(run: Run, fromX: number, fromY: number): boolean {
  const toSource = Math.atan2(fromY - run.y, fromX - run.x)
  const delta = Math.atan2(Math.sin(toSource - run.facing), Math.cos(toSource - run.facing))
  return Math.abs(delta) <= blockArc(run.shieldLevel ?? 1)
}

function hurtPlayer(run: Run, amount: number, fromX: number, fromY: number): void {
  if ((run.soul?.guard ?? 0) > 0) return
  if (run.dodge > 0 || run.hp <= 0) {
    if (run.dodge > 0) float(run, t('hit.dodge'))
    return
  }
  if (run.blocking && run.shield != null && run.shield > 0 && threatInFront(run, fromX, fromY)) {
    run.shield -= 1
    float(run, t('hit.block'))
    if (run.shield <= 0) {
      run.shield = null
      run.blocking = false
      run.breakFx = 0.4
      float(run, t('hit.break'))
    }
    return
  }
  run.hp = Math.max(0, run.hp - amount)
  run.hurt = 0.18
  run.channel = 0
  const ang = Math.atan2(run.y - fromY, run.x - fromX)
  run.x += Math.cos(ang) * 6
  run.y += Math.sin(ang) * 6
  float(run, t('hit.hurt'))
}

export type StepResult = 'play' | 'dead' | 'extracted'

export function step(run: Run, input: Input, dt: number): StepResult {
  if (run.hp <= 0) return 'dead'
  const h = Math.max(0, Math.min(0.05, dt))
  run.stam = Math.min(STAM_MAX, run.stam + 16 * h)
  run.snare = Math.max(0, (run.snare ?? 0) - h)
  run.attackCd = Math.max(0, run.attackCd - h)
  run.dodge = Math.max(0, run.dodge - h)
  run.dodgeCd = Math.max(0, run.dodgeCd - h)
  run.hurt = Math.max(0, run.hurt - h)
  run.breakFx = Math.max(0, run.breakFx - h)
  run.age += h
  run.bagPulse = Math.max(0, (run.bagPulse ?? 0) - h)
  run.shake = Math.max(0, (run.shake ?? 0) - h)
  for (const item of run.floats) item.life -= h
  run.floats = run.floats.filter((item) => item.life > 0)

  const len = Math.hypot(input.moveX, input.moveY)
  const originX = run.x
  const originY = run.y
  const casting = (run.soul?.cast ?? 0) > 0
  if (len > 0.15 && run.dodge <= 0 && !casting) {
    run.facing = Math.atan2(input.moveY, input.moveX)
    const speed = 92 * Math.min(1, len) * ((run.snare ?? 0) > 0 ? 0.45 : 1)
    run.x += (input.moveX / len) * speed * h
    run.y += (input.moveY / len) * speed * h
  }
  if (run.dodge > 0) {
    run.x += Math.cos(run.facing) * 150 * h
    run.y += Math.sin(run.facing) * 150 * h
  }
  run.x = Math.max(-ZONE_W / 2 + PLAYER_R, Math.min(ZONE_W / 2 - PLAYER_R, run.x))
  run.y = Math.max(-ZONE_H / 2 + PLAYER_R, Math.min(ZONE_H / 2 - PLAYER_R, run.y))
  crossZone(run)
  tickDungeon(run, h)
  run.stepping = Math.hypot(run.x - originX, run.y - originY) > 0.04 && run.dodge <= 0
  if (run.stepping) run.gait += h * 10
  else run.gait *= Math.max(0, 1 - h * 12)
  const capeWant = run.facing + Math.PI
  const capeGap = Math.atan2(Math.sin(capeWant - run.cape), Math.cos(capeWant - run.cape))
  run.cape += capeGap * Math.min(1, h * (run.stepping ? 8 : 4))

  if (input.dodge && run.dodgeCd <= 0 && run.stam >= 26 && !casting) {
    run.stam -= 26
    run.dodge = 0.26
    run.dodgeCd = 0.7
    if (len > 0.15) run.facing = Math.atan2(input.moveY, input.moveX)
  }
  const armed = run.sword || run.spear != null
  if (input.attack && run.attackCd <= 0 && armed && run.stam >= 10 && run.swing <= 0 && !casting) {
    run.stam -= run.spear ? 8 : 10
    run.attackCd = run.spear ? 0.4 : 0.5
    run.swing = run.spear ? SPEAR_TOTAL : SWING_TOTAL
    run.swingHit = []
    if (run.spear?.perks.includes('lunge')) {
      run.x += Math.cos(run.facing) * 18
      run.y += Math.sin(run.facing) * 18
      run.x = Math.max(-ZONE_W / 2 + PLAYER_R, Math.min(ZONE_W / 2 - PLAYER_R, run.x))
      run.y = Math.max(-ZONE_H / 2 + PLAYER_R, Math.min(ZONE_H / 2 - PLAYER_R, run.y))
      crossZone(run)
    }
  }
  if (run.swing > 0) {
    const total = run.spear ? SPEAR_TOTAL : SWING_TOTAL
    const from = total - run.swing
    run.swing = Math.max(0, run.swing - h)
    const to = total - run.swing
    if (run.spear) connectThrust(run, from, to)
    else connectSwing(run, from, to)
    if (run.swing === 0 && run.swingHit.length === 0) float(run, t('hit.miss'))
  }
  run.blocking = input.block && run.shield != null && run.shield > 0 && run.swing <= 0
  if (input.use) useItem(run, input.use)
  releaseDrops(run)
  if (input.interact) openNear(run)
  tickStairs(run, h)
  if ((run.floorCue ?? 0) > 0) run.floorCue = Math.max(0, (run.floorCue ?? 0) - h)
  tickSoul(run, h, input.soul === true)
  announceBoss(run)

  tickFoes(run, h)
  const inside = standingInExtract(run)
  if (inside && run.hurt <= 0) run.channel = Math.min(EXTRACT_TIME, run.channel + h)
  else run.channel = 0
  if (run.hp <= 0) return 'dead'
  if (run.channel >= EXTRACT_TIME) return 'extracted'
  return 'play'
}

function soulRoll(seed: number): [number, number] {
  let a = (Math.floor(seed) || 1) >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return [next(), next()]
}

const SOUL_START: Array<{ x: number; y: number }> = [
  { x: 48, y: 50 },
  { x: -48, y: 50 },
  { x: 40, y: 90 },
  { x: -40, y: 90 },
]

export function scheduleSoul(seed: number): SoulRite {
  const [, salt] = soulRoll(seed)
  const spot = SOUL_START[Math.floor(salt * SOUL_START.length) % SOUL_START.length]!
  return {
    at: 0,
    salt,
    zone: 'pangkalan',
    x: spot.x,
    y: spot.y,
    phase: 'live',
    told: false,
    cast: 0,
    guard: 0,
    burst: false,
    embers: 0,
  }
}

function announceBoss(run: Run): void {
  if (run.bossTold) return
  const boss = run.foes.find((foe) => foe.kind === 'boss' && foe.zone === run.zone && foe.hp > 0 && !run.slain.includes(foe.id))
  if (!boss) return
  run.bossTold = true
  const need = recommendDamage(run.depth || 1)
  const power = strikeDamage(run)
  const depth = Math.max(1, run.depth || 1)
  const shown = bossDisplay(depthPlan(depth).boss.id, depthPlan(depth).boss.name)
  const name = t('banner.boss', { name: shown, depth })
  run.banner = power < need
    ? { text: t('banner.weak', { power, need }), life: 5, tone: 'weak', key: 'banner.weak', vars: { power, need } }
    : { text: name, life: 4.2, key: 'banner.boss', vars: { name: shown, depth } }
}

function burstSoul(run: Run): void {
  const maxBoss = depthMods(run.depth || 1).bossHp
  for (const foe of run.foes) {
    if (foe.zone !== run.zone || foe.hp <= 0 || run.slain.includes(foe.id)) continue
    const dist = bodyDist(foe, foe.x - run.x, foe.y - run.y)
    if (dist > SOUL_RADIUS) continue
    const cap = foe.maxHp ?? maxBoss
    const dealt = foe.kind === 'boss' ? Math.max(1, Math.round(cap * SOUL_BOSS_FRACTION)) : SOUL_DAMAGE
    foe.hp -= dealt
    foe.flash = 0.28
    float(run, String(dealt))
    if (foe.hp <= 0) slayFoe(run, foe)
    else foe.stun = SOUL_STUN
  }
}

function tickSoul(run: Run, h: number, pressed: boolean): void {
  if (!run.soul) run.soul = scheduleSoul(run.seed || 1)
  const soul = run.soul
  if (run.banner) {
    run.banner.life -= h
    if (run.banner.life <= 0) run.banner = undefined
  }
  if (soul.phase === 'wait') {
    const placed = scheduleSoul(run.seed || 1)
    soul.x = placed.x
    soul.y = placed.y
    soul.zone = 'pangkalan'
    soul.at = 0
    soul.phase = 'live'
    soul.told = false
  }
  if (soul.phase === 'live' && !soul.told) {
    soul.told = true
    const close = soul.zone === run.zone && Math.hypot(soul.x - run.x, soul.y - run.y) < 90
    run.banner = close
      ? { text: t('soul.near'), life: 4.2, key: 'soul.near' }
      : { text: t('soul.far'), life: 4.2, key: 'soul.far' }
  }
  if (pressed) {
    const cast = castSoul(run)
    if (!cast.ok && cast.reason === soulLow()) run.banner = { text: soulLow(), life: 1.4, key: 'soul.low' }
  }
  if (soul.guard > 0) soul.guard = Math.max(0, soul.guard - h)
  if (soul.embers > 0) soul.embers = Math.max(0, soul.embers - h)
  if (soul.cast > 0) {
    const before = soul.cast
    soul.cast = Math.max(0, soul.cast - h)
    if (!soul.burst && before > SOUL_BURST_AT && soul.cast <= SOUL_BURST_AT) {
      soul.burst = true
      soul.embers = Math.max(soul.embers, 0.8)
      burstSoul(run)
    }
  }
}

export function soulNear(run: Run): boolean {
  const soul = run.soul
  if (!soul || soul.phase !== 'live' || soul.zone !== run.zone) return false
  return Math.hypot(soul.x - run.x, soul.y - run.y) <= PICKUP_RADIUS
}

export function claimSoul(run: Run): boolean {
  if (!soulNear(run) || !run.soul) return false
  run.soul.phase = 'held'
  run.banner = { text: t('soul.held'), life: 4.6, key: 'soul.held' }
  return true
}

export function castSoul(run: Run): { ok: true } | { ok: false; reason: string } {
  const soul = run.soul
  if (!soul || soul.phase !== 'held') return { ok: false, reason: t('soul.none') }
  if (soul.cast > 0) return { ok: false, reason: t('soul.busy') }
  if (run.stam <= SOUL_STAM) return { ok: false, reason: soulLow() }
  run.stam = SOUL_STAM
  soul.phase = 'spent'
  soul.cast = SOUL_CAST
  soul.guard = SOUL_GUARD
  soul.burst = false
  return { ok: true }
}

export function dropLanded(run: Run, drop: Drop): boolean {
  const hover = drop.hover ?? 0
  if (hover <= 0) return true
  const born = drop.born ?? run.age - hover - 1
  return run.age >= born + hover
}

function releaseDrops(run: Run): void {
  for (const drop of run.drops) {
    if (!drop.handsOff) continue
    if (Math.hypot(drop.x - run.x, drop.y - run.y) > PICKUP_RADIUS + 8) drop.handsOff = false
  }
}

/** Nearest landed, unclaimed drop inside the pickup radius. */
export function claimTarget(run: Run): Drop | null {
  let best: Drop | null = null
  let bestD = PICKUP_RADIUS
  for (const drop of run.drops) {
    if (drop.claimedBy || !dropLanded(run, drop) || drop.handsOff) continue
    const dist = Math.hypot(drop.x - run.x, drop.y - run.y)
    if (dist <= bestD) {
      best = drop
      bestD = dist
    }
  }
  return best
}

export function dropFromBag(run: Run, kind: ItemKind, n: number, coins?: number): { ok: true; left: number; dropped: number } | { ok: false; reason: string } {
  const stack = run.bag.find((item) => item.kind === kind)
  const pool = coins == null ? stack?.units ?? [] : (stack?.units ?? []).filter((unit) => unit.coins === coins)
  const takeN = Math.max(0, Math.min(Math.floor(n), pool.length || count(run.bag, kind)))
  if (takeN <= 0 || !stack) return { ok: false, reason: t('err.notInBag') }
  let units: ItemUnit[] | null
  if (coins == null || !stack.units) units = spendStack(run.bag, kind, takeN)
  else {
    const taken = stack.units.filter((unit) => unit.coins === coins).slice(0, takeN)
    let left = takeN
    stack.units = stack.units.filter((unit) => {
      if (left > 0 && unit.coins === coins) {
        left -= 1
        return false
      }
      return true
    })
    stack.n = stack.units.length
    if (stack.n <= 0) run.bag.splice(run.bag.indexOf(stack), 1)
    units = taken
  }
  if (!units) return { ok: false, reason: t('err.notInBag') }
  for (let i = 0; i < units.length; i += 1) {
    const ang = (i / units.length) * Math.PI * 2
    const unit = units[i]
    run.drops.push({
      id: `drop-bag-${kind}-${Math.floor(run.age * 1000)}-${i}-${run.drops.length}`,
      kind,
      x: run.x + Math.cos(ang) * 12,
      y: run.y + Math.sin(ang) * 10,
      born: run.age,
      handsOff: true,
      unit,
    })
  }
  float(run, t('hit.drop', { name: spoken(kind) }))
  return { ok: true, left: count(run.bag, kind), dropped: takeN }
}

export function dropFoundSpear(run: Run, id: string): { ok: true } | { ok: false; reason: string } {
  const spear = (run.found ?? []).find((item) => item.id === id)
  if (!spear) return { ok: false, reason: t('err.noSpear') }
  run.found = (run.found ?? []).filter((item) => item.id !== id)
  run.drops.push({
    id: `drop-spear-${id}`,
    kind: 'tombak',
    x: run.x + 12,
    y: run.y + 8,
    born: run.age,
    handsOff: true,
    spear,
  })
  float(run, t('hit.drop', { name: t('item.short.tombak') }))
  return { ok: true }
}

/** First claimant to reach a landed item takes it. Later calls lose. */
export function claimLoot(run: Run, itemId: string, claimant: string): ClaimResult {
  const drop = run.drops.find((item) => item.id === itemId)
  if (!drop) return 'missing'
  if (drop.claimedBy) return 'taken'
  if (!dropLanded(run, drop)) return 'hover'
  if (Math.hypot(drop.x - run.x, drop.y - run.y) > PICKUP_RADIUS) return 'far'
  if (drop.blade) {
    if (!slotFree(run)) {
      float(run, t('hud.bagFull'))
      return 'full'
    }
    run.foundBlades = [...(run.foundBlades ?? []), drop.blade]
    drop.claimedBy = claimant
    run.drops = run.drops.filter((item) => item.id !== itemId)
    notePickup(run, lootTitle(drop))
    return 'ok'
  }
  if (drop.kind === 'tombak') {
    if (!slotFree(run)) {
      float(run, t('hud.bagFull'))
      return 'full'
    }
    const spear = drop.spear ?? rollSpear(drop.id.length * 17 + Math.floor(drop.x))
    run.found = [...(run.found ?? []), spear]
    drop.claimedBy = claimant
    run.drops = run.drops.filter((item) => item.id !== itemId)
    notePickup(run, lootTitle(drop))
    return 'ok'
  }
  if (drop.unit) {
    if (!slotFree(run)) {
      float(run, t('hud.bagFull'))
      return 'full'
    }
    addUnits(run.bag, drop.kind, [drop.unit])
  } else if (!give(run, drop.kind, mixSeed(drop.id.length * 131 + Math.floor(drop.x)))) {
    float(run, t('hud.bagFull'))
    return 'full'
  }
  drop.claimedBy = claimant
  run.drops = run.drops.filter((item) => item.id !== itemId)
  notePickup(run, lootTitle(drop))
  return 'ok'
}

export function runCrates(run: Run): Crate[] {
  return [...cratesFor(run.depth || 1), ...(run.rewards ?? [])]
}

function openNear(run: Run): void {
  if (useProps(run)) return
  if (chipNearestVein(run)) return
  const crate = runCrates(run).find((item) => item.zone === run.zone && !run.opened.includes(item.id) && Math.hypot(item.x - run.x, item.y - run.y) < PROP_REACH)
  if (!crate) return
  openContainer(run, crate)
}

function openContainer(run: Run, crate: Crate): void {
  if (run.opened.includes(crate.id)) return
  run.opened.push(crate.id)
  const total = crate.loot.length + (crate.blade ? 1 : 0)
  crate.loot.forEach((kind, index) => {
    const id = `${crate.id}-${kind}-${index}`
    if (kind === 'tombak') {
      layDrop(run, {
        id,
        kind,
        x: 0,
        y: 0,
        spear: crate.spear ?? rollSpear(run.seed * 13 + index + 1),
      }, crate.x, crate.y, index, total)
      return
    }
    const unit = crate.blade ? bossUnit(run, kind, index) : mintUnit(kind, mixSeed(crate.id.length * 17 + index * 13 + (run.seed || 1)), 'loot')
    layDrop(run, { id, kind, x: 0, y: 0, unit }, crate.x, crate.y, index, total)
  })
  if (crate.blade) {
    layDrop(run, { id: `${crate.id}-blade`, kind: 'sword', x: 0, y: 0, blade: crate.blade }, crate.x, crate.y, crate.loot.length, total)
  }
}

function bossUnit(run: Run, kind: ItemKind, index: number): ItemUnit {
  const rarity: CoinRarity = (run.depth || 1) >= 4 ? 'legenda' : 'pusaka'
  return { rarity, coins: coinsFor(rarity, mixSeed(run.seed * 19 + index * 7 + kind.length)), origin: 'loot' }
}

function softened(run: Run, foe: Foe, dealt: number): number {
  if (!frontGuarded(foe.breed, foe.phase ?? 0)) return dealt
  const toPlayer = Math.atan2(run.y - foe.y, run.x - foe.x)
  const delta = Math.atan2(Math.sin(toPlayer - foe.aim), Math.cos(toPlayer - foe.aim))
  if (Math.abs(delta) > 1) return dealt
  return Math.max(1, Math.round(dealt * GUARD_FACTOR))
}

function foeHurt(run: Run, base: number, fromX: number, fromY: number): void {
  const scale = depthMods(run.depth || 1).foeDamage
  hurtPlayer(run, Math.max(1, Math.round(base * scale)), fromX, fromY)
}

function spawnBossChest(run: Run, foe: Foe): void {
  const id = `boss-chest-${run.depth}`
  if ((run.rewards ?? []).some((crate) => crate.id === id) || run.opened.includes(id)) return
  const bonus: ItemKind = run.depth >= 2 ? 'relic' : 'ore'
  const spear = rollSpear(Math.abs(run.seed) * 31 + run.depth * 17 + 5)
  const spot = indoors(foe.x, foe.y + 22)
  const blade = makeBlade(run.depth || 1, run.seed * 31 + (run.depth || 1))
  run.rewards = [...(run.rewards ?? []), { id, zone: 'sarang', x: spot.x, y: spot.y, loot: ['tombak', bonus], spear, blade }]
}

function indoors(x: number, y: number): { x: number; y: number } {
  const margin = 36
  return {
    x: Math.max(-ZONE_W / 2 + margin, Math.min(ZONE_W / 2 - margin, x)),
    y: Math.max(-ZONE_H / 2 + margin, Math.min(ZONE_H / 2 - margin, y)),
  }
}

function hurtRaw(run: Run, amount: number, fromX: number, fromY: number): void {
  hurtPlayer(run, Math.max(1, Math.round(amount)), fromX, fromY)
}

function tickMarks(run: Run, foe: Foe, h: number): void {
  const explode = foe.kind === 'bomber' || foe.kind === 'boss'
  const next: { x: number; y: number; life: number }[] = []
  for (const mark of foe.marks ?? []) {
    mark.life -= h
    if (explode && mark.life <= 0) {
      if (Math.hypot(mark.x - run.x, mark.y - run.y) < 36) hurtRaw(run, foe.damage ?? 24, mark.x, mark.y)
      continue
    }
    if (!explode && mark.life > 0 && Math.hypot(mark.x - run.x, mark.y - run.y) < 16) {
      hurtRaw(run, Math.max(6, Math.round((foe.damage ?? 12) * 0.3)), mark.x, mark.y)
      mark.life = 0
    }
    if (mark.life > 0) next.push(mark)
  }
  foe.marks = next.slice(-4)
}

function tickSpecial(run: Run, foe: Foe, h: number): void {
  if ((foe.stun ?? 0) > 0) {
    foe.stun = Math.max(0, (foe.stun ?? 0) - h)
    return
  }
  foe.cd = Math.max(0, foe.cd - h)
  const dx = run.x - foe.x
  const dy = run.y - foe.y
  const dist = Math.hypot(dx, dy) || 1
  tickMarks(run, foe, h)
  if (foe.bolt) {
    foe.bolt.x += foe.bolt.vx * h
    foe.bolt.y += foe.bolt.vy * h
    const hit = PLAYER_R + (foe.kind === 'boss' ? 10 : 6)
    if (Math.hypot(foe.bolt.x - run.x, foe.bolt.y - run.y) < hit) {
      const pattern = foe.kind === 'boss' ? bossPattern(String(foe.breed), foe.pattern ?? 0, foe.phase ?? 0) : null
      hurtRaw(run, (pattern?.damage ?? foe.damage ?? 14) * rageMul(foe.fought ?? 0), foe.bolt.x, foe.bolt.y)
      if (foe.kind === 'web' || pattern?.kind === 'snare') run.snare = Math.max(run.snare ?? 0, 1.6)
      foe.bolt = null
    } else if (Math.hypot(foe.bolt.x - foe.x, foe.bolt.y - foe.y) > 180) foe.bolt = null
  }
  if (foe.dash > 0) {
    foe.dash -= h
    const pace = foe.kind === 'boss' ? 110 : 150
    foe.x += Math.cos(foe.aim) * pace * h
    foe.y += Math.sin(foe.aim) * pace * h
    if (Math.hypot(foe.x - run.x, foe.y - run.y) < 20) {
      const pattern = foe.kind === 'boss' ? bossPattern(String(foe.breed), foe.pattern ?? 0, foe.phase ?? 0) : null
      hurtRaw(run, (pattern?.damage ?? foe.damage ?? 20) * rageMul(foe.fought ?? 0), foe.x, foe.y)
      foe.dash = 0
      foe.cd = 1.15
    } else if (foe.dash <= 0) foe.cd = 1.05
    pinFoe(foe)
    return
  }
  if (foe.wind > 0) {
    foe.wind -= h
    if (foe.wind <= 0) resolveSpecial(run, foe)
    pinFoe(foe)
    return
  }
  if (foe.kind === 'boss') {
    notePhase(run, foe)
    if (dist > 78) {
      foe.x += (dx / dist) * 16 * h
      foe.y += (dy / dist) * 16 * h
    }
    foe.aim = Math.atan2(dy, dx)
    pinFoe(foe)
    if (foe.cd <= 0 && dist < 156) beginSpecial(run, foe, true)
    return
  }
  steerSpecial(run, foe, h, dx, dy, dist)
  pinFoe(foe)
}

function notePhase(run: Run, foe: Foe): void {
  const before = foe.phase ?? 0
  foe.phase = bossPhaseOf(foe.hp, foe.maxHp ?? foe.hp)
  if (before < 1 && (foe.phase ?? 0) >= 1 && run.banner?.tone !== 'weak') {
    run.banner = { text: t('banner.phase'), life: 2.2, key: 'banner.phase' }
  }
}

function beginSpecial(run: Run, foe: Foe, boss: boolean): void {
  const dx = run.x - foe.x
  const dy = run.y - foe.y
  foe.aim = Math.atan2(dy, dx)
  if (boss) {
    notePhase(run, foe)
    foe.pattern = (foe.pattern ?? 0) + 1
    const pattern = bossPattern(String(foe.breed), foe.pattern, foe.phase ?? 0)
    if (pattern.kind === 'burrow') {
      foe.lurk = { x: run.x, y: run.y }
      foe.hidden = true
    }
    foe.wind = (foe.phase === 1 ? 0.62 : 0.9) * ((foe.fought ?? 0) >= BOSS_RAGE_SEC ? 0.6 : 1)
    return
  }
  foe.wind = foe.kind === 'crusher' ? 1.05 : foe.kind === 'burrow' || foe.kind === 'wisp' ? 0.75 : foe.kind === 'beetle' ? 0.68 : 0.55
  if (foe.kind === 'burrow') {
    foe.lurk = { x: run.x, y: run.y }
    foe.hidden = true
  }
}

function steerSpecial(run: Run, foe: Foe, h: number, dx: number, dy: number, dist: number): void {
  const kind = foe.kind
  foe.hidden = kind === 'burrow' && dist > 110
  if (kind === 'moth' || kind === 'swarm') {
    const orbit = kind === 'swarm' ? 1.6 : 1.15
    foe.x += Math.cos(Math.atan2(dy, dx) + orbit) * (kind === 'swarm' ? 42 : 34) * h
    foe.y += Math.sin(Math.atan2(dy, dx) + orbit) * (kind === 'swarm' ? 42 : 34) * h
    if (foe.cd <= 0 && dist < (kind === 'swarm' ? 36 : 46)) beginSpecial(run, foe, false)
    return
  }
  if (kind === 'burrow') {
    if (foe.cd <= 0 && dist < 130) beginSpecial(run, foe, false)
    return
  }
  if (kind === 'spore' || kind === 'web') {
    const near = kind === 'web' ? 78 : 64
    const far = kind === 'web' ? 140 : 128
    if (dist < near) {
      foe.x -= (dx / dist) * 26 * h
      foe.y -= (dy / dist) * 26 * h
    } else if (dist > far) {
      foe.x += (dx / dist) * 22 * h
      foe.y += (dy / dist) * 22 * h
    }
    if (foe.cd <= 0 && dist < far + 20) beginSpecial(run, foe, false)
    return
  }
  if (kind === 'ember') {
    foe.x += (dx / dist) * 30 * h
    foe.y += (dy / dist) * 30 * h
    foe.marks = [...(foe.marks ?? []), { x: foe.x, y: foe.y, life: 1.1 }].slice(-4)
    if (foe.cd <= 0 && dist < 40) beginSpecial(run, foe, false)
    return
  }
  if (kind === 'bomber') {
    if (dist > 50) {
      foe.x += (dx / dist) * 24 * h
      foe.y += (dy / dist) * 24 * h
    }
    if (foe.cd <= 0 && dist < 150) beginSpecial(run, foe, false)
    return
  }
  if (kind === 'wisp') {
    if (foe.cd <= 0 && dist < 170) beginSpecial(run, foe, false)
    return
  }
  const pace = kind === 'crusher' ? 16 : kind === 'beetle' || kind === 'mole' ? 26 : kind === 'leech' ? 22 : 24
  if (dist > 28) {
    foe.x += (dx / dist) * pace * h
    foe.y += (dy / dist) * pace * h
  }
  foe.aim = Math.atan2(dy, dx)
  const reach = kind === 'crusher' ? 54 : kind === 'beetle' ? 120 : 42
  if (foe.cd <= 0 && dist < reach) beginSpecial(run, foe, false)
}

function resolveSpecial(run: Run, foe: Foe): void {
  const dist = Math.hypot(run.x - foe.x, run.y - foe.y)
  const damage = foe.damage ?? 12
  if (foe.kind === 'boss') {
    const pattern = bossPattern(String(foe.breed), foe.pattern ?? 0, foe.phase ?? 0)
    foe.hidden = false
    const rage = rageMul(foe.fought ?? 0)
    if (pattern.kind === 'bolt' || pattern.kind === 'snare') {
      foe.bolt = { x: foe.x, y: foe.y, vx: Math.cos(foe.aim) * 78 * rage, vy: Math.sin(foe.aim) * 78 * rage }
    } else if (pattern.kind === 'charge') foe.dash = 0.34
    else if (pattern.kind === 'burrow' && foe.lurk) {
      foe.x = foe.lurk.x
      foe.y = foe.lurk.y
      if (Math.hypot(run.x - foe.x, run.y - foe.y) < 26) hurtRaw(run, pattern.damage * rage, foe.x, foe.y)
    } else if (dist < (pattern.kind === 'ring' ? 64 : 52)) hurtRaw(run, pattern.damage * rage, foe.x, foe.y)
    foe.cd = foe.phase === 1 ? 1.05 : 1.45
    return
  }
  foe.hidden = false
  if (foe.kind === 'spore' || foe.kind === 'web') {
    const speed = foe.kind === 'web' ? 62 : 84
    foe.bolt = { x: foe.x, y: foe.y, vx: Math.cos(foe.aim) * speed, vy: Math.sin(foe.aim) * speed }
    foe.cd = foe.kind === 'web' ? 1.7 : 1.45
    return
  }
  if (foe.kind === 'beetle') {
    foe.dash = 0.3
    return
  }
  if (foe.kind === 'burrow' && foe.lurk) {
    foe.x = foe.lurk.x
    foe.y = foe.lurk.y
    if (Math.hypot(run.x - foe.x, run.y - foe.y) < 24) hurtRaw(run, damage, foe.x, foe.y)
    foe.hidden = true
    foe.cd = 1.35
    return
  }
  if (foe.kind === 'wisp') {
    foe.x = run.x - Math.cos(foe.aim) * 18
    foe.y = run.y - Math.sin(foe.aim) * 18
    if (Math.hypot(run.x - foe.x, run.y - foe.y) < 28) hurtRaw(run, damage, foe.x, foe.y)
    foe.cd = 1.25
    return
  }
  if (foe.kind === 'bomber') {
    foe.marks = [...(foe.marks ?? []), { x: foe.x, y: foe.y, life: 0.85 }].slice(-3)
    foe.cd = 1.6
    return
  }
  if (dist < (foe.kind === 'crusher' ? 48 : foe.kind === 'moth' || foe.kind === 'swarm' ? 30 : 36)) {
    hurtRaw(run, damage, foe.x, foe.y)
    if (foe.kind === 'leech') foe.hp = Math.min(foe.maxHp ?? foe.hp, foe.hp + Math.round(damage * 0.4))
  }
  foe.cd = foe.kind === 'swarm' ? 0.7 : foe.kind === 'crusher' ? 1.6 : 1.15
}

function tickFoes(run: Run, h: number): void {
  for (const foe of run.foes) {
    foe.flash = Math.max(0, foe.flash - h)
    foe.glance = Math.max(0, (foe.glance ?? 0) - h)
    foe.dash = Math.max(0, foe.dash || 0)
    if (foe.kind === 'boss' && foe.zone === run.zone && foe.hp > 0 && !run.slain.includes(foe.id)) {
      const before = foe.fought ?? 0
      foe.fought = before + h
      if (before < BOSS_RAGE_SEC && foe.fought >= BOSS_RAGE_SEC && run.banner?.tone !== 'weak') {
        run.banner = { text: t('banner.rage'), life: 2.6, key: 'banner.rage' }
      }
    }
    if ((foe.bleed ?? 0) > 0 && foe.hp > 0 && !run.slain.includes(foe.id) && foe.zone === run.zone) {
      const prev = foe.bleed ?? 0
      foe.bleed = Math.max(0, prev - h)
      if (Math.floor(prev * 2) !== Math.floor((foe.bleed ?? 0) * 2)) {
        foe.hp -= 3
        foe.flash = 0.1
        if (foe.hp <= 0) slayFoe(run, foe)
      }
    }
    if (run.slain.includes(foe.id) || foe.hp <= 0 || foe.zone !== run.zone) continue
    if (run.zone === 'kamar' && foe.room && foe.room !== run.roomId) continue
    if ((foe.heard ?? 0) > 0) {
      foe.heard = Math.max(0, (foe.heard ?? 0) - h)
      const hx = run.x - foe.x
      const hy = run.y - foe.y
      const hd = Math.hypot(hx, hy) || 1
      if (hd > 24) {
        const pull = foe.kind === 'boss' ? 8 : 52
        foe.x += (hx / hd) * pull * h
        foe.y += (hy / hd) * pull * h
        pinFoe(foe)
      }
      if (foe.cd > 0.2) foe.cd = 0.2
    }
    if (isSpecial(foe)) {
      tickSpecial(run, foe, h)
      continue
    }
    if ((foe.stun ?? 0) > 0) {
      foe.stun = Math.max(0, (foe.stun ?? 0) - h)
      continue
    }
    foe.cd = Math.max(0, foe.cd - h)
    const dx = run.x - foe.x
    const dy = run.y - foe.y
    const dist = Math.hypot(dx, dy) || 1
    if (foe.bolt) {
      foe.bolt.x += foe.bolt.vx * h
      foe.bolt.y += foe.bolt.vy * h
      const boltHit = PLAYER_R + (foe.kind === 'boss' ? 10 : 6)
      if (Math.hypot(foe.bolt.x - run.x, foe.bolt.y - run.y) < boltHit) {
        foeHurt(run, (foe.kind === 'boss' ? 16 : 14) * rageMul(foe.fought ?? 0), foe.bolt.x, foe.bolt.y)
        foe.bolt = null
      } else if (Math.hypot(foe.bolt.x - foe.x, foe.bolt.y - foe.y) > 160) foe.bolt = null
    }
    if (foe.dash > 0) {
      foe.dash -= h
      foe.x += Math.cos(foe.aim) * 150 * h
      foe.y += Math.sin(foe.aim) * 150 * h
      if (Math.hypot(foe.x - run.x, foe.y - run.y) < 18) {
        foeHurt(run, 20, foe.x, foe.y)
        foe.dash = 0
        foe.cd = 1.35
      } else if (foe.dash <= 0) foe.cd = 1.35
      pinFoe(foe)
      if (foe.kind === 'boss') syncCentipede(foe)
      continue
    }
    if (foe.wind > 0) {
      foe.wind -= h
      if (foe.wind <= 0) resolveFoe(run, foe, dist)
      pinFoe(foe)
      if (foe.kind === 'boss') syncCentipede(foe)
      continue
    }
    if (foe.kind === 'crab' && dist > 36) {
      foe.x += (dx / dist) * 28 * h
      foe.y += (dy / dist) * 28 * h
    } else if (foe.kind === 'brute' && dist > 46) {
      foe.x += (dx / dist) * 22 * h
      foe.y += (dy / dist) * 22 * h
    } else if (foe.kind === 'boss' && dist > 64) {
      foe.x += (dx / dist) * 16 * h
      foe.y += (dy / dist) * 16 * h
    }
    pinFoe(foe)
    if (foe.kind === 'boss') syncCentipede(foe)
    const reach = foe.kind === 'crab' ? 48 : foe.kind === 'brute' ? 110 : foe.kind === 'lurker' ? 78 : foe.kind === 'boss' ? 150 : 130
    if (foe.cd <= 0 && dist < reach) {
      foe.aim = Math.atan2(dy, dx)
      if (foe.kind === 'boss') foe.pattern = ((foe.pattern ?? 0) + 1) % 2
      const rageWind = foe.kind === 'boss' && (foe.fought ?? 0) >= BOSS_RAGE_SEC ? 0.6 : 1
      foe.wind = (foe.kind === 'crab' ? 0.55 : foe.kind === 'spitter' ? 0.75 : foe.kind === 'brute' ? 0.72 : foe.kind === 'lurker' ? 0.8 : foe.pattern === 0 ? 0.9 : 0.7) * rageWind
    }
  }
}

function resolveFoe(run: Run, foe: Foe, dist: number): void {
  if (foe.kind === 'crab') {
    const aim = Math.atan2(run.y - foe.y, run.x - foe.x)
    const delta = Math.atan2(Math.sin(aim - foe.aim), Math.cos(aim - foe.aim))
    if (dist < 42 && Math.abs(delta) < 0.7) foeHurt(run, 18, foe.x, foe.y)
    foe.cd = 1.1
    return
  }
  if (foe.kind === 'spitter') {
    foe.bolt = { x: foe.x, y: foe.y, vx: Math.cos(foe.aim) * 70, vy: Math.sin(foe.aim) * 70 }
    foe.cd = 1.6
    return
  }
  if (foe.kind === 'brute') {
    foe.dash = 0.28
    return
  }
  if (foe.kind === 'lurker') {
    if (dist < 40) foeHurt(run, 16, foe.x, foe.y)
    foe.cd = 1.5
    return
  }
    const rage = rageMul(foe.fought ?? 0)
    if ((foe.pattern ?? 0) === 0) {
    if (dist < 56) foeHurt(run, 22 * rage, foe.x, foe.y)
    foe.cd = rage > 1 ? 1.05 : 1.7
    return
  }
  foe.bolt = { x: foe.x, y: foe.y, vx: Math.cos(foe.aim) * 58 * rage, vy: Math.sin(foe.aim) * 58 * rage }
  foe.cd = rage > 1 ? 1.05 : 1.7
}

function pinFoe(foe: Foe): void {
  const edge = foe.kind === 'boss' ? BOSS_INSET : 10
  foe.x = Math.max(-ZONE_W / 2 + edge, Math.min(ZONE_W / 2 - edge, foe.x))
  foe.y = Math.max(-ZONE_H / 2 + edge, Math.min(ZONE_H / 2 - edge, foe.y))
}

function crossZone(run: Run): void {
  if (run.zone === 'kamar') return
  const left = -ZONE_W / 2 + PLAYER_R
  const right = ZONE_W / 2 - PLAYER_R
  const top = -ZONE_H / 2 + PLAYER_R
  const bottom = ZONE_H / 2 - PLAYER_R
  if (run.zone === 'pangkalan' && run.y >= bottom - 0.01) {
    run.zone = 'tambang'
    run.y = top + 36
  } else if (run.zone === 'tambang' && run.y <= top + 0.01) {
    run.zone = 'pangkalan'
    run.y = bottom - 36
  } else if (run.zone === 'tambang' && run.x >= right - 0.01) {
    run.zone = 'reruntuhan'
    run.x = left + 36
  } else if (run.zone === 'reruntuhan' && run.x <= left + 0.01) {
    run.zone = 'tambang'
    run.x = right - 36
  } else if (run.zone === 'reruntuhan' && run.y >= bottom - 0.01 && throughNestDoor(run.x)) {
    run.zone = 'sarang'
    run.y = top + 36
    run.x = Math.max(-NEST_DOOR, Math.min(NEST_DOOR, run.x))
  } else if (run.zone === 'sarang' && run.y <= top + 0.01 && throughNestDoor(run.x)) {
    run.zone = 'reruntuhan'
    run.y = bottom - 36
    run.x = Math.max(-NEST_DOOR, Math.min(NEST_DOOR, run.x))
  }
}

export function ensureChart(run: Run): void {
  const depth = Math.max(1, Math.min(DEPTH_CAP, run.depth || 1))
  const seed = Math.floor(run.seed) || 1
  if (!run.chart || run.chart.depth !== depth || run.chart.seed !== seed) {
    run.chart = generateFloor(depth, seed)
    run.seenRooms = []
    run.flags = []
    run.roomClock = 0
  }
  if (!run.flags) run.flags = []
  if (!run.seenRooms) run.seenRooms = []
  if (run.keys == null) run.keys = 0
  const spine = run.zone === 'kamar' ? roomAt(run.chart, run.roomId) : spineRoom(run.chart, run.zone)
  if (!run.roomId || !roomAt(run.chart, run.roomId) || (run.zone !== 'kamar' && spine && run.roomId !== spine.id && roomAt(run.chart, run.roomId)?.zone !== 'kamar')) {
    run.roomId = spine?.id ?? run.chart.rooms[0]?.id
  }
  if (run.roomId && !run.seenRooms.includes(run.roomId)) run.seenRooms.push(run.roomId)
  for (const spawn of run.chart.spawns) {
    if (run.foes.some((foe) => foe.id === spawn.id)) continue
    run.foes.push(spawnFoe(spawn))
  }
}

function spawnFoe(spawn: SpawnNode): Foe {
  return {
    id: spawn.id,
    zone: spawn.zone,
    kind: (spawn.kind === 'boss' ? 'brute' : spawn.kind) as Foe['kind'],
    x: spawn.x,
    y: spawn.y,
    hp: spawn.hp,
    maxHp: spawn.hp,
    damage: spawn.damage,
    breed: spawn.breed,
    wind: 0,
    aim: 0,
    cd: 0.8,
    bolt: null,
    flash: 0,
    dash: 0,
    pattern: 0,
    phase: 0,
    room: spawn.room,
    elite: spawn.elite,
  }
}

function standingInExtract(run: Run): boolean {
  if (Math.hypot(run.x - EXTRACT.x, run.y - EXTRACT.y) > EXTRACT.r) return false
  if (run.zone === 'pangkalan') return true
  const room = run.chart ? roomAt(run.chart, run.roomId) : null
  return room?.role === 'extract' || room?.role === 'fast'
}

function tickDungeon(run: Run, dt: number): void {
  if (run.bits) {
    for (const bit of run.bits) {
      bit.life -= dt
      bit.x += bit.vx * dt
      bit.y += bit.vy * dt
    }
    run.bits = run.bits.filter((bit) => bit.life > 0)
  }
  if (run.booms) {
    for (const boom of run.booms) boom.life -= dt
    run.booms = run.booms.filter((boom) => boom.life > 0)
  }
  ensureChart(run)
  const chart = run.chart
  if (!chart) return
  let room = roomAt(chart, run.roomId)
  if (!room || (run.zone !== 'kamar' && room.zone !== run.zone)) room = spineRoom(chart, run.zone)
  if (!room) return
  if (run.roomId !== room.id) {
    run.roomId = room.id
    run.roomClock = 0
    enterRoom(run, room)
  }
  run.roomClock = (run.roomClock ?? 0) + dt
  if (!run.seenRooms) run.seenRooms = []
  if (!run.seenRooms.includes(room.id)) run.seenRooms.push(room.id)
  run.gloom = room.event === 'dark' ? 1 : 0
  tickEvent(run, room)
  tickHazard(run, room)
  tickFuses(run, dt)
  tryDoor(run, room)
}

function enterRoom(run: Run, room: RoomNode): void {
  const flag = `enter:${room.id}`
  if (!run.flags) run.flags = []
  if (run.flags.includes(flag)) return
  run.flags.push(flag)
  if (room.event === 'ambush') {
    float(run, t('room.ambush'))
    burstFoes(run, room, 2, 'ambush')
  }
  if (room.event === 'dark') float(run, t('room.dark'))
  if (room.event === 'collapse') float(run, t('room.fall'))
  if (room.event === 'timed') float(run, t('room.door'))
}

function burstFoes(run: Run, room: RoomNode, count: number, tag: string): void {
  for (let i = 0; i < count; i += 1) {
    const breed = room.mix[i % room.mix.length] ?? 'crab'
    const shift = layoutShift(room.layout, i)
    const hp = Math.round((40 + (run.depth || 1) * 16) * (1 + ((run.depth || 1) - 1) * 0.1))
    run.foes.push(spawnFoe({
      id: `${room.id}-${tag}-${i}`,
      room: room.id,
      zone: room.zone,
      kind: breed,
      breed,
      x: shift.x,
      y: shift.y,
      hp,
      damage: 12 + (run.depth || 1) * 4,
      elite: false,
    }))
  }
}

function roomClear(run: Run, roomId: string): boolean {
  return run.foes.every((foe) => foe.room !== roomId || foe.hp <= 0 || run.slain.includes(foe.id))
}

function tickEvent(run: Run, room: RoomNode): void {
  if (!run.flags) run.flags = []
  if (room.event === 'waves' && roomClear(run, room.id) && !run.flags.includes(`wave:${room.id}`)) {
    run.flags.push(`wave:${room.id}`)
    float(run, t('room.wave'))
    burstFoes(run, room, Math.min(4, 1 + Math.floor((run.depth || 1) / 2)), 'wave')
  }
  if (room.event === 'collapse' && (run.roomClock ?? 0) > 1.6) {
    const tick = Math.floor((run.roomClock ?? 0) / 1.5)
    const mark = `fall:${room.id}:${tick}`
    if (!run.flags.includes(mark)) {
      run.flags.push(mark)
      hurtPlayer(run, 12, run.x, run.y - 20)
    }
  }
}

function tickHazard(run: Run, room: RoomNode): void {
  const chart = run.chart
  if (!chart) return
  for (const prop of chart.props) {
    if (prop.room !== room.id || prop.state === 'spent') continue
    if (prop.kind !== 'puddle' && prop.kind !== 'lava' && prop.kind !== 'web' && prop.kind !== 'thorn' && prop.kind !== 'debris') continue
    if (Math.hypot(prop.x - run.x, prop.y - run.y) > 18) continue
    if (prop.kind === 'web') {
      run.snare = Math.max(run.snare ?? 0, 1.1)
      continue
    }
    const mark = `hurt:${prop.id}:${Math.floor(run.age * 2)}`
    if (run.flags?.includes(mark)) continue
    run.flags?.push(mark)
    const amount = prop.kind === 'lava' ? 16 : prop.kind === 'puddle' ? 8 : 14
    hurtPlayer(run, amount, prop.x, prop.y)
  }
}

function doorAllowed(run: Run, room: RoomNode, door: { lock: string; to: string }): boolean {
  if (door.lock === 'none') return true
  if (door.lock === 'combat') return roomClear(run, room.id)
  if (door.lock === 'secret') return !!run.flags?.includes(`secret:${door.to}`)
  if (door.lock === 'timed') return !!run.flags?.includes(`lever:${room.id}`) || (run.roomClock ?? 0) < 8
  return true
}

function tryDoor(run: Run, room: RoomNode): void {
  for (const door of room.doors) {
    if (door.to.startsWith('room-mine') || door.to.startsWith('room-ruin') || door.to.startsWith('room-boss') || door.to === 'room-start') {
      if (room.zone !== 'kamar') continue
    }
    if (!nearPad(run.x, run.y, door.dir)) continue
    if (!doorAllowed(run, room, door)) {
      if (!crackInReach(run)) float(run, t('room.shut'))
      const pad = doorPad(door.dir)
      run.x += Math.sign(run.x - pad.x) || (door.dir === 'w' ? 1 : door.dir === 'e' ? -1 : 0)
      run.y += door.dir === 'n' ? 8 : door.dir === 's' ? -8 : 0
      return
    }
    const next = run.chart ? roomAt(run.chart, door.to) : null
    if (!next) return
    const back = door.dir === 'n' ? 's' : door.dir === 's' ? 'n' : door.dir === 'w' ? 'e' : 'w'
    const land = doorPad(back)
    run.zone = next.zone
    run.roomId = next.id
    run.x = land.x + (back === 'w' ? 36 : back === 'e' ? -36 : 0)
    run.y = land.y + (back === 'n' ? 36 : back === 's' ? -36 : 0)
    run.roomClock = 0
    enterRoom(run, next)
    return
  }
}

function strikeVeins(run: Run): void {
  const chart = run.chart
  if (!chart) return
  for (const vein of chart.veins) {
    if (vein.hp <= 0 || run.swingHit.includes(vein.id)) continue
    if (vein.zone !== run.zone || vein.room !== run.roomId) continue
    const dx = vein.x - run.x
    const dy = vein.y - run.y
    const dist = Math.hypot(dx, dy)
    if (dist > SWING_REACH) continue
    const sample = Math.atan2(Math.sin(Math.atan2(dy, dx) - run.facing), Math.cos(Math.atan2(dy, dx) - run.facing))
    if (dist > 12 && Math.abs(sample) > 1.15) continue
    vein.hp -= 1
    run.swingHit.push(vein.id)
    miningNoise(run, vein.x, vein.y)
    if (vein.hp > 0) {
      float(run, t('ore.vein'))
      continue
    }
    grantVein(run, vein)
  }
}

function grantVein(run: Run, vein: VeinNode): void {
  const need = vein.big ? 3 : 1
  for (let i = 0; i < need; i += 1) {
    const coins = oreValue(vein.rarity, mixSeed(vein.id.length * 19 + (run.seed || 1) + i * 5))
    layDrop(run, {
      id: `ore-${vein.id}-${i}`,
      kind: 'ore',
      x: 0,
      y: 0,
      ore: vein.ore,
      unit: { rarity: vein.rarity, coins, origin: 'loot' },
    }, vein.x, vein.y, i, need)
  }
}

export function nearestVein(run: Run): VeinNode | null {
  const chart = run.chart
  if (!chart) return null
  let best: VeinNode | null = null
  let bestD = PROP_REACH
  for (const vein of chart.veins) {
    if (vein.hp <= 0 || vein.room !== run.roomId) continue
    const dist = Math.hypot(vein.x - run.x, vein.y - run.y)
    if (dist < bestD) {
      best = vein
      bestD = dist
    }
  }
  return best
}

function chipNearestVein(run: Run): boolean {
  const vein = nearestVein(run)
  if (!vein) return false
  vein.hp -= 1
  miningNoise(run, vein.x, vein.y)
  if (vein.hp > 0) float(run, t('ore.vein'))
  else grantVein(run, vein)
  return true
}

export function miningNoise(run: Run, x: number, y: number): number {
  let pulled = 0
  for (const foe of run.foes) {
    if (foe.hp <= 0 || run.slain.includes(foe.id) || foe.zone !== run.zone) continue
    if (run.zone === 'kamar' && foe.room && foe.room !== run.roomId) continue
    if (Math.hypot(foe.x - x, foe.y - y) > 180) continue
    foe.heard = 5.5
    foe.cd = Math.min(foe.cd, 0.15)
    pulled += 1
  }
  if (pulled > 0) float(run, t('ore.noise'))
  return pulled
}

const BARREL_R = 10

function slashHits(run: Run, x: number, y: number, radius: number, lo: number, hi: number): boolean {
  const dx = x - run.x
  const dy = y - run.y
  const dist = Math.hypot(dx, dy)
  if (dist - radius > SWING_REACH) return false
  const sample = Math.atan2(Math.sin(Math.atan2(dy, dx) - run.facing), Math.cos(Math.atan2(dy, dx) - run.facing))
  if (dist <= radius + 8) return Math.abs(sample) <= Math.PI / 2
  return sample >= lo && sample <= hi && Math.abs(sample) <= Math.PI / 2 + 0.05
}

function strikeBarrels(run: Run, lo: number, hi: number): void {
  const chart = run.chart
  if (!chart) return
  for (const prop of chart.props) {
    if (prop.kind !== 'barrel' || prop.state !== 'live' || prop.room !== run.roomId) continue
    if (run.swingHit.includes(prop.id)) continue
    if (!slashHits(run, prop.x, prop.y, BARREL_R, lo, hi)) continue
    run.swingHit.push(prop.id)
    lightFuse(run, prop, FUSE_TIME)
  }
}

function strikeCracks(run: Run, lo: number, hi: number): void {
  const chart = run.chart
  if (!chart) return
  for (const prop of chart.props) {
    if (prop.kind !== 'crack' || prop.state !== 'live' || prop.room !== run.roomId) continue
    if (run.swingHit.includes(prop.id)) continue
    if (!slashHits(run, prop.x, prop.y, 8, lo, hi)) continue
    run.swingHit.push(prop.id)
    chipCrack(run, prop)
  }
}

function fuseInterval(left: number, max: number): number {
  const k = Math.max(0, Math.min(1, left / Math.max(0.05, max)))
  return 0.08 + 0.24 * k
}

/** Starts or shortens a barrel fuse. A shorter fuse already burning is left alone. */
function lightFuse(run: Run, prop: PropNode, seconds: number): void {
  if (prop.kind !== 'barrel' || prop.state !== 'live') return
  if (prop.fuse != null && prop.fuse > 0 && prop.fuse <= seconds + 0.001) return
  prop.fuse = seconds
  prop.fuseMax = seconds
  prop.tickAt = fuseInterval(seconds, seconds)
  run.fuseTick = (run.fuseTick ?? 0) + 1
}

function tickFuses(run: Run, dt: number): void {
  const chart = run.chart
  if (!chart) return
  const due: PropNode[] = []
  for (const prop of chart.props) {
    if (prop.kind !== 'barrel' || prop.state !== 'live' || prop.fuse == null || prop.fuse <= 0) continue
    prop.fuse -= dt
    prop.tickAt = (prop.tickAt ?? 0) - dt
    if (prop.tickAt <= 0 && prop.fuse > 0) {
      run.fuseTick = (run.fuseTick ?? 0) + 1
      prop.tickAt = fuseInterval(prop.fuse, prop.fuseMax ?? prop.fuse)
    }
    if (prop.fuse <= 0) due.push(prop)
  }
  for (const prop of due) {
    if (prop.state === 'live') blowBarrel(run, prop)
  }
}

function blowBarrel(run: Run, prop: PropNode): void {
  prop.state = 'spent'
  prop.fuse = 0
  float(run, t('room.boom'))
  spillLoot(run, prop)
  run.shake = 0.22
  run.boomPing = (run.boomPing ?? 0) + 1
  run.booms = [...(run.booms ?? []), { x: prop.x, y: prop.y, life: 0.5 }]
  if (Math.hypot(run.x - prop.x, run.y - prop.y) <= BLAST_RADIUS) hurtPlayer(run, 18, prop.x, prop.y)
  for (const foe of run.foes) {
    if (foe.zone !== run.zone || foe.hp <= 0 || run.slain.includes(foe.id)) continue
    if (run.zone === 'kamar' && foe.room && foe.room !== run.roomId) continue
    if (Math.hypot(foe.x - prop.x, foe.y - prop.y) > BLAST_RADIUS) continue
    foe.hp -= 24
    foe.flash = 0.2
    if (foe.hp <= 0) slayFoe(run, foe)
  }
  const chart = run.chart
  if (!chart) return
  for (const other of chart.props) {
    if (other === prop || other.kind !== 'barrel' || other.state !== 'live' || other.room !== prop.room) continue
    if (Math.hypot(other.x - prop.x, other.y - prop.y) > BLAST_RADIUS + BARREL_R) continue
    lightFuse(run, other, CHAIN_FUSE)
  }
}

export const PROP_REACH = 52

export function usableProp(run: Run): PropNode | null {
  const chart = run.chart
  if (!chart) return null
  let best: PropNode | null = null
  let bestD = PROP_REACH
  for (const prop of chart.props) {
    if (prop.room !== run.roomId || prop.state === 'spent') continue
    if (prop.kind === 'crack' && prop.state === 'open') continue
    if (prop.kind === 'chest' && prop.state === 'open') continue
    if (prop.kind === 'puddle' || prop.kind === 'lava' || prop.kind === 'web' || prop.kind === 'debris' || prop.kind === 'thorn') continue
    const dist = Math.hypot(prop.x - run.x, prop.y - run.y)
    if (dist < bestD) {
      best = prop
      bestD = dist
    }
  }
  return best
}

function crackInReach(run: Run): boolean {
  return !!run.chart?.props.some((prop) => prop.kind === 'crack' && prop.room === run.roomId && prop.state === 'live' && Math.hypot(prop.x - run.x, prop.y - run.y) < PROP_REACH + 8)
}

function chipCrack(run: Run, prop: PropNode): void {
  const left = prop.hp ?? 3
  if (left <= 0 || prop.state === 'open') return
  prop.hp = left - 1
  miningNoise(run, prop.x, prop.y)
  const bits = run.bits ?? []
  for (let i = 0; i < 5; i += 1) {
    const ang = (i / 5) * Math.PI * 2
    bits.push({ x: prop.x, y: prop.y, vx: Math.cos(ang) * 36, vy: Math.sin(ang) * 28, life: 0.35 })
  }
  run.bits = bits.slice(-24)
  if ((prop.hp ?? 0) > 0) {
    float(run, t('prop.chip', { n: 3 - (prop.hp ?? 0) }))
    return
  }
  const room = run.chart ? roomAt(run.chart, run.roomId) : null
  const door = room?.doors.find((item) => item.lock === 'secret')
  if (door) run.flags = [...(run.flags ?? []), `secret:${door.to}`]
  prop.state = 'open'
  prop.hp = 0
  float(run, t('room.crack'))
}

function useProps(run: Run): boolean {
  const chart = run.chart
  if (!chart) return false
  const prop = usableProp(run)
  if (!prop || prop.state !== 'live') return false
  if (prop.kind === 'shrine') {
    if (run.flags?.includes(`rest:${prop.id}`)) {
      float(run, t('room.dry'))
      return true
    }
    run.flags = [...(run.flags ?? []), `rest:${prop.id}`]
    run.hp = Math.min(HP_MAX, run.hp + 8)
    prop.state = 'spent'
    float(run, t('room.pool', { n: 8 }))
    return true
  }
  if (prop.kind === 'crack') {
    chipCrack(run, prop)
    return true
  }
  if (prop.kind === 'lever') {
    run.flags = [...(run.flags ?? []), `lever:${prop.room}`]
    prop.state = 'spent'
    float(run, t('room.door'))
    return true
  }
  if (prop.kind === 'chest') {
    if (prop.lock === 'key' && (run.keys ?? 0) <= 0) {
      float(run, t('room.locked'))
      return true
    }
    if (prop.lock === 'key') run.keys = Math.max(0, (run.keys ?? 0) - 1)
    prop.state = 'open'
    spillLoot(run, prop)
    return true
  }
  if (prop.kind === 'crate') {
    prop.state = 'spent'
    spillLoot(run, prop)
    float(run, t('room.wood'))
    return true
  }
  if (prop.kind === 'barrel') {
    lightFuse(run, prop, FUSE_TIME)
    return true
  }
  if (prop.kind === 'vendor') return false
  return false
}

function spillLoot(run: Run, prop: PropNode): void {
  prop.loot.forEach((kind, index) => {
    const rarity = kind === 'relic' ? 'pusaka' : kind === 'shard' ? 'langka' : 'biasa'
    const coins = oreValue(rarity, mixSeed(prop.id.length + index))
    layDrop(run, {
      id: `${prop.id}-${kind}-${index}`,
      kind,
      x: 0,
      y: 0,
      unit: { rarity, coins, origin: 'loot' },
    }, prop.x, prop.y, index, prop.loot.length)
  })
}

/** Keeps a spilled item on the open floor, a short step away from its source. */
function floorSpot(x: number, y: number): { x: number; y: number } {
  const edgeX = ZONE_W / 2 - 28
  const edgeY = ZONE_H / 2 - 28
  return {
    x: Math.max(-edgeX, Math.min(edgeX, x)),
    y: Math.max(-edgeY, Math.min(edgeY, y)),
  }
}

function layDrop(run: Run, drop: Drop, fromX: number, fromY: number, index: number, count: number): void {
  const ang = -Math.PI / 2 + (index - (Math.max(1, count) - 1) / 2) * 0.7
  const dist = count <= 1 ? 12 : 14
  const spot = floorSpot(fromX + Math.cos(ang) * dist, fromY + Math.sin(ang) * dist * 0.8)
  drop.x = spot.x
  drop.y = spot.y
  drop.born = run.age
  drop.hover = 0.58
  drop.fromX = fromX
  drop.fromY = fromY
  run.drops.push(drop)
}

function pulseBag(run: Run): void {
  run.bagPulse = 0.45
}

/** Seller goods go into the bag. A full bag leaves the purchase on the stall floor. */
function pocketUnit(run: Run, kind: ItemKind, unit: ItemUnit, id: string): void {
  if (kind === 'sword') return
  if (slotFree(run)) {
    addUnits(run.bag, kind, [unit])
    notePickup(run, lootTitle({ kind }))
    return
  }
  layDrop(run, { id, kind, x: 0, y: 0, unit }, run.x, run.y, run.drops.length, 1)
  float(run, t('hud.bagFull'))
}

export const FIELD_PRICE = { bandage: 40, tonic: 32 } as const

export function fieldBuy(save: ExtractSave, kind: 'bandage' | 'tonic'): string {
  const run = save.run
  if (!run?.chart) return ''
  const vendor = run.chart.props.find((item) => item.kind === 'vendor' && item.room === run.roomId && item.state === 'live' && Math.hypot(item.x - run.x, item.y - run.y) < PROP_REACH)
  if (!vendor) return ''
  const price = FIELD_PRICE[kind]
  if (save.coins < price) return t('shop.poor')
  save.coins -= price
  pocketUnit(run, kind, { rarity: 'biasa', coins: kind === 'bandage' ? 8 : 6, origin: 'loot' }, `vendor-${kind}-${Math.floor(run.age * 1000)}-${run.x}`)
  vendor.state = 'spent'
  return ''
}

const visibleFoes: Foe[] = []

/** Foes in the current room. The returned array is reused next call. */
export function foeView(run: Run): Foe[] {
  visibleFoes.length = 0
  const slain = run.slain
  for (let i = 0; i < run.foes.length; i += 1) {
    const foe = run.foes[i]!
    if (foe.hp <= 0 || slain.includes(foe.id) || foe.zone !== run.zone) continue
    if (run.zone === 'kamar' && foe.room && foe.room !== run.roomId) continue
    visibleFoes.push(foe)
  }
  return visibleFoes
}

export function floorBossDown(run: Run): boolean {
  const boss = run.foes.find((foe) => foe.kind === 'boss')
  return !!boss && run.slain.includes(boss.id)
}

export function stairsOpen(run: Run): boolean {
  return (run.depth || 1) < DEPTH_CAP && floorBossDown(run)
}

export function onStairs(run: Run): boolean {
  return run.zone === 'sarang' && Math.hypot(run.x - STAIRS.x, run.y - STAIRS.y) <= STAIRS.r
}

/** Drop to the next floor. Bag, weapons, and insurance stay. HP heals by a quarter of the cap. */
export function descendFloor(run: Run): boolean {
  if (!stairsOpen(run)) return false
  const next = (run.depth || 1) + 1
  run.hp = Math.min(HP_MAX, run.hp + Math.round(HP_MAX * FLOOR_HEAL))
  run.depth = next
  run.zone = 'pangkalan'
  run.x = 0
  run.y = 70
  run.facing = Math.PI / 2
  run.seed = (run.seed || 1) + next * 13
  run.foes = spawnRoster(next, run.seed)
  run.slain = []
  run.opened = []
  run.drops = []
  run.rewards = []
  run.explored = []
  run.channel = 0
  run.bossTold = false
  run.banner = undefined
  run.swing = 0
  run.swingHit = []
  run.floorCue = 1.8
  ensureChart(run)
  return true
}

/** Test helper. Puts the same run on another floor without the heal or the walk. */
export function warpFloor(run: Run, depth: number): void {
  const level = Math.max(1, Math.min(DEPTH_CAP, Math.floor(depth) || 1))
  run.depth = level
  run.seed = (run.seed || 1) + level * 13
  run.foes = spawnRoster(level, run.seed)
  run.slain = []
  run.opened = []
  run.drops = []
  run.rewards = []
  run.explored = []
  run.bossTold = false
  run.floorCue = 0
  ensureChart(run)
}

function tickStairs(run: Run, _h: number): void {
  if ((run.depth || 1) >= DEPTH_CAP || !onStairs(run)) return
  if (!stairsOpen(run)) return
  descendFloor(run)
}

export function inExtract(run: Run): boolean {
  return standingInExtract(run)
}

export const EXTRACT_ZONE = EXTRACT

export { foeState }
