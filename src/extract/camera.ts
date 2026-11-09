import { ZONE_H, ZONE_W } from './sim.ts'

/** Knight height in world units. The old blit used 52. */
export const KNIGHT_WORLD_H = 44

export interface FrameMeasure {
  scale: number
  visibleW: number
  visibleH: number
  knightPx: number
}

/** Camera before this pass: max(2.6, min(width, height) / 132), knight 52 world units tall. */
export function legacyScale(width: number, height: number): number {
  return Math.max(2.6, Math.min(width, height) / 132)
}

/**
 * Cover the screen on the axis that would otherwise leave a skinny room.
 * A tall room on a wide screen fills the width and the camera scrolls vertically.
 * World speed and hitboxes stay put.
 */
export function cameraScale(width: number, height: number): number {
  if (width <= 0 || height <= 0) return 1.6
  const fitH = height / ZONE_H
  const roomTaller = ZONE_H / ZONE_W >= height / width
  if (roomTaller) {
    const gutter = Math.min(width * 0.22, 200)
    const available = Math.max(width - gutter, width * 0.78)
    const fitted = Math.max(1.35, available / ZONE_W)
    if (width <= height) return fitted
    // Desktop landscape stays on the wider frame. A short phone is another ~10% further out than the previous 1.35 phone frame.
    const phone = height <= 520
    return fitted / (phone ? 1.485 : 1.22)
  }
  return Math.max(1.35, fitH)
}

export function measure(scale: number, knightWorld: number, width: number, height: number): FrameMeasure {
  return {
    scale: round(scale),
    visibleW: round(width / scale),
    visibleH: round(height / scale),
    knightPx: round(knightWorld * scale),
  }
}

export function legacyFrame(width: number, height: number): FrameMeasure {
  return measure(legacyScale(width, height), 52, width, height)
}

export function cameraFrame(width: number, height: number): FrameMeasure {
  return measure(cameraScale(width, height), KNIGHT_WORLD_H, width, height)
}

/**
 * Pixel art stays in CSS pixels on phones. A 3× device pixel ratio is clamped
 * so a retina desktop never allocates more than a 2× backing store.
 */
export function backingRatio(cssW: number, cssH: number, dpr = 1): number {
  const requested = Number.isFinite(dpr) ? Math.max(1, dpr) : 1
  if (Math.min(cssW, cssH) <= 900) return 1
  return Math.min(2, requested)
}

function round(value: number): number {
  return Math.round(value * 10) / 10
}

export const ZONE_SPAN = { w: ZONE_W, h: ZONE_H }
