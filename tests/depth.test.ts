import { describe, expect, it } from 'vitest'
import { loadExtract } from '../src/extract/save.ts'
import { depthPlan } from '../src/extract/depths.ts'
import {
  BOSS_BASE_HP,
  BOSS_HP_MULT,
  CRAB_HP,
  bankRun,
  claimLoot,
  depthMods,
  deploy,
  freshSave,
  killRun,
  spawnRoster,
  step,
  strikeDamage,
  type Input,
} from '../src/extract/sim.ts'

const still: Input = { moveX: 0, moveY: 0, attack: false, dodge: false, interact: false, block: false, use: null }

function memory(): Storage {
  const data = new Map<string, string>()
  return {
    get length() { return data.size },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => { data.delete(key) },
    setItem: (key, value) => { data.set(key, value) },
  }
}

describe('depth, boss, and fresh maps', () => {
  it('gives the boss about four times a crab\'s health and scales later depths', () => {
    expect(BOSS_HP_MULT).toBe(4)
    expect(depthMods(1).bossHp).toBe(BOSS_BASE_HP)
    expect(BOSS_BASE_HP).toBe(CRAB_HP * 4)
    expect(depthMods(2).bossHp).toBeGreaterThan(depthMods(1).bossHp)
    expect(depthMods(2).foeHp).toBeGreaterThan(1)
    expect(depthMods(2).foeDamage).toBeGreaterThan(1)
    expect(depthMods(2).foeDamage).toBeLessThan(1.2)
    const boss = spawnRoster(1, 1).find((foe) => foe.kind === 'boss')!
    expect(boss.hp).toBe(176)
    expect(boss.zone).toBe('sarang')
    expect(spawnRoster(1, 1).filter((foe) => foe.zone === 'tambang').length).toBeGreaterThan(2)
  })

  it('drops a special weapon chest when the boss dies and equips it for more damage', () => {
    const save = freshSave()
    deploy(save, [{ kind: 'sword', n: 1 }])
    const run = save.run!
    const boss = run.foes.find((foe) => foe.id === 'boss-induk')!
    run.zone = 'sarang'
    run.x = boss.x
    run.y = boss.y
    run.facing = 0
    boss.hp = 20
    step(run, { ...still, attack: true }, 0.05)
    for (let i = 0; i < 6; i += 1) step(run, still, 0.05)
    expect(run.slain).toContain('boss-induk')
    expect(run.rewards.some((crate) => crate.id.startsWith('boss-chest'))).toBe(true)
    const chest = run.rewards[0]!
    expect(chest.loot).toContain('tombak')
    expect(chest.spear?.perks.length).toBeGreaterThan(0)
    run.x = chest.x
    run.y = chest.y
    step(run, { ...still, interact: true }, 0.05)
    expect(run.opened).toContain(chest.id)
    const weapon = run.drops.find((drop) => drop.kind === 'tombak')!
    run.age = (weapon.born ?? 0) + 1
    run.x = weapon.x
    run.y = weapon.y
    expect(claimLoot(run, weapon.id, 'local')).toBe('ok')
    expect(run.found.some((spear) => spear.id === chest.spear?.id)).toBe(true)
    expect(run.spear).toBeNull()
    expect(strikeDamage(run)).toBe(24)
  })

  it('starts a new run with a fresh map after extract or death', () => {
    const save = freshSave()
    deploy(save, [{ kind: 'sword', n: 1 }])
    const first = save.run!
    first.opened.push('crate-mine')
    first.slain.push('crab-a')
    first.drops.push({ id: 'leftover', kind: 'scrap', x: 1, y: 1 })
    first.rewards.push({ id: 'boss-chest-1', zone: 'sarang', x: 0, y: 0, loot: ['tombak'] })
    const seed = first.seed
    first.channel = 3
    expect(bankRun(save)).toBe(true)
    expect(save.run).toBeNull()
    deploy(save, [{ kind: 'sword', n: 1 }])
    expect(save.run!.opened).toEqual([])
    expect(save.run!.slain).toEqual([])
    expect(save.run!.drops).toEqual([])
    expect(save.run!.rewards).toEqual([])
    expect(save.run!.seed).not.toBe(seed)
    expect(save.run!.foes.find((foe) => foe.id === 'crab-a')!.hp).toBe(CRAB_HP)
    save.run!.slain.push('boss-induk')
    killRun(save)
    expect(save.depth).toBe(1)
    expect(save.run).toBeNull()
  })

  it('keeps the unlocked depth and migrates an old save that has none', () => {
    const store = memory()
    store.setItem('npcs-burrow-pixel-extract.save.v1', JSON.stringify({
      stash: [{ kind: 'sword', n: 1 }],
      support: 0,
      shield: 4,
      shieldGranted: true,
      run: null,
    }))
    const loaded = loadExtract(store)
    expect(loaded.depth).toBe(1)
    expect(loaded.ventures).toBe(0)
    loaded.depth = 2
    deploy(loaded, [{ kind: 'sword', n: 1 }])
    expect(loaded.depth).toBe(2)
    expect(loaded.run!.depth).toBe(1)
    expect(loaded.run!.foes.find((foe) => foe.kind === 'boss')!.id).toBe('boss-induk')
    expect(depthPlan(2).boss.hp).toBeGreaterThan(depthMods(2).bossHp)
    expect(depthMods(2).bossHp).toBeGreaterThan(BOSS_BASE_HP)
  })
})
