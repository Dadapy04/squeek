/** Placement for the floating stick. The analog vector matches the old fixed stick. */

export interface StickVec {
  x: number
  y: number
}

export interface Bounds {
  left: number
  top: number
  right: number
  bottom: number
}

/** Fraction of the radius that does not move. About 5%, and at least ~3px. */
export const STICK_DEAD = 0.05
/** Travel, as a fraction of the radius, that already means full speed. */
export const STICK_FULL = 0.58
/** Speed the moment the thumb leaves the deadzone. */
export const STICK_MIN = 0.38
export const MOVE_FRACTION = 0.48

export function stickVector(dx: number, dy: number, radius: number): StickVec {
  const max = Math.max(radius, 1)
  const len = Math.hypot(dx, dy)
  const dead = Math.max(3, max * STICK_DEAD)
  if (len <= dead || len === 0) return { x: 0, y: 0 }
  const full = max * STICK_FULL
  const span = Math.max(0.001, full - dead)
  const along = Math.min(1, (len - dead) / span)
  const speed = STICK_MIN + (1 - STICK_MIN) * along
  return { x: (dx / len) * speed, y: (dy / len) * speed }
}

/** Keep the finger on the rim once it leaves the base. */
export function followBase(fingerX: number, fingerY: number, centerX: number, centerY: number, radius: number): { x: number; y: number } {
  const dx = fingerX - centerX
  const dy = fingerY - centerY
  const len = Math.hypot(dx, dy)
  if (len <= radius || len === 0) return { x: centerX, y: centerY }
  return { x: fingerX - (dx / len) * radius, y: fingerY - (dy / len) * radius }
}

export function clampCenter(x: number, y: number, half: number, bounds: Bounds): { x: number; y: number } {
  return {
    x: Math.max(bounds.left + half, Math.min(bounds.right - half, x)),
    y: Math.max(bounds.top + half, Math.min(bounds.bottom - half, y)),
  }
}

export function inMoveZone(x: number, y: number, width: number, top: number, bottom: number): boolean {
  return x >= 0 && x <= width * MOVE_FRACTION && y >= top && y <= bottom
}
