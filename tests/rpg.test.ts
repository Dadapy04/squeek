import { describe, expect, it } from 'vitest'
import { createRpg, step, swordDamage, toSave, type Input } from '../src/rpg/sim.ts'
import { EXTRACTION_SAVE_KEY, RPG_SAVE_KEY, emptySave, writeRpg } from '../src/rpg/save.ts'
import { BOSS, CHEST } from '../src/rpg/world.ts'

const quiet: Input = { moveX: 0, moveY: 0, attack: false, skill: false, dodge: false, interact: false, yaw: Math.PI }

describe('burrow rpg', () => {
  it('chains sword hits and spends a skill only once until the cooldown ends', () => {
    const state = createRpg(emptySave())
    const foe = state.enemies[0]
    if (!foe) throw new Error('no foe')
    state.x = foe.x
    state.y = foe.y - 20
    step(state, { ...quiet, attack: true }, 0.05)
    const once = foe.hp
    expect(once).toBeLessThan(42)
    step(state, { ...quiet, attack: true }, 0.05)
    expect(foe.hp).toBe(once)
    step(state, quiet, 0.4)
    step(state, { ...quiet, attack: true }, 0.05)
    expect(foe.hp).toBeLessThan(once)
    expect(swordDamage(state, 3)).toBeGreaterThan(swordDamage({ ...state, edge: false }, 1))
    const before = state.focus
    step(state, { ...quiet, skill: true }, 0.05)
    expect(state.focus).toBeLessThan(before)
    const spent = state.focus
    step(state, { ...quiet, skill: true }, 0.2)
    expect(state.focus).toBeGreaterThanOrEqual(spent)
    expect(state.skillCd).toBeGreaterThan(4)
  })

  it('opens the ruin chest into equipped loot and records the gate', () => {
    const state = createRpg(emptySave())
    state.x = CHEST.x
    state.y = CHEST.y
    step(state, { ...quiet, interact: true }, 0.05)
    expect(state.fang).toBe(true)
    expect(state.edge).toBe(true)
    expect(state.maxHp).toBe(128)
    state.y = 290
    step(state, quiet, 0.05)
    expect(state.checkpoint).toBe('gate')
    const storage = memory()
    writeRpg(storage, toSave(state))
    expect(storage.getItem(EXTRACTION_SAVE_KEY)).toBeNull()
    expect(storage.getItem(RPG_SAVE_KEY)).toContain('gate')
  })

  it('telegraphs the boss into a second phase and can be beaten', () => {
    const state = createRpg(emptySave())
    const boss = state.enemies.find((enemy) => enemy.kind === 'boss')
    if (!boss) throw new Error('no boss')
    state.x = BOSS.x
    state.y = BOSS.y - 22
    state.hp = 400
    state.maxHp = 400
    for (let i = 0; i < 20 && boss.phase === 1 && boss.hp > 0; i++) {
      state.x = BOSS.x
      state.y = BOSS.y - 20
      step(state, quiet, 0.35)
      step(state, { ...quiet, attack: true }, 0.05)
    }
    expect(boss.phase).toBe(2)
    expect(state.phase).toBe('play')
    step(state, quiet, 0.05)
    state.x = boss.x
    state.y = boss.y - 16
    state.attackCd = 0
    state.attackHeld = false
    boss.hp = 8
    step(state, { ...quiet, attack: true }, 0.05)
    expect(state.phase).toBe('victory')
  })

  it('returns the retry body to the checkpoint without wiping equipment', () => {
    const state = createRpg(emptySave())
    state.edge = true
    state.fang = true
    state.checkpoint = 'gate'
    state.hp = 1
    state.x = BOSS.x
    state.y = BOSS.y - 10
    for (let i = 0; i < 30 && state.phase === 'play'; i++) step(state, quiet, 0.2)
    expect(state.phase).toBe('dead')
    const save = toSave(state)
    expect(save.edge).toBe(true)
    const again = createRpg({ ...save, bossDefeated: false })
    expect(again.y).toBeGreaterThan(200)
    expect(again.edge).toBe(true)
    expect(again.hp).toBe(again.maxHp)
  })
})

function memory(): Storage {
  const map = new Map<string, string>()
  return {
    get length() { return map.size },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (index) => [...map.keys()][index] ?? null,
    removeItem: (key) => { map.delete(key) },
    setItem: (key, value) => { map.set(key, value) },
  }
}
