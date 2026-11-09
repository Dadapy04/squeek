import { describe, expect, it } from 'vitest'
import { EXTRACT_TIME } from '../src/balance.ts'
import { createRun, hurtPlayer, step, takeBank, type Input } from '../src/run.ts'
import { buyUpgrade, freshMeta, loadMeta, saveMeta, sanitizeMeta } from '../src/save.ts'
import type { World } from '../src/types.ts'
import { CAMPAIGN } from '../src/world.ts'
import { blocked } from '../src/run.ts'

const quiet: Input = { moveX: 0, moveY: 0, dodge: false, attack: false, boost: false, shield: false }

function arena(): World {
  return {
    w: 480,
    h: 480,
    safeY: 30,
    spawn: { x: 180, y: 220 },
    extract: { x: 80, y: 70, r: 28 },
    obstacles: [{ x: 320, y: 180, w: 50, h: 90 }],
    loots: [
      { kind: 'scrap', x: 180, y: 220 },
      { kind: 'gear', x: 190, y: 220 },
      { kind: 'core', x: 168, y: 230 },
    ],
    enemies: [{ kind: 'biter', x: 230, y: 220, hp: 80, touch: 17 }],
  }
}

function memory(): Storage {
  const data = new Map<string, string>()
  return {
    get length() {
      return data.size
    },
    clear() {
      data.clear()
    },
    getItem(key: string) {
      return data.get(key) ?? null
    },
    key(index: number) {
      return [...data.keys()][index] ?? null
    },
    removeItem(key: string) {
      data.delete(key)
    },
    setItem(key: string, value: string) {
      data.set(key, value)
    },
  }
}

describe('burrow run', () => {
  it('keeps the campaign start, loot, and enemies out of walls', () => {
    const run = createRun(freshMeta())
    expect(blocked(CAMPAIGN, run.x, run.y, 12)).toBe(false)
    expect(run.y).toBeLessThan(CAMPAIGN.safeY)
    expect(Math.hypot(run.x - CAMPAIGN.extract.x, run.y - CAMPAIGN.extract.y)).toBeGreaterThan(CAMPAIGN.extract.r)
    for (const loot of run.loots) expect(blocked(CAMPAIGN, loot.x, loot.y, 8)).toBe(false)
    for (const enemy of run.enemies) expect(blocked(CAMPAIGN, enemy.x, enemy.y, 14)).toBe(false)
  })

  it('stops on a wall and caps the bag', () => {
    const run = createRun(freshMeta(), arena())
    run.bagSize = 2
    step(run, 0.2, quiet)
    expect(run.bag).toHaveLength(2)
    expect(run.loots.filter((loot) => !loot.taken)).toHaveLength(1)
    const before = run.x
    step(run, 2, { ...quiet, moveX: 1 })
    expect(run.x).toBeGreaterThan(before)
    expect(run.x).toBeLessThanOrEqual(320 - 12)
    expect(blocked(run.world, run.x, run.y, 12)).toBe(false)
  })

  it('dodges with a cooldown and ignores damage during iframes', () => {
    const run = createRun(freshMeta(), arena())
    const hp = run.hp
    step(run, 0.05, { ...quiet, dodge: true, moveX: 1 })
    expect(run.stamina).toBeLessThan(100)
    expect(run.dodgeCd).toBeGreaterThan(1)
    expect(run.iframes).toBeGreaterThan(0)
    hurtPlayer(run, 40)
    expect(run.hp).toBe(hp)
    const stamina = run.stamina
    step(run, 0.05, { ...quiet, dodge: true, moveX: 1 })
    expect(run.stamina).toBeGreaterThan(stamina)
    expect(run.dodgeCd).toBeGreaterThan(0.5)
  })

  it('hurts after a biter telegraph, not before it', () => {
    const run = createRun(freshMeta(), arena())
    run.iframes = 0
    run.dodgeLeft = 0
    const enemy = run.enemies[0]
    expect(enemy).toBeTruthy()
    if (!enemy) return
    enemy.x = run.x + 30
    enemy.y = run.y
    enemy.timer = 0
    enemy.state = 'idle'
    step(run, 0.12, quiet)
    expect(run.hp).toBe(run.maxHp)
    expect(enemy.state).toBe('windup')
    step(run, 0.7, quiet)
    expect(run.hp).toBeLessThan(run.maxHp)
  })

  it('banks carried loot once and death drops only the bag', () => {
    const meta = freshMeta()
    meta.bank.scrap = 2
    const run = createRun(meta, arena())
    run.enemies.forEach((enemy) => {
      enemy.hp = 0
    })
    run.bag = ['scrap', 'core']
    run.x = run.world.extract.x
    run.y = run.world.extract.y
    step(run, EXTRACT_TIME + 0.2, quiet)
    expect(run.phase).toBe('extracted')
    expect(run.bag).toEqual([])
    const banked = takeBank(meta, run)
    expect(banked).toEqual(['scrap', 'core'])
    expect(meta.bank.scrap).toBe(3)
    expect(meta.bank.gear).toBe(0)
    expect(meta.bank.core).toBe(1)
    expect(takeBank(meta, run)).toBeNull()
    expect(meta.bank.scrap).toBe(3)

    const doomed = createRun(meta, arena())
    doomed.bag = ['gear']
    doomed.hp = 10
    hurtPlayer(doomed, 40)
    expect(doomed.phase).toBe('dead')
    expect(doomed.bag).toEqual([])
    expect(doomed.lost).toEqual(['gear'])
    expect(meta.bank.scrap).toBe(3)
    expect(meta.bank.gear).toBe(0)
    expect(meta.bank.core).toBe(1)
  })

  it('cancels extraction without banking when you leave the ring', () => {
    const meta = freshMeta()
    const run = createRun(meta, arena())
    run.enemies.forEach((enemy) => {
      enemy.hp = 0
    })
    run.bag = ['gear']
    run.x = run.world.extract.x
    run.y = run.world.extract.y
    step(run, 0.6, quiet)
    expect(run.phase).toBe('extracting')
    run.x = 40
    run.y = 400
    step(run, 0.1, quiet)
    expect(run.phase).toBe('explore')
    expect(takeBank(meta, run)).toBeNull()
    expect(meta.bank.gear).toBe(0)
    expect(run.bag).toEqual(['gear'])
  })

  it('spends the shared bonus on either a boost or a shield, not both at once', () => {
    const run = createRun(freshMeta(), arena())
    run.bonus = 30
    step(run, 0.05, { ...quiet, boost: true })
    expect(run.bonus).toBe(6)
    expect(run.boostUntil).toBeGreaterThan(0)
    step(run, 0.05, { ...quiet, shield: true })
    expect(run.shieldUntil).toBe(0)
    expect(run.bonus).toBe(6)
    step(run, 0.05, quiet)
    run.bonus = 24
    step(run, 0.05, { ...quiet, shield: true })
    expect(run.shieldUntil).toBeGreaterThan(0)
    expect(run.bonus).toBe(0)
    const hp = run.hp
    hurtPlayer(run, 18)
    expect(run.hp).toBe(hp)
  })

  it('walks out of the safe burrow and picks up shallow scrap', () => {
    const run = createRun(freshMeta())
    const loot = CAMPAIGN.loots.find((item) => item.kind === 'scrap')
    expect(loot).toBeTruthy()
    for (let i = 0; i < 80 && run.bag.length === 0; i++) {
      const dx = (loot?.x ?? run.x) - run.x
      const dy = (loot?.y ?? run.y) - run.y
      const before = run.y
      step(run, 0.1, { ...quiet, moveX: Math.abs(dx) > 12 ? Math.sign(dx) : 0, moveY: Math.sign(dy) || 1 })
      if (Math.hypot(dx, dy) < 8 && run.y === before) break
    }
    expect(run.bag).toContain('scrap')
    expect(run.hp).toBe(run.maxHp)
    expect(run.phase).toBe('explore')
    expect(run.phase).toBe('explore')
  })

  it('regenerates stamina with no wheel bonus', () => {
    const run = createRun(freshMeta(), arena())
    run.bonus = 0
    run.stamina = 4
    step(run, 1, quiet)
    expect(run.stamina).toBeGreaterThan(20)
    expect(run.bonus).toBe(0)
    expect(run.phase).toBe('explore')
  })
})

describe('workshop and save', () => {
  it('buys one upgrade with banked parts and refuses a second it cannot afford', () => {
    const meta = freshMeta()
    meta.bank.scrap = 2
    meta.bank.ore = 1
    expect(buyUpgrade(meta, 'damage')).toBe(true)
    expect(meta.ranks.damage).toBe(1)
    expect(meta.bank.scrap).toBe(0)
    expect(meta.bank.ore).toBe(0)
    expect(buyUpgrade(meta, 'damage')).toBe(false)
    expect(buyUpgrade(meta, 'bag')).toBe(false)
    expect(meta.ranks.bag).toBe(0)
    const geared = createRun(meta)
    expect(geared.attackDamage).toBeGreaterThan(createRun(freshMeta()).attackDamage)
  })

  it('reloads sanitized progress and ignores broken saves', () => {
    const storage = memory()
    const meta = freshMeta()
    meta.bank.core = 2
    meta.ranks.bag = 1
    expect(saveMeta(storage, meta)).toBe(true)
    const loaded = loadMeta(storage)
    expect(loaded.bank.core).toBe(2)
    expect(loaded.ranks.bag).toBe(1)
    storage.setItem('npcs-burrow-extraction.save.v1', '{')
    expect(loadMeta(storage).bank.core).toBe(0)
    expect(sanitizeMeta({ bank: { scrap: -5, gear: 4.8 }, ranks: { damage: 9 } }).bank.scrap).toBe(0)
    expect(sanitizeMeta({ bank: { scrap: -5, gear: 4.8 }, ranks: { damage: 9 } }).ranks.damage).toBe(3)
    expect(sanitizeMeta({ bank: { gear: 4.8 } }).bank.gear).toBe(4)
    const legacy = sanitizeMeta({ bank: { scrap: 4, gear: 2, core: 1 }, ranks: { damage: 1, bag: 0, vitality: 0 } })
    expect(legacy.bank.scrap).toBe(4)
    expect(legacy.bank.core).toBe(1)
    expect(legacy.bank.ore).toBe(0)
    expect(legacy.bank.bandage).toBe(0)
    expect(legacy.ranks.damage).toBe(1)
  })
})
