import { drawPlaceholderHero } from './hero.ts'
import { COURTYARD } from './courtyard.ts'
import { ARENA_R, type Enemy, type RunState } from './sim.ts'

export interface Camera {
  scale: number
  cx: number
  cy: number
}

export function frameArena(width: number, height: number, inset: { top: number; right: number; bottom: number; left: number }): Camera {
  const viewW = Math.max(80, width - inset.left - inset.right)
  const viewH = Math.max(80, height - inset.top - inset.bottom)
  const size = Math.min(viewW, viewH) * 0.94
  return { scale: size / (ARENA_R * 2), cx: inset.left + viewW / 2, cy: inset.top + viewH / 2 }
}

export function drawArena(ctx: CanvasRenderingContext2D, state: RunState, cam: Camera, width: number, height: number): void {
  drawGround(ctx, cam, width, height)
  for (const loot of state.loots) {
    const p = world(loot.x, loot.y, cam)
    ctx.fillStyle = '#ffe08a'
    ctx.fillRect(p.x - 4, p.y - 4, 8, 8)
  }
  drawPuffs(ctx, state, cam)
  for (const enemy of state.enemies) drawMark(ctx, enemy, cam)
  for (const enemy of state.enemies) drawEnemy(ctx, enemy, cam)
  drawShock(ctx, state, cam)
  drawPlaceholderHero(ctx, state, cam)
  drawFloats(ctx, state, cam)
}

function drawGround(ctx: CanvasRenderingContext2D, cam: Camera, width: number, height: number): void {
  ctx.fillStyle = '#3c4336'
  ctx.fillRect(0, 0, width, height)
  ctx.beginPath()
  traceCourtyard(ctx, cam)
  ctx.fillStyle = '#7d766c'
  ctx.fill()
  const cracks: Array<[number, number, number, number]> = [[-40, 30, 50, 70], [30, -20, 80, -70], [-90, -40, -20, 20]]
  ctx.strokeStyle = '#4e4942'
  ctx.lineWidth = 3
  for (const [x1, y1, x2, y2] of cracks) {
    const a = world(x1, y1, cam)
    const b = world(x2, y2, cam)
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
  }
  ctx.beginPath()
  traceCourtyard(ctx, cam)
  ctx.strokeStyle = '#3a342e'
  ctx.lineWidth = 10
  ctx.stroke()
  for (const [x, y] of COURTYARD) {
    const p = world(x, y, cam)
    ctx.fillStyle = '#b7aea2'
    ctx.fillRect(p.x - 4, p.y - 14, 8, 18)
  }
}

function traceCourtyard(ctx: CanvasRenderingContext2D, cam: Camera): void {
  COURTYARD.forEach(([x, y], index) => {
    const p = world(x, y, cam)
    if (index === 0) ctx.moveTo(p.x, p.y)
    else ctx.lineTo(p.x, p.y)
  })
  ctx.closePath()
}

function drawPuffs(ctx: CanvasRenderingContext2D, state: RunState, cam: Camera): void {
  for (const item of state.puffs) {
    const p = world(item.x, item.y, cam)
    const u = item.life / item.max
    ctx.globalAlpha = 0.35 * u
    ctx.fillStyle = '#f4efe2'
    ctx.beginPath()
    ctx.ellipse(p.x, p.y, (8 + (1 - u) * 10) * cam.scale * 0.35, (5 + (1 - u) * 6) * cam.scale * 0.35, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

function drawShock(ctx: CanvasRenderingContext2D, state: RunState, cam: Camera): void {
  const shock = state.shock
  if (!shock || shock.radius <= 1) return
  const p = world(shock.x, shock.y, cam)
  const radius = shock.radius * cam.scale
  const u = shock.life / shock.maxLife
  ctx.save()
  ctx.globalAlpha = 0.28 + 0.45 * u
  ctx.strokeStyle = '#f7fbff'
  ctx.lineWidth = 4 + 6 * u
  ctx.beginPath()
  ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
  ctx.stroke()
  ctx.strokeStyle = '#7ec8ff'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(p.x, p.y, Math.max(2, radius - 10), 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

function drawMark(ctx: CanvasRenderingContext2D, enemy: Enemy, cam: Camera): void {
  const mark = enemy.mark
  if (!mark) return
  const a = Math.max(0.25, mark.life / mark.max)
  ctx.save()
  ctx.globalAlpha = 0.35 + 0.4 * (1 - a)
  ctx.strokeStyle = '#e23b3b'
  ctx.fillStyle = 'rgba(226,59,59,0.28)'
  ctx.lineWidth = Math.max(3, mark.r * cam.scale * 0.18)
  if (mark.kind === 'line') {
    const a1 = world(mark.x, mark.y, cam)
    const a2 = world(mark.x2, mark.y2, cam)
    ctx.lineWidth = Math.max(6, mark.r * 2 * cam.scale)
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(a1.x, a1.y)
    ctx.lineTo(a2.x, a2.y)
    ctx.stroke()
  } else {
    const p = world(mark.x, mark.y, cam)
    ctx.beginPath()
    ctx.arc(p.x, p.y, mark.r * cam.scale, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }
  ctx.restore()
}

function drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy, cam: Camera): void {
  if (enemy.hp <= 0 || enemy.speed === 0) return
  const p = world(enemy.x, enemy.y, cam)
  const r = enemy.r * cam.scale * 1.15
  ctx.fillStyle = 'rgba(36, 24, 15, 0.22)'
  ctx.beginPath()
  ctx.ellipse(p.x, p.y + r * 0.72, r * 0.85, r * 0.28, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.save()
  if (enemy.state === 'fade') ctx.globalAlpha = 0.28
  if (enemy.flash > 0) ctx.globalAlpha = 1
  ctx.fillStyle = enemy.flash > 0 ? '#fff6d8' : colorOf(enemy)
  ctx.beginPath()
  if (enemy.kind === 'bat') {
    ctx.ellipse(p.x, p.y, r * 1.3, r * 0.7, 0, 0, Math.PI * 2)
  } else if (enemy.kind === 'bossRing' || enemy.kind === 'bossMortar') {
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
  } else {
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
  }
  ctx.fill()
  ctx.restore()
  if (enemy.state === 'windup' && enemy.kind !== 'bolt' && !enemy.mark) {
    ctx.strokeStyle = '#fff1a8'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(p.x, p.y, r + 6, 0, Math.PI * 2)
    ctx.stroke()
  }
  if (enemy.flash > 0) {
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(p.x - r, p.y)
    ctx.lineTo(p.x - r - 6, p.y - 4)
    ctx.moveTo(p.x + r, p.y)
    ctx.lineTo(p.x + r + 6, p.y + 3)
    ctx.stroke()
  }
  const bar = Math.max(0, enemy.hp / enemy.maxHp)
  ctx.fillStyle = '#24180f'
  ctx.fillRect(p.x - r, p.y - r - 8, r * 2, 4)
  ctx.fillStyle = '#e23b3b'
  ctx.fillRect(p.x - r, p.y - r - 8, r * 2 * bar, 4)
}

function drawFloats(ctx: CanvasRenderingContext2D, state: RunState, cam: Camera): void {
  ctx.font = '700 18px sans-serif'
  ctx.textAlign = 'center'
  ctx.lineWidth = 3
  for (const item of state.floats) {
    const p = world(item.x, item.y, cam)
    ctx.strokeStyle = '#24180f'
    ctx.strokeText(item.text, p.x, p.y)
    ctx.fillStyle = item.kind === 'hit' ? '#fff6d0' : item.kind === 'shield' ? '#b7f0cf' : item.kind === 'dodge' ? '#d7ecff' : '#ffe1c4'
    ctx.fillText(item.text, p.x, p.y)
  }
}

function colorOf(enemy: Enemy): string {
  switch (enemy.kind) {
    case 'slime':
      return '#7dce4a'
    case 'slimeBlue':
      return '#4aa0e0'
    case 'baby':
      return '#b6e98a'
    case 'bat':
      return '#5c4a78'
    case 'melee':
      return '#d07a3a'
    case 'archer':
      return '#c45b8a'
    case 'bomber':
      return '#e0a030'
    case 'armor':
      return '#8d97a8'
    case 'ghost':
      return '#d7e4ff'
    case 'mage':
      return '#7a4ad0'
    case 'bolt':
      return '#ffb15a'
    case 'bossRing':
      return '#b64040'
    case 'bossMortar':
      return '#8d3d55'
    case 'pup':
      return '#e7c07a'
    default:
      return '#888'
  }
}

function world(x: number, y: number, cam: Camera): { x: number; y: number } {
  return { x: cam.cx + x * cam.scale, y: cam.cy + y * cam.scale }
}
