import { describe, expect, it } from 'vitest'
import { WEAPONS, WEAPON_ORDER } from '../src/guns.ts'
import { createRun, step, takeBank, type Input } from '../src/run.ts'
import { freshMeta } from '../src/save.ts'
import type { World } from '../src/types.ts'

const quiet: Input = { moveX: 0, moveY: 0, dodge: false, attack: false, boost: false, shield: false }

function yard(): World {
  return {
    w: 640,
    h: 480,
    safeY: 20,
    spawn: { x: 80, y: 240 },
    extract: { x: 40, y: 40, r: 16 },
    obstacles: [{ x: 300, y: 80, w: 24, h: 220 }],
    loots: [],
    enemies: [{ kind: 'biter', x: 420, y: 240, hp: 80, touch: 14 }],
  }
}

describe('reliability', () => {
  it('never drives a magazine, reserve, or durability below zero', () => {
    const run = createRun(freshMeta(), yard())
    const release = { ...quiet, mode: 'tactical' as const }
    const held = { ...release, fire: true, yaw: Math.PI / 2 }
    for (const id of WEAPON_ORDER) {
      if (id === 'sword') continue
      step(run, 0.05, release)
      run.weapon = id
      run.mag[id] = 1
      run.reserve[id] = 0
      run.fireCd = 0
      step(run, 0.05, held)
      step(run, 0.05, held)
      expect(run.mag[id]).toBe(0)
      expect(run.reserve[id]).toBe(0)
      expect(run.durability[id]).toBeGreaterThanOrEqual(0)
      expect(run.durability[id]).toBeLessThanOrEqual(100)
    }
  })

  it('reloads each gun once up to its magazine', () => {
    const run = createRun(freshMeta(), yard())
    for (const id of WEAPON_ORDER) {
      if (id === 'sword') continue
      const spec = WEAPONS[id]
      step(run, 0.05, { ...quiet, mode: 'tactical' })
      run.weapon = id
      run.mag[id] = 0
      run.reserve[id] = spec.mag + 3
      run.reloadLeft = 0
      step(run, 0.05, { ...quiet, mode: 'tactical', reload: true })
      expect(run.reloadLeft).toBeGreaterThan(0.4)
      step(run, spec.reload + 0.05, { ...quiet, mode: 'tactical' })
      expect(run.mag[id]).toBe(spec.mag)
      expect(run.reserve[id]).toBe(3)
      step(run, 0.2, { ...quiet, mode: 'tactical', reload: true })
      expect(run.mag[id]).toBe(spec.mag)
      expect(run.reserve[id]).toBe(3)
    }
  })

  it('searches, walks home, and patrols again', () => {
    const run = createRun(freshMeta(), yard())
    const enemy = run.enemies[0]
    if (!enemy) return
    run.x = 40
    run.y = 40
    run.stance = 'crouch'
    enemy.mind = 'search'
    enemy.timer = 0.04
    enemy.lastX = enemy.x
    enemy.lastY = enemy.y
    step(run, 0.05, quiet)
    expect(enemy.mind).toBe('return')
    enemy.homeX = enemy.x + 90
    step(run, 0.05, quiet)
    expect(enemy.mind).toBe('return')
    enemy.homeX = enemy.x
    enemy.homeY = enemy.y
    step(run, 0.05, quiet)
    expect(enemy.mind).toBe('patrol')
  })

  it('crouches out of sight and a sprint step is heard past a wall', () => {
    const hidden = createRun(freshMeta(), yard())
    const watcher = hidden.enemies[0]
    if (!watcher) return
    hidden.x = watcher.x + 100
    hidden.y = watcher.y
    hidden.stance = 'crouch'
    step(hidden, 0.3, quiet)
    expect(watcher.mind).toBe('patrol')
    hidden.stance = 'stand'
    step(hidden, 0.15, quiet)
    expect(watcher.mind === 'alert' || watcher.mind === 'chase').toBe(true)

    const heard = createRun(freshMeta(), yard())
    const enemy = heard.enemies[0]
    if (!enemy) return
    heard.x = 270
    heard.y = 240
    enemy.x = 340
    enemy.y = 240
    heard.slideX = 0
    heard.slideY = 220
    heard.stance = 'stand'
    step(heard, 0.05, { ...quiet, mode: 'tactical', sprint: true, moveY: 1, yaw: Math.PI })
    expect(enemy.mind).toBe('investigate')
  })

  it('banks an extraction once and drops a death loot once', () => {
    const meta = freshMeta()
    const run = createRun(meta, yard())
    const enemy = run.enemies[0]
    if (!enemy) return
    const before = run.loots.length
    enemy.hp = 0
    step(run, 0.1, quiet)
    step(run, 0.4, quiet)
    expect(run.loots.length).toBe(before + 1)
    expect(enemy.mind).toBe('dead')
    run.payload = ['scrap', 'ore']
    run.phase = 'extracted'
    expect(takeBank(meta, run)).toEqual(['scrap', 'ore'])
    expect(takeBank(meta, run)).toBeNull()
    expect(meta.bank.scrap).toBe(1)
    expect(meta.bank.ore).toBe(1)
  })

  it('keeps an automatic gun single-shot until Tahan is selected', () => {
    const run = createRun(freshMeta(), yard())
    run.weapon = 'smg'
    run.fireMode = 'semi'
    run.mag.smg = 10
    const release = { ...quiet, mode: 'tactical' as const, yaw: Math.PI / 2 }
    step(run, 0.05, { ...release, fire: true })
    step(run, 0.05, { ...release, fire: true })
    expect(run.mag.smg).toBe(9)
    step(run, 0.05, release)
    run.fireMode = 'auto'
    step(run, 0.25, { ...release, fire: true })
    expect(run.mag.smg).toBeLessThan(9)
    expect(run.mag.smg).toBeGreaterThanOrEqual(0)
  })

  it('steps only while the feet are moving, and faster while sprinting', () => {
    const idle = createRun(freshMeta(), yard())
    idle.slideX = 0
    idle.slideY = 0
    step(idle, 0.8, { ...quiet, mode: 'tactical' })
    expect(idle.cues.some((cue) => cue.startsWith('step'))).toBe(false)
    const walking = createRun(freshMeta(), yard())
    walking.slideY = 80
    walking.grounded = true
    walking.stepCd = 0
    step(walking, 1.3, { ...quiet, mode: 'tactical', moveY: 1, yaw: Math.PI })
    const steps = walking.cues.filter((cue) => cue === 'step').length
    expect(steps).toBeGreaterThanOrEqual(2)
    const sprint = createRun(freshMeta(), yard())
    sprint.slideY = 220
    sprint.grounded = true
    sprint.stepCd = 0
    step(sprint, 1.3, { ...quiet, mode: 'tactical', moveY: 1, yaw: Math.PI, sprint: true })
    const fast = sprint.cues.filter((cue) => cue === 'step-fast').length
    expect(fast).toBeGreaterThan(steps)
  })
})
