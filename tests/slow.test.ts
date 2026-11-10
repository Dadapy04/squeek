import { describe, expect, it } from 'vitest'
import { SLOW_RADIUS, deploy, freshSave, isSlowed, slowPixels, slowZones, step, warpFloor, zoneHits, type Input, type SlowKind } from '../src/extract/sim.ts'

const still: Input = { moveX: 0, moveY: 0, attack: false, dodge: false, interact: false, block: false, use: null, soul: false }
const right: Input = { ...still, moveX: 1 }

function travel(run: NonNullable<ReturnType<typeof freshSave>['run']>, frames: number): number {
  const start = run.x
  for (let i = 0; i < frames; i += 1) step(run, right, 0.05)
  return run.x - start
}

describe('slow zones', () => {
  it('keeps full speed on open floor and does not grow a sticky timer', () => {
    const save = freshSave()
    save.depth = 2
    expect(deploy(save, [{ kind: 'sword', n: 1 }], false, 4)).toBeNull()
    const run = save.run!
    warpFloor(run, 2)
    run.zone = 'pangkalan'
    run.roomId = run.chart!.rooms.find((room) => room.zone === 'pangkalan')!.id
    run.x = -40
    run.y = 20
    expect(slowZones(run).some((zone) => zoneHits(zone, run.x, run.y))).toBe(false)
    expect(isSlowed(run)).toBe(false)
    const moved = travel(run, 10)
    expect(moved).toBeCloseTo(92 * 0.5, 1)
    expect(run.snare ?? 0).toBe(0)
    run.snare = 0.65
    for (let i = 0; i < 14; i += 1) step(run, still, 0.05)
    expect(run.snare ?? 0).toBe(0)
    expect(isSlowed(run)).toBe(false)
    const again = travel(run, 4)
    expect(again).toBeCloseTo(92 * 0.2, 1)
  })

  it('slows only while standing in a moss root, cocoon, or digger trail, then lets go', () => {
    const save = freshSave()
    save.depth = 2
    deploy(save, [{ kind: 'sword', n: 1 }], false, 6)
    const run = save.run!
    warpFloor(run, 2)
    const root = run.chart!.props.find((prop) => prop.kind === 'root')!
    run.zone = root.zone
    run.roomId = root.room
    run.x = root.x
    run.y = root.y
    expect(isSlowed(run)).toBe(true)
    expect(run.snare ?? 0).toBe(0)
    const slowed = travel(run, 1)
    expect(slowed).toBeCloseTo(92 * 0.45 * 0.05, 2)
    expect(run.snare ?? 0).toBe(0)
    run.x = root.x + SLOW_RADIUS.root + 6
    run.y = root.y
    expect(isSlowed(run)).toBe(false)
    const free = travel(run, 1)
    expect(free).toBeCloseTo(92 * 0.05, 2)

    const nest = freshSave()
    nest.depth = 6
    deploy(nest, [{ kind: 'sword', n: 1 }], false, 8)
    const deep = nest.run!
    warpFloor(deep, 6)
    const cocoon = deep.chart!.props.find((prop) => prop.kind === 'cocoon')!
    deep.zone = cocoon.zone
    deep.roomId = cocoon.room
    deep.x = cocoon.x
    deep.y = cocoon.y
    expect(isSlowed(deep)).toBe(true)
    deep.x = cocoon.x + SLOW_RADIUS.cocoon + 4
    expect(isSlowed(deep)).toBe(false)
    expect(deep.snare ?? 0).toBe(0)

    const digger = run.foes.find((foe) => foe.kind === 'burrow')!
    run.zone = digger.zone
    run.roomId = run.chart!.rooms.find((room) => room.zone === digger.zone)!.id
    digger.cd = 9
    digger.wind = 0
    digger.marks = [{ x: -70, y: -80, life: 0.04 }]
    run.x = -70
    run.y = -80
    expect(slowZones(run).some((zone) => zone.kind !== 'trail' && zoneHits(zone, run.x, run.y))).toBe(false)
    expect(isSlowed(run)).toBe(true)
    step(run, still, 0.05)
    expect(digger.marks?.some((mark) => mark.life > 0)).toBe(false)
    expect(run.snare ?? 0).toBe(0)
    expect(isSlowed(run)).toBe(false)
    const after = travel(run, 1)
    expect(after).toBeCloseTo(92 * 0.05, 2)
  })

  it('draws each slow patch inside its hit circle', () => {
    const kinds = Object.keys(SLOW_RADIUS) as SlowKind[]
    for (const kind of kinds) {
      const zone = { x: 3, y: -5, r: SLOW_RADIUS[kind], kind }
      const dots = slowPixels(zone)
      expect(dots.length, kind).toBeGreaterThan(8)
      for (const dot of dots) expect(zoneHits({ ...zone, x: 0, y: 0 }, dot.x, dot.y), kind).toBe(true)
      expect(dots.some((dot) => Math.hypot(dot.x, dot.y) > zone.r - 3), kind).toBe(true)
      expect(zoneHits(zone, zone.x + zone.r + 1, zone.y), kind).toBe(false)
      expect(zoneHits(zone, zone.x, zone.y), kind).toBe(true)
    }
    const save = freshSave()
    save.depth = 2
    deploy(save, [{ kind: 'sword', n: 1 }], false, 3)
    const run = save.run!
    warpFloor(run, 2)
    for (const zone of slowZones(run)) expect(zone.r).toBe(SLOW_RADIUS[zone.kind])
  })
})
