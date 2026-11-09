import { describe, expect, it } from 'vitest'
import { chaseDistance } from '../src/guns.ts'
import { createRun, hurtPlayer, step, type Input } from '../src/run.ts'
import { freshMeta } from '../src/save.ts'
import type { World } from '../src/types.ts'

const quiet: Input = { moveX: 0, moveY: 0, dodge: false, attack: false, boost: false, shield: false }

function pit(): World {
  return {
    w: 640,
    h: 400,
    safeY: 20,
    spawn: { x: 80, y: 150 },
    extract: { x: 40, y: 40, r: 16 },
    obstacles: [{ x: 180, y: 40, w: 36, h: 220 }],
    loots: [],
    enemies: [{ kind: 'biter', x: 140, y: 150, hp: 200, touch: 14 }],
  }
}

describe('tactical combat', () => {
  it('keeps the chase camera outside a wall behind the player', () => {
    const wall = (_x: number, y: number) => y < 100
    expect(chaseDistance(80, 180, Math.PI, 58, 22, wall)).toBeGreaterThanOrEqual(54)
    const boxed = chaseDistance(80, 130, Math.PI, 58, 22, wall)
    expect(boxed).toBeGreaterThanOrEqual(22)
    expect(boxed).toBeLessThan(40)
    expect(wall(80, 130 - boxed)).toBe(false)
  })

  it('sprints farther than a crouch and still stops at a wall', () => {
    const sprint = createRun(freshMeta(), pit())
    const start = sprint.x
    step(sprint, 0.5, { ...quiet, mode: 'tactical', moveX: 1, sprint: true, yaw: Math.PI / 2 })
    const crouch = createRun(freshMeta(), pit())
    step(crouch, 0.5, { ...quiet, mode: 'tactical', moveX: 1, crouch: true, yaw: Math.PI / 2 })
    expect(sprint.x - start).toBeGreaterThan(crouch.x - start)
    expect(sprint.stance).toBe('stand')
    expect(crouch.stance).toBe('crouch')
    const blockedRun = createRun(freshMeta(), pit())
    blockedRun.x = 150
    step(blockedRun, 1, { ...quiet, mode: 'tactical', moveX: 1, sprint: true, yaw: Math.PI / 2 })
    expect(blockedRun.x).toBeLessThanOrEqual(168)
  })

  it('accelerates into a sprint instead of starting at full speed', () => {
    const run = createRun(freshMeta(), pit())
    const start = run.x
    step(run, 0.05, { ...quiet, mode: 'tactical', moveX: 1, sprint: true, yaw: Math.PI / 2 })
    const first = run.x - start
    expect(first).toBeGreaterThan(0)
    expect(first).toBeLessThan(156 * 1.62 * 0.05 * 0.55)
    step(run, 0.45, { ...quiet, mode: 'tactical', moveX: 1, sprint: true, yaw: Math.PI / 2 })
    expect(run.x - start).toBeGreaterThan(first * 6)
    expect(run.grounded).toBe(true)
  })

  it('jumps and lands, and looking sets the facing', () => {
    const run = createRun(freshMeta(), pit())
    step(run, 0.05, { ...quiet, mode: 'tactical', jump: true })
    expect(run.z).toBeGreaterThan(0)
    step(run, 1.2, { ...quiet, mode: 'tactical' })
    expect(run.z).toBe(0)
    step(run, 0.05, { ...quiet, mode: 'tactical', yaw: Math.PI / 2, pitch: 0.2 })
    expect(run.facingX).toBeCloseTo(1, 4)
    expect(run.facingY).toBeCloseTo(0, 4)
    expect(run.pitch).toBeCloseTo(0.2, 4)
  })

  it('hits the enemy in front, misses behind a wall, and recoils', () => {
    const run = createRun(freshMeta(), pit())
    run.weapon = 'pistol'
    const enemy = run.enemies[0]
    if (!enemy) return
    step(run, 0.05, { ...quiet, mode: 'tactical', fire: true, yaw: Math.PI / 2 })
    expect(enemy.hp).toBeLessThan(200)
    expect(run.mag.pistol).toBe(7)
    expect(run.recoil).toBeGreaterThan(0)
    const kicked = run.recoil
    step(run, 0.3, { ...quiet, mode: 'tactical', yaw: Math.PI / 2 })
    expect(run.recoil).toBeLessThan(kicked)

    const covered = createRun(freshMeta(), pit())
    covered.weapon = 'pistol'
    const foe = covered.enemies[0]
    if (!foe) return
    foe.x = 250
    step(covered, 0.05, { ...quiet, mode: 'tactical', fire: true, yaw: Math.PI / 2 })
    expect(foe.hp).toBe(200)
    expect(covered.mag.pistol).toBe(7)
  })

  it('stops at an empty mag, reloads from reserve, and switches weapons', () => {
    const run = createRun(freshMeta(), pit())
    run.weapon = 'pistol'
    run.mag.pistol = 0
    const hp = run.enemies[0]?.hp
    step(run, 0.05, { ...quiet, mode: 'tactical', fire: true, yaw: Math.PI / 2 })
    expect(run.enemies[0]?.hp).toBe(hp)
    expect(run.cues).toContain('dry')
    step(run, 1.3, { ...quiet, mode: 'tactical', reload: true, yaw: Math.PI / 2 })
    expect(run.mag.pistol).toBe(8)
    expect(run.reserve.pistol).toBe(24 - 8)

    const arms = createRun(freshMeta(), pit())
    expect(arms.weapon).toBe('sword')
    step(arms, 0.05, { ...quiet, mode: 'tactical', switchWeapon: true })
    expect(arms.weapon).toBe('pistol')
    arms.weapon = 'smg'
    const smg = arms.enemies[0]
    if (!smg) return
    step(arms, 0.45, { ...quiet, mode: 'tactical', fire: true, yaw: Math.PI / 2 })
    const smgDamage = 200 - smg.hp
    const pistol = createRun(freshMeta(), pit())
    pistol.weapon = 'pistol'
    step(pistol, 0.05, { ...quiet, mode: 'tactical', fire: true, yaw: Math.PI / 2 })
    expect(smgDamage).toBeGreaterThan(200 - (pistol.enemies[0]?.hp ?? 200))
  })

  it('dies and a new run restores health and magazines without touching the top-down sword', () => {
    const run = createRun(freshMeta(), pit())
    hurtPlayer(run, 400)
    expect(run.phase).toBe('dead')
    const again = createRun(freshMeta(), pit())
    expect(again.hp).toBe(150)
    expect(again.maxHp).toBe(150)
    expect(again.mag.pistol).toBe(8)
    expect(again.weapon).toBe('sword')
    step(again, 0.2, { ...quiet, moveX: 1 })
    expect(again.mag.pistol).toBe(8)
    expect(again.z).toBe(0)
  })
})
