/**
 * Convex ruined courtyard. The same polygon is the walkable floor and the wall line.
 * Coordinates are sim x/y. Positive area is counter-clockwise.
 */

export const COURTYARD: ReadonlyArray<readonly [number, number]> = [
  [235, 15],
  [70, 195],
  [-25, 225],
  [-195, 145],
  [-230, -25],
  [-155, -205],
  [15, -185],
  [195, -145],
]

interface Edge {
  x: number
  y: number
  nx: number
  ny: number
}

const EDGES: Edge[] = COURTYARD.map((start, index) => {
  const end = COURTYARD[(index + 1) % COURTYARD.length] ?? start
  const ex = end[0] - start[0]
  const ey = end[1] - start[1]
  const len = Math.hypot(ex, ey) || 1
  return { x: start[0], y: start[1], nx: -ey / len, ny: ex / len }
})

export function courtyardContains(x: number, y: number, pad = 0): boolean {
  return EDGES.every((edge) => (x - edge.x) * edge.nx + (y - edge.y) * edge.ny >= pad - 0.01)
}

export function clampCourtyard(x: number, y: number, pad: number): { x: number; y: number } {
  let px = x
  let py = y
  for (let pass = 0; pass < 4; pass += 1) {
    for (const edge of EDGES) {
      const dist = (px - edge.x) * edge.nx + (py - edge.y) * edge.ny
      if (dist < pad) {
        px += edge.nx * (pad - dist)
        py += edge.ny * (pad - dist)
      }
    }
  }
  return { x: px, y: py }
}

export function courtyardRim(angle: number, inset: number): { x: number; y: number } {
  const dx = Math.cos(angle)
  const dy = Math.sin(angle)
  const hit = rayDistance(0, 0, dx, dy)
  const travel = Math.max(12, (hit ?? 180) - inset)
  return { x: dx * travel, y: dy * travel }
}

export function courtyardClearance(x: number, y: number, dx: number, dy: number): number {
  const len = Math.hypot(dx, dy) || 1
  const hit = rayDistance(x, y, dx / len, dy / len)
  return hit === null ? 40 : Math.max(0, hit - 18)
}

function rayDistance(ox: number, oy: number, dx: number, dy: number): number | null {
  let best: number | null = null
  for (let i = 0; i < COURTYARD.length; i += 1) {
    const start = COURTYARD[i] ?? [0, 0]
    const end = COURTYARD[(i + 1) % COURTYARD.length] ?? start
    const ex = end[0] - start[0]
    const ey = end[1] - start[1]
    const den = dx * ey - dy * ex
    if (Math.abs(den) < 1e-8) continue
    const t = ((start[0] - ox) * ey - (start[1] - oy) * ex) / den
    const u = ((start[0] - ox) * dy - (start[1] - oy) * dx) / den
    if (t > 0.001 && u >= -0.001 && u <= 1.001 && (best === null || t < best)) best = t
  }
  return best
}
