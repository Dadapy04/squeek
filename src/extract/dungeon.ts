/** Seeded room-and-corridor floors. Boss numbers and gear gates stay in depths.ts. */

import { coinsFor, mixSeed, type CoinRarity } from './coins.ts'
import type { ItemKind } from './sim.ts'

export const ROOM_W = 220
export const ROOM_H = 300

export type ThemeId = 'burrow' | 'roots' | 'spore' | 'hive' | 'mine' | 'web' | 'maw'
export type RoomRole = 'start' | 'combat' | 'treasure' | 'trap' | 'rest' | 'merchant' | 'secret' | 'elite' | 'boss' | 'extract' | 'fast'
export type Dir = 'n' | 'e' | 's' | 'w'
export type RoomEvent = 'none' | 'ambush' | 'waves' | 'dark' | 'collapse' | 'timed'
export type LayoutId = 'gallery' | 'pocket' | 'cross' | 'nook' | 'split' | 'well' | 'lane' | 'hearth'
export type DoorLock = 'none' | 'combat' | 'secret' | 'timed'
export type OreKind = 'copper' | 'silver' | 'gold' | 'spore' | 'gem' | 'abyss'
export type ZoneName = 'pangkalan' | 'tambang' | 'reruntuhan' | 'sarang' | 'kamar'

export interface DoorLink {
  dir: Dir
  to: string
  lock: DoorLock
}

export interface RoomNode {
  id: string
  role: RoomRole
  zone: ZoneName
  gx: number
  gy: number
  layout: LayoutId
  event: RoomEvent
  mix: string[]
  doors: DoorLink[]
  secret: boolean
}

export interface VeinNode {
  id: string
  room: string
  zone: ZoneName
  x: number
  y: number
  hp: number
  max: number
  rarity: CoinRarity
  ore: OreKind
  big: boolean
}

export interface PropNode {
  id: string
  room: string
  zone: ZoneName
  kind: 'chest' | 'lever' | 'barrel' | 'crate' | 'crack' | 'shrine' | 'vendor' | 'puddle' | 'web' | 'lava' | 'debris' | 'thorn'
  x: number
  y: number
  state: 'live' | 'spent' | 'open'
  loot: ItemKind[]
  lock: 'none' | 'key'
  /** Cracked walls start at 3. Missing means a fresh crack. */
  hp?: number
  /** Seconds left on a lit barrel. Missing means the fuse is cold. */
  fuse?: number
  /** Length the current fuse started at, so the blink can speed up. */
  fuseMax?: number
  /** Seconds until the next fuse tick. Not required on old saves. */
  tickAt?: number
}

export interface SpawnNode {
  id: string
  room: string
  zone: ZoneName
  kind: string
  breed: string
  x: number
  y: number
  hp: number
  damage: number
  elite: boolean
}

export interface TorchNode {
  id: string
  room: string
  zone: ZoneName
  x: number
  y: number
  wall: Dir
}

export interface FloorChart {
  depth: number
  seed: number
  theme: ThemeId
  rooms: RoomNode[]
  veins: VeinNode[]
  props: PropNode[]
  spawns: SpawnNode[]
  torches: TorchNode[]
}

export interface ThemePaint {
  id: ThemeId
  floor: string
  trim: string
  mote: string
  hazard: string
}

export const THEME_PAINT: ThemePaint[] = [
  { id: 'burrow', floor: '#3a2c20', trim: '#6b4424', mote: '#c4a15a', hazard: '#8a5a32' },
  { id: 'roots', floor: '#243024', trim: '#3d5a32', mote: '#8fbf6a', hazard: '#6a8f4a' },
  { id: 'spore', floor: '#241c28', trim: '#5a3a68', mote: '#c4f27a', hazard: '#7dce4a' },
  { id: 'hive', floor: '#2a2418', trim: '#8a6a32', mote: '#e7c27a', hazard: '#a33b32' },
  { id: 'mine', floor: '#241c16', trim: '#5c4030', mote: '#f2c04a', hazard: '#e25a2a' },
  { id: 'web', floor: '#1c1824', trim: '#4a3a58', mote: '#d5dee6', hazard: '#b7a8c8' },
  { id: 'maw', floor: '#140e12', trim: '#6e2420', mote: '#f2c04a', hazard: '#c43a6a' },
]

const LAYOUTS: LayoutId[] = ['gallery', 'pocket', 'cross', 'nook', 'split', 'well', 'lane', 'hearth']
const EVENTS: RoomEvent[] = ['ambush', 'waves', 'dark', 'collapse', 'timed']
const DIRS: Dir[] = ['n', 'e', 's', 'w']
const DELTA: Record<Dir, [number, number]> = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }
const OPPOSITE: Record<Dir, Dir> = { n: 's', s: 'n', e: 'w', w: 'e' }

const SPINE_FREE: Record<string, Dir[]> = {
  'room-start': ['n', 'w', 'e'],
  'room-mine': ['w', 's'],
  'room-ruin': ['n', 'e'],
  'room-boss': ['w', 'e', 's'],
}

export function themeFor(depth: number): ThemePaint {
  const level = Math.max(1, Math.min(7, Math.floor(depth) || 1))
  return THEME_PAINT[level - 1]!
}

/** Rarity bands match COIN_BAND. Deep floors are the only place valuable ore appears. */
export function oreRoll(depth: number, salt: number, big: boolean): { ore: OreKind; rarity: CoinRarity } {
  const level = Math.max(1, Math.min(7, Math.floor(depth) || 1))
  const roll = Math.abs(Math.floor(salt)) % 5
  if (level <= 2) {
    if (roll === 0) return { ore: 'silver', rarity: 'langka' }
    return { ore: 'copper', rarity: 'biasa' }
  }
  if (level <= 4) return { ore: 'gold', rarity: big ? 'pusaka' : 'langka' }
  if (level <= 6) return { ore: roll % 2 === 0 ? 'spore' : 'gem', rarity: 'pusaka' }
  return { ore: 'abyss', rarity: 'legenda' }
}

export function oreValue(rarity: CoinRarity, salt: number): number {
  return coinsFor(rarity, mixSeed(salt))
}

function rng(seed: number): () => number {
  let a = (Math.floor(Math.abs(seed)) || 1) >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function link(rooms: RoomNode[], from: string, dir: Dir, to: string, lock: DoorLock): void {
  const a = rooms.find((room) => room.id === from)
  const b = rooms.find((room) => room.id === to)
  if (!a || !b) return
  if (!a.doors.some((door) => door.dir === dir)) a.doors.push({ dir, to, lock })
  const back = OPPOSITE[dir]
  if (!b.doors.some((door) => door.dir === back)) b.doors.push({ dir: back, to: from, lock: 'none' })
}

function pushRoom(rooms: RoomNode[], room: RoomNode): void {
  rooms.push(room)
}

export function generateFloor(depth: number, seed: number): FloorChart {
  const level = Math.max(1, Math.min(7, Math.floor(depth) || 1))
  const salt = (Math.floor(seed) || 1) + level * 17
  const rand = rng(salt)
  const theme = themeFor(level).id
  const count = 6 + Math.floor(rand() * 5)
  const rooms: RoomNode[] = [
    node('room-start', 'start', 'pangkalan', 0, 0, 'hearth', 'none', false, rand),
    node('room-mine', 'combat', 'tambang', 0, 1, pickLayout(rand), 'none', false, rand),
    node('room-ruin', 'combat', 'reruntuhan', 1, 1, pickLayout(rand), 'none', false, rand),
    node('room-boss', 'boss', 'sarang', 1, 2, 'well', 'none', false, rand),
  ]
  link(rooms, 'room-start', 's', 'room-mine', 'none')
  link(rooms, 'room-mine', 'e', 'room-ruin', 'none')
  link(rooms, 'room-ruin', 's', 'room-boss', 'none')

  const open: { id: string; dir: Dir }[] = []
  for (const [id, dirs] of Object.entries(SPINE_FREE)) {
    for (const dir of dirs) open.push({ id, dir })
  }
  const want: RoomRole[] = ['fast', 'extract', 'secret', 'treasure', 'trap', 'combat']
  if (rand() < 0.55) want.push('merchant')
  if (level >= 2 && rand() < 0.34) want.push('rest')
  if (count >= 8) want.push('elite')
  if (count >= 9) want.push('combat')
  let guard = 0
  while (rooms.length < count && want.length > 0 && guard < 40) {
    guard += 1
    const spot = open.splice(Math.floor(rand() * open.length), 1)[0]
    if (!spot) break
    const host = rooms.find((room) => room.id === spot.id)
    if (!host || host.doors.some((door) => door.dir === spot.dir)) continue
    const role = want.shift() ?? 'combat'
    const [dx, dy] = DELTA[spot.dir]
    const gx = host.gx + dx
    const gy = host.gy + dy
    if (rooms.some((room) => room.gx === gx && room.gy === gy)) continue
    const id = `room-${role}-${rooms.length}`
    const secret = role === 'secret'
    const event = role === 'combat' || role === 'elite' || role === 'fast' ? EVENTS[Math.floor(rand() * EVENTS.length)]! : 'none'
    const made = node(id, role, 'kamar', gx, gy, pickLayout(rand), event, secret, rand)
    pushRoom(rooms, made)
    link(rooms, host.id, spot.dir, id, secret ? 'secret' : 'none')
    const exit = made.doors.find((door) => door.dir === OPPOSITE[spot.dir])
    if (exit && (role === 'combat' || role === 'elite' || role === 'fast')) exit.lock = 'combat'
    if (exit && event === 'timed') exit.lock = 'timed'
    for (const dir of DIRS) {
      if (dir === OPPOSITE[spot.dir]) continue
      if (rand() < 0.45) open.push({ id, dir })
    }
  }
  while (rooms.length < 6 && open.length > 0) {
    const spot = open.pop()
    if (!spot) break
    const host = rooms.find((room) => room.id === spot.id)
    if (!host || host.doors.some((door) => door.dir === spot.dir)) continue
    const [dx, dy] = DELTA[spot.dir]
    const gx = host.gx + dx
    const gy = host.gy + dy
    if (rooms.some((room) => room.gx === gx && room.gy === gy)) continue
    const id = `room-fill-${rooms.length}`
    const made = node(id, 'treasure', 'kamar', gx, gy, pickLayout(rand), 'none', false, rand)
    pushRoom(rooms, made)
    link(rooms, host.id, spot.dir, id, 'none')
  }
  ensureRole(rooms, freeSpots(rooms), 'secret', rand)
  ensureRole(rooms, freeSpots(rooms), 'fast', rand)
  ensureRole(rooms, freeSpots(rooms), 'extract', rand)
  if (rand() < 0.55) ensureRole(rooms, freeSpots(rooms), 'merchant', rand)

  const veins = placeVeins(rooms, level, salt, rand)
  const props = placeProps(rooms, level, rand)
  const spawns = placeSpawns(rooms, level, rand)
  const torches = placeTorches(rooms, level, Math.floor(seed) || 1)
  return { depth: level, seed: Math.floor(seed) || 1, theme, rooms, veins, props, spawns, torches }
}

/** Wall sconces. Own seed so room layout stays put. Not on a door. */
export function placeTorches(rooms: RoomNode[], depth: number, seed: number): TorchNode[] {
  const rand = rng((Math.floor(Math.abs(seed)) || 1) * 97 + depth * 13 + 5)
  const torches: TorchNode[] = []
  for (const room of rooms) {
    if (rand() > 0.62) continue
    const walls = DIRS.filter((dir) => !room.doors.some((door) => door.dir === dir))
    if (walls.length === 0) continue
    const count = walls.length > 1 && rand() < 0.28 ? 2 : 1
    for (let n = 0; n < count; n += 1) {
      const wall = walls.splice(Math.floor(rand() * walls.length), 1)[0]
      if (!wall) break
      const along = Math.round((rand() - 0.5) * 70)
      const spot = wall === 'n'
        ? { x: along, y: -ROOM_H / 2 + 16 }
        : wall === 's'
          ? { x: along, y: ROOM_H / 2 - 20 }
          : wall === 'w'
            ? { x: -ROOM_W / 2 + 14, y: Math.round(along * 0.7) }
            : { x: ROOM_W / 2 - 18, y: Math.round(along * 0.7) }
      const clear = shiftOffDoor(room, spot.x, spot.y)
      torches.push({ id: `torch-${room.id}-${wall}`, room: room.id, zone: room.zone, x: clear.x, y: clear.y, wall })
    }
  }
  return torches
}

function freeSpots(rooms: RoomNode[]): { id: string; dir: Dir }[] {
  const spots: { id: string; dir: Dir }[] = []
  for (const room of rooms) {
    for (const dir of DIRS) {
      if (room.doors.some((door) => door.dir === dir)) continue
      const [dx, dy] = DELTA[dir]
      if (rooms.some((other) => other.gx === room.gx + dx && other.gy === room.gy + dy)) continue
      spots.push({ id: room.id, dir })
    }
  }
  return spots
}

function ensureRole(rooms: RoomNode[], open: { id: string; dir: Dir }[], role: RoomRole, rand: () => number): void {
  if (rooms.some((room) => room.role === role)) return
  if (rooms.length >= 10) {
    const victim = rooms.find((room) => room.zone === 'kamar' && (room.role === 'treasure' || room.role === 'trap' || room.role === 'combat'))
    if (!victim) return
    victim.role = role
    victim.secret = role === 'secret'
    if (role === 'secret') {
      const door = victim.doors[0]
      if (door) {
        const host = rooms.find((room) => room.id === door.to)
        const back = host?.doors.find((item) => item.to === victim.id)
        if (back) back.lock = 'secret'
      }
    }
    return
  }
  for (let guard = 0; guard < 16 && open.length > 0; guard += 1) {
    const spot = open.splice(Math.floor(rand() * open.length), 1)[0]
    if (!spot) return
    const host = rooms.find((room) => room.id === spot.id)
    if (!host || host.doors.some((door) => door.dir === spot.dir)) continue
    const [dx, dy] = DELTA[spot.dir]
    const gx = host.gx + dx
    const gy = host.gy + dy
    if (rooms.some((room) => room.gx === gx && room.gy === gy)) continue
    const id = `room-${role}-x${rooms.length}`
    const made = node(id, role, 'kamar', gx, gy, pickLayout(rand), role === 'fast' ? 'ambush' : 'none', role === 'secret', rand)
    pushRoom(rooms, made)
    link(rooms, host.id, spot.dir, id, role === 'secret' ? 'secret' : 'none')
    const exit = made.doors.find((door) => door.dir === OPPOSITE[spot.dir])
    if (exit && (role === 'fast' || role === 'combat')) exit.lock = 'combat'
    return
  }
}

function pickLayout(rand: () => number): LayoutId {
  return LAYOUTS[Math.floor(rand() * LAYOUTS.length)]!
}

function node(id: string, role: RoomRole, zone: ZoneName, gx: number, gy: number, layout: LayoutId, event: RoomEvent, secret: boolean, rand: () => number): RoomNode {
  const mixes = ['crab', 'brute', 'spitter', 'lurker', 'moth', 'burrow', 'spore', 'beetle', 'jelly', 'swarm', 'mole', 'web', 'ember', 'leech', 'bomber', 'wisp', 'crusher']
  const mix: string[] = []
  const n = 2 + Math.floor(rand() * 2)
  for (let i = 0; i < n; i += 1) mix.push(mixes[Math.floor(rand() * mixes.length)]!)
  return { id, role, zone, gx, gy, layout, event, mix, doors: [], secret }
}

function placeVeins(rooms: RoomNode[], depth: number, salt: number, rand: () => number): VeinNode[] {
  const hosts = rooms.filter((room) => room.role !== 'boss' && room.role !== 'rest')
  const total = Math.min(4, 1 + Math.floor(depth / 2))
  const veins: VeinNode[] = []
  const spots = [[-96, -70], [96, -40], [-96, 80], [92, 100], [-88, -110], [100, 40]]
  for (let i = 0; i < total && hosts.length > 0; i += 1) {
    const room = hosts[Math.floor(rand() * hosts.length)]!
    const spot = spots[i % spots.length]!
    const rolled = oreRoll(depth, salt + i * 13, false)
    const max = 4
    const clear = shiftOffDoor(room, spot[0]!, spot[1]!)
    veins.push({
      id: `vein-${room.id}-${i}`,
      room: room.id,
      zone: room.zone,
      x: clear.x,
      y: clear.y,
      hp: max,
      max,
      rarity: rolled.rarity,
      ore: rolled.ore,
      big: false,
    })
  }
  if (depth >= 3 && rand() < 0.5) {
    const host = rooms.find((room) => room.role === 'secret') ?? rooms.find((room) => room.role === 'elite' || room.role === 'fast')
    if (host) {
      const rolled = oreRoll(depth, salt + 99, true)
      veins.push({
        id: `vein-big-${host.id}`,
        room: host.id,
        zone: host.zone,
        x: -70,
        y: -20,
        hp: 7,
        max: 7,
        rarity: rolled.rarity,
        ore: rolled.ore,
        big: true,
      })
    }
  }
  for (const vein of veins) {
    const room = rooms.find((entry) => entry.id === vein.room)
    if (!room) continue
    const spot = shiftOffDoor(room, vein.x, vein.y)
    vein.x = spot.x
    vein.y = spot.y
  }
  return veins
}

function placeProps(rooms: RoomNode[], depth: number, rand: () => number): PropNode[] {
  const props: PropNode[] = []
  for (const room of rooms) {
    if (room.role === 'merchant') {
      props.push(prop(room, 'vendor', 10, 20, []))
    }
    if (room.role === 'rest') props.push(prop(room, 'shrine', 0, 10, []))
    if (room.role === 'treasure' || room.role === 'fast') {
      const loot: ItemKind[] = depth >= 5 ? ['relic', 'shard'] : depth >= 3 ? ['ore', 'shard'] : ['scrap', 'ore']
      props.push({ ...prop(room, 'chest', 24, -10, loot), lock: room.role === 'treasure' ? 'key' : 'none' })
    }
    if (room.role === 'secret') {
      const loot: ItemKind[] = depth >= 5 ? ['relic', 'shard', 'ore'] : depth >= 3 ? ['relic', 'ore'] : ['ore', 'shard']
      props.push({ ...prop(room, 'chest', 24, -10, loot), lock: 'none' })
    }
    if (room.role === 'trap' || room.layout === 'cross' || room.layout === 'lane') {
      props.push(prop(room, 'barrel', -20, 36, []))
      props.push(prop(room, 'crate', 30, 50, ['scrap']))
    }
    if (room.role === 'trap' || room.event === 'collapse') {
      const kind = depth === 3 ? 'puddle' : depth === 4 ? 'thorn' : depth === 5 ? 'lava' : depth >= 6 ? 'web' : 'debris'
      const spot = shiftOffDoor(room, Math.round((rand() - 0.5) * 60), 16 + Math.round(rand() * 40))
      props.push(prop(room, kind, spot.x, spot.y, []))
    }
    if (room.doors.some((door) => door.lock === 'timed')) props.push(prop(room, 'lever', -30, -20, []))
    for (const door of room.doors) {
      if (door.lock !== 'secret') continue
      const pad = doorPad(door.dir)
      const toward = door.dir === 'n' ? 56 : door.dir === 's' ? -56 : 0
      const aside = door.dir === 'w' ? 56 : door.dir === 'e' ? -56 : 0
      props.push({
        id: `crack-${room.id}-${door.dir}`,
        room: room.id,
        zone: room.zone,
        kind: 'crack',
        x: pad.x + aside,
        y: pad.y + toward,
        state: 'live',
        loot: [],
        lock: 'none',
        hp: 3,
      })
    }
  }
  for (const item of props) {
    if (item.kind === 'crack') continue
    const room = rooms.find((entry) => entry.id === item.room)
    if (!room) continue
    const spot = shiftOffDoor(room, item.x, item.y)
    item.x = spot.x
    item.y = spot.y
  }
  return props
}

function prop(room: RoomNode, kind: PropNode['kind'], x: number, y: number, loot: ItemKind[]): PropNode {
  return { id: `${kind}-${room.id}-${x}`, room: room.id, zone: room.zone, kind, x, y, state: 'live', loot, lock: 'none' }
}

function placeSpawns(rooms: RoomNode[], depth: number, rand: () => number): SpawnNode[] {
  const spawns: SpawnNode[] = []
  for (const room of rooms) {
    if (room.zone !== 'kamar') continue
    if (room.role === 'secret' && depth >= 4) {
      const breed = room.mix[0] ?? 'crab'
      spawns.push({
        id: `${room.id}-guard`,
        room: room.id,
        zone: 'kamar',
        kind: breed === 'boss' ? 'crab' : breed,
        breed,
        x: 16,
        y: 22,
        hp: Math.round(36 + depth * 14),
        damage: 10 + depth * 3,
        elite: false,
      })
    }
    if (room.role !== 'combat' && room.role !== 'elite' && room.role !== 'fast' && room.role !== 'trap') continue
    const crowd = room.role === 'elite' || room.role === 'fast' ? 1 : Math.min(5, 1 + Math.floor(depth / 2))
    for (let i = 0; i < crowd; i += 1) {
      const elite = room.role === 'elite' || room.role === 'fast'
      const breed = room.mix[i % room.mix.length] ?? 'crab'
      const hp = elite ? 80 + depth * 55 : Math.round((36 + depth * 14) * (1 + (depth - 1) * 0.08))
      const damage = elite ? 14 + depth * 8 : 10 + depth * 3
      spawns.push({
        id: `${room.id}-f${i}`,
        room: room.id,
        zone: 'kamar',
        kind: elite ? 'brute' : breed === 'boss' ? 'crab' : breed,
        breed,
        x: -40 + (i % 3) * 36 + Math.round((rand() - 0.5) * 10),
        y: -20 + Math.floor(i / 3) * 34,
        hp,
        damage,
        elite,
      })
    }
  }
  for (const spawn of spawns) {
    const room = rooms.find((entry) => entry.id === spawn.room)
    if (!room) continue
    const spot = shiftOffDoor(room, spawn.x, spawn.y)
    spawn.x = spot.x
    spawn.y = spot.y
  }
  return spawns
}

export function roomAt(chart: FloorChart, id: string | undefined): RoomNode | null {
  if (!id) return null
  return chart.rooms.find((room) => room.id === id) ?? null
}

export function spineRoom(chart: FloorChart, zone: ZoneName): RoomNode | null {
  return chart.rooms.find((room) => room.zone === zone) ?? null
}

export function criticalPath(chart: FloorChart): string[] {
  const start = chart.rooms.find((room) => room.role === 'start')
  const boss = chart.rooms.find((room) => room.role === 'boss')
  if (!start || !boss) return []
  const prev = new Map<string, string | null>([[start.id, null]])
  const queue = [start.id]
  for (let i = 0; i < queue.length; i += 1) {
    const id = queue[i]!
    const room = roomAt(chart, id)
    if (!room) continue
    for (const door of room.doors) {
      if (prev.has(door.to)) continue
      prev.set(door.to, id)
      queue.push(door.to)
    }
  }
  if (!prev.has(boss.id)) return []
  const path: string[] = []
  let cursor: string | null = boss.id
  while (cursor) {
    path.push(cursor)
    cursor = prev.get(cursor) ?? null
  }
  return path.reverse()
}

export function connected(chart: FloorChart): boolean {
  const path = criticalPath(chart)
  if (!path.includes(chart.rooms.find((room) => room.role === 'boss')?.id ?? '')) return false
  const seen = new Set(path)
  const queue = [...path]
  for (let i = 0; i < queue.length; i += 1) {
    const room = roomAt(chart, queue[i])
    if (!room) continue
    for (const door of room.doors) {
      if (seen.has(door.to)) continue
      seen.add(door.to)
      queue.push(door.to)
    }
  }
  return seen.size === chart.rooms.length
}

/** A doorway sits in the middle of its wall, inset just enough to stand in. */
export function doorPad(dir: Dir): { x: number; y: number } {
  if (dir === 'n') return { x: 0, y: -ROOM_H / 2 + 28 }
  if (dir === 's') return { x: 0, y: ROOM_H / 2 - 28 }
  if (dir === 'w') return { x: -ROOM_W / 2 + 28, y: 0 }
  return { x: ROOM_W / 2 - 28, y: 0 }
}

export const DOOR_CLEAR = 36

export function onDoor(room: RoomNode, x: number, y: number, clear = DOOR_CLEAR): boolean {
  return room.doors.some((door) => {
    const pad = doorPad(door.dir)
    return Math.hypot(x - pad.x, y - pad.y) < clear
  })
}

/** Slide a prop toward the room center until it is off every threshold. */
export function shiftOffDoor(room: RoomNode, x: number, y: number): { x: number; y: number } {
  let px = x
  let py = y
  for (let step = 0; step < 8 && onDoor(room, px, py); step += 1) {
    const len = Math.hypot(px, py) || 1
    px -= (px / len) * 18
    py -= (py / len) * 18
  }
  return { x: Math.round(px), y: Math.round(py) }
}

/** First doorway on the shortest walk to an extract or fast room. */
export function nextExitDoor(chart: FloorChart, roomId: string): { dir: Dir; to: string } | null {
  const here = roomAt(chart, roomId)
  if (!here || here.role === 'extract' || here.role === 'fast') return null
  const goal = new Set(chart.rooms.filter((room) => room.role === 'extract' || room.role === 'fast').map((room) => room.id))
  if (goal.size === 0) return null
  const prev = new Map<string, { from: string; dir: Dir } | null>([[roomId, null]])
  const queue = [roomId]
  let hit: string | null = null
  for (let i = 0; i < queue.length && hit == null; i += 1) {
    const id = queue[i]!
    if (goal.has(id)) {
      hit = id
      break
    }
    const room = roomAt(chart, id)
    if (!room) continue
    for (const door of room.doors) {
      if (prev.has(door.to)) continue
      prev.set(door.to, { from: id, dir: door.dir })
      queue.push(door.to)
    }
  }
  if (!hit) return null
  let node = hit
  let via = prev.get(node)
  while (via && via.from !== roomId) {
    node = via.from
    via = prev.get(node)
  }
  return via ? { dir: via.dir, to: node } : null
}

export function nearPad(x: number, y: number, dir: Dir): boolean {
  const pad = doorPad(dir)
  return Math.abs(x - pad.x) < 26 && Math.abs(y - pad.y) < 24
}

export function layoutShift(layout: LayoutId, index: number): { x: number; y: number } {
  const table: Record<LayoutId, Array<[number, number]>> = {
    gallery: [[-50, -30], [40, -10], [0, 40]],
    pocket: [[-20, 20], [30, -40], [10, 60]],
    cross: [[0, 0], [-46, 24], [46, -24]],
    nook: [[-60, 50], [20, 20], [50, -50]],
    split: [[-30, -50], [30, 30], [0, 70]],
    well: [[0, -20], [-40, 40], [36, 36]],
    lane: [[-10, -60], [-10, 0], [-10, 60]],
    hearth: [[20, -30], [-40, 10], [10, 50]],
  }
  const spot = table[layout][index % 3]!
  return { x: spot[0], y: spot[1] }
}
