import type { Enemy, RunState } from './run.ts'
import {
  BITER,
  BITER_BITE,
  CHEST_CORE,
  CHEST_GEAR,
  CHEST_SCRAP,
  FLOOR_DIRT,
  FLOOR_METAL,
  FLOOR_WOOD,
  HAMSTER,
  HAMSTER_DODGE,
  HAMSTER_STEP,
  LAMP,
  PALETTE,
  PIPE,
  RAIL,
  SPITTER,
  SPITTER_AIM,
  WALL_MACHINE,
  WALL_ROCK,
  WALL_TIMBER,
} from './sprites.ts'
import { ROWS, RUINS_ROW, TILE } from './world.ts'

const sheets = new Map<string, HTMLCanvasElement>()

function sheet(key: string, sprite: string[]): HTMLCanvasElement {
  const cached = sheets.get(key)
  if (cached) return cached
  const canvas = document.createElement('canvas')
  canvas.width = 16
  canvas.height = 16
  const pen = canvas.getContext('2d')
  if (!pen) return canvas
  pen.imageSmoothingEnabled = false
  for (let y = 0; y < sprite.length; y++) {
    const row = sprite[y] ?? ''
    for (let x = 0; x < row.length; x++) {
      const color = PALETTE[row[x] ?? '']
      if (!color) continue
      pen.fillStyle = color
      pen.fillRect(x, y, 1, 1)
    }
  }
  sheets.set(key, canvas)
  return canvas
}

function blit(
  ctx: CanvasRenderingContext2D,
  key: string,
  sprite: string[],
  x: number,
  y: number,
  flash = false,
  size = 16,
): void {
  const image = sheet(key, sprite)
  const left = Math.round(x)
  const top = Math.round(y)
  ctx.drawImage(image, left, top, size, size)
  if (!flash) return
  ctx.fillStyle = 'rgba(255,244,230,0.45)'
  ctx.fillRect(left, top, size, size)
}

export function pixelScale(cssW: number): number {
  return cssW < 900 ? 3 : 2
}

function floorSprite(row: number): string[] {
  if (row < 9) return FLOOR_WOOD
  if (row < RUINS_ROW) return FLOOR_DIRT
  return FLOOR_METAL
}

function wallSprite(row: number): string[] {
  if (row < 9) return WALL_TIMBER
  if (row < RUINS_ROW) return WALL_ROCK
  return WALL_MACHINE
}

export function draw(
  ctx: CanvasRenderingContext2D,
  cssW: number,
  cssH: number,
  dpr: number,
  run: RunState,
  reduced: boolean,
): void {
  const scale = pixelScale(cssW)
  const world = run.world
  const viewW = cssW / scale
  const viewH = cssH / scale
  let camX = run.x - viewW / 2
  let camY = run.y - viewH / 2
  if (viewW >= world.w) camX = (world.w - viewW) / 2
  else camX = Math.max(0, Math.min(world.w - viewW, camX))
  if (viewH >= world.h) camY = (world.h - viewH) / 2
  else camY = Math.max(0, Math.min(world.h - viewH, camY))
  camX = Math.round(camX)
  camY = Math.round(camY)
  const shake = !reduced && run.shake > 0 ? Math.round(Math.sin(run.time * 40) * 2) : 0
  const kick = !reduced ? run.kick : 0
  const face = Math.atan2(run.facingY, run.facingX) || 0
  ctx.imageSmoothingEnabled = false
  ctx.setTransform(
    dpr * scale,
    0,
    0,
    dpr * scale,
    dpr * (-camX * scale + shake + Math.cos(face) * kick),
    dpr * (-camY * scale + Math.sin(face) * kick),
  )
  ctx.fillStyle = '#120e0c'
  ctx.fillRect(camX - 2, camY - 2, viewW + 4, viewH + 4)

  for (let row = 0; row < ROWS.length; row++) {
    const line = ROWS[row] ?? ''
    const y = row * TILE
    if (y > camY + viewH || y + TILE < camY) continue
    for (let col = 0; col < line.length; col++) {
      const x = col * TILE
      if (x > camX + viewW || x + TILE < camX) continue
      const cell = line[col]
      if (cell === '#') blit(ctx, `wall-${row < 9 ? 'h' : row < RUINS_ROW ? 'm' : 'r'}`, wallSprite(row), x, y)
      else blit(ctx, `floor-${row < 9 ? 'h' : row < RUINS_ROW ? 'm' : 'r'}`, floorSprite(row), x, y)
      if (cell === 'l') blit(ctx, 'lamp', LAMP, x, y - 6)
      if (cell === '=') blit(ctx, 'rail', RAIL, x, y)
      if (cell === 'i') blit(ctx, 'pipe', PIPE, x, y)
    }
  }

  const hub = ctx.createRadialGradient(run.world.extract.x, 70, 8, run.world.extract.x, 80, 120)
  hub.addColorStop(0, 'rgba(255, 196, 110, 0.28)')
  hub.addColorStop(1, 'rgba(255, 196, 110, 0)')
  ctx.fillStyle = hub
  ctx.fillRect(0, 0, world.w, 160)
  if (run.y > RUINS_ROW * TILE) {
    ctx.fillStyle = 'rgba(80, 140, 160, 0.08)'
    ctx.fillRect(0, RUINS_ROW * TILE, world.w, world.h)
  }

  const zone = world.extract
  const pulse = reduced ? 0 : Math.sin(run.time * 4) * 2
  ctx.strokeStyle = '#d7ffe6'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(zone.x, zone.y, zone.r + pulse, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = '#e9fff2'
  ctx.font = '8px ui-monospace, monospace'
  ctx.textAlign = 'center'
  ctx.fillText('EKSTRAK', zone.x, zone.y - zone.r - 3)

  for (const loot of run.loots) {
    if (loot.taken) continue
    const bob = reduced ? 0 : Math.sin(run.time * 3 + loot.id) * 1
    drawLootIcon(ctx, loot.kind, loot.x - 16, loot.y - 18 + bob)
    if (loot.extra.length > 0) {
      ctx.strokeStyle = '#f0d080'
      ctx.strokeRect(loot.x - 8, loot.y - 8, 16, 12)
    }
  }

  for (const shot of run.shots) {
    ctx.fillStyle = '#ffb089'
    ctx.fillRect(Math.round(shot.x) - 2, Math.round(shot.y) - 2, 4, 4)
  }

  const drawables: { y: number; draw: () => void }[] = []
  for (const enemy of run.enemies) {
    if (enemy.hp <= 0) continue
    drawables.push({
      y: enemy.y,
      draw: () => drawEnemy(ctx, enemy, run.time, reduced),
    })
  }
  drawables.push({ y: run.y, draw: () => drawPlayer(ctx, run, reduced) })
  drawables.sort((a, b) => a.y - b.y)
  for (const item of drawables) item.draw()

  ctx.font = '8px ui-monospace, monospace'
  ctx.textAlign = 'center'
  for (const item of run.popups) {
    ctx.globalAlpha = Math.max(0, item.life * 1.4)
    ctx.fillStyle = '#fff4dc'
    ctx.fillText(item.text, item.x, item.y)
    ctx.globalAlpha = 1
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function drawLootIcon(ctx: CanvasRenderingContext2D, kind: string, x: number, y: number): void {
  if (kind === 'scrap') return blit(ctx, 'chest-scrap', CHEST_SCRAP, x, y, false, 32)
  if (kind === 'gear') return blit(ctx, 'chest-gear', CHEST_GEAR, x, y, false, 32)
  if (kind === 'core') return blit(ctx, 'chest-core', CHEST_CORE, x, y, false, 32)
  ctx.save()
  ctx.translate(x + 8, y + 10)
  if (kind === 'ore') {
    ctx.fillStyle = '#8aa0a8'
    ctx.fillRect(-5, -4, 10, 8)
    ctx.fillStyle = '#d5e4ea'
    ctx.fillRect(-2, -6, 4, 4)
  } else if (kind === 'bandage') {
    ctx.fillStyle = '#f4efe4'
    ctx.fillRect(-6, -3, 12, 6)
    ctx.fillStyle = '#c44848'
    ctx.fillRect(-1, -3, 2, 6)
  } else if (kind === 'tonic') {
    ctx.fillStyle = '#3f8f5a'
    ctx.fillRect(-3, -2, 6, 8)
    ctx.fillStyle = '#d7ffe6'
    ctx.fillRect(-1, -6, 2, 4)
  } else {
    ctx.fillStyle = '#c9a6ff'
    ctx.fillRect(-4, -6, 8, 10)
    ctx.fillStyle = '#fff4dc'
    ctx.fillRect(-1, -2, 2, 2)
  }
  ctx.restore()
}

function drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy, time: number, reduced: boolean): void {
  const alert = enemy.state === 'windup' || enemy.mind === 'alert' || enemy.mind === 'chase' || enemy.alarm > 0.2
  if (alert) {
    ctx.strokeStyle = enemy.kind === 'spitter' ? '#ffd27a' : '#ff6a4a'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(enemy.x, enemy.y, 10 + enemy.telegraph * 10, 0, Math.PI * 2)
    ctx.stroke()
    if (enemy.kind === 'spitter') {
      ctx.beginPath()
      ctx.moveTo(enemy.x, enemy.y)
      ctx.lineTo(enemy.aimX, enemy.aimY)
      ctx.stroke()
    }
    ctx.fillStyle = '#fff6df'
    ctx.font = '8px ui-monospace, monospace'
    ctx.textAlign = 'center'
    ctx.fillText('!', enemy.x, enemy.y - 14)
  }
  const frame = enemy.kind === 'spitter'
    ? enemy.state === 'windup' ? SPITTER_AIM : SPITTER
    : enemy.state === 'windup' ? BITER_BITE : BITER
  const hop = !reduced && enemy.state !== 'windup' && Math.floor(time * 4 + enemy.id) % 2 === 0 ? -1 : 0
  blit(ctx, `${enemy.kind}-${enemy.state === 'windup' ? 'w' : 'i'}`, frame, enemy.x - 16, enemy.y - 18 + hop, false, 32)
  if (enemy.kind === 'guard') {
    ctx.fillStyle = '#d7dde4'
    ctx.fillRect(enemy.x - 5, enemy.y - 16, 10, 3)
  }
  const ratio = Math.max(0, enemy.hp / enemy.maxHp)
  ctx.fillStyle = '#1a120e'
  ctx.fillRect(enemy.x - 7, enemy.y - 16, 14, 2)
  ctx.fillStyle = ratio > 0.4 ? '#d8ef9a' : '#ff8b78'
  ctx.fillRect(enemy.x - 7, enemy.y - 16, 14 * ratio, 2)
}

function drawPlayer(ctx: CanvasRenderingContext2D, run: RunState, reduced: boolean): void {
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.beginPath()
  ctx.ellipse(run.x, run.y + 6, 6, 2, 0, 0, Math.PI * 2)
  ctx.fill()
  const pose = bladePose(run)
  const face = Math.atan2(run.facingY, run.facingX)
  const lx = Math.cos(face) * pose.lunge
  const ly = Math.sin(face) * pose.lunge
  const walking = run.travel > 0 && !reduced && Math.floor(run.travel / 8) % 2 === 1 && run.dodgeLeft <= 0 && run.swingT < 0
  const sprite = run.dodgeLeft > 0 ? HAMSTER_DODGE : walking ? HAMSTER_STEP : HAMSTER
  const key = run.dodgeLeft > 0 ? 'ham-d' : walking ? 'ham-s' : 'ham-i'
  blit(ctx, key, sprite, run.x + lx - 16, run.y + ly - 22, run.hitFlash > 0.05, 32)
  if (run.time < run.shieldUntil) {
    ctx.strokeStyle = '#9fd7ff'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(run.x, run.y, 11, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.save()
  ctx.translate(run.x + lx, run.y + ly)
  ctx.rotate(face + pose.sword)
  ctx.fillStyle = '#6d4124'
  ctx.fillRect(2, -3, 4, 6)
  ctx.fillStyle = '#f4f7fb'
  ctx.fillRect(6, -2, pose.blade, 3)
  ctx.fillStyle = '#9aa4aa'
  ctx.fillRect(6, 1, pose.blade, 1)
  ctx.fillStyle = '#fff6d8'
  ctx.fillRect(6 + pose.blade - 3, -3, 4, 6)
  ctx.restore()
  if (run.slashLife > 0) {
    const reach = Math.max(18, run.slashRange * (0.55 + pose.swing * 0.35))
    ctx.save()
    ctx.translate(run.x + lx, run.y + ly)
    ctx.rotate(run.slashAngle)
    const lead = pose.sword
    const trail = -run.slashArc / 2
    ctx.beginPath()
    ctx.moveTo(6, 0)
    ctx.arc(0, 0, reach, Math.min(trail, lead), Math.max(lead, trail + 0.2))
    ctx.closePath()
    ctx.fillStyle = run.didHit
      ? run.slashKind === 'heavy' ? 'rgba(255, 186, 70, 0.72)' : 'rgba(255, 244, 214, 0.62)'
      : 'rgba(232, 226, 210, 0.28)'
    ctx.fill()
    ctx.strokeStyle = run.didHit ? 'rgba(255, 250, 230, 0.9)' : 'rgba(255,255,255,0.35)'
    ctx.lineWidth = run.slashKind === 'heavy' ? 3 : 2
    ctx.stroke()
    ctx.restore()
  }
  for (const spark of run.sparks) {
    ctx.fillStyle = `rgba(255, 230, 180, ${spark.life * 4})`
    ctx.fillRect(spark.x, spark.y, 2, 2)
  }
}

function bladePose(run: RunState): { sword: number; lunge: number; lean: number; blade: number; swing: number } {
  if (run.swingT < 0) {
    if (run.attackDown && run.attackHold > 0.06) {
      const u = Math.min(1, run.attackHold / 0.34)
      return { sword: -1.15 * u, lunge: -6 * u, lean: -0.28 * u, blade: 14, swing: 0 }
    }
    return { sword: 0.35, lunge: 0, lean: 0, blade: 14, swing: 0 }
  }
  const w = Math.max(0.001, run.windup)
  const a = Math.max(0.001, run.active)
  const f = Math.max(0.001, run.follow)
  const arc = run.slashArc > 0 ? run.slashArc : 1.15
  if (run.swingT < w) {
    const u = run.swingT / w
    return { sword: -arc * 0.7 * u, lunge: -5 * u, lean: -0.22 * u, blade: 14, swing: 0 }
  }
  if (run.swingT < w + a) {
    const u = (run.swingT - w) / a
    const e = u * u * (3 - 2 * u)
    return { sword: -arc * 0.7 + arc * 1.4 * e, lunge: -5 + 12 * e, lean: -0.22 + 0.5 * e, blade: 14 + e * 4, swing: e }
  }
  const u = Math.min(1, (run.swingT - w - a) / f)
  return { sword: arc * 0.7 * (1 - u), lunge: 7 * (1 - u), lean: 0.24 * (1 - u), blade: 16, swing: 1 - u }
}
