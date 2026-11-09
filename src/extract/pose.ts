import { blit, eyeBody, hamsterDown, knightBust, knightCape, mawSprite, wingMembrane } from './patterns.ts'
import { SPEAR_ACTIVE, SPEAR_TOTAL, SPEAR_WIND, spearBodyShift, spearExtension, spearHex, type SpearRarity } from './spear.ts'
import { SHIELD_MAX, SWING_ACTIVE, SWING_REACH, SWING_TOTAL, SWING_WIND, bladeOffset, swordAim } from './sim.ts'

export interface HeroPose {
  facing: number
  gait: number
  stepping: boolean
  swing: number
  sword: boolean
  shield: number | null
  blocking: boolean
  dodge: number
  hurt: number
  cape: number
  age: number
  breakFx?: number
  weapon?: 'sword' | 'tombak' | 'bilah' | 'spear'
  spearRarity?: SpearRarity
  spearReach?: number
  /** 0–1 while Pelebur Jiwa lifts the weapon overhead. */
  rite?: number
}

type Dir = 'n' | 'e' | 's' | 'w'
type Pen = CanvasRenderingContext2D

const ARMOR = '#d5dce6'
const BELT = '#d7a23a'
const BOOT = '#6b4424'
const BLADE = '#f7fbff'
const BLADE_SHADE = '#b7c2d0'
const FUR = '#f2c04a'
const FUR_DEEP = '#e09820'
const PAW = '#f8e7b0'

const DIR_MARGIN = 0.18
let heldDir: Dir | null = null

export function rawQuarter(facing: number): Dir {
  const a = Math.atan2(Math.sin(facing), Math.cos(facing))
  if (Math.abs(a) <= Math.PI / 4) return 'e'
  if (Math.abs(a) >= (3 * Math.PI) / 4) return 'w'
  return a > 0 ? 's' : 'n'
}

function dirCenter(dir: Dir): number {
  if (dir === 'e') return 0
  if (dir === 's') return Math.PI / 2
  if (dir === 'w') return Math.PI
  return -Math.PI / 2
}

function angDiff(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from))
}

/** Four-way facing. A small dead zone stops the sprite flipping when the stick sits on a diagonal. */
export function quarter(facing: number): Dir {
  const a = Math.atan2(Math.sin(facing), Math.cos(facing))
  const next = rawQuarter(a)
  if (heldDir == null || next === heldDir) {
    heldDir = next
    return next
  }
  const heldCenter = dirCenter(heldDir)
  if (Math.abs(angDiff(heldCenter, a)) > Math.PI / 2 + DIR_MARGIN) {
    heldDir = next
    return next
  }
  const nextCenter = dirCenter(next)
  const boundary = heldCenter + angDiff(heldCenter, nextCenter) / 2
  const intoNext = angDiff(boundary, a)
  const towardNext = angDiff(boundary, nextCenter)
  if (intoNext * towardNext > 0 && Math.abs(intoNext) > DIR_MARGIN) {
    heldDir = next
    return next
  }
  return heldDir
}

export function cardinalFacing(facing: number): number {
  return dirCenter(rawQuarter(facing))
}

/** The upright sprite direction. Diagonals use the nearest side, front, or back. */
export function spriteFacing(facing: number): number {
  return cardinalFacing(facing)
}

function spin(x: number, y: number, angle: number): { x: number; y: number } {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return { x: x * c - y * s, y: x * s + y * c }
}

export function drawHero(ctx: Pen, footX: number, footY: number, scale: number, pose: HeroPose): void {
  const dir = quarter(pose.facing)
  const guard = noteBlock(pose)
  const brace = guard.raise
  const bob = (pose.stepping ? Math.abs(Math.sin(pose.gait)) * 1.4 : Math.sin(pose.age * 2) * 0.35) + (pose.dodge > 0 ? -1 : 0)
  const stride = pose.stepping ? Math.sin(pose.gait) * 3.6 : 0
  const liftL = pose.stepping ? Math.max(0, Math.sin(pose.gait)) * 5 : 0
  const liftR = pose.stepping ? Math.max(0, -Math.sin(pose.gait)) * 5 : 0
  const lag = Math.atan2(Math.sin(pose.cape - pose.facing - Math.PI), Math.cos(pose.cape - pose.facing - Math.PI))
  const capeX = Math.sin(lag) * 5 + (pose.stepping ? Math.sin(pose.gait) * 1.5 : 0)
  const hurt = pose.hurt > 0 && Math.floor(pose.hurt * 24) % 2 === 0
  const s = scale
  const thrustingNow = pose.weapon === 'spear' && pose.swing > 0
  const thrustElapsed = thrustingNow ? SPEAR_TOTAL - pose.swing : 0
  const bodyLunge = spearBodyShift(thrustElapsed, thrustingNow)
  let fx = footX + Math.cos(pose.facing) * bodyLunge
  let fy = footY + Math.sin(pose.facing) * bodyLunge
  const put = (x: number, y: number, w: number, h: number, color: string) => {
    const px = Math.round(fx + x * s)
    const py = Math.round(fy + (y - bob) * s)
    const pw = Math.max(1, Math.round(w * s))
    const ph = Math.max(1, Math.round(h * s))
    ctx.fillStyle = '#14110e'
    ctx.fillRect(px - 1, py - 1, pw + 2, ph + 2)
    ctx.fillStyle = hurt ? '#f4f7fb' : color
    ctx.fillRect(px, py, pw, ph)
  }
  ctx.fillStyle = 'rgba(20, 14, 10, 0.35)'
  ctx.beginPath()
  ctx.ellipse(Math.round(fx), Math.round(fy), 7 * s, 3 * s, 0, 0, Math.PI * 2)
  ctx.fill()

  const faceEast = dir === 'e' || dir === 'w'
  const flip = dir === 'w' ? -1 : 1
  const depth = gearDepth(pose.facing)
  const shieldNear = -Math.cos(pose.facing) > 0
  const boot = (x: number, lift: number) => {
    put(x, -4 - lift, 5, 4, BOOT)
    put(x + 0.5, -8 - lift, 4, 4, ARMOR)
  }
  const planted = brace > 0.45 && pose.dodge <= 0 && !pose.stepping
  if (pose.dodge > 0) {
    boot(-2, 2)
    boot(1, 2)
  } else if (planted) {
    boot(flip * -7, 0)
    boot(flip * 6, 0)
  } else if (faceEast) {
    boot(flip * (5 + stride), liftL)
    boot(flip * (-5 - stride), liftR)
  } else {
    boot(-8 + stride, liftL)
    boot(3 - stride, liftR)
  }

  const face = dir === 'n' ? 'n' : dir === 's' ? 's' : 'e'
  const walkFrame = pose.dodge > 0 ? 3 : pose.stepping ? (Math.sin(pose.gait) >= 0 ? 1 : 2) : 0
  const bust = knightBust(face, walkFrame)
  const cape = knightCape(face)
  const recoil = guard.spark > 0 ? 2.2 : 0
  const thrust = pose.weapon === 'spear'
  const elapsed = pose.swing > 0 ? (thrust ? SPEAR_TOTAL : SWING_TOTAL) - pose.swing : 0
  const rite = pose.rite ?? 0
  const aim = rite > 0 ? -Math.PI / 2 : pose.swing > 0 && !thrust ? shownSwordAim(pose.facing, pose.swing, dir) : raisedAim(dir)
  const bobWeapon = bob - rite * 14
  const active = !thrust && pose.swing > 0 && elapsed >= SWING_WIND && elapsed <= SWING_WIND + SWING_ACTIVE
  const broken = pose.breakFx ?? 0
  const paintActive = () => {
    if (!pose.sword || !active) return
    const shoulder = {
      x: fx + (dir === 'w' ? -4 : 4) * s,
      y: fy + (-17 - bob) * s,
    }
    const hand = {
      x: shoulder.x + Math.cos(aim) * 6 * s,
      y: shoulder.y + Math.sin(aim) * 6 * s,
    }
    stampLine(ctx, shoulder.x, shoulder.y, hand.x, hand.y, s, hurt ? '#f4f7fb' : ARMOR)
    const tipX = fx + Math.cos(aim) * SWING_REACH * s
    const tipY = fy + Math.sin(aim) * SWING_REACH * s
    drawBlade(ctx, hand.x, hand.y, tipX, tipY, s, true)
  }
  const paintSmear = () => {
    if (pose.swing <= 0 || elapsed < 0.08 || elapsed > 0.22) return
    const radius = SWING_REACH * s * 0.92
    ctx.fillStyle = 'rgba(255, 248, 230, 0.8)'
    for (let i = 0; i <= 8; i += 1) {
      const a = pose.facing - Math.PI / 2 + (Math.PI * i) / 8
      ctx.fillRect(Math.round(fx + Math.cos(a) * radius), Math.round(fy + Math.sin(a) * radius), Math.max(1, Math.round(s * 0.7)), Math.max(1, Math.round(s * 0.7)))
    }
  }
  const paintRaised = () => {
    if (pose.sword && !active) drawRaisedSword(ctx, fx, fy, s, dir, bobWeapon, hurt, aim, pose.weapon ?? 'sword')
  }
  const paintSpear = () => {
    if (!thrust) return
    drawSpear(ctx, fx, fy, s, rite > 0 ? -Math.PI / 2 : pose.facing, elapsed, pose.swing > 0, pose.spearReach ?? 68, pose.spearRarity ?? 'langka', pose.age, bobWeapon, hurt)
  }
  const paintSword = () => {
    if (thrust) return
    paintActive()
    paintSmear()
    paintRaised()
  }
  const paintShield = () => {
    if ((pose.shield != null && pose.shield > 0) || broken > 0 || guard.jolt > 0) {
      drawShieldArm(ctx, {
        fx, fy, s, dir, facing: pose.facing, residual: 0, durability: pose.shield ?? 0, bob, age: pose.age,
        spark: guard.spark, crouch: brace * 1.2, raise: brace, recoil: guard.recoil, jolt: Math.max(guard.jolt, broken > 0 && pose.shield == null ? Math.min(1, broken / 0.22) : 0),
        hurt, broken,
      })
    } else {
      const off = pose.stepping ? Math.sin(pose.gait + Math.PI) * 4 : 0
      put(dir === 'w' ? 3 : -8, -18 - Math.abs(off), 3, 7, ARMOR)
    }
  }
  const swordBehind = depth === 'back' || (depth === 'side' && shieldNear)
  const shieldBehind = depth === 'back' || (depth === 'side' && !shieldNear)
  if (shieldBehind) paintShield()
  if (swordBehind) paintSword()

  ctx.save()
  if (dir === 'w') {
    ctx.translate(fx, 0)
    ctx.scale(-1, 1)
    ctx.translate(-fx, 0)
  }
  const shoveX = recoil > 0 ? -Math.cos(pose.facing) * recoil * s : 0
  const shoveY = recoil > 0 ? -Math.sin(pose.facing) * recoil * s : 0
  blit(ctx, cape, fx + shoveX - (cape.width * s) / 2 + capeX * s * 0.45, fy + shoveY - (8 + cape.height + bob) * s, s)
  blit(ctx, bust, fx + shoveX - (bust.width * s) / 2, fy + shoveY - (8 + bust.height + bob) * s, s)
  ctx.restore()

  if (thrust) paintSpear()
  if (depth === 'front') {
    paintShield()
    if (!thrust) {
      paintActive()
      paintSmear()
      paintRaised()
    }
  } else {
    if (!shieldBehind) paintShield()
    if (!swordBehind) paintSword()
  }
  if (pose.stepping && Math.sin(pose.gait) > 0.85) {
    put(-2, -1, 2, 1, '#5c4632')
  }
}

/** North, including the up-diagonals, holds gear in front of the body and out of sight. South keeps it in view. */
function gearDepth(facing: number): 'back' | 'front' | 'side' {
  const rise = Math.sin(facing)
  const cut = Math.sin(Math.PI / 8)
  if (rise < -cut) return 'back'
  if (rise > cut) return 'front'
  return 'side'
}

function raisedAim(dir: Dir): number {
  return -Math.PI / 2 + (dir === 'w' ? -0.48 : 0.48)
}

function shownSwordAim(facing: number, swing: number, dir: Dir): number {
  const rest = raisedAim(dir)
  const elapsed = SWING_TOTAL - swing
  if (elapsed < SWING_WIND) {
    const k = smoothStep(elapsed / SWING_WIND)
    return lerpAngle(rest, facing + bladeOffset(SWING_WIND), k)
  }
  if (elapsed >= SWING_WIND + SWING_ACTIVE) {
    const span = Math.max(0.01, SWING_TOTAL - SWING_WIND - SWING_ACTIVE)
    const k = smoothStep(Math.min(1, (elapsed - SWING_WIND - SWING_ACTIVE) / span))
    return lerpAngle(facing + Math.PI / 2, rest, k)
  }
  return swordAim(facing, swing)
}

function smoothStep(t: number): number {
  const x = Math.max(0, Math.min(1, t))
  return x * x * (3 - 2 * x)
}

function lerpAngle(from: number, to: number, t: number): number {
  return from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * t
}

function drawSpear(
  ctx: Pen,
  fx: number,
  fy: number,
  s: number,
  facing: number,
  elapsed: number,
  thrusting: boolean,
  reach: number,
  rarity: SpearRarity,
  age: number,
  bob: number,
  hurt: boolean,
): void {
  const ext = spearExtension(elapsed, thrusting)
  const len = Math.max(10, reach * ext)
  const lunging = thrusting && elapsed >= SPEAR_WIND && elapsed <= SPEAR_WIND + SPEAR_ACTIVE
  const pull = thrusting && elapsed < SPEAR_WIND ? (1 - elapsed / SPEAR_WIND) : 0
  const hx = fx + Math.cos(facing) * (7 - pull * 6) * s
  const hy = fy + (-13 - bob) * s + Math.sin(facing) * (7 - pull * 6) * s
  const tx = hx + Math.cos(facing) * len * s
  const ty = hy + Math.sin(facing) * len * s
  const color = hurt ? '#f4f7fb' : spearHex(rarity)
  const px = Math.cos(facing + Math.PI / 2)
  const py = Math.sin(facing + Math.PI / 2)
  const shaft = Math.max(4, Math.round(s * 2.4))
  if (lunging) {
    for (const [lag, alpha] of [[0.045, 0.55], [0.08, 0.28]] as const) {
      const ghost = spearExtension(Math.max(0, elapsed - lag), true)
      const gx = hx + Math.cos(facing) * reach * ghost * s
      const gy = hy + Math.sin(facing) * reach * ghost * s
      ctx.globalAlpha = alpha
      ctx.fillStyle = '#f7fbff'
      ctx.fillRect(Math.round(gx - s), Math.round(gy - s), Math.max(2, Math.round(s * 2)), Math.max(2, Math.round(s * 2)))
    }
    ctx.globalAlpha = 0.85
    thickLine(ctx, hx + (tx - hx) * 0.45, hy + (ty - hy) * 0.45, tx, ty, Math.max(1, shaft - 1), '#f7fbff')
    ctx.globalAlpha = 1
  }
  thickLine(ctx, hx, hy, tx, ty, shaft + 2, '#14110e')
  thickLine(ctx, hx, hy, tx, ty, shaft, '#6a442c')
  thickLine(ctx, hx + (tx - hx) * 0.12, hy + (ty - hy) * 0.12, tx, ty, Math.max(1, shaft - 1), color)
  const guard = 4.5 * s
  thickLine(ctx, hx - px * guard, hy - py * guard, hx + px * guard, hy + py * guard, Math.max(2, Math.round(s)), '#c4a15a')
  const tip = Math.max(6, Math.round(s * 3.6))
  ctx.fillStyle = '#14110e'
  ctx.fillRect(Math.round(tx - tip / 2) - 1, Math.round(ty - tip / 2) - 1, tip + 2, tip + 2)
  ctx.fillStyle = '#f2c04a'
  ctx.fillRect(Math.round(tx - tip / 2), Math.round(ty - tip / 2), tip, tip)
  ctx.fillStyle = '#f7fbff'
  ctx.fillRect(Math.round(tx - s * 0.4), Math.round(ty - s * 0.4), Math.max(1, Math.round(s)), Math.max(1, Math.round(s)))
  if (lunging && ext > 0.72) {
    const colors = ['#f2c04a', '#7ec8c4', '#f7fbff']
    const ox = tx - Math.cos(facing) * 8 * s
    const oy = ty - Math.sin(facing) * 8 * s
    for (let i = 0; i < 6; i += 1) {
      const a = facing + Math.PI + (i - 2.5) * 0.5
      const d = (4 + (i % 3) * 5) * s
      ctx.fillStyle = colors[i % colors.length]!
      const w = Math.max(3, Math.round(s * 1.6))
      ctx.fillRect(Math.round(ox + Math.cos(a) * d), Math.round(oy + Math.sin(a) * d), w, w)
    }
  } else if (Math.sin(age * 8) > 0.2) {
    ctx.fillStyle = '#f7fbff'
    ctx.fillRect(Math.round(tx + px * 3 * s), Math.round(ty - 2 * s), Math.max(1, Math.round(s)), Math.max(1, Math.round(s)))
  }
}

function drawRaisedSword(ctx: Pen, fx: number, fy: number, s: number, dir: Dir, bob: number, hurt: boolean, aim: number, weapon: 'sword' | 'tombak' | 'bilah' | 'spear' = 'sword'): void {
  const side = dir === 'w' ? -1 : 1
  const hx = fx + side * 12 * s
  const hy = fy + (-18 - bob) * s
  const len = (weapon === 'tombak' ? 44 : 32) * s
  const metal = weapon === 'bilah' ? '#f2c04a' : weapon === 'tombak' ? '#7ec8c4' : '#d5dce6'
  const tipX = hx + Math.cos(aim) * len
  const tipY = hy + Math.sin(aim) * len
  const px = Math.cos(aim + Math.PI / 2)
  const py = Math.sin(aim + Math.PI / 2)
  const flank = Math.max(1.5, s * 1.5)
  const sx = fx + side * 5 * s
  const sy = fy + (-16 - bob) * s
  thickLine(ctx, sx, sy, hx, hy, Math.max(2, s * 1.5), hurt ? '#f4f7fb' : FUR)
  thickLine(ctx, hx + px * flank, hy + py * flank, tipX + px * flank * 0.2, tipY + py * flank * 0.2, Math.max(2, s * 1.2), '#14110e')
  thickLine(ctx, hx - px * flank, hy - py * flank, tipX - px * flank * 0.2, tipY - py * flank * 0.2, Math.max(2, s * 1.2), '#14110e')
  thickLine(ctx, hx, hy, tipX, tipY, Math.max(3, s * (weapon === 'bilah' ? 2.8 : 2.3)), hurt ? '#f4f7fb' : metal)
  thickLine(ctx, hx + px * flank * 0.28, hy + py * flank * 0.28, tipX, tipY, Math.max(1, s * 0.85), '#f7fbff')
  const guard = Math.max(5, s * 4.4)
  thickLine(ctx, hx - px * guard, hy - py * guard, hx + px * guard, hy + py * guard, Math.max(2, s * 1.6), '#14110e')
  thickLine(ctx, hx - px * (guard - s), hy - py * (guard - s), hx + px * (guard - s), hy + py * (guard - s), Math.max(2, s * 1.15), BELT)
  const grip = 5 * s
  thickLine(ctx, hx, hy, hx - Math.cos(aim) * grip, hy - Math.sin(aim) * grip, Math.max(2, s * 1.5), BOOT)
  const paw = Math.max(4, Math.round(s * 2.6))
  ctx.fillStyle = '#14110e'
  ctx.fillRect(Math.round(hx - paw), Math.round(hy - paw), paw * 2, paw * 2)
  ctx.fillStyle = hurt ? '#f4f7fb' : PAW
  ctx.fillRect(Math.round(hx - paw + 1), Math.round(hy - paw + 1), Math.max(1, paw * 2 - 2), Math.max(1, paw * 2 - 2))
}

function drawLimb(ctx: Pen, sx: number, sy: number, ex: number, ey: number, hx: number, hy: number, scale: number, hurt: boolean): void {
  const deep = hurt ? '#f4f7fb' : FUR_DEEP
  const fur = hurt ? '#f4f7fb' : FUR
  brickAlong(ctx, sx, sy, ex, ey, scale, deep, 3.1)
  brickAlong(ctx, ex, ey, hx, hy, scale, fur, 2.6)
  const n = Math.max(2, Math.round(scale * 1.3))
  ctx.fillStyle = '#14110e'
  ctx.fillRect(Math.round(ex - n), Math.round(ey - n), n * 2, n * 2)
  ctx.fillStyle = deep
  ctx.fillRect(Math.round(ex - n + 1), Math.round(ey - n + 1), Math.max(1, n * 2 - 2), Math.max(1, n * 2 - 2))
}

function brickAlong(ctx: Pen, x0: number, y0: number, x1: number, y1: number, scale: number, color: string, thick: number): void {
  const steps = 4
  const w = Math.max(3, Math.round(scale * thick))
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps
    const x = x0 + (x1 - x0) * t - w / 2
    const y = y0 + (y1 - y0) * t - w / 2
    ctx.fillStyle = '#14110e'
    ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, w + 2, w + 2)
    ctx.fillStyle = color
    ctx.fillRect(Math.round(x), Math.round(y), w, w)
  }
}

function drawPaw(ctx: Pen, x: number, y: number, aim: number, scale: number, hurt: boolean, kind: 'sword' | 'shield'): void {
  const w = Math.max(4, Math.round(scale * 3.4))
  const h = Math.max(4, Math.round(scale * 3.1))
  ctx.save()
  ctx.translate(Math.round(x), Math.round(y))
  ctx.rotate(aim)
  ctx.fillStyle = '#14110e'
  ctx.fillRect(-Math.round(w * 0.55) - 1, -Math.round(h * 0.55) - 1, w + 2, h + 2)
  ctx.fillStyle = hurt ? '#f4f7fb' : PAW
  ctx.fillRect(-Math.round(w * 0.55), -Math.round(h * 0.55), w, h)
  ctx.fillStyle = hurt ? '#f4f7fb' : FUR_DEEP
  ctx.fillRect(Math.round(w * 0.15), -Math.round(h * 0.2), Math.max(2, Math.round(scale)), Math.max(2, Math.round(scale * 0.8)))
  ctx.fillRect(Math.round(w * 0.15), Math.round(h * 0.05), Math.max(2, Math.round(scale)), Math.max(2, Math.round(scale * 0.8)))
  if (kind === 'sword') {
    ctx.fillStyle = BOOT
    ctx.fillRect(-Math.round(scale * 1.2), -Math.round(scale * 0.7), Math.max(3, Math.round(scale * 2.2)), Math.max(2, Math.round(scale * 1.4)))
  }
  ctx.restore()
}

function drawBlade(ctx: Pen, x: number, y: number, tipX: number, tipY: number, scale: number, live: boolean): void {
  stampLine(ctx, x, y, tipX, tipY, scale, BLADE)
  const aim = Math.atan2(tipY - y, tipX - x)
  stampLine(ctx, x + Math.cos(aim + 1.4) * scale, y + Math.sin(aim + 1.4) * scale, tipX, tipY, Math.max(1, scale * 0.6), BLADE_SHADE)
  ctx.fillStyle = BOOT
  ctx.fillRect(Math.round(x - scale * 0.4), Math.round(y - scale * 0.3), Math.round(scale * 1.3), Math.round(scale * 2.2))
  ctx.fillStyle = BELT
  const guard = Math.atan2(tipY - y, tipX - x) + Math.PI / 2
  ctx.fillRect(Math.round(x + Math.cos(guard) * scale - scale), Math.round(y + Math.sin(guard) * scale * 0.2 - scale * 0.4), Math.round(scale * 2.4), Math.round(scale))
  if (live) ctx.fillRect(Math.round(tipX), Math.round(tipY), Math.max(1, Math.round(scale)), Math.max(1, Math.round(scale)))
}

let blockShown = 0
let lastPoseAge = 0
let seenShield: number | null = null
let sparkUntil = 0
let recoilStart = 0
let recoilUntil = 0
let joltUntil = 0
let blockPreview: { raise: number; spark: number; recoil: number; jolt: number } | null = null

function noteBlock(pose: HeroPose): { spark: number; raise: number; recoil: number; jolt: number } {
  if (blockPreview) {
    blockShown = blockPreview.raise
    return blockPreview
  }
  const dt = Math.max(0, Math.min(0.05, pose.age - lastPoseAge))
  lastPoseAge = pose.age
  const target = pose.blocking ? 1 : 0
  blockShown += (target - blockShown) * Math.min(1, dt / 0.09)
  if (seenShield != null && pose.shield != null && pose.shield < seenShield) {
    sparkUntil = pose.age + 0.2
    recoilStart = pose.age
    recoilUntil = pose.age + 0.07
  }
  if (seenShield != null && seenShield > 0 && (pose.shield == null || pose.shield <= 0)) {
    sparkUntil = pose.age + 0.28
    joltUntil = pose.age + 0.16
    recoilUntil = pose.age
  }
  seenShield = pose.shield
  const spark = pose.age < sparkUntil ? sparkUntil - pose.age : 0
  return { spark, raise: blockShown, recoil: pulse(pose.age, recoilStart, recoilUntil), jolt: pose.age < joltUntil ? Math.min(1, (joltUntil - pose.age) / 0.16) : 0 }
}

function pulse(age: number, start: number, until: number): number {
  if (age < start || age >= until) return 0
  const t = (age - start) / Math.max(0.001, until - start)
  if (t < 0.4) return t / 0.4
  return 1 - (t - 0.4) / 0.6
}

function drawShieldArm(ctx: Pen, pose: {
  fx: number
  fy: number
  s: number
  dir: Dir
  facing: number
  durability: number
  bob: number
  age: number
  spark: number
  crouch: number
  raise: number
  recoil: number
  jolt: number
  residual: number
  hurt: boolean
  broken: number
}): void {
  const { fx, fy, s, dir, facing, residual, durability, bob, age, spark, crouch, raise, recoil, jolt, hurt, broken } = pose
  const off = dir === 'w' ? 1 : -1
  const tremble = raise > 0.92 && recoil < 0.08 && jolt < 0.08 ? Math.sin(age * 17) * 0.55 : 0
  const fwdX = Math.cos(facing)
  const fwdY = Math.sin(facing)
  const chest = spin(off * 2, -13 - bob, residual)
  const hip = spin(off * 11, -12 - bob, residual)
  const back = recoil * 4.8 + jolt * 7
  const away = Math.sin(facing) < -Math.sin(Math.PI / 8)
  let frontX = chest.x + fwdX * (8 + tremble) - fwdX * back
  let frontY = chest.y + fwdY * (6 + tremble) - fwdY * back + jolt * 1.2
  if (away) {
    frontX = off * 14 + fwdX * (raise * 5 + tremble) - fwdX * back
    frontY = -22 - bob + fwdY * (6 + raise * 10 + tremble) - fwdY * back + jolt * 1.2
  }
  const sx = hip.x + (frontX - hip.x) * raise
  const sy = hip.y + (frontY - hip.y) * raise
  const shieldX = fx + sx * s
  const shieldY = fy + sy * s
  const shoulderOff = spin(off * 5.5, -17 - bob, residual)
  const shoulderX = fx + shoulderOff.x * s
  const shoulderY = fy + (crouch + shoulderOff.y) * s
  const gripX = shieldX + (shoulderX - shieldX) * 0.18
  const gripY = shieldY + (shoulderY - shieldY) * 0.18
  const ang = Math.atan2(gripY - shoulderY, gripX - shoulderX)
  const bend = (2.2 + (1 - raise) * 2.4) * s * off
  const elbowX = (shoulderX + gripX) / 2 + Math.cos(ang + Math.PI / 2) * bend
  const elbowY = (shoulderY + gripY) / 2 + Math.sin(ang + Math.PI / 2) * bend
  drawLimb(ctx, shoulderX, shoulderY, elbowX, elbowY, gripX, gripY, s, hurt)
  if (durability > 0) {
    ctx.save()
    ctx.translate(Math.round(shieldX), Math.round(shieldY))
    if (raise > 0.4) ctx.rotate(facing)
    ctx.fillStyle = '#14181c'
    ctx.beginPath()
    ctx.arc(0, 0, 7 * s, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = spark > 0 ? '#f7fbff' : '#d5dce6'
    ctx.beginPath()
    ctx.arc(0, 0, 5.5 * s, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#2f6fd0'
    ctx.fillRect(Math.round(-1.5 * s), Math.round(-4 * s), Math.round(3 * s), Math.round(8 * s))
    ctx.fillStyle = '#c4a15a'
    ctx.fillRect(Math.round(-1.2 * s), Math.round(-1.2 * s), Math.round(2.4 * s), Math.round(2.4 * s))
    if (durability <= 2 || broken > 0) {
      ctx.fillStyle = '#24180f'
      ctx.fillRect(Math.round(-0.6 * s), Math.round(-4 * s), Math.max(1, Math.round(s)), Math.round(8 * s))
      ctx.fillRect(Math.round(-3 * s), Math.round(-1 * s), Math.round(4 * s), Math.max(1, Math.round(s)))
    }
    if (raise > 0.45) {
      ctx.fillStyle = `rgba(242, 192, 74, ${0.55 + raise * 0.4})`
      const rim = 8 * s
      for (let i = 0; i < 14; i += 1) {
        const a = (Math.PI * 2 * i) / 14
        ctx.fillRect(Math.round(Math.cos(a) * rim - s * 0.7), Math.round(Math.sin(a) * rim - s * 0.7), Math.max(2, Math.round(s * 1.35)), Math.max(2, Math.round(s * 1.35)))
      }
    }
    ctx.restore()
  } else {
    ctx.fillStyle = '#d5dce6'
    for (let i = 0; i < 4; i += 1) {
      const a = facing + i * 1.3 + 0.4
      const d = (5 + i * 2) * jolt
      ctx.fillRect(Math.round(shieldX + Math.cos(a) * d * s), Math.round(shieldY + Math.sin(a) * d * s), Math.max(2, Math.round(s)), Math.max(2, Math.round(s * 1.4)))
    }
  }
  drawPaw(ctx, gripX, gripY, ang, s, hurt, 'shield')
  if (raise > 0.65 && durability > 0) {
    ctx.strokeStyle = `rgba(214, 193, 90, ${0.35 + Math.sin(age * 10) * 0.12})`
    ctx.lineWidth = Math.max(1, s)
    ctx.beginPath()
    ctx.arc(fx, fy, 16 * s, facing - 0.7, facing + 0.7)
    ctx.stroke()
  }
  if (spark > 0) {
    ctx.fillStyle = '#f4e7c4'
    for (let i = 0; i < 5; i += 1) {
      const a = facing + (i - 2) * 0.35
      ctx.fillRect(Math.round(shieldX + Math.cos(a) * (8 + i) * s), Math.round(shieldY + Math.sin(a) * (8 + i) * s), Math.max(2, Math.round(s * 1.2)), Math.max(2, Math.round(s * 1.2)))
    }
  }
}

function stampLine(ctx: Pen, x0: number, y0: number, x1: number, y1: number, scale: number, color: string): void {
  thickLine(ctx, x0, y0, x1, y1, scale, color)
}

function thickLine(ctx: Pen, x0: number, y0: number, x1: number, y1: number, width: number, color: string): void {
  const n = Math.max(1, Math.round(width))
  const steps = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / Math.max(1, n * 0.6)))
  ctx.fillStyle = color
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps
    ctx.fillRect(Math.round(x0 + (x1 - x0) * t - n / 2), Math.round(y0 + (y1 - y0) * t - n / 2), n, n)
  }
}

export function drawMaw(
  ctx: Pen,
  x: number,
  y: number,
  scale: number,
  age: number,
  wind: number,
  aim: number,
  flash: number,
): void {
  const bob = Math.abs(Math.sin(age * 6)) * 1.5
  const lunge = wind > 0 ? (1 - wind / 0.55) * 8 : 0
  const fx = x + Math.cos(aim) * lunge * scale
  const fy = y + Math.sin(aim) * lunge * scale
  const s = scale
  const body = flash > 0 ? '#f7fbff' : '#5f8a62'
  const dark = flash > 0 ? '#d5dce6' : '#2e4a32'
  const put = (px: number, py: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color
    ctx.fillRect(Math.round(fx + px * s), Math.round(fy + py * s), Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s)))
  }
  const art = mawSprite()
  if (flash > 0) {
    ctx.globalAlpha = 0.85
    ctx.fillStyle = '#f7fbff'
    for (let i = 0; i < 6; i += 1) {
      const a = (Math.PI * 2 * i) / 6
      ctx.fillRect(Math.round(fx + Math.cos(a) * 10 * s), Math.round(fy - 8 * s + Math.sin(a) * 8 * s), Math.max(2, Math.round(s)), Math.max(2, Math.round(s)))
    }
  }
  blit(ctx, art, fx - (art.width * s) / 2, fy - art.height * s - bob, s)
  ctx.globalAlpha = 1
  const step = Math.sin(age * 6)
  put(-4 + step, -2, 3, 2, dark)
  put(2 - step, -2, 3, 2, dark)
  void body
}

export function drawWing(
  ctx: Pen,
  x: number,
  y: number,
  scale: number,
  age: number,
  wind: number,
  flash: number,
): void {
  const flap = Math.sin(age * 11) * 4
  const hover = Math.sin(age * 4) * 2
  const s = scale
  const fy = y + hover * s
  const gold = flash > 0 ? '#f7fbff' : '#f0c044'
  const put = (px: number, py: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color
    ctx.fillRect(Math.round(x + px * s), Math.round(fy + py * s), Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s)))
  }
  const wing = wingMembrane()
  const eye = eyeBody()
  blit(ctx, wing, x - wing.width * s, fy - 8 * s - flap * 0.35, s)
  ctx.save()
  ctx.translate(x + s, fy - 6 * s + flap * 0.35)
  ctx.scale(-1, 1)
  blit(ctx, wing, -wing.width * s, 0, s)
  ctx.restore()
  if (flash > 0) ctx.globalAlpha = 0.85
  blit(ctx, eye, x - (eye.width * s) / 2, fy - 10 * s, s)
  ctx.globalAlpha = 1
  void gold
  void put
  void wind
}

export function drawCarryStrip(ctx: Pen, width: number, height: number): void {
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = '#1a140f'
  ctx.fillRect(0, 0, width, height)
  const facings = [0, Math.PI / 2, Math.PI, -Math.PI / 2]
  const names = ['timur', 'selatan', 'barat', 'utara']
  const rows = [
    { label: 'diam', gait: 0, stepping: false },
    { label: 'langkah', gait: 0.5, stepping: true },
    { label: 'langkah', gait: 2.2, stepping: true },
  ]
  ctx.font = '14px Courier New, monospace'
  ctx.textAlign = 'center'
  rows.forEach((row, rowIndex) => {
    facings.forEach((facing, col) => {
      const x = 80 + col * ((width - 40) / 4)
      const y = 110 + rowIndex * ((height - 40) / 3)
      ctx.fillStyle = '#2a2118'
      ctx.fillRect(x - 52, y - 86, 120, 120)
      drawHero(ctx, x, y, 3.2, { ...basePose(facing, row.gait, row.stepping), age: 1.2 })
      ctx.fillStyle = '#f6ecd8'
      ctx.fillText(`${names[col]} ${row.label}`, x, y - 70)
    })
  })
}

export function drawWalkStrip(ctx: Pen, width: number, height: number): void {
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = '#1a140f'
  ctx.fillRect(0, 0, width, height)
  const facings = [0, Math.PI / 2, Math.PI, -Math.PI / 2]
  const names = ['timur', 'selatan', 'barat', 'utara']
  const steps = [0.4, 2.2]
  ctx.font = '13px Courier New, monospace'
  ctx.textAlign = 'center'
  const rows = [
    { label: '6260ba5', draw: drawLegacyWalk },
    { label: 'sekarang', draw: (pen: Pen, x: number, y: number, facing: number, gait: number) => drawHero(pen, x, y, 3, { ...basePose(facing, gait, true), age: 1 }) },
  ]
  rows.forEach((row, rowIndex) => {
    steps.forEach((gait, stepIndex) => {
      facings.forEach((facing, col) => {
        const x = 70 + col * ((width - 40) / 4)
        const y = 90 + (rowIndex * 2 + stepIndex) * ((height - 30) / 4)
        ctx.fillStyle = '#2a2118'
        ctx.fillRect(x - 46, y - 70, 100, 100)
        row.draw(ctx, x, y, facing, gait)
        ctx.fillStyle = '#f6ecd8'
        ctx.fillText(`${row.label} ${names[col]}`, x, y - 56)
      })
    })
  })
}

function drawLegacyWalk(ctx: Pen, footX: number, footY: number, facing: number, gait: number): void {
  const dir = rawQuarter(facing)
  const s = 3
  const bob = Math.abs(Math.sin(gait)) * 1.4
  const stride = Math.sin(gait) * 3.6
  const liftL = Math.max(0, Math.sin(gait)) * 5
  const liftR = Math.max(0, -Math.sin(gait)) * 5
  const flip = dir === 'w' ? -1 : 1
  const put = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = '#14110e'
    ctx.fillRect(Math.round(footX + x * s) - 1, Math.round(footY + (y - bob) * s) - 1, Math.max(1, Math.round(w * s)) + 2, Math.max(1, Math.round(h * s)) + 2)
    ctx.fillStyle = color
    ctx.fillRect(Math.round(footX + x * s), Math.round(footY + (y - bob) * s), Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s)))
  }
  const boot = (x: number, lift: number) => {
    put(x, -4 - lift, 5, 4, BOOT)
    put(x + 0.5, -8 - lift, 4, 4, ARMOR)
  }
  if (dir === 'e' || dir === 'w') {
    boot(flip * (5 + stride), liftL)
    boot(flip * (-5 - stride), liftR)
  } else {
    boot(-8 + stride, liftL)
    boot(3 - stride, liftR)
  }
  const face = dir === 'n' ? 'n' : dir === 's' ? 's' : 'e'
  const bust = knightBust(face, Math.sin(gait) >= 0 ? 1 : 2)
  const cape = knightCape(face)
  ctx.save()
  if (dir === 'w') {
    ctx.translate(footX, 0)
    ctx.scale(-1, 1)
    ctx.translate(-footX, 0)
  }
  blit(ctx, cape, footX - (cape.width * s) / 2, footY - (8 + cape.height + bob) * s, s)
  blit(ctx, bust, footX - (bust.width * s) / 2, footY - (8 + bust.height + bob) * s, s)
  ctx.restore()
  const aim = -Math.PI / 2
  const shoulder = { x: footX + (dir === 'w' ? -4 : 4) * s, y: footY + (-17 - bob) * s }
  const hand = { x: shoulder.x + Math.cos(aim) * 6 * s, y: shoulder.y + Math.sin(aim) * 6 * s }
  stampLine(ctx, shoulder.x, shoulder.y, hand.x, hand.y, s, ARMOR)
  drawBlade(ctx, hand.x, hand.y, hand.x + Math.cos(aim) * 15 * s, hand.y + Math.sin(aim) * 15 * s, s, false)
}

export function drawSwingStrip(ctx: Pen, width: number, height: number): void {
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = '#1a140f'
  ctx.fillRect(0, 0, width, height)
  const elapsed = [0.02, 0.07, 0.11, 0.15, 0.22, 0.31]
  const facings = [Math.PI / 2, 0, -Math.PI / 2]
  const names = ['depan', 'sisi', 'belakang']
  ctx.font = '14px Courier New, monospace'
  ctx.textAlign = 'center'
  elapsed.forEach((time, col) => {
    facings.forEach((facing, row) => {
      const x = 70 + col * ((width - 40) / 6)
      const y = 120 + row * ((height - 40) / 3)
      ctx.fillStyle = '#2a2118'
      ctx.fillRect(x - 48, y - 90, 110, 130)
      drawHero(ctx, x, y, 3.2, { ...basePose(facing, 0, false), swing: SWING_TOTAL - time })
      ctx.fillStyle = '#f6ecd8'
      ctx.fillText(`${names[row]} ${col + 1}`, x, y - 74)
    })
  })
}

export function drawBlockStrip(ctx: Pen, width: number, height: number): void {
  const saved = { blockShown, lastPoseAge, seenShield, sparkUntil, recoilStart, recoilUntil, joltUntil }
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = '#1a140f'
  ctx.fillRect(0, 0, width, height)
  const frames = [
    { label: 'angkat', raise: 0.34, spark: 0, recoil: 0, jolt: 0, shield: SHIELD_MAX, broken: 0 },
    { label: 'dorong', raise: 0.72, spark: 0, recoil: 0, jolt: 0, shield: SHIELD_MAX, broken: 0 },
    { label: 'tahan', raise: 1, spark: 0, recoil: 0, jolt: 0, shield: SHIELD_MAX, broken: 0 },
    { label: 'kena', raise: 1, spark: 0.16, recoil: 1, jolt: 0, shield: 3, broken: 0 },
    { label: 'patah', raise: 0.9, spark: 0.22, recoil: 0, jolt: 1, shield: 0, broken: 0.36 },
    { label: 'turun', raise: 0.32, spark: 0, recoil: 0, jolt: 0, shield: SHIELD_MAX, broken: 0 },
  ]
  const facings = [Math.PI / 2, 0, -Math.PI / 2]
  const names = ['depan', 'sisi', 'belakang']
  ctx.font = '14px Courier New, monospace'
  ctx.textAlign = 'center'
  frames.forEach((frame, col) => {
    facings.forEach((facing, row) => {
      const x = 70 + col * ((width - 40) / 6)
      const y = 120 + row * ((height - 40) / 3)
      ctx.fillStyle = '#2a2118'
      ctx.fillRect(x - 48, y - 90, 110, 130)
      blockPreview = { raise: frame.raise, spark: frame.spark, recoil: frame.recoil, jolt: frame.jolt }
      drawHero(ctx, x, y, 3.2, {
        ...basePose(facing, 0, false),
        blocking: frame.raise > 0.5 && frame.shield > 0,
        shield: frame.shield > 0 ? frame.shield : null,
        breakFx: frame.broken,
        age: 1.2 + col * 0.2,
      })
      blockPreview = null
      ctx.fillStyle = '#f6ecd8'
      ctx.fillText(`${names[row]} ${frame.label}`, x, y - 74)
    })
  })
  blockPreview = null
  blockShown = saved.blockShown
  lastPoseAge = saved.lastPoseAge
  seenShield = saved.seenShield
  sparkUntil = saved.sparkUntil
  recoilStart = saved.recoilStart
  recoilUntil = saved.recoilUntil
  joltUntil = saved.joltUntil
}

export function drawDirectionStrip(ctx: Pen, width: number, height: number): void {
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = '#1a140f'
  ctx.fillRect(0, 0, width, height)
  const dirs: Array<[number, string]> = [
    [0, 'timur'],
    [Math.PI / 4, 'tenggara'],
    [Math.PI / 2, 'selatan'],
    [(3 * Math.PI) / 4, 'barat daya'],
    [Math.PI, 'barat'],
    [(-3 * Math.PI) / 4, 'barat laut'],
    [-Math.PI / 2, 'utara'],
    [-Math.PI / 4, 'timur laut'],
  ]
  const elapsed = SWING_WIND + SWING_ACTIVE / 2
  ctx.font = '14px Courier New, monospace'
  ctx.textAlign = 'center'
  dirs.forEach(([facing, name], index) => {
    const col = index % 4
    const row = Math.floor(index / 4)
    const x = width * (col + 0.5) / 4
    const y = height * (row + 0.72) / 2
    ctx.fillStyle = '#2a2118'
    ctx.fillRect(x - 70, y - 120, 140, 170)
    drawHero(ctx, x, y, 3.4, { ...basePose(facing, 0, false), swing: SWING_TOTAL - elapsed, blocking: false })
    ctx.fillStyle = '#f6ecd8'
    ctx.fillText(name, x, y - 104)
  })
}

export function drawHoldStrip(ctx: Pen, width: number, height: number): void {
  const saved = { blockShown, lastPoseAge, seenShield, sparkUntil, recoilStart, recoilUntil, joltUntil }
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = '#1a140f'
  ctx.fillRect(0, 0, width, height)
  const dirs: Array<[number, string]> = [
    [-Math.PI / 2, 'utara'],
    [-Math.PI / 4, 'timur laut'],
    [0, 'timur'],
    [Math.PI / 4, 'tenggara'],
    [Math.PI / 2, 'selatan'],
    [(3 * Math.PI) / 4, 'barat daya'],
    [Math.PI, 'barat'],
    [(-3 * Math.PI) / 4, 'barat laut'],
  ]
  const rows = [
    { label: 'diam', raise: 0 },
    { label: 'tangkis', raise: 1 },
  ]
  ctx.font = '14px Courier New, monospace'
  ctx.textAlign = 'center'
  rows.forEach((row, rowIndex) => {
    dirs.forEach(([facing, name], col) => {
      const x = width * (col + 0.5) / 8
      const y = height * (rowIndex + 0.72) / 2
      ctx.fillStyle = '#2a2118'
      ctx.fillRect(x - 62, y - 108, 124, 150)
      blockPreview = row.raise > 0 ? { raise: row.raise, spark: 0, recoil: 0, jolt: 0 } : null
      drawHero(ctx, x, y, 3.1, { ...basePose(facing, 0, false), blocking: row.raise > 0.5, age: 1.4 })
      blockPreview = null
      ctx.fillStyle = '#f6ecd8'
      ctx.fillText(`${name}`, x, y - 92)
      ctx.fillText(row.label, x, y - 76)
    })
  })
  blockPreview = null
  blockShown = saved.blockShown
  lastPoseAge = saved.lastPoseAge
  seenShield = saved.seenShield
  sparkUntil = saved.sparkUntil
  recoilStart = saved.recoilStart
  recoilUntil = saved.recoilUntil
  joltUntil = saved.joltUntil
}

export function drawContactSheet(ctx: Pen, width: number, height: number): void {
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = '#1a140f'
  ctx.fillRect(0, 0, width, height)
  const cols = 4
  const rows = 3
  const cellW = width / cols
  const cellH = height / rows
  const labels = [
    'pedang atas',
    'jalan kiri',
    'jalan kanan',
    'hadap timur',
    'ayun siap',
    'ayun kena',
    'ayun lanjut',
    'hindar berdebu',
    'tangkis',
    'perisai retak',
    'rebah',
    'sayap',
  ]
  const poses: HeroPose[] = [
    basePose(Math.PI / 2, 0, false),
    basePose(Math.PI, 0.6, true),
    basePose(Math.PI, 0.6 + Math.PI, true),
    basePose(0, 0, false),
    { ...basePose(0, 0, false), swing: SWING_TOTAL - 0.04 },
    { ...basePose(0, 0, false), swing: SWING_TOTAL - 0.15 },
    { ...basePose(0, 0, false), swing: SWING_TOTAL - 0.28 },
    { ...basePose(0, 0, false), dodge: 0.2 },
  ]
  const shieldPoses: HeroPose[] = [
    { ...basePose(0, 0, false), blocking: true },
    { ...basePose(Math.PI / 2, 0, false), shield: 1 },
  ]
  ctx.fillStyle = '#f6ecd8'
  ctx.font = '14px sans-serif'
  ctx.textAlign = 'center'
  for (let i = 0; i < 12; i += 1) {
    const col = i % cols
    const row = Math.floor(i / cols)
    const cx = col * cellW + cellW / 2
    const cy = row * cellH + cellH * 0.62
    ctx.fillStyle = '#2a2118'
    ctx.fillRect(col * cellW + 6, row * cellH + 6, cellW - 12, cellH - 12)
    if (i < 8) drawHero(ctx, cx, cy, 3, poses[i]!)
    else if (i === 8) {
      blockPreview = { raise: 1, spark: 0, recoil: 0, jolt: 0 }
      drawHero(ctx, cx, cy, 3, shieldPoses[0]!)
      blockPreview = null
    }
    else if (i === 9) drawHero(ctx, cx, cy, 3, shieldPoses[1]!)
    else if (i === 10) blit(ctx, hamsterDown(), cx - 60, cy - 24, 4)
    else drawWing(ctx, cx, cy, 3, 0.4, 0, 0)
    if (i === 7) drawDustMark(ctx, cx, cy, 3)
    ctx.fillStyle = '#f6ecd8'
    ctx.fillText(labels[i]!, cx, row * cellH + 22)
  }
}

function drawDustMark(ctx: Pen, x: number, y: number, scale: number): void {
  ctx.fillStyle = '#8a6240'
  ctx.fillRect(Math.round(x - 10 * scale), Math.round(y), Math.round(3 * scale), Math.round(2 * scale))
  ctx.fillStyle = '#c4b8a4'
  ctx.fillRect(Math.round(x - 6 * scale), Math.round(y - 4 * scale), Math.round(2 * scale), Math.round(2 * scale))
}

function basePose(facing: number, gait: number, stepping: boolean): HeroPose {
  return { facing, gait, stepping, swing: 0, sword: true, shield: SHIELD_MAX, blocking: false, dodge: 0, hurt: 0, cape: facing + Math.PI, age: 1 }
}
