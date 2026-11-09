/** Screen-space title for the Pelebur Jiwa burst. Mechanics stay in the sim. */

import { glyphRows } from './pixel-font.ts'

export const TITLE_LINE = 'SOUL MELTER!!!'
export const TITLE_SETTLE = 0.28
export const TITLE_HOLD = 0.7
export const TITLE_FADE = 0.45

export function titleGlyph(ch: string): string[] {
  return glyphRows(ch)
}

export function fadeStart(): number {
  return TITLE_SETTLE + TITLE_HOLD
}

/** 1.6 punch, a small overshoot, then a steady 1 through the hold. */
export function titleScale(t: number): number {
  if (t <= 0) return 1.6
  if (t < 0.14) {
    const u = t / 0.14
    const ease = 1 - (1 - u) ** 3
    return 1.6 + (0.92 - 1.6) * ease
  }
  if (t < 0.22) {
    const u = (t - 0.14) / 0.08
    return 0.92 + (1.06 - 0.92) * u
  }
  if (t < TITLE_SETTLE) {
    const u = (t - 0.22) / (TITLE_SETTLE - 0.22)
    return 1.06 + (1 - 1.06) * u
  }
  return 1
}

export function titleAlpha(t: number): number {
  const start = fadeStart()
  if (t <= start) return 1
  const u = (t - start) / TITLE_FADE
  if (u >= 1) return 0
  return 1 - u
}

export function titleJitter(t: number): { x: number; y: number } {
  if (t < TITLE_SETTLE || t > fadeStart()) return { x: 0, y: 0 }
  return {
    x: Math.round(Math.sin(t * 47) * 1.4),
    y: Math.round(Math.cos(t * 53) * 1.2),
  }
}

export function chromaOffset(t: number): number {
  if (t < TITLE_SETTLE || t > fadeStart()) return 0
  const flick = 0.5 + 0.5 * Math.sin(t * 90)
  return flick > 0.62 ? 2 : 1
}

export function letterDrift(index: number, count: number, t: number): { x: number; y: number } {
  const start = fadeStart()
  if (t <= start) return { x: 0, y: 0 }
  const u = Math.min(1, (t - start) / TITLE_FADE)
  const mid = (count - 1) / 2
  return {
    x: (index - mid) * 22 * u,
    y: -30 * u - (index % 3) * 8 * u,
  }
}

export function titlePixel(width: number): number {
  const cells = TITLE_LINE.length * 6 - 1
  return Math.max(4, Math.min(8, Math.floor((width * 0.68) / cells)))
}

export function titleWidth(px: number): number {
  return (TITLE_LINE.length * 6 - 1) * px
}

/** Upper-middle, clear of the top bars and the bottom controls. */
export function titleAnchor(width: number, height: number): { x: number; y: number } {
  return { x: Math.round(width / 2), y: Math.round(height * 0.34) }
}

export function titleBox(width: number, height: number): { left: number; top: number; right: number; bottom: number } {
  const px = titlePixel(width)
  const pad = px
  const anchor = titleAnchor(width, height)
  const w = titleWidth(px) + pad * 2
  const h = 7 * px + pad * 2
  return {
    left: anchor.x - w / 2,
    top: anchor.y - h / 2,
    right: anchor.x + w / 2,
    bottom: anchor.y + h / 2,
  }
}

let fromAge = Number.NaN
let armedSeed = -1
let finished = false

export function resetSoulTitle(): void {
  fromAge = Number.NaN
  armedSeed = -1
  finished = false
}

/** Seconds since the burst title began, or null when it should not draw. */
export function noteSoulTitle(run: { seed: number; age: number; soul?: { cast: number } | null }, elapsed: number): number | null {
  if (run.seed !== armedSeed) {
    armedSeed = run.seed
    fromAge = Number.NaN
    finished = false
  }
  if (Number.isFinite(fromAge) && run.age + 0.25 < fromAge) {
    fromAge = Number.NaN
    finished = false
  }
  const firing = (run.soul?.cast ?? 0) > 0 && elapsed >= 0.55
  if (!finished && !Number.isFinite(fromAge) && firing) fromAge = run.age - (elapsed - 0.55)
  if (!Number.isFinite(fromAge)) return null
  const t = run.age - fromAge
  if (t > fadeStart() + TITLE_FADE) {
    finished = true
    return null
  }
  if (t < 0) return null
  return t
}
