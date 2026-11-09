import { describe, expect, it } from 'vitest'
import { falloff, PART_NAME } from '../src/guns.ts'
import { createRun, step, type Input } from '../src/run.ts'
import { freshMeta } from '../src/save.ts'
import type { World } from '../src/types.ts'

const quiet: Input = { moveX: 0, moveY: 0, dodge: false, attack: false, boost: false, shield: false }

function pit(enemyX = 140): World {
  return {
    w: 640,
    h: 400,
    safeY: 20,
    spawn: { x: 80, y: 150 },
    extract: { x: 40, y: 40, r: 16 },
    obstacles: [{ x: 300, y: 40, w: 30, h: 200 }],
    loots: [],
    enemies: [{ kind: 'biter', x: enemyX, y: 150, hp: 200, touch: 14 }],
  }
}

function shoot(x: number, pitch: number) {
  const run = createRun(freshMeta(), pit(x))
  run.weapon = 'pistol'
  step(run, 0.05, { ...quiet, mode: 'tactical', fire: true, yaw: Math.PI / 2, pitch })
  return run
}

describe('body hits', () => {
  it('hits the torso from chest height and the head from above it', () => {
    const chest = shoot(140, 0)
    const head = shoot(140, 0.12)
    expect(chest.popups.some((popup) => popup.text.endsWith(PART_NAME.torso))).toBe(true)
    expect(head.popups.some((popup) => popup.text.endsWith(PART_NAME.head))).toBe(true)
    expect(head.enemies[0]?.hp ?? 200).toBeLessThan(chest.enemies[0]?.hp ?? 0)
    expect(chest.popups.filter((popup) => popup.text.includes(PART_NAME.torso))).toHaveLength(1)
  })

  it('drops damage with distance and stops on a wall', () => {
    expect(falloff('pistol', 40, 280)).toBeGreaterThan(falloff('pistol', 220, 280))
    const near = shoot(130, 0)
    const far = shoot(340, 0)
    const nearLoss = 200 - (near.enemies[0]?.hp ?? 200)
    const farLoss = 200 - (far.enemies[0]?.hp ?? 200)
    expect(nearLoss).toBeGreaterThan(0)
    expect(farLoss).toBe(0)
    expect(far.impacts.some((mark) => mark.part === 'wall')).toBe(true)
    expect(far.cues).toContain('impact')
    expect(near.cues).toContain('hit')
    expect(near.cues).toContain('shot-pistol')
  })

  it('refuses an empty or broken gun and can cancel a reload', () => {
    const empty = createRun(freshMeta(), pit())
    empty.weapon = 'pistol'
    empty.mag.pistol = 0
    step(empty, 0.05, { ...quiet, mode: 'tactical', fire: true, yaw: Math.PI / 2 })
    expect(empty.enemies[0]?.hp).toBe(200)
    expect(empty.mag.pistol).toBe(0)
    expect(empty.cues).toContain('dry')

    const broken = createRun(freshMeta(), pit())
    broken.weapon = 'pistol'
    broken.durability.pistol = 0
    const mag = broken.mag.pistol
    step(broken, 0.05, { ...quiet, mode: 'tactical', fire: true, yaw: Math.PI / 2 })
    expect(broken.enemies[0]?.hp).toBe(200)
    expect(broken.mag.pistol).toBe(mag)

    const reload = createRun(freshMeta(), pit())
    reload.weapon = 'pistol'
    reload.mag.pistol = 3
    step(reload, 0.05, { ...quiet, mode: 'tactical', reload: true })
    expect(reload.reloadLeft).toBeGreaterThan(0.5)
    expect(reload.cues).toContain('reload-pistol')
    step(reload, 0.05, { ...quiet, mode: 'tactical', fire: true, yaw: Math.PI / 2 })
    expect(reload.reloadLeft).toBe(0)
    expect(reload.mag.pistol).toBe(2)
    expect(reload.enemies[0]?.hp).toBeLessThan(200)
    expect(reload.durability.pistol).toBe(99)
  })
})
