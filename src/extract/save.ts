import { asBlade, bladesOf, DEPTH_CAP } from './depths.ts'
import { asSpear, rollSpear, type Spear } from './spear.ts'
import { mintUnit, readUnit, type ItemUnit } from './coins.ts'
import { bagSlotsOf, clampLevel, shieldMaxFor } from './economy.ts'
import { HP_MAX, HP_OLD, SHIELD_MAX, freshSave, scheduleSoul, spawnRoster, type Crate, type Drop, type ExtractSave, type Foe, type Insured, type ItemKind, type Run, type SoulRite, type Stack, type ZoneId } from './sim.ts'

export const EXTRACT_SAVE_KEY = 'npcs-burrow-pixel-extract.save.v1'
const EXTRACT_SAVE_TMP = `${EXTRACT_SAVE_KEY}.tmp`

const KINDS: ItemKind[] = ['sword', 'bandage', 'tonic', 'scrap', 'ore', 'relic', 'shard', 'tombak', 'bilah', 'p3k']
const ZONES: ZoneId[] = ['pangkalan', 'tambang', 'reruntuhan', 'sarang']
const FOE_KINDS = ['crab', 'spitter', 'brute', 'lurker', 'boss', 'moth', 'burrow', 'spore', 'beetle', 'jelly', 'swarm', 'mole', 'web', 'ember', 'leech', 'bomber', 'wisp', 'crusher']

function readSave(raw: string | null): ExtractSave | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed !== 'object' || parsed === null) return null
    return sanitize(parsed)
  } catch {
    return null
  }
}

export function loadExtract(storage: Storage | null): ExtractSave {
  if (!storage) return freshSave()
  const main = readSave(storage.getItem(EXTRACT_SAVE_KEY))
  if (main) return main
  const staged = readSave(storage.getItem(EXTRACT_SAVE_TMP))
  if (staged) {
    try { storage.setItem(EXTRACT_SAVE_KEY, JSON.stringify(staged)) } catch { /* keep the staged copy in memory */ }
    return staged
  }
  return freshSave()
}

export function writeExtract(storage: Storage | null, save: ExtractSave): boolean {
  if (!storage) return false
  let payload = ''
  try {
    payload = JSON.stringify(sanitize(save))
  } catch {
    return false
  }
  try {
    storage.setItem(EXTRACT_SAVE_TMP, payload)
    storage.setItem(EXTRACT_SAVE_KEY, payload)
    storage.removeItem(EXTRACT_SAVE_TMP)
    return true
  } catch {
    return false
  }
}

function sanitize(value: unknown): ExtractSave {
  const save = freshSave()
  if (typeof value !== 'object' || value === null) return save
  const raw = value as { stash?: unknown; support?: unknown; run?: unknown; shield?: unknown; shieldGranted?: unknown; depth?: unknown; ventures?: unknown }
  save.support = clamp(raw.support, 100)
  save.coins = Math.max(0, Math.floor(num((raw as { coins?: unknown }).coins)))
  save.swordLevel = clampLevel(Number((raw as { swordLevel?: unknown }).swordLevel) || 1)
  save.shieldLevel = clampLevel(Number((raw as { shieldLevel?: unknown }).shieldLevel) || 1)
  save.bagSlots = bagSlotsOf(Number((raw as { bagSlots?: unknown }).bagSlots) || 12)
  save.insured = insuredOf((raw as { insured?: unknown }).insured)
  save.shieldGranted = raw.shieldGranted === true
  save.shield = durability(raw.shield, shieldMaxFor(save.shieldLevel))
  save.depth = Math.max(1, Math.min(DEPTH_CAP, Math.floor(num(raw.depth)) || 1))
  const picked = (raw as { chosenDepth?: unknown }).chosenDepth
  save.chosenDepth = picked == null ? save.depth : Math.max(1, Math.min(save.depth, Math.floor(num(picked)) || save.depth))
  save.blades = bladesOf((raw as { blades?: unknown }).blades)
  save.blade = asBlade((raw as { blade?: unknown }).blade)
  save.ventures = Math.max(0, Math.floor(num(raw.ventures)))
  save.spears = spearsOf((raw as { spears?: unknown }).spears)
  save.spear = asSpear((raw as { spear?: unknown }).spear)
  save.run = runOf(raw.run)
  const salt = Math.floor(num((raw as { ventures?: unknown }).ventures)) || 1
  save.stash = Array.isArray(raw.stash) ? stacks(raw.stash, [], salt) : save.run ? [] : freshSave().stash
  save.stash = liftTombak(save.stash, save.spears, 5)
  const scaled = (raw as { hpScaled?: unknown }).hpScaled === true
  if (save.run && !scaled) save.run.hp = Math.min(HP_MAX, Math.max(1, Math.round(save.run.hp * HP_MAX / HP_OLD)))
  save.hpScaled = true
  if (!save.shieldGranted) {
    const carried = save.run?.shield != null
    if (save.shield == null && !carried) save.shield = SHIELD_MAX
    save.shieldGranted = true
  }
  if (save.run) {
    const lifted: Spear[] = []
    save.run.bag = liftTombak(save.run.bag, lifted, 11)
    save.run.found = [...save.run.found, ...lifted]
  }
  return save
}

function liftTombak(list: Stack[], into: Spear[], salt: number): Stack[] {
  const out: Stack[] = []
  let n = 0
  for (const stack of list) {
    if (stack.kind !== 'tombak') {
      out.push(stack)
      continue
    }
    for (let i = 0; i < stack.n; i += 1) into.push(rollSpear(salt * 100 + n++))
  }
  return out
}

function spearsOf(value: unknown): Spear[] {
  if (!Array.isArray(value)) return []
  const list: Spear[] = []
  for (const row of value) {
    const spear = asSpear(row)
    if (spear && !list.some((item) => item.id === spear.id)) list.push(spear)
  }
  return list
}

function durability(value: unknown, cap = SHIELD_MAX): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  const n = Math.floor(value)
  if (n <= 0) return null
  return Math.min(cap, n)
}

function insuredOf(value: unknown): Insured | null {
  if (typeof value !== 'object' || value === null) return null
  const raw = value as { kind?: unknown; unit?: unknown; spear?: unknown }
  const blade = asBlade((raw as { blade?: unknown }).blade)
  if (blade) return { kind: 'sword', blade }
  if (typeof raw.kind !== 'string' || !KINDS.includes(raw.kind as ItemKind) || raw.kind === 'sword') return null
  const spear = asSpear(raw.spear)
  if (raw.kind === 'tombak' && spear) return { kind: 'tombak', spear }
  if (typeof raw.unit === 'object') return { kind: raw.kind as ItemKind, unit: readUnit(raw.unit, raw.kind as ItemKind, 3) }
  return null
}

function stacks(value: unknown, fallback: Stack[], salt: number): Stack[] {
  if (!Array.isArray(value)) return fallback
  const list: Stack[] = []
  for (const row of value) {
    if (typeof row !== 'object' || row === null) continue
    const kind = (row as { kind?: unknown }).kind
    const n = clamp((row as { n?: unknown }).n, 99)
    if (!KINDS.includes(kind as ItemKind) || n <= 0) continue
    const item = kind as ItemKind
    if (item === 'sword') {
      const found = list.find((stack) => stack.kind === 'sword')
      if (found) found.n += n
      else list.push({ kind: 'sword', n })
      continue
    }
    const units = unitsFor(item, n, (row as { units?: unknown }).units, salt + list.length * 50)
    const found = list.find((stack) => stack.kind === item)
    if (found) {
      found.units = [...(found.units ?? []), ...units]
      found.n = found.units.length
    } else list.push({ kind: item, n: units.length, units })
  }
  return list
}

function unitsFor(kind: ItemKind, n: number, raw: unknown, salt: number): ItemUnit[] {
  const units: ItemUnit[] = []
  if (Array.isArray(raw)) {
    for (let i = 0; i < raw.length && units.length < n; i += 1) units.push(readUnit(raw[i], kind, salt + i + 1))
  }
  while (units.length < n) units.push(mintUnit(kind, salt + units.length * 13 + 3, 'stash'))
  return units
}

function runOf(value: unknown): Run | null {
  if (typeof value !== 'object' || value === null) return null
  const raw = value as Partial<Run>
  if (!ZONES.includes(raw.zone as ZoneId)) return null
    const bagSlots = bagSlotsOf(Number((raw as { bagSlots?: unknown }).bagSlots) || 12)
    const shieldLevel = clampLevel(Number((raw as { shieldLevel?: unknown }).shieldLevel) || 1)
    const bag = clampBag(stacks(raw.bag, [], Math.floor(num(raw.seed)) || 1), bagSlots)
  return {
    zone: raw.zone as ZoneId,
    x: num(raw.x),
    y: num(raw.y),
    hp: clamp(raw.hp, HP_MAX),
    stam: clamp(raw.stam, 100),
    facing: num(raw.facing),
    sword: raw.sword === true,
    shield: durability(raw.shield, shieldMaxFor(shieldLevel)),
    blocking: false,
    breakFx: 0,
    bag,
    opened: strings(raw.opened),
    slain: strings(raw.slain),
    drops: drops(raw.drops),
    foes: foesOf(raw.foes, strings(raw.slain), Math.max(1, Math.min(DEPTH_CAP, Math.floor(num(raw.depth)) || 1)), Math.floor(num(raw.seed)) || 1),
    channel: clamp(raw.channel, 3),
    attackCd: clamp(raw.attackCd, 2),
    swing: 0,
    swingHit: [],
    gait: num(raw.gait),
    cape: num(raw.cape),
    age: num(raw.age),
    stepping: false,
    dodge: 0,
    dodgeCd: clamp(raw.dodgeCd, 2),
    hurt: 0,
    floats: [],
    explored: exploredOf(raw.explored),
    depth: Math.max(1, Math.min(DEPTH_CAP, Math.floor(num(raw.depth)) || 1)),
    seed: Math.floor(num(raw.seed)) || 1,
    rewards: cratesOf(raw.rewards),
    found: spearsOf((raw as { found?: unknown }).found),
    spear: asSpear((raw as { spear?: unknown }).spear),
    blade: asBlade((raw as { blade?: unknown }).blade),
    foundBlades: bladesOf((raw as { foundBlades?: unknown }).foundBlades),
    swordLevel: clampLevel(Number((raw as { swordLevel?: unknown }).swordLevel) || 1),
    shieldLevel,
    bagSlots,
    insured: insuredOf((raw as { insured?: unknown }).insured),
    soul: soulOf((raw as { soul?: unknown }).soul, Math.floor(num(raw.seed)) || 1),
  }
}

const SOUL_PHASES = ['wait', 'live', 'held', 'spent'] as const

function soulOf(value: unknown, seed: number): SoulRite {
  if (typeof value !== 'object' || value === null) return scheduleSoul(seed)
  const raw = value as Partial<SoulRite>
  const at = Number(raw.at)
  if (!Number.isFinite(at) || at < 0 || at > 180 || !SOUL_PHASES.includes(raw.phase as SoulRite['phase'])) return scheduleSoul(seed)
  const salt = Number(raw.salt)
  return {
    at,
    salt: Number.isFinite(salt) ? Math.min(1, Math.max(0, salt)) : 0,
    zone: ZONES.includes(raw.zone as ZoneId) ? raw.zone as ZoneId : 'pangkalan',
    x: num(raw.x),
    y: num(raw.y),
    phase: raw.phase as SoulRite['phase'],
    told: raw.told === true,
    cast: clamp(raw.cast, 0.9),
    guard: clamp(raw.guard, 0.6),
    burst: raw.burst === true,
    embers: clamp(raw.embers, 1),
  }
}

function foesOf(value: unknown, slain: string[], depth: number, seed: number): Foe[] {
  const saved = Array.isArray(value) ? value : []
  const parsed = saved.map(foeRow).filter((foe): foe is Foe => foe != null)
  const roster = spawnRoster(depth, seed)
  const byId = new Map(parsed.map((foe) => [foe.id, foe]))
  const source = roster.map((spot) => {
    const kept = byId.get(spot.id)
    if (!kept) return spot
    return { ...spot, x: kept.x, y: kept.y, hp: kept.hp, aim: kept.aim, pattern: kept.pattern }
  })
  return source.map((foe) => ({ ...foe, hp: slain.includes(foe.id) ? 0 : foe.hp, wind: 0, dash: 0, bolt: null, flash: 0, cd: 0.4 }))
}

function foeRow(value: unknown): Foe | null {
  if (typeof value !== 'object' || value === null) return null
  const row = value as Partial<Foe>
  if (typeof row.id !== 'string' || !ZONES.includes(row.zone as ZoneId) || !FOE_KINDS.includes(row.kind as Foe['kind'])) return null
  return {
    id: row.id,
    zone: row.zone as ZoneId,
    kind: row.kind as Foe['kind'],
    x: num(row.x),
    y: num(row.y),
    hp: Math.max(0, num(row.hp)),
    wind: 0,
    aim: num(row.aim),
    cd: 0.4,
    bolt: null,
    flash: 0,
    dash: 0,
    pattern: Math.max(0, Math.floor(num(row.pattern))),
    breed: typeof row.breed === 'string' ? row.breed : undefined,
    maxHp: Number.isFinite(Number(row.maxHp)) ? Math.max(0, Number(row.maxHp)) : undefined,
    damage: Number.isFinite(Number(row.damage)) ? Math.max(0, Number(row.damage)) : undefined,
    phase: Math.max(0, Math.floor(num(row.phase))),
    child: row.child === true,
  }
}

function cratesOf(value: unknown): Crate[] {
  if (!Array.isArray(value)) return []
  const list: Crate[] = []
  for (const row of value) {
    if (typeof row !== 'object' || row === null) continue
    const id = (row as { id?: unknown }).id
    const zone = (row as { zone?: unknown }).zone
    if (typeof id !== 'string' || !ZONES.includes(zone as ZoneId)) continue
    const rawLoot = (row as { loot?: unknown }).loot
    const loot: ItemKind[] = []
    if (Array.isArray(rawLoot)) {
      for (const item of rawLoot) {
        if (typeof item === 'string' && KINDS.includes(item as ItemKind)) loot.push(item as ItemKind)
      }
    }
    if (loot.length === 0) continue
    const crate: Crate = { id, zone: zone as ZoneId, x: num((row as { x?: unknown }).x), y: num((row as { y?: unknown }).y), loot }
    const spear = asSpear((row as { spear?: unknown }).spear)
    if (spear) crate.spear = spear
    list.push(crate)
  }
  return list
}

function drops(value: unknown): Run['drops'] {
  if (!Array.isArray(value)) return []
  const list: Run['drops'] = []
  for (const row of value) {
    if (typeof row !== 'object' || row === null) continue
    const kind = (row as { kind?: unknown }).kind
    const id = (row as { id?: unknown }).id
    if (typeof id !== 'string' || !KINDS.includes(kind as ItemKind)) continue
    const extra = row as { born?: unknown; hover?: unknown; claimedBy?: unknown; fromX?: unknown; fromY?: unknown; handsOff?: unknown }
    const drop: Drop = { id, kind: kind as ItemKind, x: num((row as { x?: unknown }).x), y: num((row as { y?: unknown }).y) }
    if (typeof extra.born === 'number' && Number.isFinite(extra.born)) drop.born = extra.born
    if (typeof extra.hover === 'number' && Number.isFinite(extra.hover)) drop.hover = extra.hover
    if (extra.handsOff === true) drop.handsOff = true
    if (typeof extra.claimedBy === 'string' && extra.claimedBy) drop.claimedBy = extra.claimedBy
    if (typeof extra.fromX === 'number' && Number.isFinite(extra.fromX)) drop.fromX = extra.fromX
    if (typeof extra.fromY === 'number' && Number.isFinite(extra.fromY)) drop.fromY = extra.fromY
    const spear = asSpear((row as { spear?: unknown }).spear)
    if (drop.kind === 'tombak' && spear) drop.spear = spear
    if (typeof (row as { unit?: unknown }).unit === 'object') drop.unit = readUnit((row as { unit?: unknown }).unit, drop.kind, drop.id.length + 1)
    list.push(drop)
  }
  return list
}

function clampBag(list: Stack[], limit: number): Stack[] {
  const out: Stack[] = []
  let left = limit
  for (const stack of list) {
    if (left <= 0) break
    const n = Math.min(stack.n, left)
    out.push({ kind: stack.kind, n, units: stack.units?.slice(0, n) })
    left -= n
  }
  return out
}

function exploredOf(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const out: string[] = []
  for (const item of value) {
    if (typeof item !== 'string' || !/^(pangkalan|tambang|reruntuhan|sarang):\d+:\d+$/.test(item)) continue
    if (!out.includes(item)) out.push(item)
  }
  return out
}

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item) => typeof item === 'string')
}

function clamp(value: unknown, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0
  return Math.max(0, Math.min(max, value))
}

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}
