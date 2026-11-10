import { describe, expect, it } from 'vitest'
import { setLocale } from '../src/extract/i18n.ts'

setLocale('en')
import { COIN_BAND } from '../src/extract/coins.ts'
import { connected, criticalPath, doorPad, generateFloor, oreRoll, oreValue, type FloorChart } from '../src/extract/dungeon.ts'
import { loadExtract, writeExtract, EXTRACT_SAVE_KEY } from '../src/extract/save.ts'
import { deploy, freshSave, miningNoise, step, type Input } from '../src/extract/sim.ts'
import { drawExtract } from '../src/extract/view.ts'

const still: Input = { moveX: 0, moveY: 0, attack: false, dodge: false, interact: false, block: false, use: null, soul: false }

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

function chartOf(run: NonNullable<ReturnType<typeof freshSave>['run']>): FloorChart {
  if (!run.chart) throw new Error('missing chart')
  return run.chart
}

describe('procedural floors', () => {
  it('builds a connected floor of 6 to 10 rooms from the seed', () => {
    const seen = new Set<string>()
    const events = new Set<string>()
    const layouts = new Set<string>()
    for (let seed = 1; seed <= 8; seed += 1) {
      const a = generateFloor(4, seed)
      const b = generateFloor(4, seed)
      expect(a.rooms.length).toBeGreaterThanOrEqual(6)
      expect(a.rooms.length).toBeLessThanOrEqual(10)
      expect(a.rooms.map((room) => room.id).join()).toBe(b.rooms.map((room) => room.id).join())
      expect(connected(a)).toBe(true)
      const path = criticalPath(a)
      expect(path[0]).toBe('room-start')
      expect(path.at(-1)).toBe('room-boss')
      expect(a.rooms.some((room) => room.role === 'fast')).toBe(true)
      expect(a.rooms.some((room) => room.role === 'secret')).toBe(true)
      expect(a.rooms.some((room) => room.role === 'extract')).toBe(true)
      seen.add(a.rooms.map((room) => `${room.role}:${room.layout}:${room.event}`).join('|'))
      for (const room of a.rooms) {
        if (room.zone === 'kamar') events.add(room.event)
        layouts.add(room.layout)
      }
      expect(a.theme).toBe('hive')
    }
    expect(seen.size).toBeGreaterThan(3)
    expect(events.size).toBeGreaterThan(2)
    expect(layouts.size).toBeGreaterThan(3)
    const themes = [1, 2, 3, 4, 5, 6, 7].map((depth) => generateFloor(depth, 2).theme)
    expect(new Set(themes).size).toBe(7)
  })

  it('keeps rest rare and locks a combat room until it is clear', () => {
    let rests = 0
    for (let seed = 1; seed <= 24; seed += 1) {
      if (generateFloor(4, seed).rooms.some((room) => room.role === 'rest')) rests += 1
    }
    expect(rests).toBeGreaterThan(0)
    expect(rests).toBeLessThan(18)
    const save = freshSave()
    expect(deploy(save, [{ kind: 'sword', n: 1 }])).toBeNull()
    const run = save.run!
    const room = chartOf(run).rooms.find((item) => item.zone === 'kamar' && item.doors.some((door) => door.lock === 'combat'))
    expect(room).toBeTruthy()
    const door = room!.doors.find((item) => item.lock === 'combat')!
    run.zone = 'kamar'
    run.roomId = room!.id
    run.x = doorPad(door.dir).x
    run.y = doorPad(door.dir).y
    step(run, still, 0.05)
    expect(run.roomId).toBe(room!.id)
    expect(run.floats.some((item) => item.text === 'The door is still shut')).toBe(true)
    for (const foe of run.foes) {
      if (foe.room === room!.id) {
        foe.hp = 0
        run.slain.push(foe.id)
      }
    }
    run.floats = []
    step(run, still, 0.05)
    expect(run.roomId).not.toBe(room!.id)
  })

  it('reveals the current room on the minimap and keeps an old save', () => {
    const save = freshSave()
    deploy(save, [{ kind: 'sword', n: 1 }])
    const run = save.run!
    expect(run.seenRooms).toContain('room-start')
    run.zone = 'tambang'
    step(run, still, 0.05)
    expect(run.seenRooms).toContain('room-mine')
    const store = memory()
    store.setItem(EXTRACT_SAVE_KEY, JSON.stringify({
      coins: 40,
      swordLevel: 2,
      shield: 4,
      shieldGranted: true,
      stash: [{ kind: 'sword', n: 1 }, { kind: 'relic', n: 1, units: [{ coins: 40, rarity: 'pusaka', origin: 'stash' }] }],
      hpScaled: true,
      run: { zone: 'pangkalan', x: 0, y: 40, hp: 90, sword: true, bag: [], seed: 4, depth: 2 },
    }))
    const loaded = loadExtract(store)
    expect(loaded.coins).toBe(40)
    expect(loaded.swordLevel).toBe(2)
    expect(loaded.stash.some((stack) => stack.kind === 'relic')).toBe(true)
    expect(loaded.run?.zone).toBe('pangkalan')
    expect(loaded.run?.chart?.rooms.length).toBeGreaterThanOrEqual(6)
    expect(loaded.run?.hp).toBe(90)
    writeExtract(store, loaded)
    expect(loadExtract(store).run?.chart?.seed).toBe(loaded.run?.chart?.seed)
  })

  it('keeps a short median frame', () => {
    const save = freshSave()
    deploy(save, [{ kind: 'sword', n: 1 }])
    const run = save.run!
    const calls: string[] = []
    const pen = new Proxy({}, {
      get(_target, prop) {
        if (prop === 'canvas') return { width: 844, height: 390 }
        if (prop === 'measureText') return () => ({ width: 8 })
        if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return () => ({ addColorStop() {} })
        return () => pen
      },
      set() { return true },
    }) as unknown as CanvasRenderingContext2D
    const samples: number[] = []
    for (let i = 0; i < 40; i += 1) {
      const t0 = performance.now()
      step(run, { ...still, moveX: i % 2 ? 1 : 0, moveY: 0.2 }, 0.016)
      drawExtract(pen, run, 844, 390)
      samples.push(performance.now() - t0)
      calls.push('ok')
    }
    samples.sort((a, b) => a - b)
    const median = samples[Math.floor(samples.length / 2)] ?? 0
    console.log(JSON.stringify({ frameMedianMs: Number(median.toFixed(3)), frames: samples.length }))
    expect(median).toBeLessThan(8)
    expect(calls.length).toBe(40)
  })
})

describe('ore table', () => {
  it('keeps valuable ore off the first floors and inside the coin bands', () => {
    for (let salt = 0; salt < 12; salt += 1) {
      const early = oreRoll(1, salt, false)
      expect(['copper', 'silver']).toContain(early.ore)
      expect(['biasa', 'langka']).toContain(early.rarity)
      expect(oreRoll(2, salt, true).rarity === 'legenda').toBe(false)
      const gold = oreRoll(3, salt, false)
      expect(gold.ore).toBe('gold')
      expect(oreRoll(7, salt, true).rarity).toBe('legenda')
      const deep = oreRoll(6, salt, false)
      expect(['spore', 'gem']).toContain(deep.ore)
      expect(deep.rarity).toBe('pusaka')
    }
    for (const rarity of ['biasa', 'langka', 'pusaka', 'legenda'] as const) {
      const coins = oreValue(rarity, 9)
      expect(coins).toBeGreaterThanOrEqual(COIN_BAND[rarity].min)
      expect(coins).toBeLessThanOrEqual(COIN_BAND[rarity].max)
    }
  })

  it('hangs the same torches for a seed and skips some rooms', () => {
    const a = generateFloor(3, 11)
    const b = generateFloor(3, 11)
    expect(a.torches).toEqual(b.torches)
    expect(a.torches.length).toBeGreaterThan(0)
    expect(a.torches.length).toBeLessThan(a.rooms.length * 2)
    const lit = new Set(a.torches.map((torch) => torch.room))
    expect(lit.size).toBeLessThan(a.rooms.length)
    for (const torch of a.torches) {
      const room = a.rooms.find((item) => item.id === torch.room)
      expect(room).toBeTruthy()
      expect(room!.doors.some((door) => door.dir === torch.wall)).toBe(false)
      const onWall = Math.abs(torch.x) > 70 || Math.abs(torch.y) > 110
      expect(onWall).toBe(true)
    }
    const other = generateFloor(3, 12)
    expect(other.torches.map((torch) => `${torch.room}:${torch.wall}:${torch.x}`).join('|')).not.toBe(
      a.torches.map((torch) => `${torch.room}:${torch.wall}:${torch.x}`).join('|'),
    )
    expect(generateFloor(1, 4).torches).toEqual(generateFloor(1, 4).torches)
    expect(generateFloor(5, 4).torches.length).toBeGreaterThan(0)
    expect(generateFloor(7, 4).torches.length).toBeGreaterThan(0)
  })
})
