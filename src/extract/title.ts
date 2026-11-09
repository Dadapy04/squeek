import { t } from './i18n.ts'
import { glyphRows } from './pixel-font.ts'
import { drawHero, type HeroPose } from './pose.ts'
import { SHIELD_MAX } from './sim.ts'

/** Fade, lanterns, and title drop. A tap can leave before this finishes. */
export const TITLE_INTRO = 1.35

export function titlePrompt(finePointer: boolean): string {
  return finePointer ? t('title.click') : t('title.tap')
}

export function titleUsesDesktopPrompt(input: { fine: boolean; coarse: boolean; hover: boolean; width: number }): boolean {
  if (input.coarse) return false
  return input.fine || input.hover || input.width >= 1100
}

type Pen = CanvasRenderingContext2D

let buffer: HTMLCanvasElement | null = null

const SCENE_W = 168
const SCENE_H = 108

export interface TitleLayout {
  margin: number
  nameScale: number
  subScale: number
  promptScale: number
  sceneScale: number
  hudTop: number
  hudBottom: number
  namePx: number
  subPx: number
  promptPx: number
  scenePxW: number
  scenePxH: number
}

/** Integer scales that keep the title, the prompt, the hamster, and the mine inside the viewport. */
export function titleLayout(viewW: number, viewH: number, prompt: string): TitleLayout {
  const margin = 12
  const availW = Math.max(40, viewW - margin * 2)
  const portrait = viewH > viewW
  const nameUnit = textWidth('SQUEEK', 1)
  const subUnit = textWidth('EXTRACTION SURVIVAL', 1)
  const promptUnit = Math.max(1, textWidth(prompt, 1))
  const subScale = clamp(Math.floor(availW / subUnit), 1, portrait ? 2 : 3)
  const promptScale = clamp(Math.floor(availW / promptUnit), 1, portrait ? 2 : 3)
  const nameScale = clamp(Math.floor(availW / nameUnit), 1, portrait ? 4 : 6)
  const hudTop = margin + nameScale * 7 + 6 + subScale * 7 + 10
  const hudBottom = margin + promptScale * 7 + 10
  const roomH = Math.max(SCENE_H, viewH - hudTop - hudBottom)
  const sceneScale = Math.max(1, Math.floor(Math.min(availW / SCENE_W, roomH / SCENE_H)))
  return {
    margin,
    nameScale,
    subScale,
    promptScale,
    sceneScale,
    hudTop,
    hudBottom,
    namePx: nameUnit * nameScale,
    subPx: subUnit * subScale,
    promptPx: promptUnit * promptScale,
    scenePxW: SCENE_W * sceneScale,
    scenePxH: SCENE_H * sceneScale,
  }
}

export function paintTitleScreen(ctx: Pen, viewW: number, viewH: number, time: number, finePointer: boolean): void {
  if (viewW < 2 || viewH < 2) return
  const prompt = titlePrompt(finePointer)
  const layout = titleLayout(viewW, viewH, prompt)
  const light = clamp((time - 0.15) / 0.5, 0, 1)
  const titleT = clamp((time - 0.6) / 0.45, 0, 1)
  const drop = Math.round((1 - ease(titleT)) * -16)
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = '#100e0c'
  ctx.fillRect(0, 0, viewW, viewH)
  rockField(ctx, viewW, viewH)
  if (!buffer) buffer = document.createElement('canvas')
  if (buffer.width !== SCENE_W || buffer.height !== SCENE_H) {
    buffer.width = SCENE_W
    buffer.height = SCENE_H
  }
  const pen = buffer.getContext('2d')
  if (!pen) return
  pen.imageSmoothingEnabled = false
  drawWorld(pen, SCENE_W, SCENE_H, time, light)
  const sx = Math.floor((viewW - layout.scenePxW) / 2)
  const sy = Math.floor(layout.hudTop + Math.max(0, viewH - layout.hudTop - layout.hudBottom - layout.scenePxH) / 2)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(buffer, sx, sy, layout.scenePxW, layout.scenePxH)
  if (titleT > 0) {
    const nameX = Math.floor((viewW - layout.namePx) / 2)
    const nameY = layout.margin + drop
    const glint = titleT > 0.85 ? ((time * 48) % (layout.namePx + 24)) - 12 : null
    drawWord(ctx, 'SQUEEK', nameX, nameY, layout.nameScale, '#f2c04a', glint)
    const subX = Math.floor((viewW - layout.subPx) / 2)
    drawWord(ctx, 'EXTRACTION SURVIVAL', subX, nameY + layout.nameScale * 7 + 6, layout.subScale, '#d5dce6', null)
  }
  if (time > 1.05 && Math.floor(time * 2) % 2 === 0) {
    const promptX = Math.floor((viewW - layout.promptPx) / 2)
    const promptY = viewH - layout.margin - layout.promptScale * 7
    drawWord(ctx, prompt, promptX, promptY, layout.promptScale, '#f6ecd8', null)
  }
  if (time < 0.4) {
    ctx.fillStyle = `rgba(0,0,0,${(1 - time / 0.4).toFixed(3)})`
    ctx.fillRect(0, 0, viewW, viewH)
  }
}

function rockField(ctx: Pen, w: number, h: number): void {
  for (let y = 0; y < h; y += 4) {
    for (let x = 0; x < w; x += 4) {
      const n = hash(x * 13 + y * 3)
      ctx.fillStyle = n > 0.82 ? '#3a2c22' : n > 0.55 ? '#241910' : '#1a140f'
      ctx.fillRect(x, y, 4, 4)
    }
  }
}

function drawWorld(ctx: Pen, w: number, h: number, time: number, light: number): void {
  ctx.fillStyle = '#100e0c'
  ctx.fillRect(0, 0, w, h)
  const mouthX = Math.round(w * 0.58)
  const mouthTop = 28
  carveTunnel(ctx, w, h, mouthX, mouthTop)
  rockShell(ctx, w, h, mouthX, mouthTop)
  beams(ctx, w, h, mouthX, mouthTop, light)
  rails(ctx, w, h, mouthX, mouthTop + 8)
  lantern(ctx, Math.max(4, mouthX - 78), mouthTop + 2, time, light)
  lantern(ctx, Math.min(w - 16, mouthX + 62), mouthTop, time + 1.7, light)
  eyes(ctx, mouthX, mouthTop + 8, time, light)
  if (light > 0.35) embers(ctx, w, h, time)
  const heroScale = 2
  const footX = 40
  const footY = h - 8
  const pose: HeroPose = {
    facing: Math.PI / 2,
    gait: 0,
    stepping: false,
    swing: 0,
    sword: true,
    shield: SHIELD_MAX,
    blocking: false,
    dodge: 0,
    hurt: 0,
    cape: Math.PI / 2 + Math.PI + Math.sin(time * 5.2) * 0.85,
    age: time,
  }
  drawHero(ctx, footX, footY, heroScale, pose)
}

function carveTunnel(ctx: Pen, w: number, h: number, mouthX: number, mouthTop: number): void {
  for (let y = mouthTop; y < h - 10; y += 1) {
    const k = (y - mouthTop) / Math.max(1, h - 10 - mouthTop)
    const half = 10 + k * (w < 260 ? 48 : 70)
    const shade = k < 0.45 ? '#050403' : '#0c0a09'
    ctx.fillStyle = shade
    ctx.fillRect(Math.round(mouthX - half), y, Math.round(half * 2), 1)
  }
}

function rockShell(ctx: Pen, w: number, h: number, mouthX: number, mouthTop: number): void {
  for (let y = 0; y < h; y += 4) {
    for (let x = 0; x < w; x += 4) {
      const k = (y - mouthTop) / Math.max(1, h - mouthTop)
      const half = 8 + Math.max(0, k) * (w < 260 ? 50 : 74)
      const inside = y > mouthTop && Math.abs(x + 2 - mouthX) < half - 2 && y < h - 12
      if (inside) continue
      const n = hash(x * 13 + y * 3)
      ctx.fillStyle = n > 0.82 ? '#3a2c22' : n > 0.55 ? '#241910' : '#1a140f'
      ctx.fillRect(x, y, 4, 4)
      if (n > 0.9) {
        ctx.fillStyle = '#4a3828'
        ctx.fillRect(x + 1, y + 1, 1, 1)
      }
    }
  }
}

function beams(ctx: Pen, w: number, h: number, mouthX: number, mouthTop: number, light: number): void {
  const left = Math.max(8, mouthX - (w < 260 ? 58 : 86))
  const right = Math.min(w - 16, mouthX + (w < 260 ? 58 : 86))
  post(ctx, left, mouthTop - 6, h)
  post(ctx, right, mouthTop - 6, h)
  ctx.fillStyle = '#2a1c12'
  ctx.fillRect(left, mouthTop - 8, right - left + 8, 8)
  ctx.fillStyle = light > 0.2 ? '#6b4424' : '#3a2818'
  ctx.fillRect(left + 1, mouthTop - 7, right - left + 6, 5)
  ctx.fillStyle = '#8a5a32'
  ctx.fillRect(left + 2, mouthTop - 6, right - left + 4, 1)
}

function post(ctx: Pen, x: number, y: number, h: number): void {
  ctx.fillStyle = '#14110e'
  ctx.fillRect(x - 1, y, 10, h - y)
  ctx.fillStyle = '#4a3018'
  ctx.fillRect(x, y, 8, h - y)
  ctx.fillStyle = '#6b4424'
  ctx.fillRect(x + 1, y, 2, h - y)
  for (let i = y + 10; i < h; i += 14) {
    ctx.fillStyle = '#2a1c12'
    ctx.fillRect(x, i, 8, 1)
  }
}

function rails(ctx: Pen, w: number, h: number, mouthX: number, y0: number): void {
  const y1 = y0 + 8
  const y2 = h - 22
  const near = w < 260 ? 34 : 52
  pixelLine(ctx, mouthX, y1, mouthX - near, y2, '#8d97a3')
  pixelLine(ctx, mouthX, y1, mouthX + near, y2, '#8d97a3')
  pixelLine(ctx, mouthX - 1, y1, mouthX - near - 1, y2, '#5c6570')
  pixelLine(ctx, mouthX + 1, y1, mouthX + near + 1, y2, '#5c6570')
  for (let i = 1; i <= 7; i += 1) {
    const t = (i / 7) ** 1.4
    const y = Math.round(y1 + (y2 - y1) * t)
    const half = Math.round(2 + (near - 2) * t)
    ctx.fillStyle = '#4a3828'
    ctx.fillRect(mouthX - half, y, half * 2, 2)
  }
}

function pixelLine(ctx: Pen, x0: number, y0: number, x1: number, y1: number, color: string): void {
  const steps = Math.max(1, Math.abs(x1 - x0), Math.abs(y1 - y0))
  ctx.fillStyle = color
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps
    ctx.fillRect(Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), 1, 1)
  }
}

function lantern(ctx: Pen, x: number, y: number, time: number, light: number): void {
  ctx.fillStyle = '#2a1c12'
  ctx.fillRect(x + 5, y - 8, 2, 8)
  ctx.fillStyle = '#14110e'
  ctx.fillRect(x, y, 12, 16)
  ctx.fillStyle = '#3a2c22'
  ctx.fillRect(x + 1, y + 1, 10, 14)
  const flick = 0.7 + Math.sin(time * 11) * 0.18 + Math.sin(time * 23) * 0.12
  const hot = light * clamp(flick, 0.25, 1)
  ctx.fillStyle = hot > 0.55 ? '#fff1c4' : '#6b4424'
  ctx.fillRect(x + 4, y + 3, 4, hot > 0.75 ? 7 : 5)
  ctx.fillStyle = hot > 0.35 ? '#f2c04a' : '#3a2818'
  ctx.fillRect(x + 5, y + 4, 2, 4)
  if (hot > 0.4) {
    ctx.fillStyle = '#c47a28'
    ctx.fillRect(x - 2, y + 6, 2, 2)
    ctx.fillRect(x + 12, y + 5, 2, 2)
    ctx.fillRect(x + 5, y + 16, 2, 2)
    ctx.fillRect(x + 2, y - 2, 1, 1)
    ctx.fillRect(x + 9, y + 18, 1, 1)
  }
}

function eyes(ctx: Pen, mouthX: number, y: number, time: number, light: number): void {
  const pairs = [
    { x: mouthX - 16, y: y + 4, phase: 0.2 },
    { x: mouthX + 12, y: y + 18, phase: 1.5 },
    { x: mouthX - 4, y: y + 30, phase: 2.4 },
  ]
  for (const pair of pairs) {
    const cycle = (time + pair.phase) % 3.4
    if (cycle < 0.18) continue
    ctx.fillStyle = '#14110e'
    ctx.fillRect(pair.x - 1, pair.y - 1, 5, 4)
    ctx.fillRect(pair.x + 6, pair.y - 1, 5, 4)
    ctx.fillStyle = light > 0.4 ? '#f0c044' : '#6b5420'
    ctx.fillRect(pair.x, pair.y, 3, 2)
    ctx.fillRect(pair.x + 7, pair.y, 3, 2)
    ctx.fillStyle = '#fff6d0'
    ctx.fillRect(pair.x, pair.y, 1, 1)
    ctx.fillRect(pair.x + 7, pair.y, 1, 1)
  }
}

function embers(ctx: Pen, w: number, h: number, time: number): void {
  for (let i = 0; i < 18; i += 1) {
    const speed = 7 + (i % 4) * 3
    const y = h - ((time * speed + i * 23) % (h + 8))
    const x = (i * 41 + Math.sin(time * 0.7 + i) * 5 + w) % w
    ctx.fillStyle = i % 3 === 0 ? '#f2c04a' : '#8a5a32'
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1)
  }
}

function textWidth(text: string, scale: number): number {
  return (text.length * 6 - 1) * scale
}

function drawWord(ctx: Pen, text: string, x: number, y: number, scale: number, color: string, glint: number | null): void {
  stamp(ctx, text, x, y, scale, '#14110e', true)
  stamp(ctx, text, x, y, scale, color, false, glint)
}

function stamp(ctx: Pen, text: string, x: number, y: number, scale: number, color: string, outline: boolean, glint: number | null = null): void {
  let cursor = 0
  for (const ch of text) {
    const rows = glyphRows(ch)
    rows.forEach((row, gy) => {
      for (let gx = 0; gx < row.length; gx += 1) {
        if (row[gx] !== '1') continue
        const px = x + (cursor + gx) * scale
        const py = y + gy * scale
        if (outline) {
          ctx.fillStyle = color
          ctx.fillRect(px - 1, py - 1, scale + 2, scale + 2)
        } else {
          const along = (cursor + gx) * scale
          const spark = glint != null && Math.abs(along - glint) <= scale
          ctx.fillStyle = spark ? '#fff8e6' : color
          ctx.fillRect(px, py, scale, scale)
        }
      }
    })
    cursor += 6
  }
}

function hash(n: number): number {
  const x = Math.sin(n * 127.1) * 43758.5453
  return x - Math.floor(x)
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

function ease(t: number): number {
  return 1 - (1 - t) * (1 - t)
}
