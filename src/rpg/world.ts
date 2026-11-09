export interface Box {
  x: number
  y: number
  w: number
  h: number
}

/** Connected ruin: shrine, hall, side chest, boss alcove. Coordinates are floor space. */
export const WALLS: Box[] = [
  { x: 120, y: 70, w: 36, h: 36 },
  { x: 250, y: 120, w: 40, h: 28 },
  { x: 70, y: 210, w: 48, h: 22 },
  { x: 300, y: 230, w: 36, h: 36 },
  { x: 20, y: 300, w: 88, h: 22 },
  { x: 300, y: 300, w: 100, h: 22 },
]

export const SPAWN = { shrine: { x: 70, y: 48 }, gate: { x: 210, y: 270 } }
export const CHEST = { x: 64, y: 168 }
export const CRAWLERS = [
  { x: 200, y: 150 },
  { x: 320, y: 200 },
]
export const BOSS = { x: 210, y: 370 }

export function blocked(x: number, y: number, radius: number): boolean {
  if (x - radius < 18 || y - radius < 18 || x + radius > 402 || y + radius > 442) return true
  for (const box of WALLS) {
    const cx = Math.max(box.x, Math.min(x, box.x + box.w))
    const cy = Math.max(box.y, Math.min(y, box.y + box.h))
    const dx = x - cx
    const dy = y - cy
    if (dx * dx + dy * dy < radius * radius) return true
  }
  return false
}

export function move(x: number, y: number, nx: number, ny: number, radius: number): { x: number; y: number } {
  let px = nx
  let py = ny
  if (blocked(px, y, radius)) px = x
  if (blocked(px, py, radius)) py = y
  return { x: px, y: py }
}
