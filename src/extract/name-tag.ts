import { knightBust } from './patterns.ts'

/** Shown above the hamster. Null for a guest. */
let tag: string | null = null

export function setNameTag(text: string | null): void {
  tag = text
}

export function nameTag(): string | null {
  return tag
}

export function shortAddress(address: string): string {
  const clean = address.trim()
  if (clean.length < 12) return clean
  return `${clean.slice(0, 6)}…${clean.slice(-4)}`
}

/** A blank profile keeps the short address until the player types a name. */
export function needsNickname(name: string | null | undefined): boolean {
  return !(name && name.trim())
}

/** Nickname when one is saved, otherwise the short address. */
export function nameTagLabel(name: string | null | undefined, address: string): string {
  const nick = name?.trim() ?? ''
  if (nick) return nick.slice(0, 16)
  return shortAddress(address)
}

export interface TagBox {
  x: number
  y: number
  w: number
  h: number
}

export interface TagFoe {
  x: number
  y: number
  r: number
}

/**
 * The tag sits just above the hamster's head. If that spot covers a foe,
 * it steps up or aside, and it never drops onto the hamster.
 */
export function placeNameTag(
  anchor: { headTop: number; centerX: number },
  size: { w: number; h: number },
  foes: TagFoe[],
  bounds?: { w: number; h: number },
): TagBox {
  const ceiling = anchor.headTop - size.h - 6
  let x = anchor.centerX - size.w / 2
  let y = ceiling
  for (let step = 0; step < 8; step += 1) {
    const hit = foes.find((foe) => overlaps(x, y, size.w, size.h, foe))
    if (!hit) break
    const above = hit.y - hit.r - size.h - 4
    if (above < y - 1) y = above
    else x = hit.x >= anchor.centerX ? hit.x - hit.r - size.w - 4 : hit.x + hit.r + 4
  }
  y = Math.min(y, ceiling)
  if (bounds) {
    x = Math.max(2, Math.min(x, Math.max(2, bounds.w - size.w - 2)))
    if (ceiling >= 2) y = Math.max(2, y)
  }
  return { x: Math.round(x), y: Math.round(y), w: size.w, h: size.h }
}

function overlaps(x: number, y: number, w: number, h: number, foe: TagFoe): boolean {
  const left = Math.max(x, foe.x - foe.r)
  const right = Math.min(x + w, foe.x + foe.r)
  const top = Math.max(y, foe.y - foe.r)
  const bottom = Math.min(y + h, foe.y + foe.r)
  return right > left && bottom > top
}

const TAG_FONT = '14px "Courier New", ui-monospace, monospace'

export function measureTag(ctx: CanvasRenderingContext2D, text: string): { w: number; h: number } {
  ctx.save()
  ctx.font = TAG_FONT
  const w = Math.ceil(ctx.measureText(text).width) + 8
  ctx.restore()
  return { w: Math.max(16, w), h: 16 }
}

/** Pixel-weight letters with a hard outline. No smooth glow. */
export function drawNameTag(ctx: CanvasRenderingContext2D, box: TagBox, text: string): void {
  ctx.save()
  ctx.imageSmoothingEnabled = false
  ctx.font = TAG_FONT
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const cx = Math.round(box.x + box.w / 2)
  const cy = Math.round(box.y + box.h / 2)
  ctx.lineWidth = 3
  ctx.strokeStyle = '#14110e'
  ctx.strokeText(text, cx, cy)
  ctx.fillStyle = '#2a2118'
  ctx.fillText(text, cx + 1, cy + 1)
  ctx.fillStyle = '#f6ecd8'
  ctx.fillText(text, cx, cy)
  ctx.restore()
}

/** Small hamster on the base, with the same tag above its head. Hidden for guests. */
export function paintBasePortrait(label: string | null): void {
  if (typeof document === 'undefined') return
  const canvas = document.getElementById('basePortrait') as HTMLCanvasElement | null
  if (!canvas) return
  if (!label) {
    canvas.hidden = true
    return
  }
  canvas.hidden = false
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const size = measureTag(ctx, label)
  const box = placeNameTag({ headTop: 32, centerX: canvas.width / 2 }, size, [], { w: canvas.width, h: canvas.height })
  drawNameTag(ctx, box, label)
  const bust = knightBust('s', 0)
  const scale = 2
  const x = Math.round((canvas.width - bust.width * scale) / 2)
  ctx.drawImage(bust, x, 36, bust.width * scale, bust.height * scale)
}
