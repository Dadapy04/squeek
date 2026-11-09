import { describe, expect, it } from 'vitest'
import { isRuinGrout } from '../src/extract/patterns.ts'
import { loadExtract } from '../src/extract/save.ts'
import { worldPoint } from '../src/extract/minimap.ts'
import {
  BOSS_BASE_HP,
  NEST_DOOR,
  PLAYER_R,
  ZONE_H,
  deploy,
  freshSave,
  nestGap,
  step,
  type Input,
} from '../src/extract/sim.ts'

const south: Input = { moveX: 0, moveY: 1, attack: false, dodge: false, interact: false, block: false, use: null }
const north: Input = { ...south, moveY: -1 }
const still: Input = { ...south, moveY: 0 }

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

function longestRun(gy: number): number {
  let best = 0
  let run = 0
  for (let gx = -160; gx <= 160; gx += 1) {
    if (isRuinGrout(gx, gy)) {
      run += 1
      best = Math.max(best, run)
    } else run = 0
  }
  return best
}

describe('sarang door, boss migration, and the ruin seam', () => {
  it('does not paint a full-width black grout line across the ruins', () => {
    for (const gy of [0, 64, -64, 10, 32, -128]) {
      expect(longestRun(gy)).toBeLessThan(8)
    }
  })

  it('opens the south of the ruins into the nest and keeps the boss on the first screen', () => {
    expect(nestGap('reruntuhan')).toBe('south')
    expect(nestGap('sarang')).toBe('north')
    const ruins = worldPoint('reruntuhan', 0, ZONE_H / 2)
    const nest = worldPoint('sarang', 0, -ZONE_H / 2)
    expect(nest.y).toBeGreaterThan(ruins.y - 1)
    expect(nest.x).toBeCloseTo(ruins.x, 5)

    const save = freshSave()
    deploy(save, [{ kind: 'sword', n: 1 }])
    const run = save.run!
    const bottom = ZONE_H / 2 - PLAYER_R
    run.zone = 'reruntuhan'
    run.x = NEST_DOOR + 30
    run.y = bottom
    for (let i = 0; i < 8; i += 1) step(run, south, 0.05)
    expect(run.zone).toBe('reruntuhan')

    run.x = 0
    run.y = bottom - 2
    for (let i = 0; i < 20 && run.zone === 'reruntuhan'; i += 1) step(run, south, 0.05)
    expect(run.zone).toBe('sarang')
    const boss = run.foes.find((foe) => foe.id === 'boss-induk')!
    expect(boss.hp).toBe(BOSS_BASE_HP)
    expect(boss.y).toBeLessThan(-20)
    expect(Math.hypot(boss.x - run.x, boss.y - run.y)).toBeLessThan(90)
    const seen = []
    for (let i = 0; i < 12; i += 1) {
      step(run, south, 0.05)
      seen.push(run.zone)
    }
    expect(seen.every((zone) => zone === 'sarang')).toBe(true)

    run.x = 0
    run.y = -ZONE_H / 2 + PLAYER_R
    step(run, north, 0.05)
    expect(run.zone).toBe('reruntuhan')
  })

  it('adds Induk to a resumed run saved before the nest existed', () => {
    const store = memory()
    store.setItem('npcs-burrow-pixel-extract.save.v1', JSON.stringify({
      stash: [{ kind: 'sword', n: 1 }],
      support: 0,
      shield: 4,
      shieldGranted: true,
      run: {
        zone: 'reruntuhan',
        x: 4,
        y: 20,
        hp: 77,
        stam: 40,
        facing: 0.4,
        sword: true,
        shield: 3,
        bag: [{ kind: 'scrap', n: 2 }],
        opened: ['crate-mine'],
        slain: [],
        drops: [],
        foes: [
          { id: 'crab-a', zone: 'tambang', kind: 'crab', x: 48, y: 10, hp: 20 },
          { id: 'crab-b', zone: 'tambang', kind: 'crab', x: -55, y: 60, hp: 44 },
          { id: 'crab-c', zone: 'reruntuhan', kind: 'crab', x: -30, y: 40, hp: 44 },
          { id: 'spit-a', zone: 'reruntuhan', kind: 'spitter', x: 30, y: -30, hp: 12 },
        ],
      },
    }))
    const save = loadExtract(store)
    const run = save.run!
    expect(save.depth).toBe(1)
    expect(run.zone).toBe('reruntuhan')
    expect(run.hp).toBe(96)
    expect(run.foes.find((foe) => foe.id === 'crab-a')!.hp).toBe(20)
    expect(run.foes.find((foe) => foe.id === 'spit-a')!.hp).toBe(12)
    const boss = run.foes.find((foe) => foe.id === 'boss-induk')!
    expect(boss.zone).toBe('sarang')
    expect(boss.hp).toBe(BOSS_BASE_HP)
    expect(boss.y).toBeLessThan(0)
    expect(run.foes.some((foe) => foe.kind === 'brute')).toBe(true)
    expect(run.foes.some((foe) => foe.kind === 'lurker')).toBe(true)
    expect(run.opened).toEqual(['crate-mine'])
    void still
  })
})
