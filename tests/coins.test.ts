import { describe, expect, it } from 'vitest'
import { COIN_BAND, COIN_RARITIES, coinsFor, mintUnit } from '../src/extract/coins.ts'
import { EXTRACT_SAVE_KEY, loadExtract, writeExtract } from '../src/extract/save.ts'
import { HP_MAX, HP_OLD, bankRun, deploy, freshSave, freshValue, give, killRun, localValue, stashValue, step, type Input, type ItemUnit } from '../src/extract/sim.ts'

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

describe('koin and hit points', () => {
  it('keeps rarity bands from overlapping and stores a rolled value', () => {
    for (let i = 0; i < COIN_RARITIES.length - 1; i += 1) {
      const low = COIN_RARITIES[i]!
      const high = COIN_RARITIES[i + 1]!
      expect(COIN_BAND[high].min).toBeGreaterThan(COIN_BAND[low].max)
    }
    for (const rarity of COIN_RARITIES) {
      for (let seed = 1; seed <= 30; seed += 1) {
        const coins = coinsFor(rarity, seed)
        expect(coins).toBe(coinsFor(rarity, seed))
        expect(coins).toBeGreaterThanOrEqual(COIN_BAND[rarity].min)
        expect(coins).toBeLessThanOrEqual(COIN_BAND[rarity].max)
      }
    }
    const relic = mintUnit('relic', 4, 'loot')
    const scrap = mintUnit('scrap', 4, 'loot')
    expect(relic.coins).toBeGreaterThan(scrap.coins)
  })

  it('rolls a stable coin when a run is handed a unit with no value', () => {
    const save = freshSave()
    deploy(save, [{ kind: 'sword', n: 1 }])
    const run = save.run!
    run.bag.push(
      { kind: 'scrap', n: 1, units: [{ origin: 'loot' } as ItemUnit] },
      { kind: 'ore', n: 1, units: [{ coins: Number.NaN, rarity: 'langka', origin: 'loot' } as ItemUnit] },
      { kind: 'sword', n: 1 },
    )
    const once = localValue(run.bag)
    const twice = localValue(run.bag)
    const fresh = freshValue(run)
    expect(Number.isFinite(once)).toBe(true)
    expect(once).toBe(twice)
    expect(fresh).toBe(once)
    expect(String(once)).not.toContain('NaN')
    const scrap = run.bag.find((stack) => stack.kind === 'scrap')!.units![0]!
    const ore = run.bag.find((stack) => stack.kind === 'ore')!.units![0]!
    expect(scrap.coins).toBeGreaterThanOrEqual(COIN_BAND[scrap.rarity].min)
    expect(scrap.coins).toBeLessThanOrEqual(COIN_BAND[scrap.rarity].max)
    expect(ore.rarity).toBe('langka')
    expect(ore.coins).toBeGreaterThanOrEqual(COIN_BAND.langka.min)
    expect(ore.coins).toBeLessThanOrEqual(COIN_BAND.langka.max)
    expect(ore.origin).toBe('loot')
  })

  it('adds only newly looted koin, and death drops carried stash goods', () => {
    const save = freshSave()
    const before = stashValue(save)
    const home = save.stash.find((stack) => stack.kind === 'bandage')!.units![0]!.coins
    expect(deploy(save, [{ kind: 'bandage', n: 1 }])).toBeNull()
    expect(stashValue(save)).toBe(before - home)
    const run = save.run!
    expect(run.bag[0]?.units?.[0]?.origin).toBe('stash')
    expect(give(run, 'relic', 77)).toBe(true)
    const gained = freshValue(run)
    expect(gained).toBe(run.bag.find((stack) => stack.kind === 'relic')!.units![0]!.coins)
    expect(gained).toBeGreaterThan(home)
    run.channel = 3
    expect(bankRun(save)).toBe(true)
    expect(stashValue(save)).toBe(before + gained)
    expect(freshValue(run)).toBe(gained)

    const again = freshSave()
    const kept = again.stash.find((stack) => stack.kind === 'bandage')!.units![1]!.coins
    deploy(again, [{ kind: 'bandage', n: 1 }])
    give(again.run!, 'shard', 9)
    killRun(again)
    const left = again.stash.find((stack) => stack.kind === 'bandage')!
    expect(left.n).toBe(1)
    expect(left.units![0]!.coins).toBe(kept)
    expect(stashValue(again)).toBe(kept)
    expect(again.stash.some((stack) => stack.kind === 'shard')).toBe(false)
  })

  it('gives an old stash a stable koin value once', () => {
    const store = memory()
    store.setItem(EXTRACT_SAVE_KEY, JSON.stringify({
      stash: [{ kind: 'relic', n: 2 }, { kind: 'scrap', n: 1 }, { kind: 'sword', n: 1 }],
      support: 0,
      ventures: 2,
    }))
    const loaded = loadExtract(store)
    const first = stashValue(loaded)
    expect(first).toBeGreaterThan(0)
    expect(loaded.stash.find((stack) => stack.kind === 'sword')?.units).toBeUndefined()
    writeExtract(store, loaded)
    const raw = JSON.parse(store.getItem(EXTRACT_SAVE_KEY)!) as { stash: Array<{ kind: string; units?: Array<{ coins: number }> }>; hpScaled?: boolean }
    expect(raw.hpScaled).toBe(true)
    const relic = raw.stash.find((stack) => stack.kind === 'relic')!
    expect(relic.units).toHaveLength(2)
    const again = loadExtract(store)
    expect(stashValue(again)).toBe(first)
    expect(again.stash.find((stack) => stack.kind === 'relic')?.units?.map((unit) => unit.coins)).toEqual(relic.units!.map((unit) => unit.coins))
  })

  it('raises max health by a quarter and scales a resumed run once', () => {
    expect(HP_OLD).toBe(100)
    expect(HP_MAX).toBe(125)
    const crab = 18
    const boss = 22
    expect(Math.ceil(HP_OLD / crab)).toBe(6)
    expect(Math.ceil(HP_MAX / crab)).toBe(7)
    expect(Math.ceil(HP_OLD / boss)).toBe(5)
    expect(Math.ceil(HP_MAX / boss)).toBe(6)
    const store = memory()
    store.setItem(EXTRACT_SAVE_KEY, JSON.stringify({
      stash: [{ kind: 'sword', n: 1 }],
      run: { zone: 'pangkalan', x: 0, y: 70, hp: 100, sword: true, bag: [] },
    }))
    const loaded = loadExtract(store)
    expect(loaded.run?.hp).toBe(125)
    writeExtract(store, loaded)
    loaded.run!.hp = 80
    writeExtract(store, loaded)
    expect(loadExtract(store).run?.hp).toBe(80)
    const save = freshSave()
    deploy(save, [{ kind: 'sword', n: 1 }])
    const run = save.run!
    expect(run.hp).toBe(HP_MAX)
    run.zone = 'tambang'
    run.x = 48
    run.y = 40
    const foe = run.foes.find((item) => item.id === 'crab-a')!
    foe.cd = 0
    step(run, still, 0.05)
    for (let i = 0; i < 12; i += 1) step(run, still, 0.05)
    expect(HP_MAX - run.hp).toBe(crab)
  })
})
