import { describe, expect, it } from 'vitest'
import { HEAL_AMOUNT, HP_BASE, VITALITY_HP } from '../src/balance.ts'
import { hurtPlayer, createRun, deriveCombat, useCarried } from '../src/run.ts'
import { freshMeta, loadMeta, sanitizeMeta, saveMeta } from '../src/save.ts'
import { CAMPAIGN } from '../src/world.ts'
import type { World } from '../src/types.ts'

const KEY = 'npcs-burrow-extraction.save.v1'

function pit(): World {
  return {
    w: 420,
    h: 300,
    safeY: 20,
    spawn: { x: 80, y: 150 },
    extract: { x: 40, y: 40, r: 16 },
    obstacles: [],
    loots: [],
    enemies: [],
  }
}

describe('player health', () => {
  it('starts a new run at the thicker base, still full', () => {
    const run = createRun(freshMeta(), pit())
    expect(HP_BASE).toBe(150)
    expect(run.maxHp).toBe(150)
    expect(run.hp).toBe(150)
  })

  it('keeps Badan at +30 per rank on top of the new base', () => {
    const bare = freshMeta()
    const one = freshMeta()
    one.ranks.vitality = 1
    const two = freshMeta()
    two.ranks.vitality = 2
    expect(deriveCombat(bare).maxHp).toBe(150)
    expect(deriveCombat(one).maxHp).toBe(150 + VITALITY_HP)
    expect(deriveCombat(two).maxHp).toBe(150 + VITALITY_HP * 2)
    expect(createRun(two, pit()).hp).toBe(210)
    const before = createRun(one, pit())
    const gained = deriveCombat(two).maxHp - before.maxHp
    expect(gained).toBe(30)
    expect(before.hp + gained).toBe(210)
  })

  it('reads a legacy save on the same key and applies stored Badan', () => {
    const storage = {
      data: new Map<string, string>(),
      getItem(key: string) {
        return this.data.get(key) ?? null
      },
      setItem(key: string, value: string) {
        this.data.set(key, value)
      },
      removeItem(key: string) {
        this.data.delete(key)
      },
    } as unknown as Storage
    storage.setItem(KEY, JSON.stringify({ bank: { scrap: 3, gear: 1 }, ranks: { vitality: 1, damage: 0 } }))
    const loaded = loadMeta(storage)
    expect(loaded.ranks.vitality).toBe(1)
    expect(loaded.bank.scrap).toBe(3)
    expect(loaded.bank.bandage).toBe(0)
    expect(createRun(loaded, pit()).maxHp).toBe(180)
    const saved = freshMeta()
    saved.ranks.vitality = 1
    expect(saveMeta(storage, saved)).toBe(true)
    expect(storage.getItem(KEY)).toContain('"vitality":1')
    expect(sanitizeMeta({ ranks: { vitality: 9 } }).ranks.vitality).toBe(2)
  })

  it('applies enemy damage to the new pool and caps a bandage at max', () => {
    const mine = CAMPAIGN.enemies.find((enemy) => enemy.kind === 'biter' && enemy.touch === 14)
    const ruins = CAMPAIGN.enemies.find((enemy) => enemy.kind === 'biter' && enemy.touch === 20)
    expect(mine?.touch).toBe(14)
    expect(ruins?.touch).toBe(20)
    const run = createRun(freshMeta(), pit())
    hurtPlayer(run, mine?.touch ?? 0)
    expect(run.hp).toBe(136)
    expect(run.maxHp).toBe(150)
    hurtPlayer(run, ruins?.touch ?? 0)
    hurtPlayer(run, ruins?.touch ?? 0)
    expect(run.hp).toBe(96)
    run.bag = ['bandage']
    expect(useCarried(run, 'bandage')).toBe(true)
    expect(run.hp).toBe(96 + HEAL_AMOUNT)
    expect(HEAL_AMOUNT).toBe(36)
    run.hp = 140
    run.bag = ['bandage']
    expect(useCarried(run, 'bandage')).toBe(true)
    expect(run.hp).toBe(run.maxHp)
    run.bag = ['bandage']
    expect(useCarried(run, 'bandage')).toBe(false)
    expect(run.hp).toBe(150)
    expect(run.bag).toEqual(['bandage'])
  })
})
