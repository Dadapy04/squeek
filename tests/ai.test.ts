import { describe, expect, it } from 'vitest'
import { blocked, createRun, step, type Input } from '../src/run.ts'
import { freshMeta } from '../src/save.ts'
import { CAMPAIGN } from '../src/world.ts'
import type { World } from '../src/types.ts'

const quiet: Input = { moveX: 0, moveY: 0, dodge: false, attack: false, boost: false, shield: false }

function yard(): World {
  return {
    w: 520,
    h: 420,
    safeY: 20,
    spawn: { x: 60, y: 200 },
    extract: { x: 40, y: 40, r: 12 },
    obstacles: [{ x: 180, y: 120, w: 36, h: 160 }],
    loots: [],
    enemies: [{ kind: 'biter', x: 300, y: 200, hp: 80, touch: 14 }],
  }
}

describe('enemy mind', () => {
  it('patrols while the player is hidden and alerts when seen', () => {
    const run = createRun(freshMeta(), yard())
    run.stance = 'crouch'
    const enemy = run.enemies[0]
    if (!enemy) return
    const start = enemy.x
    step(run, 1.2, quiet)
    expect(enemy.mind).toBe('patrol')
    expect(Math.abs(enemy.x - start) + Math.abs(enemy.y - 200)).toBeGreaterThan(8)
    run.x = enemy.x - 70
    run.y = enemy.y
    run.stance = 'stand'
    step(run, 0.1, quiet)
    expect(enemy.mind === 'alert' || enemy.mind === 'chase' || enemy.state === 'windup').toBe(true)
  })

  it('does not see through a wall, but investigates a gunshot', () => {
    const run = createRun(freshMeta(), yard())
    const enemy = run.enemies[0]
    if (!enemy) return
    run.x = 120
    run.y = 200
    enemy.x = 250
    enemy.y = 200
    step(run, 0.4, quiet)
    expect(enemy.state).not.toBe('windup')
    expect(enemy.mind === 'patrol' || enemy.mind === 'return').toBe(true)
    run.noise = 260
    run.noiseX = run.x
    run.noiseY = run.y
    run.noiseT = 0.5
    step(run, 0.15, quiet)
    expect(enemy.mind).toBe('investigate')
    const heard = enemy.x
    step(run, 0.6, quiet)
    expect(enemy.x).toBeLessThan(heard)
  })

  it('bites only inside reach and drops one loot when defeated', () => {
    const run = createRun(freshMeta(), yard())
    const enemy = run.enemies[0]
    if (!enemy) return
    run.x = enemy.x - 70
    run.y = enemy.y
    run.stance = 'stand'
    step(run, 0.2, quiet)
    expect(enemy.mind === 'alert' || enemy.mind === 'chase').toBe(true)
    expect(enemy.state).not.toBe('windup')
    run.x = enemy.x - 28
    step(run, 0.45, quiet)
    expect(enemy.state).toBe('windup')
    const before = run.loots.length
    enemy.hp = 0
    step(run, 0.1, quiet)
    expect(enemy.mind).toBe('dead')
    expect(run.loots.length).toBe(before + 1)
    const dropped = run.loots.length
    step(run, 0.4, quiet)
    expect(run.loots.length).toBe(dropped)
    expect(CAMPAIGN.enemies.some((item) => item.kind === 'guard')).toBe(true)
  })

  it('slides off a blocked patrol point instead of vibrating in a wall', () => {
    const run = createRun(freshMeta(), yard())
    const enemy = run.enemies[0]
    if (!enemy) return
    enemy.x = 160
    enemy.y = 200
    enemy.homeX = 160
    enemy.homeY = 200
    enemy.wx = 220
    enemy.wy = 200
    enemy.route = 1
    enemy.mind = 'patrol'
    run.x = 40
    run.y = 40
    run.stance = 'crouch'
    const startX = enemy.x
    step(run, 1.4, quiet)
    expect(blocked(run.world, enemy.x, enemy.y, 14)).toBe(false)
    expect(Math.abs(enemy.x - startX) + Math.abs(enemy.y - 200)).toBeGreaterThan(6)
  })
})
