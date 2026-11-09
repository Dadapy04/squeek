import type { Obstacle, World } from './types.ts'

export const TILE = 16
export const COLS = 24

const R = (row: string): string => {
  if (row.length !== COLS) throw new Error(`map row ${row.length}: ${row}`)
  return row
}

/**
 * Workshop, two mine tunnels, store room, abandoned hall,
 * security post, and a research nook. Door rows 16 and 24
 * keep both lanes so either seal still reaches the cores.
 */
export const ROWS = [
  R('########################'),
  R('#l....................l#'),
  R('#......................#'),
  R('#..........X...........#'),
  R('#......................#'),
  R('#..........S...........#'),
  R('#..###..........###....#'),
  R('#..........c...........#'),
  R('#......................#'),
  R('#......................#'),
  R('###..................###'),
  R('###..c..........m....###'),
  R('###..................###'),
  R('###..h..........t....###'),
  R('###........l.........###'),
  R('###..................###'),
  R('####.....######....#####'),
  R('#......................#'),
  R('#..o....B..............#'),
  R('#........=.............#'),
  R('#..........##..........#'),
  R('#...g......##.....k....#'),
  R('#....B.....##.....P....#'),
  R('#..........##.i........#'),
  R('####.....######....#####'),
  R('#......................#'),
  R('#..B...............P...#'),
  R('#......................#'),
  R('###..................###'),
  R('#....G.................#'),
  R('#......................#'),
  R('#..k..............k....#'),
  R('#......................#'),
  R('#..###.................#'),
  R('#......................#'),
  R('#....a.................#'),
  R('#....o.................#'),
  R('#......................#'),
  R('#......................#'),
  R('########################'),
]

export const MINE_DOOR_ROW = 16
export const RUIN_DOOR_ROW = 24
export const STORE_ROW = 17
export const SECURITY_ROW = 25
export const LAB_ROW = 33
export const RUINS_ROW = SECURITY_ROW

export const SEAL_LEFT: Obstacle = { x: 4 * TILE, y: MINE_DOOR_ROW * TILE, w: 5 * TILE, h: TILE }
export const SEAL_RIGHT: Obstacle = { x: 15 * TILE, y: MINE_DOOR_ROW * TILE, w: 4 * TILE, h: TILE }
export const SEAL_RUIN_LEFT: Obstacle = { x: 4 * TILE, y: RUIN_DOOR_ROW * TILE, w: 5 * TILE, h: TILE }
export const SEAL_RUIN_RIGHT: Obstacle = { x: 15 * TILE, y: RUIN_DOOR_ROW * TILE, w: 4 * TILE, h: TILE }

function obstaclesFrom(rows: string[]): Obstacle[] {
  const out: Obstacle[] = []
  for (let y = 0; y < rows.length; y++) {
    const line = rows[y] ?? ''
    let x = 0
    while (x < line.length) {
      if (line[x] === 'l') {
        out.push({ x: x * TILE + 4, y: y * TILE + 4, w: 8, h: 8 })
        x += 1
        continue
      }
      if (line[x] !== '#') {
        x += 1
        continue
      }
      let end = x
      while (line[end] === '#') end += 1
      out.push({ x: x * TILE, y: y * TILE, w: (end - x) * TILE, h: TILE })
      x = end
    }
  }
  return out
}

function center(col: number, row: number): { x: number; y: number } {
  return { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 }
}

function build(): World {
  const loots: World['loots'] = []
  const enemies: World['enemies'] = []
  let spawn = { x: 11 * TILE + 8, y: 5 * TILE + 8 }
  let extract = { x: 11 * TILE + 8, y: 3 * TILE + 8, r: 22 }
  for (let row = 0; row < ROWS.length; row++) {
    const line = ROWS[row] ?? ''
    for (let col = 0; col < line.length; col++) {
      const cell = line[col]
      const pos = center(col, row)
      if (cell === 'S') spawn = pos
      if (cell === 'X') extract = { ...pos, r: 22 }
      if (cell === 'c') loots.push({ kind: 'scrap', ...pos })
      if (cell === 'o') loots.push({ kind: 'scrap', ...pos, extra: row > LAB_ROW ? ['core', 'bandage'] : ['gear', 'bandage'] })
      if (cell === 'm') loots.push({ kind: 'ore', ...pos })
      if (cell === 'g') loots.push({ kind: 'gear', ...pos })
      if (cell === 'h') loots.push({ kind: 'bandage', ...pos })
      if (cell === 't') loots.push({ kind: 'tonic', ...pos })
      if (cell === 'k') loots.push({ kind: 'core', ...pos })
      if (cell === 'a') loots.push({ kind: 'relic', ...pos })
      if (cell === 'B') enemies.push({ kind: 'biter', ...pos, hp: row > RUINS_ROW ? 64 : 46, touch: row > RUINS_ROW ? 20 : 14 })
      if (cell === 'G') enemies.push({ kind: 'guard', ...pos, hp: 58, touch: 16 })
      if (cell === 'P') enemies.push({ kind: 'spitter', ...pos, hp: 36, touch: 12 })
    }
  }
  return {
    w: COLS * TILE,
    h: ROWS.length * TILE,
    safeY: 9 * TILE,
    spawn,
    extract,
    obstacles: obstaclesFrom(ROWS),
    loots,
    enemies,
  }
}

export const CAMPAIGN: World = build()

export function withObstacle(extra: Obstacle): World {
  return { ...CAMPAIGN, obstacles: [...CAMPAIGN.obstacles, extra] }
}

export function zoneName(y: number): string {
  if (y < CAMPAIGN.safeY) return 'Pangkalan'
  if (y < MINE_DOOR_ROW * TILE) return 'Terowongan'
  if (y < RUIN_DOOR_ROW * TILE) return 'Gudang'
  if (y < LAB_ROW * TILE) return 'Keamanan'
  return 'Riset'
}
