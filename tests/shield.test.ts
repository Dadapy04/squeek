import { describe, expect, it } from 'vitest'
import { setLocale } from '../src/extract/i18n.ts'

setLocale('id')
import { EXTRACT_SAVE_KEY, loadExtract, writeExtract } from '../src/extract/save.ts'
import {
  EXTRACT_TIME,
  HP_MAX,
  SHIELD_MAX,
  bankRun,
  count,
  deploy,
  freshSave,
  killRun,
  step,
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

function strike(run: NonNullable<ReturnType<typeof freshSave>['run']>, block: boolean): void {
  const foe = run.foes.find((item) => item.id === 'crab-a')!
  foe.aim = Math.atan2(run.y - foe.y, run.x - foe.x)
  foe.wind = 0.04
  foe.cd = 0
  step(run, { ...still, block }, 0.05)
}

describe('free starter shield', () => {
  it('starts a new game with one free shield and does not mint another on save', () => {
    const storage = memory()
    const save = freshSave()
    expect(save.shield).toBe(SHIELD_MAX)
    expect(save.shieldGranted).toBe(true)
    writeExtract(storage, save)
    writeExtract(storage, loadExtract(storage))
    expect(loadExtract(storage).shield).toBe(SHIELD_MAX)
  })

  it('gives an existing save one shield beside its old items, once', () => {
    const storage = memory()
    storage.setItem(EXTRACT_SAVE_KEY, JSON.stringify({
      stash: [{ kind: 'relic', n: 2 }],
      support: 3,
      run: { zone: 'tambang', x: 1, y: 2, hp: 80, sword: true, bag: [{ kind: 'ore', n: 1 }] },
    }))
    storage.setItem('npcs-burrow-extraction.save.v1', 'lama')
    const loaded = loadExtract(storage)
    expect(count(loaded.stash, 'relic')).toBe(2)
    expect(loaded.support).toBe(3)
    expect(loaded.run?.hp).toBe(100)
    expect(loaded.run?.shield).toBeNull()
    expect(loaded.shield).toBe(SHIELD_MAX)
    expect(loaded.shieldGranted).toBe(true)
    writeExtract(storage, loaded)
    const again = loadExtract(storage)
    expect(again.shield).toBe(SHIELD_MAX)
    expect(count(again.stash, 'relic')).toBe(2)
    expect(storage.getItem('npcs-burrow-extraction.save.v1')).toBe('lama')
  })

  it('does not replace a shield that already broke', () => {
    const storage = memory()
    storage.setItem(EXTRACT_SAVE_KEY, JSON.stringify({
      shieldGranted: true,
      shield: null,
      stash: [{ kind: 'scrap', n: 3 }],
      run: null,
    }))
    const loaded = loadExtract(storage)
    expect(loaded.shield).toBeNull()
    expect(count(loaded.stash, 'scrap')).toBe(3)
    writeExtract(storage, loaded)
    expect(loadExtract(storage).shield).toBeNull()
  })

  it('carries durability out and back exactly, and death does not issue another', () => {
    const save = freshSave()
    expect(deploy(save, [{ kind: 'sword', n: 1 }], true)).toBeNull()
    expect(save.shield).toBeNull()
    expect(save.run?.shield).toBe(SHIELD_MAX)
    expect(save.run?.bag).toHaveLength(0)
    save.run!.shield = 2
    save.run!.channel = EXTRACT_TIME
    save.run!.zone = 'pangkalan'
    save.run!.x = 0
    save.run!.y = -80
    expect(bankRun(save)).toBe(true)
    expect(save.shield).toBe(2)
    expect(bankRun(save)).toBe(false)
    expect(save.shield).toBe(2)

    expect(deploy(save, [{ kind: 'sword', n: 1 }], true)).toBeNull()
    killRun(save)
    expect(save.shield).toBeNull()
    expect(save.shieldGranted).toBe(true)
    expect(count(save.stash, 'sword')).toBe(1)
  })

  it('blocks a frontal hit, ignores a rear hit, and breaks at zero without coming back', () => {
    const save = freshSave()
    deploy(save, [{ kind: 'sword', n: 1 }], true)
    const run = save.run!
    run.zone = 'tambang'
    run.x = 48
    run.y = 40
    run.facing = -Math.PI / 2
    strike(run, true)
    expect(run.hp).toBe(HP_MAX)
    expect(run.shield).toBe(SHIELD_MAX - 1)

    run.facing = Math.PI / 2
    strike(run, true)
    expect(run.hp).toBeLessThan(HP_MAX)
    expect(run.shield).toBe(SHIELD_MAX - 1)

    run.hp = 100
    run.shield = 1
    run.facing = -Math.PI / 2
    strike(run, true)
    expect(run.hp).toBe(100)
    expect(run.shield).toBeNull()
    expect(run.floats.some((item) => item.text === 'perisai hancur')).toBe(true)
    strike(run, true)
    expect(run.hp).toBeLessThan(100)
    expect(run.shield).toBeNull()
  })

  it('blocks a frontal bolt and lets a hit through when no shield is carried', () => {
    const save = freshSave()
    deploy(save, [{ kind: 'sword', n: 1 }], true)
    const run = save.run!
    run.zone = 'reruntuhan'
    run.x = 30
    run.y = 10
    run.facing = -Math.PI / 2
    const foe = run.foes.find((item) => item.id === 'spit-a')!
    foe.bolt = { x: run.x, y: run.y - 8, vx: 0, vy: 40 }
    step(run, { ...still, block: true }, 0.05)
    expect(run.hp).toBe(HP_MAX)
    expect(run.shield).toBe(SHIELD_MAX - 1)
    expect(foe.bolt).toBeNull()

    const bare = freshSave()
    deploy(bare, [{ kind: 'sword', n: 1 }], false)
    const open = bare.run!
    open.zone = 'tambang'
    open.x = 48
    open.y = 40
    open.facing = -Math.PI / 2
    strike(open, true)
    expect(open.hp).toBeLessThan(HP_MAX)
    expect(open.shield).toBeNull()
  })

  it('keeps a broken shield broken across a reload in the middle of a run', () => {
    const storage = memory()
    const save = freshSave()
    deploy(save, [], true)
    const run = save.run!
    run.zone = 'tambang'
    run.x = 48
    run.y = 40
    run.facing = -Math.PI / 2
    run.shield = 1
    strike(run, true)
    expect(run.shield).toBeNull()
    writeExtract(storage, save)
    const loaded = loadExtract(storage)
    expect(loaded.run?.shield).toBeNull()
    expect(loaded.shield).toBeNull()
    expect(loaded.shieldGranted).toBe(true)
    writeExtract(storage, loaded)
    expect(loadExtract(storage).shield).toBeNull()
    expect(loadExtract(storage).run?.shield).toBeNull()
  })
})
