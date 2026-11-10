import { cameraScale } from './camera.ts'
import { drawNameTag, measureTag, nameTag, placeNameTag } from './name-tag.ts'
import { chromaOffset, letterDrift, noteSoulTitle, titleAlpha, titleAnchor, titleGlyph, titleJitter, titlePixel, titleScale, TITLE_LINE } from './soul-title.ts'
import { blit, cableRun, debrisSprite, lampHousing, lootIcon, machineSprite, pipeRun, rockRim } from './patterns.ts'
import { drawHero, drawMaw, drawWing } from './pose.ts'
import { spearReach, spearRgb } from './spear.ts'
import { bossDisplay, bossPattern, depthPlan, foeName, lineup, type AttackKind } from './depths.ts'
import { t } from './i18n.ts'
import { doorPad, nextExitDoor, onDoor, roomAt, type Dir } from './dungeon.ts'
import { drawThemeMotes, paintThemePlate, themeKit } from './tilesets.ts'
import { foeCanvas, hasFoeSprite } from './foe-sprites.ts'
import { blitMotif, interactable, mapLabel, spriteIdFor } from './map-sprites.ts'
import { BLAST_RADIUS, EXTRACT_ZONE, FOE_SPOTS, NEST_DOOR, SOUL_CAST, SOUL_RADIUS, STAIRS, SWING_REACH, ZONE_H, ZONE_W, claimTarget, depthMods, foeView, isSlowed, isSpecial, lootTitle, nestGap, runCrates, slowPixels, slowZones, stairsOpen, syncCentipede, swordAim, type Drop, type Foe, type Run, type SlowZone } from './sim.ts'

interface Puff {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  girth: number
  facing: number
  tint: number
}

interface BossFall {
  id: string
  x: number
  y: number
  aim: number
  depth: number
  life: number
  max: number
  links: { x: number; y: number }[]
  breed?: string
  foeKind?: string
  cut: number
}

interface Crumb {
  x: number
  y: number
  life: number
}

const puffs: Puff[] = []
const freePuffs: Puff[] = []
const crumbs: Crumb[] = []
const freeCrumbs: Crumb[] = []
const deaths: BossFall[] = []
const seenDead = new Set<string>()
const PUFF_CAP = 36
let effectBudget: 'full' | 'low' = 'full'
let glowSprite: HTMLCanvasElement | null = null
let roomCanvas: HTMLCanvasElement | null = null
let roomKey = ''
let reducedCached = false
let reducedAt = 0

export function setEffectBudget(next: 'full' | 'low'): void {
  effectBudget = next
}

export function effectBudgetNow(): 'full' | 'low' {
  return effectBudget
}

export function bossTitle(depth: number): string {
  const plan = depthPlan(depth)
  return t('banner.boss', { name: bossDisplay(plan.boss.id, plan.boss.name), depth: plan.depth })
}

/** How high the head rears during the slam. It peaks mid-windup and comes back down. */
export function centipedeRear(wind: number, pattern: number): number {
  if (pattern !== 0 || wind <= 0) return 0
  const grow = 1 - Math.min(1, wind / 0.9)
  return Math.sin(grow * Math.PI) * 34
}

/** A puff on the dash line. Step only moves it further back, never sideways. */
export function dashPuff(x: number, y: number, facing: number, step = 0): { x: number; y: number; vx: number; vy: number } {
  const backX = -Math.cos(facing)
  const backY = -Math.sin(facing)
  const dist = 11 + step * 5
  return { x: x + backX * dist, y: y + backY * dist, vx: backX * 5, vy: backY * 5 }
}

/** Smoke sits behind the dash, so the offset points opposite the facing. */
export function dashBack(x: number, y: number, facing: number, distance = 14): { x: number; y: number } {
  return { x: x - Math.cos(facing) * distance, y: y - Math.sin(facing) * distance }
}


let paintDt = 0

/** Wall-clock slice for this paint. Particles and the boss death use it, not the refresh rate. */
export function setPaintDt(seconds: number): void {
  paintDt = Number.isFinite(seconds) && seconds > 0 ? Math.min(0.05, seconds) : 0
}

/** How much a 60fps per-frame decrement should move for this slice of wall time. */
export function frameDecay(perFrame: number, seconds = paintDt): number {
  if (!Number.isFinite(seconds) || seconds <= 0 || !Number.isFinite(perFrame)) return 0
  return perFrame * Math.min(0.05, seconds) * 60
}

function consumeFrames(): number {
  const frames = frameDecay(1)
  paintDt = 0
  return frames
}

function motionReduced(): boolean {
  const now = typeof performance === 'undefined' ? 0 : performance.now()
  if (now - reducedAt > 1000) {
    reducedCached = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
    reducedAt = now
  }
  return reducedCached
}

function takePuff(): Puff {
  return freePuffs.pop() ?? { x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 0, girth: 0, facing: 0, tint: 0 }
}

function takeCrumb(): Crumb {
  return freeCrumbs.pop() ?? { x: 0, y: 0, life: 0 }
}

function extractGlow(): HTMLCanvasElement | null {
  if (glowSprite) return glowSprite
  if (typeof document === 'undefined') return null
  const board = document.createElement('canvas')
  board.width = 96
  board.height = 96
  const pen = board.getContext('2d')
  if (!pen) return null
  const grad = pen.createRadialGradient(48, 48, 8, 48, 48, 48)
  grad.addColorStop(0, 'rgba(48, 140, 72, 0.28)')
  grad.addColorStop(1, 'rgba(48, 140, 72, 0)')
  pen.fillStyle = grad
  pen.fillRect(0, 0, 96, 96)
  glowSprite = board
  return board
}

export function resetEffects(): void {
  while (puffs.length) freePuffs.push(puffs.pop()!)
  while (crumbs.length) freeCrumbs.push(crumbs.pop()!)
  deaths.length = 0
  seenDead.clear()
}

export function drawExtract(
  ctx: CanvasRenderingContext2D,
  run: Run,
  width: number,
  height: number,
): void {
  const scale = cameraScale(width, height)
  const fx = clampFocus(run.x, width / scale, ZONE_W)
  const fy = clampFocus(run.y, height / scale, ZONE_H)
  const originX = width / 2 - fx * scale
  const originY = height / 2 - fy * scale
  const at = (x: number, y: number) => ({ x: originX + x * scale, y: originY + y * scale })
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = floorFill(run.zone)
  ctx.fillRect(0, 0, width, height)
  const cast = run.soul?.cast ?? 0
  const elapsed = cast > 0 ? SOUL_CAST - cast : 0
  const soulShake = cast > 0 && elapsed >= 0.55 ? (1 - (elapsed - 0.55) / 0.35) * 5 : 0
  const shake = Math.max(soulShake, Math.min(7, (run.shake ?? 0) * 32))
  ctx.save()
  if (shake > 0) ctx.translate(Math.round(Math.sin(run.age * 47) * shake), Math.round(Math.cos(run.age * 53) * shake))
  drawBackdrop(ctx, scale, at, width, height, originX, originY, run.age, run.depth || 1)
  drawFloor(ctx, run, scale, at)
  drawMineDressing(ctx, run, scale, at)
  drawDungeonDress(ctx, run, scale, at)
  drawThemeMotes(ctx, run.depth || 1, run.age, scale, at)
  for (const boom of run.booms ?? []) {
    drawBoomFrame(ctx, at(boom.x, boom.y).x, at(boom.x, boom.y).y, scale, boomFrame(boom.life))
  }
  tickEffects(run)
  drawEffects(ctx, at, scale)
  const here = run.chart ? roomAt(run.chart, run.roomId) : null
  if (here?.role === 'extract' || here?.role === 'fast') drawCircle(ctx, at, scale, run.age)
  else drawWayfinder(ctx, run, scale, at)
  if (run.gloom) {
    ctx.fillStyle = 'rgba(4, 6, 10, 0.55)'
    ctx.fillRect(0, 0, width, height)
  }
  drawTorches(ctx, run, scale, at)
  if (run.zone === 'sarang' && (run.bossVanish ?? 0) <= 0.12) drawStairs(ctx, at, scale, run)
  drawSoulShrine(ctx, run, at, scale)
  for (const crate of runCrates(run)) {
    if (crate.zone !== run.zone) continue
    if (crate.id.startsWith('boss-chest') && (run.bossVanish ?? 0) > 0.12) continue
    drawCrate(ctx, at(crate.x, crate.y), scale, crate.id, run.opened.includes(crate.id), run.age)
  }
  if ((run.depth || 1) >= 2) {
    ctx.fillStyle = run.depth >= 3 ? 'rgba(120, 36, 24, 0.16)' : 'rgba(36, 88, 78, 0.16)'
    ctx.fillRect(0, 0, width, height)
  }
  for (const foe of foeView(run)) {
    const p = at(foe.x, foe.y)
    if (foe.wind > 0 && foe.kind !== 'boss') drawTelegraph(ctx, foe.kind, p.x, p.y, foe.aim, scale, foe.wind, foe.pattern ?? 0)
    if (foe.bolt) {
      const b = at(foe.bolt.x, foe.bolt.y)
      ctx.fillStyle = foe.kind === 'boss' ? '#9cbf6a' : '#f2e2a0'
      ctx.fillRect(Math.round(b.x - 2 * scale), Math.round(b.y - 2 * scale), Math.max(2, 4 * scale), Math.max(2, 4 * scale))
    }
    if (isSpecial(foe) || (foe.elite && hasFoeSprite(String(foe.breed)))) {
      if (isSpecial(foe)) drawSpecialTelegraph(ctx, foe, p.x, p.y, scale)
      else if (foe.wind > 0) drawTelegraph(ctx, 'brute', p.x, p.y, foe.aim, scale, foe.wind, foe.pattern ?? 0)
      if (foe.hidden) drawMound(ctx, foe.lurk ? at(foe.lurk.x, foe.lurk.y) : p, scale, foe.wind)
      else drawCreature(ctx, p.x, p.y, scale * (foe.kind === 'boss' ? 2.6 : foe.elite ? 1.35 : 1.15), foe, run.age)
      if ((foe.glance ?? 0) > 0) drawArmorSparks(ctx, p.x, p.y, scale, foe.aim, foe.glance ?? 0)
      if (foe.phase === 1) {
        ctx.strokeStyle = 'rgba(225, 6, 0, 0.85)'
        ctx.strokeRect(Math.round(p.x - 16 * scale), Math.round(p.y - 16 * scale), Math.round(32 * scale), Math.round(32 * scale))
      }
    } else if (foe.kind === 'crab') drawMaw(ctx, p.x, p.y, scale * 1.15, run.age + foe.x, foe.wind, foe.aim, foe.flash)
    else if (foe.kind === 'spitter') drawWing(ctx, p.x, p.y, scale * 1.15, run.age + foe.y, foe.wind, foe.flash)
    else if (foe.kind === 'brute') drawBrute(ctx, p.x, p.y, scale, foe.wind, foe.dash, foe.aim)
    else if (foe.kind === 'lurker') drawLurker(ctx, p.x, p.y, scale, foe.wind, run.age)
    else {
      drawCentipede(ctx, syncCentipede(foe).map((link) => at(link.x, link.y)), scale, foe.wind, foe.flash, run.age, foe.aim, foe.pattern ?? 0, run.depth || 1)
      if (foe.wind > 0) drawTelegraph(ctx, foe.kind, p.x, p.y, foe.aim, scale, foe.wind, foe.pattern ?? 0)
    }
    if (run.spear && foe.flash > 0.04) drawThrustSpark(ctx, p.x, p.y, scale, foe.flash, run.facing)
    drawFoeBar(ctx, p.x, p.y, scale, foe, run)
  }
  const targetId = claimTarget(run)?.id
  for (const drop of run.drops) {
    const from = drop.fromX != null ? at(drop.fromX, drop.fromY ?? drop.y) : undefined
    const spot = at(drop.x, drop.y)
    const marked = drop.id === targetId
    drawFloatingLoot(ctx, spot, scale, drop, run.age, from, marked)
    if (marked || Math.hypot(run.x - drop.x, run.y - drop.y) < 56) {
      drawTag(ctx, spot.x, spot.y - 16 * scale, lootTitle(drop))
    }
  }
  for (const death of deaths) {
    const owner = run.foes.find((foe) => foe.id === death.id)
    if (owner && owner.zone !== run.zone) continue
    const gone = 1 - death.life / death.max
    const p = at(death.x, death.y)
    const blink = gone > 0.2 && gone < 0.82
    const flicker = Math.floor(run.age * 16) % 2 === 0
    const fade = gone >= 0.82 ? (gone - 0.82) / 0.18 : 0
    if (gone < 0.22) drawKillSlash(ctx, p.x, p.y, scale, death.cut, gone / 0.22)
    if (!(blink && !flicker)) {
      ctx.save()
      ctx.globalAlpha = Math.max(0, 1 - fade)
      if (blink && flicker) {
        ctx.filter = 'brightness(2.4)'
      }
      if (death.breed) drawCreature(ctx, p.x, p.y, scale * 2.4, { kind: death.foeKind ?? 'boss', breed: death.breed, flash: gone < 0.22 ? 0.4 : 0, aim: death.aim, wind: 0, dash: 0, phase: 0 }, run.age)
      else drawCentipede(ctx, death.links.map((link) => at(link.x, link.y)), scale, 0, gone < 0.22 ? 0.35 : 0, run.age, death.aim, 0, death.depth, 0)
      ctx.restore()
    }
    if (death.breed && gone < 0.42) drawBossSting(ctx, p.x, p.y, scale, death.breed, gone)
    if (fade > 0.2) drawDissolve(ctx, p.x, p.y, scale, fade, run.age)
  }
  drawSoulWorld(ctx, run, at, scale, elapsed)
  const hero = at(run.x, run.y)
  if (run.dodge > 0) ctx.globalAlpha = 0.78
  const rite = cast > 0 && elapsed < 0.55 ? Math.min(1, elapsed / 0.25) : 0
  drawSlowZones(ctx, run, scale, at)
  drawHero(ctx, hero.x, hero.y, scale, {
    facing: run.facing,
    gait: run.gait,
    stepping: run.stepping,
    swing: run.swing,
    sword: run.sword || run.spear != null || run.blade != null,
    weapon: run.spear ? 'spear' : 'sword',
    spearRarity: run.spear?.rarity,
    spearReach: run.spear ? spearReach(run.spear) : undefined,
    shield: run.shield,
    blocking: run.blocking,
    dodge: run.dodge,
    hurt: run.hurt,
    cape: run.cape,
    age: run.age,
    breakFx: run.breakFx,
    rite,
  })
  if (isSlowed(run)) drawSlowMark(ctx, hero.x, hero.y, scale)
  if (run.breakFx > 0) {
    ctx.fillStyle = '#e7edf4'
    for (let i = 0; i < 5; i += 1) {
      const a = run.age * 3 + i
      ctx.fillRect(Math.round(hero.x + Math.cos(a) * (8 + i) * scale), Math.round(hero.y - 16 * scale + Math.sin(a) * 6 * scale), Math.max(1, scale), Math.max(1, scale))
    }
  }
  const label = nameTag()
  if (label) {
    const size = measureTag(ctx, label)
    const foes = run.foes.filter((foe) => foe.hp > 0 && foe.zone === run.zone).map((foe) => {
      const spot = at(foe.x, foe.y)
      return { x: spot.x, y: spot.y - 16 * scale, r: 18 * scale }
    })
    const box = placeNameTag({ headTop: hero.y - 56 * scale, centerX: hero.x }, size, foes, { w: width, h: height })
    drawNameTag(ctx, box, label)
  }
  ctx.globalAlpha = 1
  ctx.restore()
  if ((run.booms ?? []).some((boom) => boomFrame(boom.life) === 0)) {
    ctx.fillStyle = 'rgba(255, 248, 236, 0.28)'
    ctx.fillRect(0, 0, width, height)
  }
  drawSoulScreen(ctx, run, width, height, elapsed)
  let lift = 0
  ctx.textAlign = 'center'
  for (const item of run.floats) {
    const kebal = item.dim === true && (item.text === t('hit.glance') || item.text === t('hit.weak'))
    const y = item.dim ? hero.y + 36 * scale + lift : hero.y - 48 * scale - lift
    ctx.font = kebal ? 'bold 16px sans-serif' : '12px sans-serif'
    ctx.lineWidth = 3
    ctx.strokeStyle = '#14110e'
    ctx.strokeText(item.text, hero.x, y)
    ctx.fillStyle = item.dim ? '#c5ced8' : '#fff8e6'
    ctx.fillText(item.text, hero.x, y)
    lift += kebal ? 18 : 14
  }
}

function drawSoulShrine(ctx: CanvasRenderingContext2D, run: Run, at: (x: number, y: number) => { x: number; y: number }, scale: number): void {
  const soul = run.soul
  if (!soul || soul.phase !== 'live' || soul.zone !== run.zone) return
  const p = at(soul.x, soul.y)
  const bob = Math.sin(run.age * 3) * 2 * scale
  const pulse = 0.35 + Math.sin(run.age * 4) * 0.15
  ctx.fillStyle = `rgba(126, 80, 180, ${pulse})`
  ctx.beginPath()
  ctx.arc(p.x, p.y - 10 * scale + bob, 14 * scale, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#3a3228'
  ctx.fillRect(Math.round(p.x - 8 * scale), Math.round(p.y - 2 * scale), Math.round(16 * scale), Math.round(6 * scale))
  ctx.fillStyle = '#6b5438'
  ctx.fillRect(Math.round(p.x - 6 * scale), Math.round(p.y - 1 * scale), Math.round(12 * scale), Math.round(3 * scale))
  ctx.fillStyle = '#b388ff'
  ctx.fillRect(Math.round(p.x - 1 * scale), Math.round(p.y), Math.max(1, Math.round(scale)), Math.max(1, Math.round(2 * scale)))
  const flame = p.y - 12 * scale + bob
  ctx.fillStyle = '#7ec8c4'
  ctx.fillRect(Math.round(p.x - 2 * scale), Math.round(flame), Math.round(4 * scale), Math.round(6 * scale))
  ctx.fillStyle = '#d7b4ff'
  ctx.fillRect(Math.round(p.x - 1 * scale), Math.round(flame - 4 * scale), Math.round(3 * scale), Math.round(6 * scale))
  ctx.fillStyle = '#f7fbff'
  ctx.fillRect(Math.round(p.x), Math.round(flame - 2 * scale), Math.max(1, Math.round(scale)), Math.round(3 * scale))
  for (let i = 0; i < 3; i += 1) {
    const rise = ((run.age * 18 + i * 9) % 16) * scale
    ctx.fillStyle = i % 2 ? '#7ec8c4' : '#b388ff'
    ctx.fillRect(Math.round(p.x - 4 * scale + i * 3 * scale), Math.round(flame - rise), Math.max(1, Math.round(scale)), Math.max(1, Math.round(scale)))
  }
}

function drawSoulWorld(
  ctx: CanvasRenderingContext2D,
  run: Run,
  at: (x: number, y: number) => { x: number; y: number },
  scale: number,
  elapsed: number,
): void {
  const soul = run.soul
  const casting = (soul?.cast ?? 0) > 0
  const p = at(run.x, run.y)
  if (casting && elapsed < 0.55) {
    const grow = Math.min(1, elapsed / 0.25)
    ctx.strokeStyle = `rgba(179, 136, 255, ${0.35 + grow * 0.5})`
    ctx.lineWidth = Math.max(1, scale)
    ctx.beginPath()
    ctx.arc(p.x, p.y, (10 + grow * 22) * scale, 0, Math.PI * 2)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(126, 200, 196, 0.8)'
    ctx.beginPath()
    ctx.arc(p.x, p.y, 16 * grow * scale, 0, Math.PI * grow * 2)
    ctx.stroke()
  }
  if (casting && elapsed >= 0.25 && elapsed < 0.6) {
    const pull = Math.min(1, (elapsed - 0.25) / 0.3)
    const spin = pull * Math.PI * 2
    const c = Math.cos(spin)
    const s = Math.sin(spin)
    for (const foe of foeView(run)) {
      if (foe.hp <= 0) continue
      const dx = foe.x - run.x
      const dy = foe.y - run.y
      if (Math.hypot(dx, dy) > SOUL_RADIUS) continue
      const left = 1 - pull
      const w = at(run.x + (dx * c - dy * s) * left, run.y + (dx * s + dy * c) * left)
      ctx.fillStyle = '#d7b4ff'
      ctx.fillRect(Math.round(w.x - scale), Math.round(w.y - scale), Math.max(2, scale * 2), Math.max(2, scale * 2))
      ctx.fillStyle = '#7ec8c4'
      ctx.fillRect(Math.round(w.x), Math.round(w.y - 3 * scale), Math.max(1, scale), Math.max(1, scale))
    }
  }
  if (casting && elapsed >= 0.55) {
    const burst = Math.min(1, (elapsed - 0.55) / 0.35)
    ctx.strokeStyle = `rgba(247, 251, 255, ${1 - burst})`
    ctx.lineWidth = Math.max(1, (2 - burst) * scale)
    ctx.beginPath()
    ctx.arc(p.x, p.y, burst * SOUL_RADIUS * scale, 0, Math.PI * 2)
    ctx.stroke()
    ctx.strokeStyle = `rgba(179, 136, 255, ${0.8 - burst * 0.8})`
    ctx.beginPath()
    ctx.arc(p.x, p.y, Math.max(0, burst - 0.12) * SOUL_RADIUS * scale, 0, Math.PI * 2)
    ctx.stroke()
    for (let i = 0; i < 8; i += 1) {
      const a = (Math.PI * 2 * i) / 8 + burst
      const d = (12 + burst * 40) * scale
      ctx.fillStyle = i % 2 ? '#f7fbff' : '#b388ff'
      ctx.fillRect(Math.round(p.x + Math.cos(a) * d), Math.round(p.y + Math.sin(a) * d), Math.max(1, scale), Math.max(1, scale))
    }
  }
  const embers = soul?.embers ?? 0
  if (embers > 0) {
    for (let i = 0; i < 6; i += 1) {
      const a = run.age * 2 + i
      const d = (8 + (1 - embers) * 24 + i * 2) * scale
      ctx.globalAlpha = Math.min(1, embers)
      ctx.fillStyle = i % 2 ? '#7ec8c4' : '#b388ff'
      ctx.fillRect(Math.round(p.x + Math.cos(a) * d), Math.round(p.y + Math.sin(a) * d - 8 * scale), Math.max(1, scale), Math.max(1, scale))
    }
    ctx.globalAlpha = 1
  }
}

function drawSoulScreen(ctx: CanvasRenderingContext2D, run: Run, width: number, height: number, elapsed: number): void {
  const cast = run.soul?.cast ?? 0
  const title = noteSoulTitle(run, elapsed)
  if (cast <= 0 && title == null) return
  if (cast > 0 && elapsed < 0.55) {
    const dim = Math.min(0.45, elapsed / 0.25 * 0.4)
    ctx.fillStyle = `rgba(12, 6, 22, ${dim})`
    ctx.fillRect(0, 0, width, height)
  }
  if (cast > 0 && elapsed >= 0.55) {
    const flash = 1 - Math.min(1, (elapsed - 0.55) / 0.2)
    if (flash > 0) {
      ctx.fillStyle = `rgba(244, 236, 255, ${flash * 0.72})`
      ctx.fillRect(0, 0, width, height)
    }
  }
  if (title != null) drawSoulTitle(ctx, width, height, title)
}

function drawPixelLine(
  ctx: CanvasRenderingContext2D,
  px: number,
  color: string,
  ox: number,
  oy: number,
  shift: (index: number) => { x: number; y: number },
): void {
  const gap = 6 * px
  let cursor = -((TITLE_LINE.length * gap - px) / 2) + ox
  const top = -((7 * px) / 2) + oy
  for (let i = 0; i < TITLE_LINE.length; i += 1) {
    const drift = shift(i)
    const rows = titleGlyph(TITLE_LINE[i] ?? ' ')
    for (let row = 0; row < rows.length; row += 1) {
      const bits = rows[row] ?? ''
      for (let col = 0; col < bits.length; col += 1) {
        if (bits[col] !== '1') continue
        ctx.fillStyle = color
        ctx.fillRect(Math.round(cursor + drift.x + col * px), Math.round(top + drift.y + row * px), px, px)
      }
    }
    cursor += gap
  }
}

function drawSoulTitle(ctx: CanvasRenderingContext2D, width: number, height: number, t: number): void {
  const alpha = titleAlpha(t)
  if (alpha <= 0) return
  const px = titlePixel(width)
  const anchor = titleAnchor(width, height)
  const jitter = titleJitter(t)
  const chroma = chromaOffset(t)
  const fading = alpha < 1
  const shift = (index: number) => letterDrift(index, TITLE_LINE.length, t)
  ctx.save()
  ctx.imageSmoothingEnabled = false
  ctx.translate(anchor.x + jitter.x, anchor.y + jitter.y)
  ctx.scale(titleScale(t), titleScale(t))
  ctx.globalAlpha = alpha * 0.4
  drawPixelLine(ctx, px, '#7ec8c4', -px, 0, shift)
  drawPixelLine(ctx, px, '#7ec8c4', px, 0, shift)
  drawPixelLine(ctx, px, '#7ec8c4', 0, -px, shift)
  if (chroma > 0) {
    ctx.globalAlpha = alpha * 0.7
    drawPixelLine(ctx, px, '#7ec8c4', -chroma, 0, shift)
    drawPixelLine(ctx, px, '#e7b4ff', chroma, 0, shift)
  }
  ctx.globalAlpha = alpha
  const outline = Math.max(2, Math.round(px * 0.28))
  for (const [dx, dy] of [[-outline, 0], [outline, 0], [0, -outline], [0, outline], [-outline, -outline], [outline, outline], [-outline, outline], [outline, -outline]] as const) {
    drawPixelLine(ctx, px, '#140818', dx, dy, shift)
  }
  const gap = 6 * px
  let cursor = -((TITLE_LINE.length * gap - px) / 2)
  const top = -((7 * px) / 2)
  for (let i = 0; i < TITLE_LINE.length; i += 1) {
    const drift = shift(i)
    const rows = titleGlyph(TITLE_LINE[i] ?? ' ')
    for (let row = 0; row < rows.length; row += 1) {
      const bits = rows[row] ?? ''
      ctx.fillStyle = row < 3 ? '#f7fbff' : '#d7b4ff'
      for (let col = 0; col < bits.length; col += 1) {
        if (bits[col] !== '1') continue
        ctx.fillRect(Math.round(cursor + drift.x + col * px), Math.round(top + drift.y + row * px), px, px)
      }
    }
    if (fading) {
      const speck = (i * 5) % 4
      ctx.fillStyle = i % 2 === 0 ? '#7ec8c4' : '#f7fbff'
      ctx.globalAlpha = alpha * 0.85
      ctx.fillRect(Math.round(cursor + drift.x + speck * px), Math.round(top + drift.y - (1 - alpha) * 18 - speck * 3), Math.max(2, px - 2), Math.max(2, px - 2))
      ctx.globalAlpha = alpha
    }
    cursor += gap
  }
  ctx.restore()
}

function tickEffects(run: Run): void {
  const reduced = motionReduced()
  if (run.dodge > 0 && puffs.length < PUFF_CAP) {
    const count = reduced || effectBudget === 'low' ? 1 : 2
    for (let i = 0; i < count && puffs.length < PUFF_CAP; i += 1) {
      const spot = dashPuff(run.x, run.y, run.facing, i)
      const life = reduced ? 0.18 : 0.5
      const puff = takePuff()
      puff.x = spot.x
      puff.y = spot.y
      puff.vx = spot.vx
      puff.vy = spot.vy
      puff.life = life
      puff.max = life
      puff.girth = reduced ? 5 : 8
      puff.facing = run.facing
      puff.tint = (puffs.length + i) % 3
      puffs.push(puff)
    }
  }
  const frames = consumeFrames()
  for (const puff of puffs) {
    puff.life -= (reduced ? 0.04 : 0.016) * frames
    puff.x += puff.vx * 0.04 * frames
    puff.y += puff.vy * 0.04 * frames
    puff.vx *= Math.pow(0.94, frames)
    puff.vy *= Math.pow(0.94, frames)
    if (!reduced) puff.girth = Math.min(10, puff.girth + 0.025 * frames)
  }
  for (let i = puffs.length - 1; i >= 0; i -= 1) {
    if (puffs[i]!.life > 0) continue
    const dead = puffs[i]!
    const last = puffs.pop()!
    if (i < puffs.length) puffs[i] = last
    freePuffs.push(dead)
  }
  watchBoss(run, frames)
  if (run.swing > 0 && effectBudget === 'full') {
    const aim = swordAim(run.facing, run.swing)
    const crumb = takeCrumb()
    crumb.x = run.x + Math.cos(aim) * SWING_REACH * 0.82
    crumb.y = run.y + Math.sin(aim) * SWING_REACH * 0.82
    crumb.life = 0.16
    crumbs.push(crumb)
  }
  for (const crumb of crumbs) crumb.life -= 0.025 * frames
  while (crumbs.length > 8) {
    const old = crumbs.shift()
    if (old) freeCrumbs.push(old)
  }
  for (let i = crumbs.length - 1; i >= 0; i -= 1) {
    if (crumbs[i]!.life > 0) continue
    const dead = crumbs[i]!
    const last = crumbs.pop()!
    if (i < crumbs.length) crumbs[i] = last
    freeCrumbs.push(dead)
  }
}

function drawEffects(
  ctx: CanvasRenderingContext2D,
  at: (x: number, y: number) => { x: number; y: number },
  scale: number,
): void {
  for (const puff of puffs) drawSmoke(ctx, at, scale, puff)
  for (const crumb of crumbs) {
    const p = at(crumb.x, crumb.y)
    ctx.fillStyle = `rgba(255, 248, 230, ${Math.min(1, crumb.life * 5)})`
    const n = Math.max(1, Math.round(scale))
    ctx.fillRect(Math.round(p.x), Math.round(p.y), n, n)
  }
}

export function effectCounts(): { puffs: number; crumbs: number } {
  return { puffs: puffs.length, crumbs: crumbs.length }
}

function lootTint(kind: string, drop?: Drop): string {
  if (drop?.spear) return spearRgb(drop.spear.rarity)
  if (kind === 'tombak') return '126, 200, 196'
  if (kind === 'relic' || kind === 'ore' || kind === 'shard') return '242, 192, 74'
  if (kind === 'scrap') return '154, 176, 196'
  return '244, 241, 232'
}

function smooth(t: number): number {
  const x = Math.max(0, Math.min(1, t))
  return x * x * (3 - 2 * x)
}

function drawFloatingLoot(
  ctx: CanvasRenderingContext2D,
  ground: { x: number; y: number },
  scale: number,
  drop: Drop,
  age: number,
  from?: { x: number; y: number },
  highlight = false,
): void {
  const hover = drop.hover ?? 0
  const life = Math.max(0, age - (drop.born ?? age - hover - 1))
  const rise = 0.35
  const settle = 0.45
  const hoverHeight = 34 * Math.max(1, scale * 0.45)
  const source = from ?? ground
  const hangX = source.x + (ground.x - source.x) * 0.72
  const hangY = source.y - hoverHeight + (ground.y - source.y) * 0.15
  let x = ground.x
  let y = ground.y
  let reveal = false
  if (hover > 0 && life < rise) {
    const k = smooth(life / rise)
    x = source.x + (hangX - source.x) * k
    y = source.y + (hangY - source.y) * k
    reveal = true
  } else if (hover > 0 && life < hover) {
    const bob = -Math.sin((life * Math.PI * 2) / 0.7) * 3.2
    x = hangX + Math.sin(life * 1.6) * 3
    y = hangY + bob
    reveal = true
  } else if (hover > 0 && life < hover + settle) {
    const k = smooth((life - hover) / settle)
    x = hangX + (ground.x - hangX) * k
    y = hangY + (ground.y - hangY) * k - Math.sin(k * Math.PI) * 8
    reveal = true
  } else {
    y = ground.y - Math.sin((age * Math.PI * 2) / 1.2 + ground.x * 0.01) * 2.6
  }
  const lift = Math.max(0, ground.y - y)
  const shadow = 1 - Math.min(0.6, lift / 36)
  ctx.fillStyle = `rgba(8, 6, 4, ${0.4 * shadow})`
  ctx.beginPath()
  ctx.ellipse(ground.x, ground.y + 2, Math.max(3, 6 * scale * shadow), Math.max(1.5, 2.2 * scale * shadow), 0, 0, Math.PI * 2)
  ctx.fill()
  const spearDrop = drop.spear != null || drop.kind === 'tombak'
  const pulse = (reveal ? 0.45 : 0.22) + Math.sin(age * (spearDrop ? 7 : 3.4)) * (spearDrop ? 0.16 : 0.06)
  const tint = lootTint(drop.kind, drop)
  ctx.fillStyle = `rgba(${tint}, ${spearDrop ? Math.min(0.72, pulse + 0.2) : pulse})`
  ctx.beginPath()
  ctx.arc(x, y - 4 * scale, (spearDrop ? 16 : reveal ? 10 : 7) * scale, 0, Math.PI * 2)
  ctx.fill()
  if (spearDrop) {
    ctx.strokeStyle = `rgba(${tint}, ${0.55 + Math.sin(age * 5) * 0.25})`
    ctx.lineWidth = Math.max(1, scale)
    ctx.beginPath()
    ctx.arc(x, y - 4 * scale, (12 + Math.sin(age * 4) * 2) * scale, 0, Math.PI * 2)
    ctx.stroke()
  }
  if (reveal) {
    ctx.save()
    ctx.translate(x, y - 6 * scale)
    for (let i = -1; i <= 1; i += 1) {
      ctx.fillStyle = `rgba(${tint}, ${0.28})`
      ctx.fillRect(i * 4 * scale, -14 * scale, Math.max(1, scale), 10 * scale)
    }
    ctx.restore()
  }
  const art = lootIcon(drop.kind)
  ctx.save()
  ctx.translate(x, y - (art.height * scale) / 2)
  if (reveal) ctx.rotate(Math.sin(life * 2.2) * 0.35)
  if (highlight) {
    ctx.strokeStyle = '#f2c04a'
    ctx.lineWidth = Math.max(2, scale)
    ctx.strokeRect(-art.width * scale * 0.5 - 3, -art.height * scale * 0.5 - 3, art.width * scale + 6, art.height * scale + 6)
  }
  blit(ctx, art, -(art.width * scale) / 2, -(art.height * scale) / 2, scale)
  ctx.restore()
  const spark = Math.max(1, Math.round(scale * 0.8))
  const sparks = reveal ? 4 : 3
  for (let i = 0; i < sparks; i += 1) {
    if (Math.sin(age * (reveal ? 8 : 6.5) + i * 1.7) < (reveal ? -0.15 : 0.05)) continue
    const a = i * 1.5 + life
    const rad = (reveal ? 9 : 6) * scale + (i % 2) * 3 * scale
    const sx = Math.round(x + Math.cos(a) * rad)
    const sy = Math.round(y - 5 * scale + Math.sin(a) * rad * 0.65)
    ctx.fillStyle = i % 2 === 0 ? '#f7fbff' : '#f2c04a'
    ctx.fillRect(sx, sy - spark, spark, spark * 3)
    ctx.fillRect(sx - spark, sy, spark * 3, spark)
  }
}

export function drawLootStrip(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = '#1a140f'
  ctx.fillRect(0, 0, width, height)
  const kinds = ['bandage', 'scrap', 'relic']
  const names = ['biasa', 'besi', 'relik']
  const times = [0.05, 0.3, 0.6, 0.9]
  ctx.font = '14px Courier New, monospace'
  ctx.textAlign = 'center'
  kinds.forEach((kind, row) => {
    times.forEach((time, col) => {
      const x = width * (col + 0.5) / times.length
      const y = height * (row + 0.72) / kinds.length
      ctx.fillStyle = '#241c16'
      ctx.fillRect(x - 54, y - 58, 108, 96)
      drawFloatingLoot(ctx, { x, y }, 3, { id: `strip-${kind}`, kind: kind as Drop['kind'], x: 0, y: 0, born: -3, hover: 0 }, time)
      ctx.fillStyle = '#f6ecd8'
      ctx.fillText(`${names[row]} ${time.toFixed(1)}d`, x, y - 46)
    })
  })
}

export function drawRevealStrip(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = '#1a140f'
  ctx.fillRect(0, 0, width, height)
  const frames = [
    { age: 0.18, label: 'naik' },
    { age: 0.85, label: 'melayang' },
    { age: 1.55, label: 'turun' },
    { age: 2.35, label: 'mendarat' },
  ]
  const kinds = ['scrap', 'relic', 'shard'] as const
  ctx.font = '16px Courier New, monospace'
  ctx.textAlign = 'center'
  frames.forEach((frame, col) => {
    const cx = width * (col + 0.5) / frames.length
    const cy = height * 0.62
    ctx.fillStyle = '#241c16'
    ctx.fillRect(cx - 110, cy - 130, 220, 220)
    drawChest(ctx, { x: cx, y: cy + 10 }, 4, frame.age < 0.55 ? 'opening' : 'open', frame.age, true, frame.age)
    kinds.forEach((kind, index) => {
      const ang = -Math.PI / 2 + (index - 1) * 0.7
      const ground = { x: cx + Math.cos(ang) * 48, y: cy + 24 + Math.sin(ang) * 20 }
      drawFloatingLoot(ctx, ground, 3, {
        id: `rev-${col}-${index}`,
        kind,
        x: 0,
        y: 0,
        born: 0,
        hover: 1.25 + index * 0.22,
      }, frame.age, { x: cx, y: cy + 10 })
    })
    ctx.fillStyle = '#f6ecd8'
    ctx.fillText(frame.label, cx, cy - 112)
  })
}

function drawMineDressing(
  ctx: CanvasRenderingContext2D,
  run: Run,
  scale: number,
  at: (x: number, y: number) => { x: number; y: number },
): void {
  const dressed = (run.depth ?? 1) <= 1
  const rocks = !dressed ? [] : run.zone === 'pangkalan'
    ? [[-92, -120, 22, 14], [78, -130, 18, 16], [-100, 40, 18, 16], [86, 30, 16, 18], [-70, -20, 14, 12], [62, 70, 12, 10]]
    : run.zone === 'tambang'
      ? [[-96, -40, 18, 20], [90, 20, 16, 18], [-70, 50, 20, 12], [55, -30, 14, 16], [-30, -90, 16, 12], [20, 80, 12, 14]]
      : [[-90, -40, 16, 24], [70, -20, 14, 20], [-60, 40, 18, 14], [50, 60, 16, 18], [-20, -80, 12, 16], [10, 20, 20, 10]]
  const room = run.chart ? roomAt(run.chart, run.roomId) : null
  const blocked = (x: number, y: number) => room != null && onDoor(room, x, y)
  if (dressed) for (const [x, y, w, h] of rocks) {
    if (blocked(x + w / 2, y + h / 2)) continue
    rock(ctx, at, scale, x, y, w, h)
  }
  if (dressed) for (let i = 0, x = -ZONE_W / 2 + 8; x < ZONE_W / 2; i += 1, x += 36) {
    if (i % 4 === 0) continue
    const northOpen = run.zone === 'sarang' && Math.abs(x) < NEST_DOOR + 16
    const southOpen = run.zone === 'reruntuhan' && Math.abs(x + 6) < NEST_DOOR + 16
    if (!northOpen && !blocked(x, -ZONE_H / 2 + 4)) rock(ctx, at, scale, x, -ZONE_H / 2 + 4, 8 + (i % 3) * 4, 7 + (i % 2) * 4)
    if (!southOpen && !blocked(x + 6, ZONE_H / 2 - 14)) rock(ctx, at, scale, x + 6, ZONE_H / 2 - 14 - (i % 3) * 2, 9 + (i % 2) * 3, 6 + (i % 3) * 2)
  }
  if (run.zone === 'reruntuhan' || run.zone === 'sarang') {
    const lip = run.zone === 'reruntuhan' ? ZONE_H / 2 - 12 : -ZONE_H / 2 + 2
    rock(ctx, at, scale, -NEST_DOOR - 10, lip, 12, 14)
    rock(ctx, at, scale, NEST_DOOR - 2, lip, 12, 14)
    const sill = at(-NEST_DOOR, lip)
    ctx.fillStyle = '#f2c04a'
    const mark = Math.max(2, Math.round(2 * scale))
    ctx.fillRect(Math.round(sill.x), Math.round(sill.y), Math.round(8 * scale), mark)
    ctx.fillRect(Math.round(sill.x + (NEST_DOOR * 2 - 8) * scale), Math.round(sill.y), Math.round(8 * scale), mark)
  }
  if (dressed) for (let i = 0, y = -ZONE_H / 2 + 30; y < ZONE_H / 2 - 10; i += 1, y += 42) {
    if (i % 3 === 1) continue
    if (!blocked(-ZONE_W / 2 + 2, y)) rock(ctx, at, scale, -ZONE_W / 2 + 2, y, 8 + (i % 2) * 4, 10 + (i % 3) * 3)
    if (!blocked(ZONE_W / 2 - 14, y + 6)) rock(ctx, at, scale, ZONE_W / 2 - 14, y + 6, 10, 8 + (i % 3) * 4)
  }
  if (!dressed) {
    /* deeper floors keep the baked tileset clear of the burrow clutter */
  } else if (run.zone === 'pangkalan') {
    pipe(ctx, at, scale, -80, 20, 50, 0, '#6a442c')
    cable(ctx, at, scale, 40, -40, 36, 18, '#2a241c')
    lamp(ctx, at, scale, -48, 36, '#c4a15a', run.age)
    machine(ctx, at, scale, 70, -40, run.age)
    drip(ctx, at, scale, -60, -60, run.age)
  } else if (run.zone === 'tambang') {
    pipe(ctx, at, scale, -100, -80, 0, 70, '#8a5a44')
    pipe(ctx, at, scale, 20, 90, 60, 0, '#5c6570')
    cable(ctx, at, scale, -20, -100, 40, 24, '#241c18')
    lamp(ctx, at, scale, 70, -60, '#a86a42', run.age)
    machine(ctx, at, scale, -20, 70, run.age)
    drip(ctx, at, scale, 40, -80, run.age)
    debris(ctx, at, scale, -50, 40)
  } else {
    pipe(ctx, at, scale, -60, -40, 46, 0, '#7a4632')
    cable(ctx, at, scale, 30, 20, -20, 36, '#1c2428')
    lamp(ctx, at, scale, -50, 80, '#8d2f24', run.age)
    lamp(ctx, at, scale, 40, -110, '#4f7a78', run.age + 1)
    machine(ctx, at, scale, -70, -20, run.age)
    drip(ctx, at, scale, 10, -40, run.age)
    debris(ctx, at, scale, 20, 50)
  }
  const edge = at(-ZONE_W / 2, -ZONE_H / 2)
  ctx.fillStyle = 'rgba(8, 10, 12, 0.28)'
  const band = 10 * scale
  const gap = nestGap(run.zone)
  const doorLeft = at(-NEST_DOOR, 0).x - edge.x
  const doorRight = at(NEST_DOOR, 0).x - edge.x
  const span = ZONE_W * scale
  if (gap === 'north') {
    ctx.fillRect(edge.x, edge.y, doorLeft, band)
    ctx.fillRect(edge.x + doorRight, edge.y, span - doorRight, band)
  } else ctx.fillRect(edge.x, edge.y, span, band)
  const foot = edge.y + (ZONE_H - 10) * scale
  if (gap === 'south') {
    ctx.fillRect(edge.x, foot, doorLeft, band)
    ctx.fillRect(edge.x + doorRight, foot, span - doorRight, band)
  } else ctx.fillRect(edge.x, foot, span, band)
}

function rock(
  ctx: CanvasRenderingContext2D,
  at: (x: number, y: number) => { x: number; y: number },
  scale: number,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const p = at(x, y)
  blit(ctx, rockRim(Math.abs(Math.round(x / 9) + Math.round(y / 7))), p.x - 2 * scale, p.y - 2 * scale, scale * 1.25)
  void w
  void h
}

function pipe(
  ctx: CanvasRenderingContext2D,
  at: (x: number, y: number) => { x: number; y: number },
  scale: number,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
): void {
  const p = at(x, y)
  const art = pipeRun()
  const vertical = Math.abs(h) > Math.abs(w)
  const span = Math.max(Math.abs(vertical ? h : w), art.width) * scale
  const seg = Math.max(1, art.width * scale)
  ctx.save()
  ctx.translate(Math.round(p.x), Math.round(p.y))
  if (vertical) ctx.rotate(Math.PI / 2)
  for (let t = 0; t < span; t += seg) blit(ctx, art, t, 0, scale)
  ctx.restore()
  void color
}

function cable(
  ctx: CanvasRenderingContext2D,
  at: (x: number, y: number) => { x: number; y: number },
  scale: number,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
): void {
  const p = at(x, y)
  const art = cableRun()
  const vertical = Math.abs(h) > Math.abs(w)
  const span = Math.max(Math.abs(vertical ? h : w), art.width) * scale
  const seg = Math.max(1, art.width * scale)
  ctx.save()
  ctx.translate(Math.round(p.x), Math.round(p.y))
  if (vertical) ctx.rotate(Math.PI / 2)
  for (let t = 0; t < span; t += seg) blit(ctx, art, t, 0, scale)
  ctx.restore()
  void color
}

function lamp(
  ctx: CanvasRenderingContext2D,
  at: (x: number, y: number) => { x: number; y: number },
  scale: number,
  x: number,
  y: number,
  color: string,
  age: number,
): void {
  const p = at(x, y)
  const pulse = 0.45 + Math.sin(age * 3) * 0.08
  blit(ctx, lampHousing(), p.x - 6 * scale, p.y - 4 * scale, scale)
  ctx.fillStyle = color
  ctx.globalAlpha = 0.22 * pulse
  ctx.fillRect(Math.round(p.x - 14 * scale), Math.round(p.y - 10 * scale), Math.round(30 * scale), Math.round(22 * scale))
  ctx.fillStyle = '#e7c27a'
  ctx.globalAlpha = 0.16 * pulse
  ctx.fillRect(Math.round(p.x - 4 * scale), Math.round(p.y - 2 * scale), Math.round(10 * scale), Math.round(8 * scale))
  ctx.globalAlpha = 1
}

function machine(
  ctx: CanvasRenderingContext2D,
  at: (x: number, y: number) => { x: number; y: number },
  scale: number,
  x: number,
  y: number,
  age: number,
): void {
  const p = at(x, y)
  const lift = Math.sin(age * 2) * 2 * scale
  blit(ctx, machineSprite(), p.x, p.y + lift, scale)
}

function drip(
  ctx: CanvasRenderingContext2D,
  at: (x: number, y: number) => { x: number; y: number },
  scale: number,
  x: number,
  y: number,
  age: number,
): void {
  const p = at(x, y)
  const drop = (age % 1.4) / 1.4
  ctx.fillStyle = '#4f7a78'
  ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.max(2, Math.round(scale)), Math.round(6 * scale))
  ctx.fillRect(Math.round(p.x), Math.round(p.y + drop * 14 * scale), Math.max(2, Math.round(scale)), Math.max(2, Math.round(scale * 1.4)))
}

function debris(
  ctx: CanvasRenderingContext2D,
  at: (x: number, y: number) => { x: number; y: number },
  scale: number,
  x: number,
  y: number,
): void {
  const p = at(x, y)
  blit(ctx, debrisSprite(), p.x, p.y, scale)
}

const chestSeen = new Map<string, { open: boolean; at: number }>()

export type ChestPhase = 'closed' | 'opening' | 'open'

function chestVisual(id: string, open: boolean, age: number): { phase: ChestPhase; openAge: number } {
  const prev = chestSeen.get(id)
  if (!prev) {
    chestSeen.set(id, { open, at: open ? age - 2 : age })
    return { phase: open ? 'open' : 'closed', openAge: open ? 2 : 0 }
  }
  if (!prev.open && open) chestSeen.set(id, { open: true, at: age })
  const rec = chestSeen.get(id)!
  if (!rec.open) return { phase: 'closed', openAge: 0 }
  const openAge = Math.max(0, age - rec.at)
  return { phase: openAge < 0.55 ? 'opening' : 'open', openAge }
}

export function drawChest(
  ctx: CanvasRenderingContext2D,
  p: { x: number; y: number },
  scale: number,
  phase: ChestPhase,
  age: number,
  fancy: boolean,
  openAge = phase === 'opening' ? 0.22 : phase === 'open' ? 2 : 0,
): void {
  const s = Math.max(1, scale)
  const lid = phase === 'closed' ? 0 : phase === 'open' ? 1 : Math.min(1, openAge / 0.5)
  const aura = phase === 'closed' ? 0.26 + Math.sin(age * 2.4) * 0.07 : phase === 'opening' ? 0.42 : 0.07
  ctx.fillStyle = fancy ? `rgba(106, 168, 164, ${aura * 0.45})` : `rgba(242, 192, 74, ${aura})`
  ctx.beginPath()
  ctx.arc(p.x, p.y - 7 * s, (fancy ? 18 : 15) * s, 0, Math.PI * 2)
  ctx.fill()
  if (phase !== 'open') {
    for (let i = 0; i < 3; i += 1) {
      if (Math.sin(age * 4.2 + i * 2.2) < 0.35) continue
      const a = age * 1.3 + i * 2.1
      ctx.fillStyle = fancy ? '#9ad4cf' : '#f7e7a0'
      const gx = Math.round(p.x + Math.cos(a) * 12 * s)
      const gy = Math.round(p.y - 8 * s + Math.sin(a) * 6 * s)
      ctx.fillRect(gx, gy, Math.max(1, Math.round(s)), Math.max(1, Math.round(s)))
    }
  }
  const w = 15 * s
  const bodyH = 7 * s
  const bodyTop = p.y - 2 * s
  const left = p.x - w / 2
  const px = (n: number) => Math.round(n)
  const wood = '#3a2416'
  const woodLite = '#5c3a22'
  const gold = fancy ? '#f2c04a' : '#d7a23a'
  const gem = fancy ? '#6aa8a4' : '#f2c04a'
  const beam = phase === 'opening' ? 0.62 * (1 - lid * 0.25) : phase === 'open' && openAge < 0.95 ? Math.max(0, 0.45 - openAge * 0.4) : 0
  if (beam > 0.04) {
    ctx.save()
    ctx.translate(p.x, bodyTop)
    for (let i = -3; i <= 3; i += 1) {
      ctx.save()
      ctx.rotate(-Math.PI / 2 + i * 0.18)
      ctx.fillStyle = `rgba(242, 214, 120, ${beam * (0.5 - Math.abs(i) * 0.06)})`
      ctx.fillRect(-Math.max(1, s * 0.6), 0, Math.max(2, s * 1.2), -(12 + (3 - Math.abs(i)) * 3) * s)
      ctx.restore()
    }
    ctx.restore()
  }
  ctx.fillStyle = '#14110e'
  ctx.fillRect(px(left - s), px(bodyTop), px(w + 2 * s), px(bodyH + s))
  ctx.fillStyle = wood
  ctx.fillRect(px(left), px(bodyTop + s), px(w), px(bodyH))
  ctx.fillStyle = woodLite
  ctx.fillRect(px(left + s), px(bodyTop + 2 * s), px(w - 2 * s), Math.max(1, px(s)))
  ctx.fillStyle = gold
  ctx.fillRect(px(left), px(bodyTop + s), px(w), Math.max(1, px(s * 0.8)))
  ctx.fillRect(px(left), px(bodyTop + bodyH - s), px(w), Math.max(1, px(s * 0.8)))
  const cap = Math.max(2, px(2 * s))
  ctx.fillRect(px(left), px(bodyTop + s), cap, px(bodyH))
  ctx.fillRect(px(left + w - cap), px(bodyTop + s), cap, px(bodyH))
  if (fancy) {
    ctx.fillStyle = '#9a6ad4'
    ctx.fillRect(px(left + 4 * s), px(bodyTop + 3 * s), Math.max(1, px(s)), Math.max(1, px(s)))
    ctx.fillRect(px(left + w - 5 * s), px(bodyTop + 3 * s), Math.max(1, px(s)), Math.max(1, px(s)))
  }
  if (lid > 0.15) {
    ctx.fillStyle = '#1a120c'
    ctx.fillRect(px(left + 2 * s), px(bodyTop + s), px(w - 4 * s), px(2.2 * s))
    ctx.fillStyle = `rgba(242, 192, 74, ${0.35 * Math.max(lid, beam)})`
    ctx.fillRect(px(left + 3 * s), px(bodyTop + s), px(w - 6 * s), px(1.4 * s))
  }
  const jewel = Math.max(3, px(2.4 * s))
  ctx.fillStyle = '#14110e'
  ctx.fillRect(px(p.x - jewel / 2 - 1), px(bodyTop + 3 * s), jewel + 2, jewel + 2)
  ctx.fillStyle = gem
  ctx.fillRect(px(p.x - jewel / 2), px(bodyTop + 3 * s + 1), jewel, jewel)
  ctx.fillStyle = '#f7fbff'
  ctx.fillRect(px(p.x - s * 0.3), px(bodyTop + 3.4 * s), Math.max(1, px(s * 0.7)), Math.max(1, px(s * 0.7)))
  const hingeX = left + 2 * s
  const hingeY = bodyTop + s
  ctx.save()
  ctx.translate(hingeX, hingeY)
  ctx.rotate(-lid * 1.2)
  const lidW = w - s
  const dome = [lidW, lidW * 0.86, lidW * 0.62, lidW * 0.38]
  dome.forEach((dw, step) => {
    const y = - (step + 1) * 1.35 * s
    ctx.fillStyle = step === 0 ? '#14110e' : wood
    ctx.fillRect(px(-s * 0.4), px(y - s * 0.3), px(dw + s), px(1.7 * s))
    ctx.fillStyle = step === dome.length - 1 ? gold : woodLite
    ctx.fillRect(px(0), px(y), px(dw), px(1.35 * s))
    if (step === 1) {
      ctx.fillStyle = gold
      ctx.fillRect(px(0), px(y + 0.35 * s), px(dw), Math.max(1, px(s * 0.55)))
    }
  })
  ctx.fillStyle = gold
  ctx.fillRect(px(0), px(-1.2 * s), px(lidW), Math.max(1, px(s * 0.7)))
  ctx.restore()
}

function drawCrate(
  ctx: CanvasRenderingContext2D,
  p: { x: number; y: number },
  scale: number,
  id: string,
  open: boolean,
  age: number,
): void {
  const visual = chestVisual(id, open, age)
  drawChest(ctx, p, scale, visual.phase, age, id === 'crate-relic' || id.startsWith('boss-chest'), visual.openAge)
}

export function drawChestStrip(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = '#1a140f'
  ctx.fillRect(0, 0, width, height)
  const phases: ChestPhase[] = ['closed', 'opening', 'open']
  const names = ['tertutup', 'terbuka separuh', 'terbuka']
  ctx.font = '16px Courier New, monospace'
  ctx.textAlign = 'center'
  phases.forEach((phase, col) => {
    ;[false, true].forEach((fancy, row) => {
      const x = width * (col + 0.5) / 3
      const y = height * (row + 0.62) / 2
      ctx.fillStyle = '#241c16'
      ctx.fillRect(x - 90, y - 90, 180, 150)
      drawChest(ctx, { x, y }, 5, phase, phase === 'closed' ? 1.1 : 0.35, fancy, phase === 'opening' ? 0.22 : phase === 'open' ? 1.4 : 0)
      ctx.fillStyle = '#f6ecd8'
      ctx.fillText(`${fancy ? t('item.short.relic') : t('chest.word')} ${names[col]}`, x, y - 74)
    })
  })
}

export const BOOM_FRAMES = 9
export const BOOM_SECONDS = 0.5

/** Frame 0 is the white flash. Frame 8 is the last smoke. */
export function boomFrame(life: number, total = BOOM_SECONDS): number {
  const t = 1 - Math.max(0, Math.min(1, life / total))
  return Math.min(BOOM_FRAMES - 1, Math.floor(t * BOOM_FRAMES))
}

function drawTag(ctx: CanvasRenderingContext2D, x: number, y: number, name: string): void {
  ctx.save()
  ctx.font = '12px Courier New, monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  ctx.lineWidth = 3
  ctx.strokeStyle = '#14110e'
  ctx.strokeText(name, x, y)
  ctx.fillStyle = '#f6ecd8'
  ctx.fillText(name, x, y)
  ctx.restore()
}

/** Lit barrel: accelerating red blink, a swell, a spark, and the 52px ring. */
export function drawFuse(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, left: number, max: number, age: number): void {
  const s = Math.max(1, scale)
  const k = 1 - Math.max(0, Math.min(1, left / Math.max(0.05, max)))
  const freq = 3 + k * 14
  const on = Math.sin(age * freq * Math.PI * 2) > 0
  const swell = 1 + k * 0.35 + Math.sin(age * 22) * 0.08
  const px = (dx: number, dy: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color
    ctx.fillRect(Math.round(x + dx * s), Math.round(y + dy * s), Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s)))
  }
  const jitter = Math.sin(age * (18 + k * 30)) * (0.6 + k * 1.4)
  ctx.save()
  ctx.globalAlpha = 0.28 + 0.5 * (0.5 + 0.5 * Math.sin(age * (5 + k * 12)))
  for (let i = 0; i < 36; i += 1) {
    const a = (i / 36) * Math.PI * 2
    px(Math.cos(a) * BLAST_RADIUS - 0.5, Math.sin(a) * BLAST_RADIUS - 0.5, 1.5, 1.5, i % 2 === 0 ? '#e10600' : '#ffb020')
  }
  ctx.restore()
  const body = 7 * swell
  px(-body + jitter, -body, body * 2, 2, '#1a120e')
  px(-body + jitter, body - 2, body * 2, 2, '#1a120e')
  px(-body + jitter, -body, 2, body * 2, '#1a120e')
  px(body - 2 + jitter, -body, 2, body * 2, '#1a120e')
  if (on) {
    px(-5 + jitter, -6, 10, 12, '#e10600')
    px(-3 + jitter, -4, 6, 8, '#ff4a3a')
    px(-1 + jitter, -2, 2, 4, '#fff6d0')
  }
  const spark = -11 - (Math.floor(age * 16) % 3)
  px(-1 + jitter, spark, 2, 2, '#fff6d0')
  px(0 + jitter, spark - 2, 1, 2, on ? '#fffaf2' : '#ffb020')
  px(1 + jitter, spark + 1, 1, 1, '#e25a12')
}

function drawScorch(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number): void {
  const s = Math.max(1, scale)
  const blot = (dx: number, dy: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color
    ctx.fillRect(Math.round(x + dx * s), Math.round(y + dy * s), Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s)))
  }
  blot(-10, -4, 20, 8, '#24160f')
  blot(-6, -7, 12, 5, '#3a2418')
  blot(-14, 1, 8, 4, '#1a120e')
  blot(6, 2, 9, 4, '#2a1812')
  blot(-3, 5, 7, 3, '#4a3020')
}

/** One frame of the barrel blast. Coordinates are already in pixels. The ring is the 52px damage radius. */
export function drawBoomFrame(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, frame: number): void {
  const s = Math.max(1, scale)
  const n = Math.max(0, Math.min(BOOM_FRAMES - 1, frame))
  const px = (dx: number, dy: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color
    ctx.fillRect(Math.round(x + dx * s), Math.round(y + dy * s), Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s)))
  }
  drawScorch(ctx, x, y, scale)
  const ringAlpha = n < 2 ? 0.35 : n < 7 ? 0.9 : 0.4
  ctx.save()
  ctx.globalAlpha = ringAlpha
  for (let i = 0; i < 40; i += 1) {
    const a = (i / 40) * Math.PI * 2
    const r = BLAST_RADIUS
    px(Math.cos(a) * r - 0.6, Math.sin(a) * r - 0.6, 1.6, 1.6, i % 2 === 0 ? '#ffb020' : '#1a120e')
  }
  ctx.restore()
  const rad = [8, 16, 26, 36, 46, 52, 44, 30, 16][n] ?? 16
  const shell = n === 0 ? '#fffaf2' : n < 3 ? '#ffe7a8' : n < 6 ? '#ffb020' : '#e25a12'
  const core = n < 2 ? '#fffaf2' : n < 5 ? '#ffe14a' : '#ffb020'
  disk(ctx, x, y, (rad + 3) * s, '#1a120e')
  disk(ctx, x, y, rad * s, shell)
  disk(ctx, x, y, Math.max(3, rad * 0.45) * s, core)
  if (n < 2) disk(ctx, x, y, 7 * s, '#fffaf2')
  const smokes = [
    [-18, -8], [14, -12], [-6, -16], [22, -4], [-24, 2],
  ]
  ctx.save()
  ctx.globalAlpha = n < 3 ? 0.35 : 0.75
  smokes.forEach(([sx, sy], i) => {
    const rise = n * (3 + (i % 3))
    const color = i % 2 === 0 ? '#6e645c' : '#3a342e'
    px(sx - 2, sy - rise, 6, 4, color)
    px(sx, sy - rise - 3, 3, 3, '#8a8078')
  })
  ctx.restore()
  const staves = [
    [1, -0.2, 8, 2],
    [-0.7, 0.8, 2, 7],
    [0.4, 1, 7, 2],
    [-1, -0.4, 2, 6],
  ] as const
  staves.forEach(([dx, dy, w, h], i) => {
    const fly = 6 + n * (4 + i)
    px(dx * fly, dy * fly - n, w, h, i % 2 === 0 ? '#8a5a32' : '#5c3a22')
    px(dx * fly + (w > h ? w - 1 : 0), dy * fly - n, 1, 1, '#c4a15a')
  })
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2 + n * 0.2
    const dist = 8 + n * 5
    px(Math.cos(a) * dist, Math.sin(a) * dist, 1, 1, i % 2 === 0 ? '#fff6d0' : '#ffb020')
  }
}

function disk(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string): void {
  ctx.fillStyle = color
  const r = Math.max(1, radius)
  const step = Math.max(1, Math.round(r / 12))
  for (let dy = -r; dy <= r; dy += step) {
    const span = Math.sqrt(Math.max(0, r * r - dy * dy))
    ctx.fillRect(Math.round(x - span), Math.round(y + dy), Math.max(1, Math.round(span * 2)), step)
  }
}

/** Nine frames of the blast, left to right. */
export function drawBoomStrip(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = '#1a140f'
  ctx.fillRect(0, 0, width, height)
  const cell = width / BOOM_FRAMES
  for (let frame = 0; frame < BOOM_FRAMES; frame += 1) {
    const cx = cell * (frame + 0.5)
    const cy = height * 0.58
    ctx.fillStyle = '#241c16'
    ctx.fillRect(cx - cell * 0.46, 8, cell * 0.92, height - 16)
    drawBoomFrame(ctx, cx, cy, 1.15, frame)
  }
}

function drawDungeonDress(
  ctx: CanvasRenderingContext2D,
  run: Run,
  scale: number,
  at: (x: number, y: number) => { x: number; y: number },
): void {
  for (const vein of run.chart?.veins ?? []) {
    if (vein.hp <= 0 || vein.room !== run.roomId) continue
    const id = spriteIdFor('vein', vein.ore, vein.big)
    placeMarked(ctx, at, scale, run, vein.x, vein.y, id, true)
    const cracks = vein.max - vein.hp
    if (cracks > 0) {
      const p = at(vein.x, vein.y)
      ctx.fillStyle = '#1a140f'
      for (let c = 0; c < cracks; c += 1) {
        ctx.fillRect(Math.round(p.x - 4 * scale + c * 2 * scale), Math.round(p.y - 2 * scale), Math.max(1, scale), Math.round(4 * scale))
      }
    }
  }
  for (const prop of run.chart?.props ?? []) {
    if (prop.room !== run.roomId) continue
    if (prop.kind === 'barrel' && prop.state === 'spent') {
      drawScorch(ctx, at(prop.x, prop.y).x, at(prop.x, prop.y).y, scale)
      continue
    }
    if (prop.state === 'spent') continue
    if (prop.kind === 'root' || prop.kind === 'cocoon' || prop.kind === 'web') continue
    if (prop.kind === 'cloud' || prop.kind === 'pod' || prop.kind === 'cart' || prop.kind === 'vent') {
      drawHazard(ctx, at(prop.x, prop.y), scale, prop.kind, prop.fuse ?? 0, run.age, prop.lane ?? 1)
      continue
    }
    if (prop.kind === 'crack' && prop.state === 'open') {
      const room = run.chart ? roomAt(run.chart, prop.room) : null
      const door = room?.doors.find((item) => item.lock === 'secret' && run.flags?.includes(`secret:${item.to}`))
      if (door) {
        const pad = doorPad(door.dir)
        const gap = at(pad.x, pad.y)
        ctx.fillStyle = '#e7c27a'
        ctx.fillRect(Math.round(gap.x - 8 * scale), Math.round(gap.y - 2 * scale), Math.round(16 * scale), Math.max(3, 4 * scale))
      }
      continue
    }
    const id = spriteIdFor(prop.kind, undefined, false, prop.state === 'open')
    const spot = at(prop.x, prop.y)
    placeMarked(ctx, at, scale, run, prop.x, prop.y, id, interactable(id))
    if (prop.kind === 'barrel' && (prop.fuse ?? 0) > 0) drawFuse(ctx, spot.x, spot.y, scale, prop.fuse ?? 0, prop.fuseMax ?? prop.fuse ?? 1, run.age)
    if (prop.kind === 'chest' && prop.lock === 'key' && prop.state !== 'open') {
      blitMotif(ctx, 'key', at(prop.x + 8, prop.y).x, at(prop.x, prop.y - 10).y, Math.max(1, scale * 0.8))
    }
    if (prop.kind === 'crack' && prop.state === 'live') {
      const gone = 3 - (prop.hp ?? 3)
      const p = at(prop.x, prop.y)
      ctx.fillStyle = '#1a140f'
      for (let c = 0; c < gone; c += 1) {
        ctx.fillRect(Math.round(p.x - 6 * scale + c * 4 * scale), Math.round(p.y - 8 * scale), Math.max(1, scale), Math.round(12 * scale))
      }
    }
  }
  for (const bit of run.bits ?? []) {
    const p = at(bit.x, bit.y)
    ctx.globalAlpha = Math.max(0, bit.life / 0.35)
    ctx.fillStyle = '#c4b8a4'
    ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.max(1, scale), Math.max(1, scale))
  }
  ctx.globalAlpha = 1
}

function placeMarked(
  ctx: CanvasRenderingContext2D,
  at: (x: number, y: number) => { x: number; y: number },
  scale: number,
  run: Run,
  x: number,
  y: number,
  id: string,
  spark: boolean,
): void {
  const p = at(x, y)
  blitMotif(ctx, id, p.x, p.y, scale)
  if (spark) sparkle(ctx, p.x, p.y, scale, run.age, x + y)
  if (id !== 'chest' && id !== 'chest-open' && Math.hypot(run.x - x, run.y - y) < 42) {
    const name = mapLabel(id.startsWith('vein') ? 'vein' : id, id.replace('vein-', ''), id === 'vein-big', false)
    ctx.save()
    ctx.font = '12px Courier New, monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.lineWidth = 3
    ctx.strokeStyle = '#14110e'
    ctx.strokeText(name, p.x, p.y - 18 * scale)
    ctx.fillStyle = '#f6ecd8'
    ctx.fillText(name, p.x, p.y - 18 * scale)
    ctx.restore()
  }
}

function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, age: number, seed: number): void {
  const s = Math.max(1, Math.round(scale))
  for (let i = 0; i < 3; i += 1) {
    if (Math.sin(age * 6 + seed * 0.01 + i * 1.7) < 0.1) continue
    const ox = Math.cos(i * 2.2 + seed) * 9 * scale
    const oy = Math.sin(i * 2.2 + seed) * 7 * scale - 8 * scale
    ctx.fillStyle = i === 0 ? '#f7fbff' : '#f7e7a0'
    ctx.fillRect(Math.round(x + ox), Math.round(y + oy), s, s * 2)
    ctx.fillRect(Math.round(x + ox - s), Math.round(y + oy + s * 0.5), s * 3, s)
  }
}

function floorFill(zone: Run['zone']): string {
  if (zone === 'sarang') return '#2a1c24'
  if (zone === 'pangkalan') return '#3a2c20'
  return '#241c16'
}

function drawBackdrop(
  ctx: CanvasRenderingContext2D,
  scale: number,
  at: (x: number, y: number) => { x: number; y: number },
  width: number,
  height: number,
  originX: number,
  originY: number,
  age: number,
  depth: number,
): void {
  const kit = themeKit(depth)
  const left = -originX / scale
  const top = -originY / scale
  const right = left + width / scale
  const bottom = top + height / scale
  const step = 16
  for (let y = Math.floor(top / step) * step; y < bottom; y += step) {
    for (let x = Math.floor(left / step) * step; x < right; x += step) {
      if (x >= -ZONE_W / 2 && x + step <= ZONE_W / 2 && y >= -ZONE_H / 2 && y + step <= ZONE_H / 2) continue
      const p = at(x, y)
      const flip = (Math.floor(x / step) + Math.floor(y / step)) % 2 === 0
      ctx.fillStyle = flip ? kit.dark : kit.wall
      ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.ceil(step * scale) + 1, Math.ceil(step * scale) + 1)
    }
  }
  const glow = 0.35 + Math.sin(age * 3) * 0.06
  for (let x = -ZONE_W / 2 + 30; x < ZONE_W / 2; x += 90) {
    placeLamp(ctx, at, scale, x, -ZONE_H / 2 - 18, glow)
    placeLamp(ctx, at, scale, x + 40, ZONE_H / 2 + 8, glow)
  }
  for (let y = -ZONE_H / 2 + 40; y < ZONE_H / 2; y += 100) {
    placeLamp(ctx, at, scale, -ZONE_W / 2 - 22, y, glow)
    placeLamp(ctx, at, scale, ZONE_W / 2 + 8, y + 30, glow)
  }
}

function placeLamp(
  ctx: CanvasRenderingContext2D,
  at: (x: number, y: number) => { x: number; y: number },
  scale: number,
  x: number,
  y: number,
  glow: number,
): void {
  const p = at(x, y)
  ctx.fillStyle = '#c4a15a'
  ctx.globalAlpha = 0.18 * glow
  ctx.fillRect(Math.round(p.x - 8 * scale), Math.round(p.y - 8 * scale), Math.round(18 * scale), Math.round(18 * scale))
  ctx.globalAlpha = 1
  ctx.fillStyle = '#3a332c'
  ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.max(2, scale * 2), Math.round(8 * scale))
  ctx.fillStyle = '#e7c27a'
  ctx.fillRect(Math.round(p.x - scale), Math.round(p.y - 3 * scale), Math.round(4 * scale), Math.round(4 * scale))
}

function clampFocus(focus: number, view: number, span: number): number {
  if (view >= span) return 0
  const limit = (span - view) / 2
  return Math.max(-limit, Math.min(limit, focus))
}

function roomPlate(depth: number, scale: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null
  const key = `${depth}:${Math.round(scale * 1000)}`
  if (roomCanvas && roomKey === key) return roomCanvas
  const w = Math.ceil(ZONE_W * scale)
  const h = Math.ceil(ZONE_H * scale)
  if (!roomCanvas) roomCanvas = document.createElement('canvas')
  if (roomCanvas.width !== w || roomCanvas.height !== h) {
    roomCanvas.width = w
    roomCanvas.height = h
  }
  const pen = roomCanvas.getContext('2d')
  if (!pen) return null
  pen.imageSmoothingEnabled = false
  pen.clearRect(0, 0, w, h)
  paintThemePlate(pen, depth, scale)
  roomKey = key
  return roomCanvas
}

function drawFloor(
  ctx: CanvasRenderingContext2D,
  run: Run,
  scale: number,
  at: (x: number, y: number) => { x: number; y: number },
): void {
  const left = at(-ZONE_W / 2, -ZONE_H / 2)
  const plate = roomPlate(run.depth || 1, scale)
  if (plate) ctx.drawImage(plate, Math.floor(left.x), Math.floor(left.y))
  strokeRoom(ctx, left.x, left.y, ZONE_W * scale, ZONE_H * scale, nestGap(run.zone), at(-NEST_DOOR, 0).x - left.x, at(NEST_DOOR, 0).x - left.x, themeKit(run.depth || 1).wallTop)
  drawDoorways(ctx, run, scale, at)
}

function strokeRoom(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  gap: 'north' | 'south' | null,
  door0: number,
  door1: number,
  color: string,
): void {
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.beginPath()
  if (gap === 'south') {
    ctx.moveTo(x, y)
    ctx.lineTo(x + w, y)
    ctx.lineTo(x + w, y + h)
    ctx.lineTo(x + door1, y + h)
    ctx.moveTo(x + door0, y + h)
    ctx.lineTo(x, y + h)
    ctx.lineTo(x, y)
  } else if (gap === 'north') {
    ctx.moveTo(x, y + h)
    ctx.lineTo(x + w, y + h)
    ctx.lineTo(x + w, y)
    ctx.lineTo(x + door1, y)
    ctx.moveTo(x + door0, y)
    ctx.lineTo(x, y)
    ctx.lineTo(x, y + h)
  } else {
    ctx.rect(x, y, w, h)
  }
  ctx.stroke()
}


function drawCircle(ctx: CanvasRenderingContext2D, at: (x: number, y: number) => { x: number; y: number }, scale: number, age: number): void {
  const p = at(EXTRACT_ZONE.x, EXTRACT_ZONE.y)
  const reduced = motionReduced()
  const r = EXTRACT_ZONE.r * scale
  const glow = extractGlow()
  if (glow) {
    const size = r * 2.7
    ctx.drawImage(glow, p.x - size / 2, p.y - size / 2, size, size)
  }
  const lamps = 4
  for (let i = 0; i < lamps; i += 1) {
    const ang = -Math.PI / 4 + (i * Math.PI * 2) / lamps
    const lx = p.x + Math.cos(ang) * r
    const ly = p.y + Math.sin(ang) * r
    const blink = reduced
      ? (Math.floor(age * 0.45 + i) % 3 === 0 ? 0.95 : 0.4)
      : 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(age * 4.2 + i * 1.4))
    ctx.fillStyle = `rgba(64, 220, 96, ${0.18 * blink})`
    ctx.beginPath()
    ctx.arc(lx, ly, 16 * scale, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#1a3a22'
    ctx.fillRect(Math.round(lx - scale), Math.round(ly - 8 * scale), Math.max(2, scale * 2), Math.round(8 * scale))
    ctx.fillStyle = `rgba(186, 255, 140, ${blink})`
    ctx.fillRect(Math.round(lx - 2 * scale), Math.round(ly - 10 * scale), Math.max(3, scale * 3), Math.max(3, scale * 3))
  }
  const wisps = reduced || effectBudget === 'low' ? 4 : 9
  const cycle = reduced ? 5.2 : 2.4
  const pace = reduced ? 0.35 : 1
  for (let i = 0; i < wisps; i += 1) {
    const t = ((age * pace + (i * cycle) / wisps) % cycle) / cycle
    const rise = t * r * 1.5
    const drift = Math.sin(age * (reduced ? 0.3 : 0.8) + i) * 10 * scale * t
    ctx.fillStyle = `rgba(90, 210, 110, ${(1 - t) * (reduced ? 0.22 : 0.42)})`
    const w = (6 + (1 - t) * 8) * scale
    const h = (8 + t * 6) * scale
    ctx.fillRect(Math.round(p.x - r * 0.35 + (i % 3) * r * 0.28 + drift), Math.round(p.y - rise - h), Math.round(w), Math.round(h))
  }
  ctx.save()
  ctx.strokeStyle = '#7dffa0'
  ctx.setLineDash([6, 5])
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

function inward(dir: Dir, pad: { x: number; y: number }, dist: number): { x: number; y: number } {
  if (dir === 'n') return { x: pad.x, y: pad.y + dist }
  if (dir === 's') return { x: pad.x, y: pad.y - dist }
  if (dir === 'w') return { x: pad.x + dist, y: pad.y }
  return { x: pad.x - dist, y: pad.y }
}

function drawDoorways(
  ctx: CanvasRenderingContext2D,
  run: Run,
  scale: number,
  at: (x: number, y: number) => { x: number; y: number },
): void {
  const room = run.chart ? roomAt(run.chart, run.roomId) : null
  if (!room) return
  const kit = themeKit(run.depth || 1)
  for (const door of room.doors) {
    const pad = doorPad(door.dir)
    const p = at(pad.x, pad.y)
    const wide = (door.dir === 'n' || door.dir === 's')
    const span = 44 * scale
    const thick = 18 * scale
    const left = Math.round(p.x - (wide ? span / 2 : thick / 2))
    const top = Math.round(p.y - (wide ? thick / 2 : span / 2))
    ctx.fillStyle = kit.floor
    ctx.fillRect(left, top, Math.round(wide ? span : thick), Math.round(wide ? thick : span))
    ctx.fillStyle = kit.trim
    const post = Math.max(2, Math.round(3 * scale))
    if (wide) {
      ctx.fillRect(left, top, post, Math.round(thick))
      ctx.fillRect(left + Math.round(span) - post, top, post, Math.round(thick))
      ctx.fillStyle = kit.wallTop
      ctx.fillRect(left, door.dir === 'n' ? top : top + Math.round(thick) - post, Math.round(span), post)
    } else {
      ctx.fillRect(left, top, Math.round(thick), post)
      ctx.fillRect(left, top + Math.round(span) - post, Math.round(thick), post)
      ctx.fillStyle = kit.wallTop
      ctx.fillRect(door.dir === 'w' ? left : left + Math.round(thick) - post, top, post, Math.round(span))
    }
  }
}

function drawWayfinder(
  ctx: CanvasRenderingContext2D,
  run: Run,
  scale: number,
  at: (x: number, y: number) => { x: number; y: number },
): void {
  const chart = run.chart
  if (!chart) return
  const step = nextExitDoor(chart, run.roomId ?? '')
  if (!step) return
  const spot = inward(step.dir, doorPad(step.dir), 46)
  const p = at(spot.x, spot.y)
  const blink = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(run.age * 6))
  ctx.save()
  ctx.globalAlpha = blink
  ctx.translate(Math.round(p.x), Math.round(p.y))
  const turn = step.dir === 'e' ? 0 : step.dir === 's' ? Math.PI / 2 : step.dir === 'w' ? Math.PI : -Math.PI / 2
  ctx.rotate(turn)
  const s = Math.max(1, scale)
  ctx.fillStyle = '#102818'
  ctx.fillRect(Math.round(-28 * s), Math.round(-12 * s), Math.round(56 * s), Math.round(24 * s))
  ctx.fillStyle = '#1f8a3a'
  ctx.fillRect(Math.round(-26 * s), Math.round(-10 * s), Math.round(52 * s), Math.round(20 * s))
  ctx.fillStyle = '#e9ffe8'
  ctx.font = `bold ${Math.max(10, Math.round(8 * scale))}px Courier New, monospace`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(t('exit.sign'), Math.round(-22 * s), 0)
  ctx.fillRect(Math.round(16 * s), Math.round(-3 * s), Math.round(4 * s), Math.round(6 * s))
  ctx.fillRect(Math.round(20 * s), Math.round(-2 * s), Math.round(4 * s), Math.round(4 * s))
  ctx.fillRect(Math.round(24 * s), Math.round(-1 * s), Math.round(3 * s), Math.round(2 * s))
  ctx.restore()
}

function drawKillSlash(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, facing: number, t: number): void {
  ctx.save()
  ctx.translate(Math.round(x), Math.round(y))
  ctx.rotate(facing)
  ctx.globalAlpha = Math.max(0, 1 - t)
  ctx.strokeStyle = '#fff6d2'
  ctx.lineWidth = Math.max(2, 3 * scale)
  ctx.beginPath()
  ctx.moveTo(-30 * scale, 12 * scale)
  ctx.lineTo(34 * scale, -16 * scale)
  ctx.stroke()
  ctx.strokeStyle = '#f2c04a'
  ctx.lineWidth = Math.max(1, scale)
  ctx.beginPath()
  ctx.moveTo(-22 * scale, 6 * scale)
  ctx.lineTo(26 * scale, -8 * scale)
  ctx.stroke()
  ctx.fillStyle = `rgba(255, 246, 220, ${0.45 * (1 - t)})`
  ctx.beginPath()
  ctx.arc(0, 0, (16 + t * 18) * scale, 0, Math.PI * 2)
  ctx.fill()
  for (let i = 0; i < 7; i += 1) {
    const ang = i / 7 * Math.PI * 2 + facing
    const dist = (10 + t * 22) * scale
    ctx.fillStyle = i % 2 === 0 ? '#fff6d2' : '#e25a2a'
    ctx.fillRect(Math.round(Math.cos(ang) * dist), Math.round(Math.sin(ang) * dist), Math.max(2, scale), Math.max(2, scale))
  }
  ctx.restore()
}

function drawDissolve(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, fade: number, age: number): void {
  for (let i = 0; i < 8; i += 1) {
    const ang = i / 8 * Math.PI * 2 + age
    const dist = (6 + fade * 16) * scale
    ctx.globalAlpha = Math.max(0, 0.7 - fade)
    ctx.fillStyle = i % 2 === 0 ? '#e7e2d4' : '#f2c04a'
    ctx.fillRect(Math.round(x + Math.cos(ang) * dist), Math.round(y + Math.sin(ang) * dist - fade * 8), Math.max(2, scale), Math.max(2, scale))
  }
  ctx.globalAlpha = 1
}

const torchGlowCache = new Map<string, HTMLCanvasElement>()

function torchGlow(color: string): HTMLCanvasElement | null {
  const hit = torchGlowCache.get(color)
  if (hit) return hit
  if (typeof document === 'undefined') return null
  const board = document.createElement('canvas')
  board.width = 48
  board.height = 48
  const pen = board.getContext('2d')
  if (!pen) return null
  const grad = pen.createRadialGradient(24, 24, 2, 24, 24, 23)
  grad.addColorStop(0, color)
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  pen.fillStyle = grad
  pen.fillRect(0, 0, 48, 48)
  torchGlowCache.set(color, board)
  return board
}

function torchColors(depth: number): { bracket: string; cap: string; flame: string; core: string; glow: string } {
  const level = Math.max(1, Math.min(7, Math.floor(depth) || 1))
  const row = [
    { bracket: '#6a442c', cap: '#c4a15a', flame: '#f2c04a', core: '#fff1c2', glow: 'rgba(242,192,74,0.38)' },
    { bracket: '#3d5a32', cap: '#8fbf6a', flame: '#e7c27a', core: '#fff6d0', glow: 'rgba(143,191,106,0.32)' },
    { bracket: '#5a3a68', cap: '#c4f27a', flame: '#d6f27a', core: '#f4ffe0', glow: 'rgba(196,242,122,0.30)' },
    { bracket: '#8a6a32', cap: '#e7c27a', flame: '#f2c04a', core: '#fff1c2', glow: 'rgba(242,192,74,0.34)' },
    { bracket: '#5c6570', cap: '#9aa0a8', flame: '#e25a2a', core: '#f2c04a', glow: 'rgba(226,90,42,0.34)' },
    { bracket: '#4a3a58', cap: '#d5dee6', flame: '#e7e2d4', core: '#fff', glow: 'rgba(213,222,230,0.28)' },
    { bracket: '#6e2420', cap: '#c43a6a', flame: '#e25a2a', core: '#ffb020', glow: 'rgba(226,90,42,0.40)' },
  ]
  return row[level - 1]!
}

function drawTorches(
  ctx: CanvasRenderingContext2D,
  run: Run,
  scale: number,
  at: (x: number, y: number) => { x: number; y: number },
): void {
  const list = (run.chart?.torches ?? []).filter((torch) => torch.room === run.roomId && torch.zone === run.zone)
  if (list.length === 0) return
  const look = torchColors(run.depth || 1)
  const frame = Math.floor(run.age * 9) % 3
  let glows = 0
  const glow = effectBudget === 'full' ? torchGlow(look.glow) : null
  for (const torch of list) {
    const p = at(torch.x, torch.y)
    if (glow && glows < 3) {
      const size = 22 * scale
      ctx.globalAlpha = 0.85
      ctx.drawImage(glow, Math.round(p.x - size / 2), Math.round(p.y - size / 2), size, size)
      ctx.globalAlpha = 1
      glows += 1
    }
    const s = Math.max(1, scale)
    ctx.fillStyle = look.bracket
    ctx.fillRect(Math.round(p.x - 2 * s), Math.round(p.y), Math.round(4 * s), Math.round(7 * s))
    ctx.fillStyle = look.cap
    ctx.fillRect(Math.round(p.x - 3 * s), Math.round(p.y - 1 * s), Math.round(6 * s), Math.round(2 * s))
    const lean = frame === 1 ? s : frame === 2 ? -s : 0
    ctx.fillStyle = look.flame
    ctx.fillRect(Math.round(p.x - s + lean), Math.round(p.y - (5 + (frame === 0 ? 1 : 0)) * s), Math.round(2 * s), Math.round(4 * s))
    ctx.fillStyle = look.core
    ctx.fillRect(Math.round(p.x + lean), Math.round(p.y - 3 * s), s, Math.round(2 * s))
  }
}

function drawStairs(ctx: CanvasRenderingContext2D, at: (x: number, y: number) => { x: number; y: number }, scale: number, run: Run): void {
  if ((run.depth || 1) >= 7) return
  const p = at(STAIRS.x, STAIRS.y)
  const open = stairsOpen(run)
  const r = STAIRS.r * scale
  ctx.fillStyle = open ? '#1a120c' : '#2a2118'
  ctx.beginPath()
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = open ? '#f2c04a' : '#6a4428'
  ctx.lineWidth = 2
  ctx.setLineDash(open ? [] : [4, 3])
  ctx.stroke()
  ctx.setLineDash([])
  if (open) {
    ctx.strokeStyle = '#c4a15a'
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath()
      ctx.moveTo(p.x - r * 0.45, p.y - r * 0.35 + i * r * 0.22)
      ctx.lineTo(p.x + r * 0.45, p.y - r * 0.35 + i * r * 0.22)
      ctx.stroke()
    }
  } else {
    ctx.fillStyle = '#4a3424'
    ctx.fillRect(Math.round(p.x - r * 0.7), Math.round(p.y - 3 * scale), Math.round(r * 1.4), Math.max(3, 4 * scale))
    ctx.fillStyle = '#c4a15a'
    ctx.fillRect(Math.round(p.x - 2 * scale), Math.round(p.y - r * 0.45), Math.max(3, 4 * scale), Math.round(r * 0.7))
  }
  ctx.fillStyle = open ? '#f2c04a' : '#e7d2b0'
  ctx.font = `${Math.max(10, Math.round(7 * scale))}px Courier New, monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  ctx.fillText(open ? t('stairs.down') : t('stairs.hint'), p.x, p.y - r - 4)
}

function foeCap(run: Run, foe: Foe): number {
  if (foe.maxHp) return foe.maxHp
  const mods = depthMods(run.depth || 1)
  if (foe.kind === 'boss') return mods.bossHp
  const spot = FOE_SPOTS.find((item) => item.id === foe.id)
  return Math.max(foe.hp, Math.round((spot?.hp ?? foe.hp) * mods.foeHp))
}

function drawThrustSpark(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, flash: number, facing: number): void {
  const n = flash > 0.1 ? 6 : 4
  ctx.fillStyle = '#f7fbff'
  for (let i = 0; i < n; i += 1) {
    const a = facing + Math.PI + (i - n / 2) * 0.4
    const d = (4 + i * 2) * scale * (1.2 - flash)
    ctx.fillRect(Math.round(x + Math.cos(a) * d), Math.round(y + Math.sin(a) * d), Math.max(2, Math.round(scale)), Math.max(2, Math.round(scale)))
  }
  ctx.fillStyle = '#f2c04a'
  ctx.fillRect(Math.round(x - scale), Math.round(y - scale), Math.max(2, Math.round(scale * 2)), Math.max(2, Math.round(scale * 2)))
}

function drawFoeBar(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, foe: Foe, run: Run): void {
  const max = foeCap(run, foe)
  if (max <= 0 || foe.hp >= max - 0.01) return
  const w = Math.round(Math.max(14, 16 * scale))
  const h = Math.max(3, Math.round(scale * 0.9))
  const lift = (foe.kind === 'spitter' ? 22 : foe.kind === 'boss' ? 20 : foe.kind === 'lurker' ? 12 : 16) * scale
  const left = Math.round(x - w / 2)
  const top = Math.round(y - lift)
  ctx.fillStyle = '#14110e'
  ctx.fillRect(left - 1, top - 1, w + 2, h + 2)
  ctx.fillStyle = '#3a1814'
  ctx.fillRect(left, top, w, h)
  ctx.fillStyle = foe.hp / max < 0.35 ? '#e10600' : '#e07a32'
  ctx.fillRect(left, top, Math.max(1, Math.round(w * Math.max(0, foe.hp) / max)), h)
}

function drawBrute(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, wind: number, dash: number, aim: number): void {
  const s = scale
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(aim)
  ctx.fillStyle = '#14110e'
  ctx.fillRect(-8 * s, -7 * s, 16 * s, 14 * s)
  ctx.fillStyle = dash > 0 ? '#a33b32' : '#6a3a32'
  ctx.fillRect(-7 * s, -6 * s, 14 * s, 12 * s)
  ctx.fillStyle = '#c4a15a'
  ctx.fillRect(4 * s, -5 * s, 4 * s, 3 * s)
  ctx.fillRect(4 * s, 2 * s, 4 * s, 3 * s)
  ctx.fillStyle = wind > 0 ? '#f2c04a' : '#e7edf4'
  ctx.fillRect(6 * s, -2 * s, 3 * s, 4 * s)
  ctx.restore()
}

function drawLurker(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, wind: number, age: number): void {
  const s = scale
  const sunk = wind > 0.35
  const h = (sunk ? 3 : 8) * s
  ctx.fillStyle = '#14110e'
  ctx.beginPath()
  ctx.ellipse(x, y, 8 * s, h + s, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = sunk ? '#2a2438' : '#4a3a68'
  ctx.beginPath()
  ctx.ellipse(x, y, 7 * s, h, 0, 0, Math.PI * 2)
  ctx.fill()
  if (!sunk) {
    ctx.fillStyle = Math.sin(age * 8) > 0 ? '#f2c04a' : '#e7edf4'
    ctx.fillRect(x - 3 * s, y - 2 * s, 2 * s, 2 * s)
    ctx.fillRect(x + s, y - 2 * s, 2 * s, 2 * s)
  }
}

function drawSmoke(
  ctx: CanvasRenderingContext2D,
  at: (x: number, y: number) => { x: number; y: number },
  scale: number,
  puff: Puff,
): void {
  const p = at(puff.x, puff.y)
  const fade = Math.max(0, puff.life / puff.max)
  const across = Math.min(9, puff.girth) * scale
  const along = across * 2.2
  const alpha = fade * 0.5
  const fill = puff.tint === 0 ? `rgba(186, 176, 148, ${alpha})` : puff.tint === 1 ? `rgba(154, 164, 142, ${alpha})` : `rgba(120, 116, 104, ${alpha * 0.85})`
  ctx.save()
  ctx.translate(Math.round(p.x), Math.round(p.y))
  ctx.rotate(puff.facing)
  for (const ox of [0, -0.42, 0.42]) {
    const bw = Math.max(2, along * (ox === 0 ? 0.7 : 0.45))
    const bh = Math.max(2, across * (ox === 0 ? 0.85 : 0.62))
    const bx = Math.round(ox * along - bw / 2)
    const by = Math.round(-bh / 2)
    ctx.fillStyle = `rgba(48, 42, 34, ${alpha * 0.65})`
    ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2)
    ctx.fillStyle = fill
    ctx.fillRect(bx, by, bw, bh)
  }
  ctx.restore()
}

function watchBoss(run: Run, frames: number): void {
  for (const foe of run.foes) {
    if (foe.kind !== 'boss') continue
    const alive = foe.hp > 0 && !run.slain.includes(foe.id)
    if (alive) {
      seenDead.delete(foe.id)
      continue
    }
    if (foe.zone !== run.zone || seenDead.has(foe.id)) continue
    seenDead.add(foe.id)
    const kelabang = foe.id === 'boss-induk' || foe.breed === 'kelabang' || !foe.breed
    deaths.push({
      id: foe.id,
      x: foe.x,
      y: foe.y,
      aim: foe.aim,
      depth: run.depth || 1,
      life: 1.55,
      max: 1.55,
      breed: kelabang ? undefined : String(foe.breed),
      foeKind: foe.kind,
      cut: run.facing,
      links: kelabang ? syncCentipede(foe).map((link) => ({ ...link })) : [{ x: foe.x, y: foe.y }],
    })
  }
  for (const death of deaths) death.life -= 0.016 * frames
  for (let i = deaths.length - 1; i >= 0; i -= 1) if (deaths[i]!.life <= 0) deaths.splice(i, 1)
}

function drawCentipede(
  ctx: CanvasRenderingContext2D,
  links: { x: number; y: number }[],
  scale: number,
  wind: number,
  flash: number,
  age: number,
  aim: number,
  pattern: number,
  depth: number,
  collapse = 0,
): void {
  const s = scale
  const shell = flash > 0 ? '#f7fbff' : depth >= 3 ? '#a81822' : '#8e1822'
  const dark = flash > 0 ? '#d5dce6' : '#3d0a12'
  const hot = flash > 0 ? '#ffffff' : depth >= 3 ? '#ff4d4d' : '#e10600'
  const rear = centipedeRear(wind, pattern)
  const bite = pattern === 0 && wind > 0 ? 1 - Math.min(1, wind / 0.9) : 0
  const spit = pattern === 1 && wind > 0
  for (let i = links.length - 1; i >= 0; i -= 1) {
    const link = links[i]!
    const front = links[i - 1]
    const ang = front ? Math.atan2(front.y - link.y, front.x - link.x) : aim
    const wave = i === 0 ? 0 : Math.sin(age * 5 - i * 0.7) * 5 * s * (1 - collapse)
    const side = ang + Math.PI / 2
    const lift = i === 0 ? rear * s : rear * s * Math.max(0, 1 - i * 0.4)
    const x = link.x + Math.cos(side) * wave
    const y = link.y + Math.sin(side) * wave - lift
    const head = i === 0
    const tail = i === links.length - 1
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(ang)
    const leg = Math.sin(age * 12 - i * 0.8) * 3 * s
    if (!head) {
      for (const dir of [-1, 1]) {
        ctx.fillStyle = dark
        ctx.fillRect(-2 * s, dir * 6 * s, 3 * s, dir * (12 * s + leg))
        ctx.fillRect(-4 * s, dir * (16 * s + leg), 6 * s, 2 * s)
      }
    }
    const w = (head ? 34 : tail ? 18 : 26) * s
    const h = (head ? 26 : tail ? 14 : 18) * s
    ctx.fillStyle = dark
    ctx.fillRect(-w / 2 - s, -h / 2 - s, w + 2 * s, h + 2 * s)
    ctx.fillStyle = shell
    ctx.fillRect(-w / 2, -h / 2, w, h)
    ctx.fillStyle = hot
    ctx.fillRect(-w / 4, -h / 2, w / 2, Math.max(2, s * 1.6))
    if (head) {
      const fang = (0.5 + bite * 0.8) * (spit ? 0.3 : 1)
      ctx.fillStyle = dark
      ctx.fillRect(8 * s, -10 * s, 16 * s, 3 * s)
      ctx.fillRect(8 * s, 7 * s, 16 * s, 3 * s)
      ctx.save()
      ctx.translate(12 * s, -6 * s)
      ctx.rotate(-0.5 - fang)
      ctx.fillStyle = hot
      ctx.fillRect(0, -2 * s, 16 * s, 4 * s)
      ctx.restore()
      ctx.save()
      ctx.translate(12 * s, 6 * s)
      ctx.rotate(0.5 + fang)
      ctx.fillStyle = hot
      ctx.fillRect(0, -2 * s, 16 * s, 4 * s)
      ctx.restore()
      const flick = Math.sin(age * 7) * 0.25
      ctx.strokeStyle = dark
      ctx.lineWidth = Math.max(1, s)
      ctx.beginPath()
      ctx.moveTo(8 * s, -6 * s)
      ctx.lineTo(22 * s, -16 * s + flick * 10 * s)
      ctx.moveTo(8 * s, 6 * s)
      ctx.lineTo(22 * s, 16 * s - flick * 10 * s)
      ctx.stroke()
      ctx.fillStyle = '#14080a'
      ctx.fillRect(2 * s, -7 * s, 4 * s, 3 * s)
      ctx.fillRect(2 * s, 4 * s, 4 * s, 3 * s)
      if (spit) {
        ctx.fillStyle = '#b6e36a'
        ctx.fillRect(20 * s, -2 * s, 4 * s, 4 * s)
      }
    }
    if (tail) {
      ctx.fillStyle = dark
      ctx.fillRect(-w / 2 - 12 * s, -5 * s, 12 * s, 2 * s)
      ctx.fillRect(-w / 2 - 12 * s, 3 * s, 12 * s, 2 * s)
    }
    ctx.restore()
  }
}

function drawTelegraph(
  ctx: CanvasRenderingContext2D,
  kind: string,
  x: number,
  y: number,
  aim: number,
  scale: number,
  wind: number,
  pattern = 0,
): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(aim)
  const grow = kind === 'crab' ? 1 - wind / 0.55 : kind === 'spitter' ? 1 - wind / 0.75 : 1 - Math.min(1, wind)
  if (kind === 'crab' || kind === 'brute') {
    ctx.fillStyle = kind === 'brute' ? `rgba(242, 120, 70, ${0.2 + grow * 0.35})` : `rgba(255,255,255,${0.18 + grow * 0.28})`
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.arc(0, 0, (kind === 'brute' ? 70 : 42) * scale, -0.45, 0.45)
    ctx.closePath()
    ctx.fill()
  } else if (kind === 'lurker' || (kind === 'boss' && pattern === 0)) {
    ctx.restore()
    ctx.strokeStyle = kind === 'boss' ? 'rgba(242, 192, 74, 0.9)' : 'rgba(154, 120, 210, 0.9)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(x, y, (kind === 'boss' ? 56 : 38) * scale * Math.max(0.35, grow), 0, Math.PI * 2)
    ctx.stroke()
    return
  } else {
    ctx.strokeStyle = 'rgba(255,236,170,0.9)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo((kind === 'boss' ? 110 : 90) * scale * Math.max(0.3, grow), 0)
    ctx.stroke()
  }
  ctx.restore()
}

type Creature = { kind: string; breed?: string; flash: number; aim: number; wind: number; dash: number; phase?: number }

function drawArmorSparks(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, aim: number, life: number): void {
  ctx.fillStyle = '#c5ced8'
  for (let i = 0; i < 6; i += 1) {
    const a = aim + Math.PI + (i - 2.5) * 0.45
    const d = (8 + i * 3) * scale * (1.1 - life)
    ctx.fillRect(Math.round(x + Math.cos(a) * d), Math.round(y + Math.sin(a) * d), Math.max(2, Math.round(scale)), Math.max(2, Math.round(scale)))
  }
}

function blot(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color
  ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)))
}

function drawHazard(
  ctx: CanvasRenderingContext2D,
  p: { x: number; y: number },
  scale: number,
  kind: string,
  fuse: number,
  age: number,
  lane: number,
): void {
  const s = Math.max(1, scale)
  if (kind === 'root') {
    blot(ctx, p.x - 10 * s, p.y - 4 * s, 20 * s, 8 * s, '#3d5a32')
    blot(ctx, p.x - 14 * s, p.y - 2 * s, 6 * s, 3 * s, '#6a4a28')
    blot(ctx, p.x + 8 * s, p.y - 1 * s, 7 * s, 3 * s, '#6a4a28')
    blot(ctx, p.x - 3 * s, p.y - 6 * s, 5 * s, 3 * s, '#8fbf6a')
    return
  }
  if (kind === 'cloud') {
    const drift = Math.sin(age * 3) * 2 * s
    blot(ctx, p.x - 8 * s + drift, p.y - 6 * s, 7 * s, 7 * s, '#c4f27a')
    blot(ctx, p.x + 2 * s, p.y - 3 * s, 6 * s, 6 * s, '#7dcec4')
    blot(ctx, p.x - 2 * s, p.y + 1 * s, 5 * s, 5 * s, '#e7c27a')
    return
  }
  if (kind === 'pod') {
    const hot = fuse < 0.45
    blot(ctx, p.x - 8 * s, p.y - 6 * s, 16 * s, 12 * s, '#8a6a32')
    blot(ctx, p.x - 4 * s, p.y - 3 * s, 8 * s, 6 * s, hot ? '#e10600' : '#e7c27a')
    if (hot) blot(ctx, p.x - 12 * s, p.y - 10 * s, 24 * s, 2 * s, '#f2c04a')
    return
  }
  if (kind === 'cart') {
    blot(ctx, p.x - 16 * s, p.y + 4 * s, 32 * s, 2 * s, '#9aa0a8')
    blot(ctx, p.x - 8 * s, p.y - 6 * s, 16 * s, 10 * s, '#6b4424')
    blot(ctx, p.x + (lane < 0 ? -10 : 6) * s, p.y - 4 * s, 4 * s, 4 * s, '#e25a2a')
    blot(ctx, p.x - 6 * s, p.y + 4 * s, 4 * s, 4 * s, '#2a241c')
    blot(ctx, p.x + 3 * s, p.y + 4 * s, 4 * s, 4 * s, '#2a241c')
    return
  }
  if (kind === 'cocoon') {
    blot(ctx, p.x - 7 * s, p.y - 10 * s, 14 * s, 18 * s, '#d5dee6')
    blot(ctx, p.x - 2 * s, p.y - 6 * s, 4 * s, 10 * s, '#4a3a58')
    blot(ctx, p.x - 10 * s, p.y - 2 * s, 4 * s, 2 * s, '#b7a8c8')
    blot(ctx, p.x + 6 * s, p.y + 2 * s, 4 * s, 2 * s, '#b7a8c8')
    return
  }
  const live = fuse > 0 && fuse < 0.5
  blot(ctx, p.x - 8 * s, p.y - 3 * s, 16 * s, 6 * s, '#1a080c')
  blot(ctx, p.x - 5 * s, p.y - (live ? 8 : 4) * s, 4 * s, live ? 8 * s : 4 * s, live ? '#ffb020' : '#6e2420')
  blot(ctx, p.x + 2 * s, p.y - (live ? 10 : 3) * s, 3 * s, live ? 10 * s : 3 * s, live ? '#e10600' : '#6e2420')
}

const STING_COLOR: Record<string, string> = {
  liang: '#8fbf6a',
  spora: '#c4f27a',
  kumbang: '#e7c27a',
  mondok: '#f2c04a',
  laba: '#d5dee6',
  mulut: '#ff4d4d',
}

function drawBossSting(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, breed: string, gone: number): void {
  const color = STING_COLOR[breed] ?? '#f2c04a'
  const s = Math.max(1, scale)
  const reach = (8 + gone * 46) * s
  for (let i = 0; i < 8; i += 1) {
    const ang = (i / 8) * Math.PI * 2
    blot(ctx, x + Math.cos(ang) * reach, y + Math.sin(ang) * reach, 3 * s, 3 * s, color)
  }
  blot(ctx, x - 2 * s, y - 2 * s, 4 * s, 4 * s, '#f7fbff')
}

function drawMound(ctx: CanvasRenderingContext2D, p: { x: number; y: number }, scale: number, wind: number): void {
  blot(ctx, p.x - 8 * scale, p.y - 3 * scale, 16 * scale, 6 * scale, '#3a2c20')
  blot(ctx, p.x - 4 * scale, p.y - 6 * scale, 8 * scale, 4 * scale, wind > 0 ? '#f2c04a' : '#6a442c')
}

function drawSlowZones(
  ctx: CanvasRenderingContext2D,
  run: Run,
  scale: number,
  at: (x: number, y: number) => { x: number; y: number },
): void {
  for (const zone of slowZones(run)) drawSlowPatch(ctx, at(zone.x, zone.y), scale, zone)
}

function drawSlowPatch(ctx: CanvasRenderingContext2D, p: { x: number; y: number }, scale: number, zone: SlowZone): void {
  const moss = zone.kind === 'root' || zone.kind === 'trail'
  const wax = zone.kind === 'wax'
  const fill = moss ? '#1c3a14' : wax ? '#3a2058' : '#d5dee6'
  const rim = moss ? '#d6ff6a' : wax ? '#e7c27a' : '#f7fbff'
  const vein = moss ? '#6a3a18' : wax ? '#b388ff' : '#4a3a58'
  const s = Math.max(1, scale)
  for (const dot of slowPixels(zone)) {
    const edge = Math.hypot(dot.x, dot.y) > zone.r - 3
    blot(ctx, p.x + dot.x * scale, p.y + dot.y * scale, s, s, edge ? rim : (dot.x + dot.y) % 4 === 0 ? vein : fill)
  }
}

function drawSlowMark(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number): void {
  const s = Math.max(1, scale)
  ctx.fillStyle = 'rgba(120, 170, 48, 0.42)'
  ctx.fillRect(Math.round(x - 7 * s), Math.round(y - 12 * s), Math.round(14 * s), Math.round(10 * s))
  blot(ctx, x - 4 * s, y - 20 * s, 2 * s, 5 * s, '#6a3a18')
  blot(ctx, x - 2 * s, y - 22 * s, 6 * s, 2 * s, '#d6ff6a')
  blot(ctx, x + 2 * s, y - 20 * s, 2 * s, 4 * s, '#6a3a18')
}

function drawSpecialTelegraph(ctx: CanvasRenderingContext2D, foe: Foe, x: number, y: number, scale: number): void {
  if (foe.kind !== 'burrow' && foe.kind !== 'swarm' && foe.kind !== 'jelly') {
    for (const mark of foe.marks ?? []) {
      const life = Math.max(0.2, mark.life)
      ctx.strokeStyle = foe.kind === 'bomber' ? `rgba(242, 120, 70, ${life})` : `rgba(224, 90, 40, ${life * 0.7})`
      ctx.strokeRect(Math.round(x + (mark.x - foe.x) * scale - 4 * scale), Math.round(y + (mark.y - foe.y) * scale - 4 * scale), Math.round(8 * scale), Math.round(8 * scale))
    }
  }
  if (foe.wind <= 0 && !(foe.lurk && foe.hidden)) return
  const pattern: AttackKind = foe.kind === 'boss' ? bossPattern(String(foe.breed), foe.pattern ?? 0, foe.phase ?? 0).kind : foe.kind === 'spore' || foe.kind === 'web' ? 'bolt' : foe.kind === 'beetle' || foe.kind === 'ember' || foe.kind === 'mole' ? 'charge' : foe.kind === 'burrow' || foe.kind === 'wisp' ? 'burrow' : 'slam'
  const at = foe.lurk && (pattern === 'burrow') ? { x: x + (foe.lurk.x - foe.x) * scale, y: y + (foe.lurk.y - foe.y) * scale } : { x, y }
  ctx.save()
  ctx.translate(at.x, at.y)
  ctx.rotate(foe.aim)
  const grow = 1 - Math.min(1, foe.wind / 0.9)
  if (pattern === 'bolt' || pattern === 'snare') {
    ctx.lineWidth = Math.max(2, 3 * scale)
    ctx.strokeStyle = pattern === 'snare' ? 'rgba(179, 136, 255, 0.9)' : 'rgba(255, 236, 170, 0.9)'
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(96 * scale * Math.max(0.25, grow), 0)
    ctx.stroke()
  } else if (pattern === 'charge') {
    ctx.fillStyle = `rgba(242, 120, 70, ${0.25 + grow * 0.35})`
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.arc(0, 0, 78 * scale, -0.35, 0.35)
    ctx.fill()
  } else {
    ctx.strokeStyle = pattern === 'burrow' ? 'rgba(242, 192, 74, 0.95)' : 'rgba(224, 122, 50, 0.9)'
    ctx.beginPath()
    ctx.arc(0, 0, (pattern === 'ring' || foe.kind === 'boss' ? 52 : 28) * scale * Math.max(0.35, grow), 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.restore()
}

function drawCreature(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, foe: Creature, age: number): void {
  const breed = String(foe.breed || foe.kind)
  const art = foeCanvas(hasFoeSprite(breed) ? breed : 'burrow', Math.floor(age * 6))
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(foe.aim || 0)
  if (art) {
    const s = Math.max(1, scale)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(art, Math.round(-(art.width * s) / 2), Math.round(-(art.height * s) / 2), Math.round(art.width * s), Math.round(art.height * s))
  }
  if (foe.flash > 0) {
    ctx.globalAlpha = 0.45
    ctx.fillStyle = '#f7fbff'
    ctx.fillRect(-8 * scale, -8 * scale, 16 * scale, 16 * scale)
  }
  ctx.restore()
}

export function drawFoeRoster(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = '#120e0c'
  ctx.fillRect(0, 0, width, height)
  const breeds = ['crab', 'spitter', 'brute', 'lurker', 'moth', 'swarm', 'burrow', 'spore', 'beetle', 'jelly', 'mole', 'web', 'ember', 'leech', 'bomber', 'wisp', 'crusher', 'kelabang', 'liang', 'spora', 'kumbang', 'mondok', 'laba', 'mulut']
  const cols = 6
  ctx.font = '12px Courier New, monospace'
  ctx.textAlign = 'center'
  breeds.forEach((breed, index) => {
    const col = index % cols
    const row = Math.floor(index / cols)
    const x = (col + 0.5) * (width / cols)
    const y = 70 + row * 150
    const boss = ['kelabang', 'liang', 'spora', 'kumbang', 'mondok', 'laba', 'mulut'].includes(breed)
    if (breed === 'kelabang') drawCentipede(ctx, Array.from({ length: 6 }, (_, i) => ({ x: x - 40 + i * 14, y })), 2, 0, 0, 1, 0, 0, 1, 0)
    else if (breed === 'crab') drawMaw(ctx, x, y, 3, 1, 0, 0, 0)
    else if (breed === 'spitter') drawWing(ctx, x, y, 3, 1, 0, 0)
    else if (breed === 'brute') drawBrute(ctx, x, y, 3, 0, 0, 0)
    else if (breed === 'lurker') drawLurker(ctx, x, y, 3, 0, 1)
    else drawCreature(ctx, x, y, boss ? 3.2 : 2.6, { kind: boss ? 'boss' : breed, breed, flash: 0, aim: 0, wind: 0, dash: 0 }, 0)
    ctx.fillStyle = '#f6ecd8'
    ctx.fillText(breed, x, y + 64)
  })
}

export function drawGallery(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = '#120e0c'
  ctx.fillRect(0, 0, width, height)
  const rows = lineup()
  const cols = 7
  ctx.font = '12px Courier New, monospace'
  ctx.textAlign = 'center'
  rows.forEach((foe, index) => {
    const col = index % cols
    const row = Math.floor(index / cols)
    const x = (col + 0.5) * (width / cols)
    const y = 78 + row * 150
    drawCreature(ctx, x, y, 4, { kind: foe.kind, breed: foe.breed, flash: 0, aim: 0, wind: 0, dash: 0, phase: 0 }, index)
    ctx.fillStyle = '#f6ecd8'
    ctx.fillText(foeName(foe.breed, foe.name), x, y + 58)
    ctx.fillStyle = '#f2c04a'
    ctx.fillText(t('foe.stat', { hp: foe.hp, dmg: foe.damage }), x, y + 74)
  })
}
