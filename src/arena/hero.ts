import { heroPose, type RunState } from './sim.ts'
import type { Camera } from './view.ts'

/**
 * Flat fallback of the same yellow mascot fighter: rounded ears, broad cheeks,
 * dark eyes and muzzle. Original drawing, not an official asset and not an NFT.
 */
export function drawPlaceholderHero(ctx: CanvasRenderingContext2D, state: RunState, cam: Camera): void {
  const pose = heroPose(state)
  const p = project(state.x, state.y, cam)
  const hand = project(pose.handX, pose.handY, cam)
  const tip = project(pose.tipX, pose.tipY, cam)
  const body = 22 * cam.scale
  const lean = state.dodgeLeft > 0 ? -10 * cam.scale : 0
  const lx = p.x + Math.cos(pose.facing) * lean
  const ly = p.y + Math.sin(pose.facing) * lean

  ctx.save()
  ctx.fillStyle = 'rgba(36, 24, 15, 0.18)'
  ctx.beginPath()
  ctx.ellipse(p.x, p.y + body * 0.85, body * 0.85, body * 0.35, 0, 0, Math.PI * 2)
  ctx.fill()

  if (state.shieldLeft > 0) {
    ctx.strokeStyle = '#1f8a62'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(p.x, p.y, body + 10, 0, Math.PI * 2)
    ctx.stroke()
  }
  if (state.dodgeLeft > 0) {
    ctx.globalAlpha = 0.28
    blob(ctx, p.x - state.dashX * 18 * cam.scale, p.y - state.dashY * 18 * cam.scale, body * 0.9, '#f5c21a')
    ctx.globalAlpha = 0.15
    blob(ctx, p.x - state.dashX * 32 * cam.scale, p.y - state.dashY * 32 * cam.scale, body * 0.7, '#ffe07a')
    ctx.globalAlpha = 1
  }

  const foot = body * 0.28
  const step = Math.sin(state.gait) * foot
  ctx.fillStyle = '#c98412'
  ctx.beginPath()
  ctx.ellipse(lx - body * 0.35, ly + body * 0.72 + step, foot, foot * 0.55, 0, 0, Math.PI * 2)
  ctx.ellipse(lx + body * 0.35, ly + body * 0.72 - step, foot, foot * 0.55, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = state.flash > 0 ? '#fff' : '#e39b0c'
  roundRect(ctx, lx - body * 0.72, ly - body * 0.15, body * 1.44, body * 0.95, body * 0.3)
  ctx.fillStyle = state.flash > 0 ? '#fff' : '#f5c21a'
  ctx.strokeStyle = '#24180f'
  ctx.lineWidth = Math.max(2, body * 0.08)
  ctx.beginPath()
  ctx.arc(lx, ly - body * 0.15, body * 0.78, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#e09a12'
  ctx.beginPath()
  ctx.arc(lx - body * 0.38, ly - body * 0.82, body * 0.28, 0, Math.PI * 2)
  ctx.arc(lx + body * 0.38, ly - body * 0.82, body * 0.28, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffe07a'
  ctx.beginPath()
  ctx.arc(lx - body * 0.42, ly - body * 0.02, body * 0.22, 0, Math.PI * 2)
  ctx.arc(lx + body * 0.42, ly - body * 0.02, body * 0.22, 0, Math.PI * 2)
  ctx.fill()

  const lookX = Math.cos(pose.facing) * body * 0.18
  const lookY = Math.sin(pose.facing) * body * 0.18
  ctx.fillStyle = '#1c140e'
  ctx.beginPath()
  ctx.arc(lx - body * 0.2 + lookX, ly - body * 0.28 + lookY, Math.max(2, body * 0.12), 0, Math.PI * 2)
  ctx.arc(lx + body * 0.2 + lookX, ly - body * 0.28 + lookY, Math.max(2, body * 0.12), 0, Math.PI * 2)
  ctx.ellipse(lx + lookX * 1.3, ly + body * 0.08 + lookY, body * 0.16, body * 0.1, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = '#c98412'
  ctx.lineWidth = Math.max(3, body * 0.28)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(lx + lookX * 0.4, ly + body * 0.05)
  ctx.lineTo(hand.x, hand.y)
  ctx.stroke()

  if (pose.phase === 'active') {
    ctx.strokeStyle = 'rgba(255, 248, 232, 0.85)'
    ctx.lineWidth = Math.max(2, pose.width * cam.scale * 0.35)
    ctx.beginPath()
    ctx.moveTo(hand.x, hand.y)
    ctx.lineTo(tip.x, tip.y)
    ctx.stroke()
  }
  drawWeapon(ctx, pose.weapon, hand, tip, Math.max(3, pose.width * cam.scale))
  ctx.restore()
}

function drawWeapon(
  ctx: CanvasRenderingContext2D,
  weapon: RunState['weapon'],
  hand: { x: number; y: number },
  tip: { x: number; y: number },
  width: number,
): void {
  const dx = tip.x - hand.x
  const dy = tip.y - hand.y
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  ctx.strokeStyle = '#6a4a32'
  ctx.lineWidth = Math.max(2, width * 0.35)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(hand.x - (dx / len) * width * 0.8, hand.y - (dy / len) * width * 0.8)
  ctx.lineTo(hand.x + (dx / len) * width * 0.45, hand.y + (dy / len) * width * 0.45)
  ctx.stroke()
  if (weapon === 'tombak') {
    ctx.strokeStyle = '#8a5a32'
    ctx.lineWidth = Math.max(2, width * 0.7)
    ctx.beginPath()
    ctx.moveTo(hand.x, hand.y)
    ctx.lineTo(tip.x - (dx / len) * width * 2.2, tip.y - (dy / len) * width * 2.2)
    ctx.stroke()
    ctx.fillStyle = '#f7f4ee'
    ctx.beginPath()
    ctx.moveTo(tip.x, tip.y)
    ctx.lineTo(tip.x - (dx / len) * width * 2.8 + nx * width, tip.y - (dy / len) * width * 2.8 + ny * width)
    ctx.lineTo(tip.x - (dx / len) * width * 2.2, tip.y - (dy / len) * width * 2.2)
    ctx.lineTo(tip.x - (dx / len) * width * 2.8 - nx * width, tip.y - (dy / len) * width * 2.8 - ny * width)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#24180f'
    ctx.lineWidth = 1.5
    ctx.stroke()
    return
  }
  ctx.fillStyle = '#f4f1ea'
  ctx.beginPath()
  ctx.moveTo(hand.x + nx * width * 0.55, hand.y + ny * width * 0.55)
  ctx.lineTo(tip.x + nx * width * 0.22, tip.y + ny * width * 0.22)
  ctx.lineTo(tip.x - nx * width * 0.22, tip.y - ny * width * 0.22)
  ctx.lineTo(hand.x - nx * width * 0.55, hand.y - ny * width * 0.55)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#24180f'
  ctx.lineWidth = 1.5
  ctx.stroke()
}

function blob(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fill()
}

function project(x: number, y: number, cam: Camera): { x: number; y: number } {
  return { x: cam.cx + x * cam.scale, y: cam.cy + y * cam.scale }
}
