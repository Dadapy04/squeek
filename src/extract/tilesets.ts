import { blit } from './patterns.ts'
import { ZONE_H, ZONE_W } from './sim.ts'

/** One recognisable floor language per depth. Plates are cached by the caller. */

export interface ThemeKit {
  id: string
  floor: string
  floorB: string
  wall: string
  wallTop: string
  trim: string
  mote: string
  accent: string
  dark: string
}

export const THEME_KITS: ThemeKit[] = [
  { id: 'burrow', floor: '#6b4e38', floorB: '#4a3424', wall: '#3a2a1c', wallTop: '#8a6240', trim: '#c4a15a', mote: '#d7c4a4', accent: '#5c3a22', dark: '#24180f' },
  { id: 'roots', floor: '#3d5a32', floorB: '#2a4024', wall: '#1c3018', wallTop: '#6a8f4a', trim: '#c4a15a', mote: '#8fbf6a', accent: '#8d4a32', dark: '#142010' },
  { id: 'spore', floor: '#3a2844', floorB: '#241830', wall: '#140e1c', wallTop: '#5a3a68', trim: '#7dcec4', mote: '#c4f27a', accent: '#e7c27a', dark: '#0c0810' },
  { id: 'hive', floor: '#c4a15a', floorB: '#8a6a32', wall: '#5c4018', wallTop: '#e7c27a', trim: '#3a2410', mote: '#f2d48a', accent: '#a33b32', dark: '#2a1c0c' },
  { id: 'mine', floor: '#4a4038', floorB: '#2e2824', wall: '#1a1614', wallTop: '#6b5344', trim: '#9aa0a8', mote: '#f2c04a', accent: '#e25a2a', dark: '#101010' },
  { id: 'web', floor: '#2a2430', floorB: '#1a1620', wall: '#100e14', wallTop: '#4a3a58', trim: '#d5dee6', mote: '#b7a8c8', accent: '#e7e2d4', dark: '#08060a' },
  { id: 'maw', floor: '#2a1418', floorB: '#140c10', wall: '#0c080a', wallTop: '#6e2420', trim: '#c43a6a', mote: '#ffb020', accent: '#e7e2d4', dark: '#1a080c' },
]

export function themeKit(depth: number): ThemeKit {
  const level = Math.max(1, Math.min(7, Math.floor(depth) || 1))
  return THEME_KITS[level - 1]!
}

const tiles = new Map<string, HTMLCanvasElement>()

function sheet(key: string, draw: (ctx: CanvasRenderingContext2D) => void, w = 16, h = 16): HTMLCanvasElement {
  const hit = tiles.get(key)
  if (hit) return hit
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  draw(ctx)
  tiles.set(key, canvas)
  return canvas
}

function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color
  ctx.fillRect(x, y, w, h)
}

/** Floor, wall, or door cell. Border cells are walls except a gap in the middle of each side. */
export function themeCell(depth: number, cx: number, cy: number, cols: number, rows: number): HTMLCanvasElement {
  const kit = themeKit(depth)
  const edge = cx === 0 || cy === 0 || cx === cols - 1 || cy === rows - 1
  const midX = cx > cols / 2 - 2 && cx < cols / 2 + 1
  const midY = cy > rows / 2 - 2 && cy < rows / 2 + 1
  const door = edge && ((cy === 0 || cy === rows - 1) && midX || (cx === 0 || cx === cols - 1) && midY)
  const kind = door ? 'door' : edge ? 'wall' : 'floor'
  const variant = (cx * 3 + cy) % 3
  return sheet(`t${depth}-${kind}-${variant}`, (ctx) => {
    if (kind === 'wall') {
      px(ctx, 0, 0, 16, 16, kit.wall)
      px(ctx, 0, 0, 16, 3, kit.wallTop)
      px(ctx, 0, 13, 16, 3, kit.dark)
      if (variant === 0) px(ctx, 4, 6, 3, 3, kit.trim)
      if (variant === 1) px(ctx, 10, 7, 2, 4, kit.floorB)
    } else if (kind === 'door') {
      px(ctx, 0, 0, 16, 16, kit.dark)
      px(ctx, 1, 1, 3, 14, kit.trim)
      px(ctx, 12, 1, 3, 14, kit.trim)
      px(ctx, 4, 1, 8, 2, kit.wallTop)
      px(ctx, 6, 8, 4, 5, kit.floor)
    } else {
      px(ctx, 0, 0, 16, 16, variant === 2 ? kit.floorB : kit.floor)
      if (depth === 1) {
        if (variant === 0) px(ctx, 3, 4, 2, 2, kit.mote)
        if (variant === 1) px(ctx, 11, 9, 3, 2, kit.accent)
        px(ctx, 0, 15, 16, 1, kit.dark)
      } else if (depth === 2) {
        if (variant !== 2) px(ctx, 2, 2 + variant * 4, 8, 2, kit.accent)
        px(ctx, 12, 12, 2, 2, kit.mote)
      } else if (depth === 3) {
        px(ctx, 6, 6, 4, 4, variant === 0 ? kit.trim : kit.mote)
        px(ctx, 1, 1, 2, 2, kit.wallTop)
      } else if (depth === 4) {
        px(ctx, 1, 1, 14, 1, kit.trim)
        px(ctx, 1, 1, 1, 14, kit.trim)
        px(ctx, 7, 7, 3, 3, kit.dark)
      } else if (depth === 5) {
        px(ctx, 0, 7, 16, 2, kit.trim)
        px(ctx, 2, 5, 3, 6, kit.accent)
        px(ctx, 11, 5, 3, 6, kit.accent)
        if (variant === 0) px(ctx, 6, 2, 2, 2, kit.mote)
      } else if (depth === 6) {
        px(ctx, 0, 0, 8, 1, kit.trim)
        px(ctx, 8, 15, 8, 1, kit.trim)
        if (variant === 1) px(ctx, 10, 4, 3, 5, kit.accent)
      } else {
        px(ctx, 0, 8, 16, 2, kit.wallTop)
        if (variant !== 1) px(ctx, 4, 3, 2, 6, kit.trim)
        px(ctx, 12, 11, 2, 2, kit.mote)
      }
    }
  })
}

function deco(depth: number, index: number): HTMLCanvasElement {
  const kit = themeKit(depth)
  return sheet(`deco-${depth}-${index}`, (ctx) => {
    px(ctx, 0, 0, 16, 16, 'rgba(0,0,0,0)')
    if (depth === 1) {
      if (index % 2 === 0) { px(ctx, 2, 4, 4, 10, kit.accent); px(ctx, 1, 2, 6, 3, kit.trim) }
      else { px(ctx, 4, 10, 6, 3, kit.mote); px(ctx, 6, 8, 2, 2, kit.dark) }
    } else if (depth === 2) {
      px(ctx, 3, 2, 4, 12, kit.accent)
      px(ctx, 1, 6, 10, 3, kit.wallTop)
      if (index % 2) { px(ctx, 10, 4, 4, 3, kit.mote); px(ctx, 11, 2, 2, 2, kit.trim) }
    } else if (depth === 3) {
      px(ctx, 5, 4, 6, 8, kit.wallTop)
      px(ctx, 6, 2, 4, 3, kit.mote)
      px(ctx, 7, 6, 2, 2, kit.trim)
    } else if (depth === 4) {
      px(ctx, 2, 2, 12, 12, kit.floorB)
      px(ctx, 4, 4, 8, 8, kit.dark)
      px(ctx, 6, 6, 4, 4, kit.mote)
    } else if (depth === 5) {
      px(ctx, 1, 8, 14, 6, kit.accent)
      px(ctx, 3, 4, 10, 6, kit.wall)
      px(ctx, 6, 2, 3, 3, kit.mote)
    } else if (depth === 6) {
      px(ctx, 4, 2, 8, 12, kit.trim)
      px(ctx, 6, 4, 4, 6, kit.accent)
      px(ctx, 0, 0, 6, 1, kit.trim)
    } else {
      px(ctx, 6, 1, 4, 12, kit.accent)
      px(ctx, 3, 10, 10, 4, kit.wallTop)
      px(ctx, 5, 12, 2, 2, kit.dark)
      px(ctx, 9, 12, 2, 2, kit.dark)
    }
  })
}

const DECO_SPOTS = [
  [-70, -90], [60, -80], [-80, 40], [70, 70], [0, -110], [40, 100],
]

/** Bakes floor, walls, door frames, and decorations for one depth. */
export function paintThemePlate(pen: CanvasRenderingContext2D, depth: number, scale: number): void {
  const step = 16
  const cols = Math.ceil(ZONE_W / step)
  const rows = Math.ceil(ZONE_H / step)
  for (let cy = 0; cy < rows; cy += 1) {
    for (let cx = 0; cx < cols; cx += 1) {
      const art = themeCell(depth, cx, cy, cols, rows)
      blit(pen, art, cx * step * scale, cy * step * scale, scale)
    }
  }
  DECO_SPOTS.slice(0, 4 + (depth % 3)).forEach(([x, y], index) => {
    const art = deco(depth, index)
    const px = (x + ZONE_W / 2) * scale
    const py = (y + ZONE_H / 2) * scale
    blit(pen, art, px, py, scale)
  })
}

export function drawThemeMotes(
  ctx: CanvasRenderingContext2D,
  depth: number,
  age: number,
  scale: number,
  at: (x: number, y: number) => { x: number; y: number },
): void {
  const kit = themeKit(depth)
  const n = 8
  for (let i = 0; i < n; i += 1) {
    const x = -ZONE_W / 2 + 24 + ((i * 41 + Math.floor(age * (depth === 7 ? 18 : 10))) % (ZONE_W - 48))
    const baseY = -ZONE_H / 2 + 30 + ((i * 57) % (ZONE_H - 60))
    const y = baseY - ((age * (6 + depth) + i * 9) % 28)
    const p = at(x, y)
    ctx.globalAlpha = 0.35 + (i % 3) * 0.15
    ctx.fillStyle = i % 2 === 0 ? kit.mote : kit.accent
    const s = Math.max(1, Math.round(scale))
    ctx.fillRect(Math.round(p.x), Math.round(p.y), s, depth === 2 || depth === 4 ? s * 2 : s)
  }
  ctx.globalAlpha = 1
  if (depth === 7) {
    ctx.fillStyle = 'rgba(160, 24, 32, 0.18)'
    ctx.fillRect(0, 0, ctx.canvas.width, 18 * scale)
    ctx.fillRect(0, ctx.canvas.height - 18 * scale, ctx.canvas.width, 18 * scale)
    ctx.fillRect(0, 0, 14 * scale, ctx.canvas.height)
    ctx.fillRect(ctx.canvas.width - 14 * scale, 0, 14 * scale, ctx.canvas.height)
  }
}
