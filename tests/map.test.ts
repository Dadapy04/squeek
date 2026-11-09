import { describe, expect, it } from 'vitest'
import { blocked } from '../src/run.ts'
import { spriteProblems } from '../src/sprites.ts'
import type { Obstacle, World } from '../src/types.ts'
import { CAMPAIGN, COLS, ROWS, SEAL_LEFT, SEAL_RIGHT, SEAL_RUIN_LEFT, SEAL_RUIN_RIGHT, withObstacle, zoneName } from '../src/world.ts'
import { createRun, openCrate, step } from '../src/run.ts'
import { freshMeta } from '../src/save.ts'

function reachable(world: World, goalX: number, goalY: number, radius = 12): boolean {
  const step = 8
  const cols = Math.ceil(world.w / step)
  const rows = Math.ceil(world.h / step)
  const free = (x: number, y: number) => x >= radius && y >= radius && x <= world.w - radius && y <= world.h - radius && !blocked(world, x, y, radius)
  const startC = Math.round(world.spawn.x / step)
  const startR = Math.round(world.spawn.y / step)
  const goalC = Math.round(goalX / step)
  const goalR = Math.round(goalY / step)
  if (!free(world.spawn.x, world.spawn.y) || !free(goalX, goalY)) return false
  const seen = new Uint8Array(cols * rows)
  const queue = [startC, startR]
  seen[startR * cols + startC] = 1
  for (let head = 0; head < queue.length; head += 2) {
    const c = queue[head] ?? 0
    const r = queue[head + 1] ?? 0
    if (c === goalC && r === goalR) return true
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nc = c + dc
      const nr = r + dr
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue
      const id = nr * cols + nc
      if (seen[id]) continue
      if (!free(nc * step, nr * step)) continue
      seen[id] = 1
      queue.push(nc, nr)
    }
  }
  return false
}

function expectRoute(extra?: Obstacle): void {
  const world = extra ? withObstacle(extra) : CAMPAIGN
  expect(reachable(world, world.extract.x, world.extract.y)).toBe(true)
  for (const loot of world.loots) {
    if (extra === SEAL_LEFT && loot.x < 160 && loot.y < 280) continue
    if (extra === SEAL_RIGHT && loot.x > 220 && loot.y < 280 && loot.y > 140) continue
    expect(reachable(world, loot.x, loot.y), `${loot.kind}@${loot.x},${loot.y}`).toBe(true)
  }
}

describe('pixel burrow map', () => {
  it('uses a consistent 16px tile grid', () => {
    expect(spriteProblems()).toEqual([])
    expect(ROWS.every((row) => row.length === COLS)).toBe(true)
    expect(CAMPAIGN.w).toBe(COLS * 16)
    expect(CAMPAIGN.h).toBe(ROWS.length * 16)
  })

  it('keeps spawn, chests, and enemies on open floor', () => {
    expect(blocked(CAMPAIGN, CAMPAIGN.spawn.x, CAMPAIGN.spawn.y, 12)).toBe(false)
    expect(CAMPAIGN.spawn.y).toBeLessThan(CAMPAIGN.safeY)
    expect(Math.hypot(CAMPAIGN.spawn.x - CAMPAIGN.extract.x, CAMPAIGN.spawn.y - CAMPAIGN.extract.y)).toBeGreaterThan(CAMPAIGN.extract.r + 6)
    for (const loot of CAMPAIGN.loots) expect(blocked(CAMPAIGN, loot.x, loot.y, 8)).toBe(false)
    for (const enemy of CAMPAIGN.enemies) {
      expect(blocked(CAMPAIGN, enemy.x, enemy.y, 14)).toBe(false)
      expect(Math.hypot(enemy.x - CAMPAIGN.spawn.x, enemy.y - CAMPAIGN.spawn.y)).toBeGreaterThan(80)
    }
  })

  it('reaches extraction through either mine lane and either ruins lane', () => {
    expectRoute()
    expect(reachable(withObstacle(SEAL_LEFT), CAMPAIGN.extract.x, CAMPAIGN.extract.y)).toBe(true)
    expect(reachable(withObstacle(SEAL_RIGHT), CAMPAIGN.extract.x, CAMPAIGN.extract.y)).toBe(true)
    expect(reachable(withObstacle(SEAL_RUIN_LEFT), CAMPAIGN.extract.x, CAMPAIGN.extract.y)).toBe(true)
    expect(reachable(withObstacle(SEAL_RUIN_RIGHT), CAMPAIGN.extract.x, CAMPAIGN.extract.y)).toBe(true)
    const cores = CAMPAIGN.loots.filter((loot) => loot.kind === 'core')
    expect(cores.length).toBeGreaterThan(1)
    for (const core of cores) {
      expect(reachable(CAMPAIGN, core.x, core.y)).toBe(true)
      expect(reachable(withObstacle(SEAL_LEFT), core.x, core.y)).toBe(true)
      expect(reachable(withObstacle(SEAL_RIGHT), core.x, core.y)).toBe(true)
    }
  })

  it('names the industrial stretches and opens a crate only once', () => {
    expect(zoneName(40)).toBe('Pangkalan')
    expect(zoneName(200)).toBe('Terowongan')
    expect(zoneName(300)).toBe('Gudang')
    expect(zoneName(420)).toBe('Keamanan')
    expect(zoneName(560)).toBe('Riset')
    const run = createRun(freshMeta())
    const crate = run.loots.find((loot) => loot.extra.length > 1)
    expect(crate).toBeTruthy()
    if (!crate) return
    expect(blocked(CAMPAIGN, crate.x, crate.y, 8)).toBe(false)
    run.x = crate.x
    run.y = crate.y
    const quiet = { moveX: 0, moveY: 0, dodge: false, attack: false, boost: false, shield: false }
    step(run, 0.2, quiet)
    expect(crate.taken).toBe(false)
    expect(run.nearId).toBe(crate.id)
    expect(openCrate(run)).toBe(true)
    const gained = run.bag.length
    expect(gained).toBe(1 + crate.extra.length)
    expect(crate.taken).toBe(true)
    step(run, 0.4, quiet)
    expect(run.bag.length).toBe(gained)
    expect(openCrate(run)).toBe(false)
    run.bag = ['scrap', 'scrap', 'scrap', 'scrap', 'scrap']
    const other = run.loots.find((loot) => !loot.taken && loot.extra.length > 1)
    expect(other).toBeTruthy()
    if (!other) return
    run.x = other.x
    run.y = other.y
    step(run, 0.2, { moveX: 0, moveY: 0, dodge: false, attack: false, boost: false, shield: false })
    expect(other.taken).toBe(false)
    expect(run.bag).toHaveLength(5)
  })

  it('stops on a lamp post instead of walking through it', () => {
    const run = createRun(freshMeta())
    const quiet = { moveX: 0, moveY: 1, dodge: false, attack: false, boost: false, shield: false, mode: 'tactical' as const }
    for (let i = 0; i < 50; i++) step(run, 0.05, quiet)
    expect(run.y).toBeGreaterThan(160)
    expect(run.y).toBeLessThan(224)
    expect(Math.abs(run.x - 184)).toBeLessThan(8)
    expect(blocked(CAMPAIGN, 184, 232, 12)).toBe(true)
  })
})
