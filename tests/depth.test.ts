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
    expect(boss.hp).toBe(216)
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

  it('moves the kelabang the same distance at 60 and 120 fps', () => {
    function chase(dt: number, frames: number): number {
      const save = freshSave()
      deploy(save, [{ kind: 'sword', n: 1 }])
      const run = save.run!
      const boss = run.foes.find((foe) => foe.kind === 'boss')!
      run.zone = boss.zone
      run.x = boss.x + 90
      run.y = boss.y
      boss.heard = 0
      boss.wind = 0
      boss.dash = 0
      boss.cd = 9
      const x0 = boss.x
      const y0 = boss.y
      for (let i = 0; i < frames; i += 1) step(run, still, dt)
      return Math.hypot(boss.x - x0, boss.y - y0)
    }
    const at60 = chase(1 / 60, 60)
    const at120 = chase(1 / 120, 120)
    expect(Math.abs(at60 - at120)).toBeLessThan(1.5)
    expect(at60).toBeGreaterThan(10)
    expect(at60).toBeLessThan(22)
  })

  it('dashes a brute only after the telegraph and does not spam a chest prompt', () => {
    const save = freshSave()
    deploy(save, [{ kind: 'sword', n: 1 }])
    const run = save.run!
    const brute = run.foes.find((foe) => foe.kind === 'brute')!
    run.zone = brute.zone
    run.x = brute.x + 30
    run.y = brute.y
    brute.wind = 0.16
    brute.dash = 0
    brute.cd = 0
    brute.heard = 0
    step(run, still, 1 / 60)
    expect(brute.dash).toBe(0)
    for (let i = 0; i < 20 && brute.wind > 0; i += 1) step(run, still, 1 / 60)
    expect(brute.wind).toBeLessThanOrEqual(0)
    expect(brute.dash).toBeGreaterThan(0)
    const chest = run.chart!.props.find((prop) => prop.kind === 'chest')!
    run.zone = chest.zone
    run.roomId = chest.room
    run.seed = run.chart!.seed
    run.depth = run.chart!.depth
    run.x = chest.x
    run.y = chest.y
    run.floats = []
    for (let i = 0; i < 90; i += 1) step(run, still, 1 / 60)
    expect(run.floats.filter((item) => /chest|peti|open|buka|key|kunci/i.test(item.text))).toHaveLength(0)
    chest.lock = 'key'
    chest.state = 'live'
    run.keys = 0
    const press = { ...still, interact: true }
    step(run, press, 1 / 60)
    step(run, press, 1 / 60)
    expect(run.floats.filter((item) => item.text === 'The chest is locked')).toHaveLength(1)
    expect(chest.state).toBe('live')
  })
})
