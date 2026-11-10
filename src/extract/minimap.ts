import { ROOM_H, ROOM_W, roomAt, themeFor, type FloorChart } from './dungeon.ts'
import { EXTRACT_ZONE, NEST_DOOR, ZONE_H, ZONE_W, nestGap, runCrates, type Run, type ZoneId } from './sim.ts'

export const MAP_TILE = 20
export const MAP_COLS = ZONE_W / MAP_TILE
export const MAP_ROWS = ZONE_H / MAP_TILE
const REACH = 48

const ZONES: ZoneId[] = ['pangkalan', 'tambang', 'reruntuhan', 'sarang']

export interface MapMarker {
  kind: 'player' | 'extract' | 'base' | 'chest' | 'chest-open' | 'soul' | 'enemy' | 'boss'
  zone: ZoneId
  x: number
  y: number
  facing?: number
  fancy?: boolean
}

export function tileKey(zone: ZoneId, x: number, y: number): string | null {
  const col = Math.floor((x + ZONE_W / 2) / MAP_TILE)
  const row = Math.floor((y + ZONE_H / 2) / MAP_TILE)
  if (col < 0 || row < 0 || col >= MAP_COLS || row >= MAP_ROWS) return null
  return `${zone}:${col}:${row}`
}

export function exploredAt(run: Pick<Run, 'explored'>, zone: ZoneId, x: number, y: number): boolean {
  const key = tileKey(zone, x, y)
  return key != null && run.explored.includes(key)
}

/** Marks tiles around the hamster. Returns true when the fog recedes. */
export function reveal(run: Run): boolean {
  const have = new Set(run.explored)
  let added = false
  const reach = run.gloom ? REACH * 0.45 : REACH
  for (let x = run.x - reach; x <= run.x + reach; x += MAP_TILE) {
    for (let y = run.y - reach; y <= run.y + reach; y += MAP_TILE) {
      if (Math.hypot(x - run.x, y - run.y) > reach) continue
      const key = tileKey(run.zone, x, y)
      if (!key || have.has(key)) continue
      have.add(key)
      added = true
    }
  }
  if (added) run.explored = [...have].sort()
  return added
}

/** World layout: base above the mine, ruins to the right of the mine. */
export function worldPoint(zone: ZoneId, x: number, y: number): { x: number; y: number } {
  const localX = x + ZONE_W / 2
  const localY = y + ZONE_H / 2
  if (zone === 'pangkalan') return { x: localX, y: localY }
  if (zone === 'tambang') return { x: localX, y: localY + ZONE_H }
  if (zone === 'reruntuhan') return { x: localX + ZONE_W, y: localY + ZONE_H }
  return { x: localX + ZONE_W, y: localY + ZONE_H * 2 }
}

export const WORLD_W = ZONE_W * 2
export const WORLD_H = ZONE_H * 3

/** Points the minimap may draw. Monsters are never included. */
export function markers(run: Run): MapMarker[] {
  const marks: MapMarker[] = [
    { kind: 'player', zone: run.zone, x: run.x, y: run.y, facing: run.facing },
  ]
  if (exploredAt(run, 'pangkalan', 0, 70)) marks.push({ kind: 'base', zone: 'pangkalan', x: 0, y: 70 })
  if (exploredAt(run, 'pangkalan', EXTRACT_ZONE.x, EXTRACT_ZONE.y)) {
    marks.push({ kind: 'extract', zone: 'pangkalan', x: EXTRACT_ZONE.x, y: EXTRACT_ZONE.y })
  }
  if (run.soul?.phase === 'live') {
    marks.push({ kind: 'soul', zone: run.soul.zone, x: run.soul.x, y: run.soul.y })
  }
  for (const foe of run.foes) {
    if (foe.hp <= 0 || run.slain.includes(foe.id)) continue
    if (!exploredAt(run, foe.zone, foe.x, foe.y)) continue
    marks.push({ kind: foe.kind === 'boss' ? 'boss' : 'enemy', zone: foe.zone, x: foe.x, y: foe.y })
  }
  for (const crate of runCrates(run)) {
    if (!exploredAt(run, crate.zone, crate.x, crate.y)) continue
    const open = run.opened.includes(crate.id)
    marks.push({
      kind: open ? 'chest-open' : 'chest',
      zone: crate.zone,
      x: crate.x,
      y: crate.y,
      fancy: crate.id === 'crate-relic',
    })
  }
  return marks
}

export function drawMinimap(ctx: CanvasRenderingContext2D, run: Run, width: number, height: number): void {
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, width, height)
  if (run.chart && drawChart(ctx, run, run.chart, width, height)) return
  ctx.fillStyle = 'rgba(10, 8, 6, 0.55)'
  ctx.fillRect(0, 0, width, height)
  const pad = 4
  const scale = Math.min((width - pad * 2) / WORLD_W, (height - pad * 2) / WORLD_H)
  const ox = (width - WORLD_W * scale) / 2
  const oy = (height - WORLD_H * scale) / 2
  const at = (zone: ZoneId, x: number, y: number) => {
    const p = worldPoint(zone, x, y)
    return { x: ox + p.x * scale, y: oy + p.y * scale }
  }
  for (const zone of ZONES) {
    for (let row = 0; row < MAP_ROWS; row += 1) {
      for (let col = 0; col < MAP_COLS; col += 1) {
        if (!run.explored.includes(`${zone}:${col}:${row}`)) continue
        const x = -ZONE_W / 2 + col * MAP_TILE + MAP_TILE / 2
        const y = -ZONE_H / 2 + row * MAP_TILE + MAP_TILE / 2
        const p = at(zone, x, y)
        ctx.fillStyle = zone === 'pangkalan' ? '#3a3228' : zone === 'tambang' ? '#2a241c' : zone === 'sarang' ? '#3a2430' : '#243028'
        ctx.fillRect(Math.round(p.x - (MAP_TILE * scale) / 2), Math.round(p.y - (MAP_TILE * scale) / 2), Math.max(1, Math.ceil(MAP_TILE * scale)), Math.max(1, Math.ceil(MAP_TILE * scale)))
      }
    }
    const origin = at(zone, -ZONE_W / 2, -ZONE_H / 2)
    const far = at(zone, ZONE_W / 2, ZONE_H / 2)
    const x = Math.round(origin.x)
    const y = Math.round(origin.y)
    const w = Math.round(far.x - origin.x)
    const h = Math.round(far.y - origin.y)
    if (zone === 'sarang') {
      ctx.fillStyle = 'rgba(90, 42, 58, 0.9)'
      ctx.fillRect(x, y, Math.max(1, w), Math.max(1, h))
    }
    const gap = nestGap(zone)
    const door0 = Math.round(at(zone, -NEST_DOOR, 0).x)
    const door1 = Math.round(at(zone, NEST_DOOR, 0).x)
    ctx.strokeStyle = zone === 'sarang' ? 'rgba(242, 192, 74, 0.95)' : 'rgba(107, 68, 36, 0.9)'
    ctx.lineWidth = 1
    ctx.beginPath()
    if (gap === 'south') {
      ctx.moveTo(x, y)
      ctx.lineTo(x + w, y)
      ctx.lineTo(x + w, y + h)
      ctx.lineTo(door1, y + h)
      ctx.moveTo(door0, y + h)
      ctx.lineTo(x, y + h)
      ctx.lineTo(x, y)
    } else if (gap === 'north') {
      ctx.moveTo(x, y + h)
      ctx.lineTo(x + w, y + h)
      ctx.lineTo(x + w, y)
      ctx.lineTo(door1, y)
      ctx.moveTo(door0, y)
      ctx.lineTo(x, y)
      ctx.lineTo(x, y + h)
    } else ctx.rect(x, y, w, h)
    ctx.stroke()
  }
  const sill = at('reruntuhan', 0, ZONE_H / 2)
  const nest = at('sarang', 0, 0)
  ctx.fillStyle = '#f2c04a'
  ctx.fillRect(Math.round(sill.x - 3), Math.round(sill.y - 1), 6, 3)
  ctx.fillRect(Math.round(nest.x - 3), Math.round(nest.y - 3), 6, 6)
  ctx.fillStyle = '#6b4424'
  ctx.fillRect(Math.round(nest.x - 1), Math.round(nest.y - 1), 2, 2)
  for (const mark of markers(run)) {
    const p = at(mark.zone, mark.x, mark.y)
    if (mark.kind === 'extract') {
      ctx.fillStyle = '#f2c04a'
      ctx.fillRect(Math.round(p.x - 2), Math.round(p.y - 2), 4, 4)
      ctx.strokeStyle = 'rgba(242, 192, 74, 0.85)'
      ctx.strokeRect(Math.round(p.x - EXTRACT_ZONE.r * scale), Math.round(p.y - EXTRACT_ZONE.r * scale), Math.round(EXTRACT_ZONE.r * 2 * scale), Math.round(EXTRACT_ZONE.r * 2 * scale))
    } else if (mark.kind === 'base') {
      ctx.fillStyle = '#d7a23a'
      ctx.fillRect(Math.round(p.x - 2), Math.round(p.y - 3), 4, 3)
      ctx.fillStyle = '#6b4424'
      ctx.fillRect(Math.round(p.x - 3), Math.round(p.y - 4), 6, 1)
    } else if (mark.kind === 'chest' || mark.kind === 'chest-open') {
      const dim = mark.kind === 'chest-open'
      ctx.fillStyle = dim ? '#4a3828' : '#6a442c'
      ctx.fillRect(Math.round(p.x - 3), Math.round(p.y - 2), 6, 4)
      ctx.fillStyle = dim ? '#6a5430' : mark.fancy ? '#f2c04a' : '#c4a15a'
      ctx.fillRect(Math.round(p.x - 3), Math.round(p.y - 3), 6, 2)
      if (!dim) {
        ctx.fillStyle = '#f7e7a0'
        ctx.fillRect(Math.round(p.x - 1), Math.round(p.y - 1), 2, 2)
      }
    } else if (mark.kind === 'soul') {
      ctx.fillStyle = '#b388ff'
      ctx.fillRect(Math.round(p.x - 2), Math.round(p.y - 3), 4, 4)
      ctx.fillStyle = '#7ec8c4'
      ctx.fillRect(Math.round(p.x - 1), Math.round(p.y - 4), 2, 2)
    } else if (mark.kind === 'enemy' || mark.kind === 'boss') {
      ctx.fillStyle = mark.kind === 'boss' ? '#e10600' : '#e07a32'
      const n = mark.kind === 'boss' ? 4 : 3
      ctx.fillRect(Math.round(p.x - n / 2), Math.round(p.y - n / 2), n, n)
    } else if (mark.kind === 'player') {
      ctx.fillStyle = '#f4f1e8'
      ctx.fillRect(Math.round(p.x - 2), Math.round(p.y - 2), 4, 4)
      const face = mark.facing ?? 0
      ctx.fillStyle = '#f2c04a'
      ctx.fillRect(Math.round(p.x + Math.cos(face) * 5 - 1), Math.round(p.y + Math.sin(face) * 5 - 1), 2, 2)
    }
  }
}

function drawChart(ctx: CanvasRenderingContext2D, run: Run, chart: FloorChart, width: number, height: number): boolean {
  if (chart.rooms.length === 0) return false
  const paint = themeFor(chart.depth)
  let minX = 0
  let minY = 0
  let maxX = 0
  let maxY = 0
  for (const room of chart.rooms) {
    minX = Math.min(minX, room.gx)
    minY = Math.min(minY, room.gy)
    maxX = Math.max(maxX, room.gx)
    maxY = Math.max(maxY, room.gy)
  }
  const cols = maxX - minX + 1
  const rows = maxY - minY + 1
  const pad = 6
  const gap = 3
  const cell = Math.max(6, Math.floor(Math.min((width - pad * 2 - gap * (cols - 1)) / cols, (height - pad * 2 - gap * (rows - 1)) / rows)))
  const originX = Math.round((width - (cols * cell + (cols - 1) * gap)) / 2)
  const originY = Math.round((height - (rows * cell + (rows - 1) * gap)) / 2)
  const seen = new Set(run.seenRooms ?? [])
  const at = (gx: number, gy: number) => ({
    x: originX + (gx - minX) * (cell + gap),
    y: originY + (gy - minY) * (cell + gap),
  })
  for (const room of chart.rooms) {
    if (room.secret && !seen.has(room.id)) continue
    const p = at(room.gx, room.gy)
    const known = seen.has(room.id)
    ctx.fillStyle = known ? paint.floor : '#100e0c'
    ctx.fillRect(p.x, p.y, cell, cell)
    ctx.strokeStyle = room.id === run.roomId ? '#f2c04a' : paint.trim
    ctx.strokeRect(p.x + 0.5, p.y + 0.5, cell - 1, cell - 1)
    if (!known) continue
    const icon = room.role === 'boss' ? '#e10600' : room.role === 'extract' || room.role === 'fast' || room.role === 'start' ? '#40dc60' : room.role === 'merchant' ? '#f2c04a' : room.role === 'rest' ? '#7ec8c4' : room.role === 'secret' ? '#d5dee6' : ''
    if (!icon) continue
    ctx.fillStyle = icon
    ctx.fillRect(p.x + cell / 2 - 2, p.y + cell / 2 - 2, 4, 4)
  }
  const marker = playerMarker(run, width, height)
  if (marker) {
    const blink = Math.floor((run.age || 0) * 5) % 2 === 0
    ctx.fillStyle = '#14110e'
    ctx.fillRect(marker.x - 3, marker.y - 3, 7, 7)
    ctx.fillStyle = blink ? '#f7fbff' : '#f2c04a'
    ctx.fillRect(marker.x - 2, marker.y - 2, 5, 5)
    ctx.fillStyle = '#f2c04a'
    const face = run.facing || 0
    ctx.fillRect(Math.round(marker.x + Math.cos(face) * 6 - 1), Math.round(marker.y + Math.sin(face) * 6 - 1), 3, 3)
  }
  return true
}

/** Pixel of the player dot inside the current room cell. Null when that room is hidden. */
export function playerMarker(run: Run, width: number, height: number): { x: number; y: number } | null {
  const chart = run.chart
  if (!chart || chart.rooms.length === 0) return null
  const here = roomAt(chart, run.roomId) ?? chart.rooms.find((room) => room.zone === run.zone)
  if (!here) return null
  if (here.secret && !(run.seenRooms ?? []).includes(here.id)) return null
  let minX = 0
  let minY = 0
  let maxX = 0
  let maxY = 0
  for (const room of chart.rooms) {
    minX = Math.min(minX, room.gx)
    minY = Math.min(minY, room.gy)
    maxX = Math.max(maxX, room.gx)
    maxY = Math.max(maxY, room.gy)
  }
  const cols = maxX - minX + 1
  const rows = maxY - minY + 1
  const pad = 6
  const gap = 3
  const cell = Math.max(6, Math.floor(Math.min((width - pad * 2 - gap * (cols - 1)) / cols, (height - pad * 2 - gap * (rows - 1)) / rows)))
  const originX = Math.round((width - (cols * cell + (cols - 1) * gap)) / 2)
  const originY = Math.round((height - (rows * cell + (rows - 1) * gap)) / 2)
  const left = originX + (here.gx - minX) * (cell + gap)
  const top = originY + (here.gy - minY) * (cell + gap)
  const nx = Math.max(0, Math.min(1, (run.x + ROOM_W / 2) / ROOM_W))
  const ny = Math.max(0, Math.min(1, (run.y + ROOM_H / 2) / ROOM_H))
  const inset = 3
  return {
    x: Math.round(left + inset + nx * (cell - inset * 2)),
    y: Math.round(top + inset + ny * (cell - inset * 2)),
  }
}
