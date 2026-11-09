import { describe, expect, it } from 'vitest'
import { setLocale } from '../src/extract/i18n.ts'

setLocale('id')
import { EXTRACT_SAVE_KEY, loadExtract, writeExtract } from '../src/extract/save.ts'
import {
  BAG_SLOTS,
  EXTRACT_TIME,
  HP_MAX,
  bagCount,
  EXTRACT_ZONE,
  bankRun,
  count,
  deploy,
  freshSave,
  give,
  killRun,
  localValue,
  step,
  useItem,
  type Input,
  type ItemKind,
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

function ticks(run: NonNullable<ReturnType<typeof freshSave>['run']>, input: Input, n: number) {
  let result: ReturnType<typeof step> = 'play'
  for (let i = 0; i < n; i += 1) result = step(run, input, 0.05)
  return result
}

describe('pixel extraction accounting', () => {
  it('deploys loadout out of the stash and refuses a second deploy', () => {
    const save = freshSave()
    expect(deploy(save, [{ kind: 'sword', n: 1 }, { kind: 'bandage', n: 1 }])).toBeNull()
    expect(count(save.stash, 'sword')).toBe(0)
    expect(count(save.stash, 'bandage')).toBe(1)
    expect(save.run?.sword).toBe(true)
    expect(count(save.run?.bag ?? [], 'bandage')).toBe(1)
    expect(deploy(save, [{ kind: 'bandage', n: 1 }])).toMatch(/galian/)
  })

  it('banks carried gear and loot once, and leaving the circle banks nothing', () => {
    const save = freshSave()
    deploy(save, [{ kind: 'sword', n: 1 }, { kind: 'bandage', n: 1 }])
    const run = save.run!
    give(run, 'relic')
    run.x = EXTRACT_ZONE.x
    run.y = EXTRACT_ZONE.y
    run.zone = 'pangkalan'
    run.channel = EXTRACT_TIME - 0.04
    expect(step(run, still, 0.05)).toBe('extracted')
    expect(bankRun(save)).toBe(true)
    expect(save.run).toBeNull()
    expect(count(save.stash, 'sword')).toBe(1)
    expect(count(save.stash, 'bandage')).toBe(2)
    expect(count(save.stash, 'relic')).toBe(1)
    expect(bankRun(save)).toBe(false)
    expect(count(save.stash, 'relic')).toBe(1)

    const again = freshSave()
    deploy(again, [{ kind: 'sword', n: 1 }])
    const live = again.run!
    live.x = EXTRACT_ZONE.x
    live.y = EXTRACT_ZONE.y
    live.channel = 2
    live.x = 80
    step(live, still, 0.05)
    expect(live.channel).toBe(0)
    expect(bankRun(again)).toBe(false)
    expect(count(again.stash, 'sword')).toBe(0)
  })

  it('cancels a channel when the player is still hurt', () => {
    const save = freshSave()
    deploy(save, [{ kind: 'sword', n: 1 }])
    const run = save.run!
    run.x = EXTRACT_ZONE.x
    run.y = EXTRACT_ZONE.y
    run.channel = 2
    run.hurt = 0.2
    step(run, still, 0.05)
    expect(run.channel).toBe(0)
    expect(bankRun(save)).toBe(false)
  })

  it('death drops the deployed loadout and only restocks a missing sword', () => {
    const lost = freshSave()
    deploy(lost, [{ kind: 'sword', n: 1 }, { kind: 'bandage', n: 2 }])
    give(lost.run!, 'ore')
    killRun(lost)
    expect(lost.run).toBeNull()
    expect(count(lost.stash, 'sword')).toBe(1)
    expect(count(lost.stash, 'bandage')).toBe(1)
    expect(count(lost.stash, 'ore')).toBe(0)

    const kept = freshSave()
    addSpare(kept)
    deploy(kept, [{ kind: 'sword', n: 1 }])
    killRun(kept)
    expect(count(kept.stash, 'sword')).toBe(1)
    expect(count(kept.stash, 'bandage')).toBe(2)
  })

  it('reloads a live run without putting the same gear back in the stash', () => {
    const storage = memory()
    storage.setItem('npcs-burrow-extraction.save.v1', '{"bank":{"relic":9}}')
    storage.setItem('npcs-battle-arena.save.v1', 'arena')
    const save = freshSave()
    deploy(save, [{ kind: 'sword', n: 1 }, { kind: 'bandage', n: 1 }])
    give(save.run!, 'shard')
    const foe = save.run!.foes.find((item) => item.id === 'crab-a')
    if (foe) foe.hp = 11
    expect(writeExtract(storage, save)).toBe(true)
    const loaded = loadExtract(storage)
    expect(loaded.run).not.toBeNull()
    expect(count(loaded.stash, 'sword')).toBe(0)
    expect(count(loaded.stash, 'bandage')).toBe(1)
    expect(count(loaded.run?.bag ?? [], 'bandage')).toBe(1)
    expect(count(loaded.run?.bag ?? [], 'shard')).toBe(1)
    expect(loaded.run?.foes.find((item) => item.id === 'crab-a')?.hp).toBe(11)
    expect(deploy(loaded, [{ kind: 'bandage', n: 1 }])).toMatch(/galian/)
    expect(storage.getItem('npcs-burrow-extraction.save.v1')).toBe('{"bank":{"relic":9}}')
    expect(storage.getItem('npcs-battle-arena.save.v1')).toBe('arena')
    expect(storage.getItem(EXTRACT_SAVE_KEY)).toContain('shard')
  })

  it('fills twelve carried slots, uses a bandage, and prices loot in local units', () => {
    const save = freshSave()
    deploy(save, [{ kind: 'sword', n: 1 }])
    const run = save.run!
    const kinds: ItemKind[] = ['bandage', 'tonic', 'scrap', 'ore', 'relic']
    for (const kind of kinds) expect(give(run, kind)).toBe(true)
    expect(give(run, 'shard')).toBe(true)
    run.hp = 40
    expect(useItem(run, 'bandage')).toBe(true)
    expect(run.hp).toBe(90)
    expect(count(run.bag, 'bandage')).toBe(0)
    expect(localValue(run.bag)).toBeGreaterThan(0)
    const relic = run.bag.find((stack) => stack.kind === 'relic')!
    const scrap = run.bag.find((stack) => stack.kind === 'scrap')!
    expect(relic.units?.[0]?.coins).toBeGreaterThan(scrap.units?.[0]?.coins ?? 0)
    for (let i = bagCount(run.bag); i < BAG_SLOTS; i += 1) expect(give(run, 'scrap')).toBe(true)
    expect(bagCount(run.bag)).toBe(BAG_SLOTS)
    expect(give(run, 'scrap')).toBe(false)
    expect(give(run, 'relic')).toBe(false)
  })

  it('sword hits a foe in the arc and whiffs when aimed away', () => {
    const save = freshSave()
    deploy(save, [{ kind: 'sword', n: 1 }])
    const run = save.run!
    run.zone = 'tambang'
    run.x = 10
    run.y = 10
    run.facing = 0
    const foe = run.foes.find((item) => item.id === 'crab-a')!
    const before = foe.hp
    step(run, { ...still, attack: true }, 0.05)
    expect(foe.hp).toBe(before)
    ticks(run, still, 4)
    expect(foe.hp).toBe(before - 24)
    expect(run.floats.some((item) => item.text === 'Meleset')).toBe(false)
    run.facing = Math.PI
    run.attackCd = 0
    run.swing = 0
    run.stam = 100
    step(run, { ...still, attack: true }, 0.05)
    ticks(run, still, 8)
    expect(foe.hp).toBe(before - 24)
    expect(run.floats.some((item) => item.text === 'Meleset')).toBe(true)
  })

  it('stops the walk cycle when the wall blocks movement', () => {
    const save = freshSave()
    deploy(save, [{ kind: 'sword', n: 1 }])
    const run = save.run!
    run.x = -98
    run.y = 0
    run.gait = 2
    ticks(run, { ...still, moveX: -1 }, 4)
    expect(run.x).toBe(-98)
    expect(run.stepping).toBe(false)
    expect(run.gait).toBeLessThan(1)
  })

  it('walks through a zone edge in small steps', () => {
    const save = freshSave()
    deploy(save, [{ kind: 'sword', n: 1 }])
    const run = save.run!
    run.y = 120
    ticks(run, { ...still, moveY: 1 }, 30)
    expect(run.zone).toBe('tambang')
  })

  it('a crab telegraph lands, and a dodge in the swing window does not', () => {
    const save = freshSave()
    deploy(save, [{ kind: 'sword', n: 1 }])
    const run = save.run!
    run.zone = 'tambang'
    run.x = 48
    run.y = 40
    const foe = run.foes.find((item) => item.id === 'crab-a')!
    foe.cd = 0
    ticks(run, still, 1)
    expect(foe.wind).toBeGreaterThan(0)
    ticks(run, still, 12)
    expect(run.hp).toBeLessThan(HP_MAX)

    const dodged = freshSave()
    deploy(dodged, [{ kind: 'sword', n: 1 }])
    const safe = dodged.run!
    safe.zone = 'tambang'
    safe.x = 48
    safe.y = 40
    const other = safe.foes.find((item) => item.id === 'crab-a')!
    other.cd = 0
    ticks(safe, still, 1)
    safe.dodge = 1
    ticks(safe, still, 12)
    expect(safe.hp).toBe(HP_MAX)
  })
})

function addSpare(save: ReturnType<typeof freshSave>): void {
  const stack = save.stash.find((item) => item.kind === 'sword')
  if (stack) stack.n += 1
}
