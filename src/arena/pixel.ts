import { COURTYARD, courtyardContains } from './courtyard.ts'
import { heroPose, type EnemyKind, type RunState } from './sim.ts'

/**
 * Original pixel scene aimed at the chosen reference: a readable golden knight
 * hamster, three distinct monsters, and a stone fortress floor. Each sprite is
 * painted at its own pixel grid and scaled with nearest-neighbor.
 */

type Grid = string[][]

const SCALE_NEAR = 3
const SCALE_FAR = 2

let zoom = 1
export function setPixelZoom(value: number): void {
  zoom = value > 1 ? 2 : 1
}

const cache = new Map<string, HTMLCanvasElement>()

export function drawPixel(
  ctx: CanvasRenderingContext2D,
  state: RunState,
  width: number,
  height: number,
  inset: { top: number; right: number; bottom: number; left: number },
): void {
  const freeH = Math.max(80, height - inset.top - inset.bottom)
  const scale = (freeH < 260 ? SCALE_FAR : SCALE_NEAR) * zoom
  const originX = width / 2
  const originY = inset.top + freeH / 2
  const project = (x: number, y: number) => ({
    x: originX + (x - state.x) * scale,
    y: originY + (y - state.y) * scale * 0.84,
  })
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = '#2a3128'
  ctx.fillRect(0, 0, width, height)
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, Math.max(0, inset.top - 6), width, Math.max(40, height - inset.top - inset.bottom + 12))
  ctx.clip()
  drawFloor(ctx, state, scale, project, width, height)
  drawStructures(ctx, state, scale, project)
  const layers: Array<{ y: number; draw: () => void }> = []
  for (const enemy of state.enemies) {
    if (enemy.hp <= 0 || enemy.speed === 0) continue
    const foot = project(enemy.x, enemy.y)
    layers.push({
      y: foot.y,
      draw: () => {
        blob(ctx, foot.x, foot.y, 10 * scale, 4 * scale)
        const art = monsterArt(enemy.kind)
        const bob = enemy.kind === 'bat' ? Math.sin(state.time * 8 + enemy.id) * 3 * scale : 0
        blit(ctx, art, foot.x, foot.y + bob, scale, true)
        bar(ctx, foot.x, foot.y - art.height * scale - 4, enemy.hp / enemy.maxHp)
      },
    })
  }
  const hero = project(state.x, state.y)
  layers.push({
    y: hero.y,
    draw: () => drawHero(ctx, state, hero.x, hero.y, scale),
  })
  layers.sort((a, b) => a.y - b.y)
  for (const layer of layers) layer.draw()
  drawMarks(ctx, state, scale, project)
  drawShock(ctx, state, scale, project)
  drawPuffs(ctx, state, scale, project)
  drawPips(ctx, state, width, height, inset, scale)
  ctx.restore()
}

function drawFloor(
  ctx: CanvasRenderingContext2D,
  state: RunState,
  scale: number,
  project: (x: number, y: number) => { x: number; y: number },
  width: number,
  height: number,
): void {
  const tile = 16
  const minX = state.x - width / scale
  const maxX = state.x + width / scale
  const minY = state.y - height / scale
  const maxY = state.y + height / scale
    for (let ty = Math.floor(minY / tile) - 1; ty <= Math.ceil(maxY / tile); ty += 1) {
      const shift = ty % 2 === 0 ? 0 : tile / 2
      for (let tx = Math.floor(minX / tile) - 2; tx <= Math.ceil(maxX / tile); tx += 1) {
        const wx = tx * tile + shift + tile / 2
        const wy = ty * tile + tile / 2
        if (!courtyardContains(wx, wy)) continue
        const near = !courtyardContains(wx, wy, 26)
        const variant = (Math.abs(tx * 3 + ty * 5) % 5) + (near ? 5 : 0)
        const art = tileArt(variant)
        const p = project(tx * tile + shift, ty * tile)
        ctx.drawImage(art, Math.round(p.x), Math.round(p.y), tile * scale, tile * scale * 0.84)
      }
    }
}

function drawStructures(
  ctx: CanvasRenderingContext2D,
  state: RunState,
  scale: number,
  project: (x: number, y: number) => { x: number; y: number },
): void {
  let gate = 0
  let best = -Infinity
  COURTYARD.forEach((start, index) => {
    const end = COURTYARD[(index + 1) % COURTYARD.length] ?? start
    if (start[1] + end[1] > best) {
      best = start[1] + end[1]
      gate = index
    }
  })
  COURTYARD.forEach(([x, y], index) => {
    const p = project(x, y)
    const broken = index % 2 === 1
    blit(ctx, broken ? pillarBroken() : pillarTall(), p.x, p.y, scale, true)
    if (broken) blit(ctx, rubble(), p.x + 10 * scale, p.y, scale, true)
  })
  const start = COURTYARD[gate] ?? [0, 0]
  const end = COURTYARD[(gate + 1) % COURTYARD.length] ?? start
  const p = project((start[0] + end[0]) / 2, (start[1] + end[1]) / 2)
  blit(ctx, gateArt(), p.x, p.y, scale, true)
  const flame = Math.floor(state.time * 8) % 2
  blit(ctx, torchArt(flame), p.x - 22 * scale, p.y, scale, true)
  blit(ctx, torchArt(flame), p.x + 22 * scale, p.y, scale, true)
  blit(ctx, pillarBroken(), project(-72, 36).x, project(-72, 36).y, scale, true)
  blit(ctx, rubble(), project(-58, 48).x, project(-58, 48).y, scale, true)
  blit(ctx, torchArt(flame), project(64, -28).x, project(64, -28).y, scale, true)
}

function drawHero(ctx: CanvasRenderingContext2D, state: RunState, x: number, y: number, scale: number): void {
  const pose = heroPose(state)
  const right = Math.cos(pose.facing) >= 0
  blob(ctx, x, y, 14 * scale, 5 * scale)
  if (state.dodgeLeft > 0) {
    blit(ctx, knightArt(), x - state.dashX * 10 * scale, y - state.dashY * 6 * scale, scale, right, 0.4)
  }
  blit(ctx, knightArt(), x, y + (state.dodgeLeft > 0 ? -2 * scale : 0), scale, right)
  const raised = state.swingPhase === 'idle' || state.swingPhase === 'windup'
  const blade = state.weapon === 'tombak' ? spearArt() : raised ? swordUp() : swordFwd()
  const hand = raised ? -46 : -28
  const side = right ? 16 : -16
  blit(ctx, blade, x + side * scale, y + hand * scale, scale, right)
}

function drawMarks(
  ctx: CanvasRenderingContext2D,
  state: RunState,
  scale: number,
  project: (x: number, y: number) => { x: number; y: number },
): void {
  ctx.fillStyle = '#d04538'
  for (const enemy of state.enemies) {
    const mark = enemy.mark
    if (!mark) continue
    if (mark.kind === 'line') {
      const a = project(mark.x, mark.y)
      const b = project(mark.x2, mark.y2)
      const steps = 12
      for (let i = 0; i <= steps; i += 1) {
        const t = i / steps
        ctx.fillRect(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, scale, scale)
      }
    } else {
      const p = project(mark.x, mark.y)
      ring(ctx, p.x, p.y, mark.r * scale, scale)
    }
  }
}

function drawShock(
  ctx: CanvasRenderingContext2D,
  state: RunState,
  scale: number,
  project: (x: number, y: number) => { x: number; y: number },
): void {
  const shock = state.shock
  if (!shock || shock.radius < 2) return
  const p = project(shock.x, shock.y)
  ctx.fillStyle = '#d7ecff'
  ring(ctx, p.x, p.y, shock.radius * scale, scale)
}

function drawPuffs(
  ctx: CanvasRenderingContext2D,
  state: RunState,
  scale: number,
  project: (x: number, y: number) => { x: number; y: number },
): void {
  ctx.fillStyle = '#efe6d4'
  for (const puff of state.puffs) {
    const p = project(puff.x, puff.y)
    ctx.fillRect(p.x, p.y, scale * 2, scale)
  }
}

function drawPips(
  ctx: CanvasRenderingContext2D,
  state: RunState,
  width: number,
  height: number,
  inset: { top: number; right: number; bottom: number; left: number },
  scale: number,
): void {
  const left = inset.left + 8
  const right = width - inset.right - 8
  const top = inset.top + 8
  const bottom = height - inset.bottom - 8
  for (const enemy of state.enemies) {
    if (enemy.hp <= 0 || enemy.speed === 0) continue
    const dx = enemy.x - state.x
    const dy = (enemy.y - state.y) * 0.84
    const sx = width / 2 + dx * scale
    const sy = inset.top + (height - inset.top - inset.bottom) / 2 + dy * scale
    if (sx > left && sx < right && sy > top && sy < bottom) continue
    const cx = Math.max(left, Math.min(right, sx))
    const cy = Math.max(top, Math.min(bottom, sy))
    ctx.fillStyle = '#f0c14a'
    ctx.fillRect(cx - 3, cy - 3, 6, 6)
  }
}

function ring(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, scale: number): void {
  const steps = Math.max(12, Math.round(r / 2))
  for (let i = 0; i < steps; i += 1) {
    const a = (i / steps) * Math.PI * 2
    ctx.fillRect(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.84, scale, scale)
  }
}

function bar(ctx: CanvasRenderingContext2D, x: number, y: number, ratio: number): void {
  ctx.fillStyle = '#24180f'
  ctx.fillRect(x - 10, y, 20, 3)
  ctx.fillStyle = '#e23b3b'
  ctx.fillRect(x - 10, y, Math.max(2, 20 * ratio), 3)
}

function blob(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = 'rgba(20, 16, 12, 0.35)'
  ctx.beginPath()
  ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2)
  ctx.fill()
}

function blit(ctx: CanvasRenderingContext2D, art: HTMLCanvasElement, footX: number, footY: number, scale: number, faceRight: boolean, alpha = 1): void {
  const w = art.width * scale
  const h = art.height * scale
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.imageSmoothingEnabled = false
  ctx.translate(Math.round(footX), Math.round(footY))
  if (!faceRight) ctx.scale(-1, 1)
  ctx.drawImage(art, Math.round(-w / 2), Math.round(-h), w, h)
  ctx.restore()
}

function raster(grid: Grid): HTMLCanvasElement {
  const key = grid.map((row) => row.join('')).join('\n')
  const cached = cache.get(key)
  if (cached) return cached
  const canvas = document.createElement('canvas')
  canvas.width = grid[0]?.length ?? 1
  canvas.height = grid.length
  const pen = canvas.getContext('2d')
  if (!pen) return canvas
  grid.forEach((row, y) => {
    row.forEach((color, x) => {
      if (!color) return
      pen.fillStyle = color
      pen.fillRect(x, y, 1, 1)
    })
  })
  cache.set(key, canvas)
  return canvas
}

function blank(w: number, h: number): Grid {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => ''))
}

function disc(grid: Grid, cx: number, cy: number, rx: number, ry: number, color: string): void {
  for (let y = 0; y < grid.length; y += 1) {
    for (let x = 0; x < (grid[0]?.length ?? 0); x += 1) {
      const nx = (x + 0.5 - cx) / rx
      const ny = (y + 0.5 - cy) / ry
      if (nx * nx + ny * ny <= 1) {
        const row = grid[y]
        if (row) row[x] = color
      }
    }
  }
}

function box(grid: Grid, x0: number, y0: number, x1: number, y1: number, color: string): void {
  for (let y = Math.max(0, y0); y <= Math.min(grid.length - 1, y1); y += 1) {
    for (let x = Math.max(0, x0); x <= Math.min((grid[0]?.length ?? 1) - 1, x1); x += 1) {
      const row = grid[y]
      if (row) row[x] = color
    }
  }
}

function outline(grid: Grid): Grid {
  const h = grid.length
  const w = grid[0]?.length ?? 0
  const next = grid.map((row) => row.slice())
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (grid[y]?.[x]) continue
      const touch = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
        const row = grid[y + (dy ?? 0)]
        return Boolean(row?.[x + (dx ?? 0)])
      })
      if (touch) {
        const row = next[y]
        if (row) row[x] = '#24180f'
      }
    }
  }
  return next
}

function knightArt(): HTMLCanvasElement {
  return raster(cacheGrid('knight', () => {
    const g = blank(48, 60)
    box(g, 8, 34, 40, 56, '#2f6fd0')
    box(g, 12, 36, 36, 54, '#3f82e6')
    disc(g, 24, 40, 11, 12, '#9aa6b5')
    disc(g, 20, 38, 7, 9, '#e7edf4')
    box(g, 16, 46, 32, 50, '#d7a23a')
    disc(g, 18, 54, 4, 3, '#6b4424')
    disc(g, 30, 54, 4, 3, '#6b4424')
    disc(g, 24, 24, 12, 11, '#e09820')
    disc(g, 22, 22, 8, 8, '#f2c04a')
    box(g, 10, 14, 38, 20, '#d5dce6')
    box(g, 12, 16, 18, 24, '#eef3f8')
    box(g, 30, 16, 36, 24, '#9aa6b5')
    box(g, 16, 12, 32, 16, '#f7fbff')
    disc(g, 12, 10, 6, 7, '#e8a028')
    disc(g, 36, 10, 6, 7, '#e8a028')
    disc(g, 12, 10, 2.4, 3.2, '#f4b8c4')
    disc(g, 36, 10, 2.4, 3.2, '#f4b8c4')
    disc(g, 19, 23, 1.6, 1.8, '#24180f')
    disc(g, 28, 23, 1.6, 1.8, '#24180f')
    disc(g, 18, 22, 0.6, 0.6, '#fff')
    disc(g, 27, 22, 0.6, 0.6, '#fff')
    disc(g, 24, 27, 2.2, 1.4, '#c47c55')
    box(g, 22, 29, 26, 30, '#24180f')
    return outline(g)
  }))
}

function swordUp(): HTMLCanvasElement {
  return raster(cacheGrid('sword-up', () => {
    const g = blank(10, 30)
    box(g, 3, 4, 6, 22, '#f7fbff')
    box(g, 6, 4, 6, 22, '#b7c2d0')
    box(g, 4, 0, 5, 4, '#ffffff')
    box(g, 1, 20, 8, 23, '#d7a23a')
    box(g, 4, 23, 5, 28, '#6b4424')
    return outline(g)
  }))
}

function swordFwd(): HTMLCanvasElement {
  return raster(cacheGrid('sword-fwd', () => {
    const g = blank(28, 8)
    box(g, 2, 3, 22, 4, '#f7fbff')
    box(g, 2, 4, 22, 4, '#c5d0dc')
    box(g, 22, 2, 26, 5, '#ffffff')
    box(g, 0, 2, 3, 5, '#d7a23a')
    return outline(g)
  }))
}

function spearArt(): HTMLCanvasElement {
  return raster(cacheGrid('spear', () => {
    const g = blank(8, 30)
    box(g, 3, 6, 4, 28, '#8a5a32')
    box(g, 2, 0, 5, 8, '#f4f7fb')
    return outline(g)
  }))
}

function monsterArt(kind: EnemyKind): HTMLCanvasElement {
  if (kind === 'bat') return winged()
  if (kind === 'melee' || kind === 'pup') return shroom()
  if (kind === 'armor') return brute()
  if (kind === 'bossRing') return ringBoss()
  if (kind === 'bossMortar') return tubeBoss()
  if (kind === 'ghost') return wisp()
  if (kind === 'bomber') return cyst()
  if (kind === 'archer' || kind === 'mage') return cannon(kind === 'mage')
  return maw(kind === 'slimeBlue')
}

function maw(blue: boolean): HTMLCanvasElement {
  const body = blue ? '#3f9ad0' : '#5cbf45'
  const dark = blue ? '#1f6e9a' : '#2e8a32'
  return raster(cacheGrid(blue ? 'maw-b' : 'maw', () => {
    const g = blank(36, 28)
    disc(g, 18, 16, 15, 11, dark)
    disc(g, 16, 14, 12, 8, body)
    disc(g, 12, 13, 2.2, 2.4, '#f7fbff')
    disc(g, 22, 13, 2.2, 2.4, '#f7fbff')
    disc(g, 12, 13, 1.1, 1.2, '#24180f')
    disc(g, 22, 13, 1.1, 1.2, '#24180f')
    box(g, 10, 18, 26, 22, '#163018')
    for (const x of [12, 16, 20, 24]) box(g, x, 18, x + 1, 21, '#f4f1e8')
    return outline(g)
  }))
}

function winged(): HTMLCanvasElement {
  return raster(cacheGrid('wing', () => {
    const g = blank(40, 28)
    box(g, 1, 8, 12, 16, '#f6e7c2')
    box(g, 28, 8, 38, 16, '#f6e7c2')
    box(g, 3, 10, 10, 12, '#d7c49a')
    box(g, 30, 10, 36, 12, '#d7c49a')
    disc(g, 20, 16, 9, 8, '#f0c044')
    disc(g, 18, 15, 6, 5, '#ffe08a')
    disc(g, 20, 15, 4.2, 4, '#7ec8ef')
    disc(g, 20, 15, 2, 2.2, '#16324a')
    disc(g, 19, 14, 0.7, 0.7, '#fff')
    box(g, 16, 20, 24, 22, '#c47c14')
    return outline(g)
  }))
}

function shroom(): HTMLCanvasElement {
  return raster(cacheGrid('shroom', () => {
    const g = blank(34, 32)
    disc(g, 17, 14, 13, 9, '#6a32b0')
    disc(g, 14, 12, 9, 6, '#8d4ad4')
    disc(g, 10, 10, 2, 1.4, '#f0e2cf')
    disc(g, 22, 11, 1.6, 1.2, '#f0e2cf')
    disc(g, 17, 20, 6, 4, '#f3e6d4')
    disc(g, 14, 19, 1.3, 1.5, '#24180f')
    disc(g, 20, 19, 1.3, 1.5, '#24180f')
    box(g, 15, 22, 19, 23, '#c47c55')
    box(g, 8, 26, 12, 30, '#6a32b0')
    box(g, 22, 26, 26, 30, '#6a32b0')
    return outline(g)
  }))
}

function brute(): HTMLCanvasElement {
  return raster(cacheGrid('brute', () => {
    const g = blank(32, 34)
    box(g, 6, 8, 26, 16, '#8e98a8')
    box(g, 10, 10, 14, 12, '#24180f')
    box(g, 18, 10, 22, 12, '#24180f')
    box(g, 8, 16, 24, 28, '#d5dce6')
    box(g, 8, 16, 12, 28, '#f7fbff')
    box(g, 10, 28, 14, 32, '#5c534c')
    box(g, 18, 28, 22, 32, '#5c534c')
    return outline(g)
  }))
}

function cyst(): HTMLCanvasElement {
  return raster(cacheGrid('cyst', () => {
    const g = blank(30, 26)
    disc(g, 15, 14, 12, 10, '#e07030')
    disc(g, 12, 12, 7, 6, '#f0a040')
    box(g, 8, 12, 22, 13, '#6a3018')
    box(g, 14, 6, 16, 18, '#6a3018')
    return outline(g)
  }))
}

function wisp(): HTMLCanvasElement {
  return raster(cacheGrid('wisp', () => {
    const g = blank(24, 32)
    disc(g, 12, 16, 7, 12, '#e7eef8')
    disc(g, 9, 12, 1.2, 1.4, '#24180f')
    disc(g, 15, 14, 1.2, 1.4, '#24180f')
    disc(g, 12, 20, 1.2, 1.4, '#24180f')
    return outline(g)
  }))
}

function cannon(tall: boolean): HTMLCanvasElement {
  return raster(cacheGrid(tall ? 'shaman' : 'cannon', () => {
    const g = blank(32, tall ? 36 : 28)
    disc(g, 14, tall ? 10 : 8, 10, 6, '#7a46c8')
    disc(g, 12, tall ? 8 : 6, 6, 3, '#9a62e0')
    box(g, 12, 12, 16, tall ? 28 : 22, '#e6d2b4')
    box(g, 16, 16, 28, 20, '#6b5340')
    return outline(g)
  }))
}

function ringBoss(): HTMLCanvasElement {
  return raster(cacheGrid('ringboss', () => {
    const g = blank(40, 36)
    disc(g, 20, 18, 16, 14, '#a33b48')
    disc(g, 20, 18, 8, 7, '#2a1418')
    disc(g, 20, 16, 2, 2, '#f4f1e8')
    return outline(g)
  }))
}

function tubeBoss(): HTMLCanvasElement {
  return raster(cacheGrid('tube', () => {
    const g = blank(40, 30)
    box(g, 6, 12, 30, 24, '#6a3044')
    box(g, 8, 6, 18, 12, '#3a242c')
    box(g, 8, 24, 12, 28, '#3a242c')
    box(g, 22, 24, 26, 28, '#3a242c')
    return outline(g)
  }))
}

function pillarTall(): HTMLCanvasElement {
  return raster(cacheGrid('pillar', () => {
    const g = blank(14, 36)
    box(g, 2, 4, 11, 32, '#b7aea2')
    box(g, 2, 4, 5, 32, '#d9d0c4')
    box(g, 9, 4, 11, 32, '#8a8176')
    box(g, 1, 0, 12, 4, '#8a8176')
    box(g, 1, 30, 12, 35, '#6a6258')
    return outline(g)
  }))
}

function pillarBroken(): HTMLCanvasElement {
  return raster(cacheGrid('pillar-broken', () => {
    const g = blank(14, 20)
    box(g, 2, 4, 11, 16, '#a3988c')
    box(g, 1, 0, 8, 4, '#6a6258')
    box(g, 1, 16, 12, 19, '#6a6258')
    return outline(g)
  }))
}

function rubble(): HTMLCanvasElement {
  return raster(cacheGrid('rubble', () => {
    const g = blank(12, 8)
    box(g, 1, 3, 6, 6, '#8a8176')
    box(g, 5, 1, 10, 5, '#6a6258')
    return outline(g)
  }))
}

function gateArt(): HTMLCanvasElement {
  return raster(cacheGrid('gate', () => {
    const g = blank(36, 32)
    box(g, 2, 8, 8, 30, '#c4bbb0')
    box(g, 28, 8, 34, 30, '#c4bbb0')
    box(g, 2, 4, 34, 10, '#a3988c')
    for (let x = 12; x <= 24; x += 4) box(g, x, 10, x + 1, 28, '#3e4654')
    box(g, 10, 12, 26, 14, '#3e4654')
    return outline(g)
  }))
}

function torchArt(frame: number): HTMLCanvasElement {
  return raster(cacheGrid(`torch-${frame}`, () => {
    const g = blank(8, 18)
    box(g, 3, 8, 4, 16, '#6b4424')
    disc(g, 4, frame === 0 ? 4 : 5, 3, 4, '#e04820')
    disc(g, 4, frame === 0 ? 3 : 4, 1.4, 2, '#ffe08a')
    return outline(g)
  }))
}

function tileArt(variant: number): HTMLCanvasElement {
  return raster(cacheGrid(`tile-${variant}`, () => {
    const g = blank(16, 16)
    box(g, 0, 0, 15, 15, '#6a6258')
    const stones: Array<[number, number, number, number, string]> = variant % 5 === 0
      ? [[1, 1, 9, 7, '#b7aea2'], [10, 2, 14, 8, '#8d8478'], [2, 9, 7, 14, '#a3988c'], [8, 8, 14, 14, '#7d766c']]
      : variant % 5 === 1
        ? [[1, 1, 6, 14, '#a3988c'], [8, 1, 14, 6, '#c4bbb0'], [8, 8, 14, 14, '#8d8478']]
        : [[1, 1, 14, 6, '#b7aea2'], [1, 8, 8, 14, '#8a8176'], [10, 8, 14, 14, '#a3988c']]
    for (const [x0, y0, x1, y1, color] of stones) box(g, x0, y0, x1, y1, color)
    if (variant % 5 === 2) box(g, 3, 6, 12, 7, '#3e3934')
    if (variant % 5 === 3) box(g, 6, 2, 7, 12, '#3e3934')
    if (variant >= 5) {
      box(g, 1, 11, 5, 14, '#4f7a38')
      box(g, 12, 1, 15, 4, '#6a9448')
    }
    return g
  }))
}

export function posterSprite(name: 'knight' | 'sword' | 'thrust' | 'maw' | 'wing' | 'shroom'): HTMLCanvasElement {
  if (name === 'knight') return knightArt()
  if (name === 'sword') return swordUp()
  if (name === 'thrust') return swordFwd()
  if (name === 'wing') return winged()
  if (name === 'shroom') return shroom()
  return maw(false)
}

function cacheGrid(name: string, build: () => Grid): Grid {
  const built = build()
  built.forEach((row) => { row.unshift(name) })
  return built.map((row) => row.slice(1))
}
