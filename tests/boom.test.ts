import { describe, expect, it } from 'vitest'
import { BLAST_RADIUS, CHAIN_FUSE, FUSE_TIME, deploy, freshSave, step, type Input, type Run } from '../src/extract/sim.ts'
import { BOOM_FRAMES, BOOM_SECONDS, boomFrame, drawBoomFrame, drawBoomStrip, drawFuse } from '../src/extract/view.ts'
import type { PropNode } from '../src/extract/dungeon.ts'

const still: Input = { moveX: 0, moveY: 0, attack: false, dodge: false, interact: false, block: false, use: null, soul: false }

function pen(): { ctx: CanvasRenderingContext2D; colors: string[] } {
  const colors: string[] = []
  const ctx = {
    fillStyle: '',
    globalAlpha: 1,
    imageSmoothingEnabled: false,
    save() {},
    restore() {},
    fillRect() { colors.push(String(ctx.fillStyle)) },
    beginPath() {},
    arc() {},
    fill() { colors.push(String(ctx.fillStyle)) },
    stroke() {},
    translate() {},
    rotate() {},
  }
  return { ctx: ctx as unknown as CanvasRenderingContext2D, colors }
}

describe('barrel explosion', () => {
  it('plays nine frames across half a second and keeps the 52px blast', () => {
    expect(BOOM_FRAMES).toBe(9)
    expect(BOOM_SECONDS).toBe(0.5)
    expect(boomFrame(0.5)).toBe(0)
    expect(boomFrame(0.25)).toBe(4)
    expect(boomFrame(0.01)).toBe(8)
    expect(BLAST_RADIUS).toBe(52)
    const save = freshSave()
    expect(deploy(save, [{ kind: 'sword', n: 1 }])).toBeNull()
    const run = save.run!
    for (const prop of run.chart!.props) prop.state = 'spent'
    const barrel: PropNode = {
      id: 'boom-barrel',
      room: run.roomId ?? 'room-start',
      zone: run.zone,
      kind: 'barrel',
      x: run.x + 20,
      y: run.y,
      state: 'live',
      loot: [],
      lock: 'none',
    }
    run.chart!.props.push(barrel)
    const foe = run.foes.find((item) => item.hp > 0)!
    foe.zone = run.zone
    foe.room = run.roomId
    foe.x = barrel.x + 40
    foe.y = barrel.y
    const before = foe.hp
    const hp = run.hp
    step(run, { ...still, interact: true }, 0.05)
    expect(barrel.state).toBe('live')
    expect(barrel.fuse).toBe(FUSE_TIME)
    expect(run.hp).toBe(hp)
    expect(foe.hp).toBe(before)
    expect(run.booms ?? []).toHaveLength(0)
    let steps = 0
    while (barrel.state === 'live' && steps < 30) {
      step(run, still, 0.05)
      steps += 1
    }
    expect(steps * 0.05).toBeGreaterThan(0.9)
    expect(steps * 0.05).toBeLessThan(1.15)
    expect(barrel.state).toBe('spent')
    expect(run.hp).toBe(hp - 18)
    expect(foe.hp).toBe(before - 24)
    expect(run.booms?.[0]?.life).toBeCloseTo(0.5, 5)
    expect(run.shake ?? 0).toBeGreaterThan(0)
    expect(run.boomPing).toBe(1)
    const far = freshSave()
    deploy(far, [{ kind: 'sword', n: 1 }])
    const other = far.run as Run
    for (const prop of other.chart!.props) prop.state = 'spent'
    const distant = other.foes.find((item) => item.hp > 0)!
    distant.zone = other.zone
    distant.room = other.roomId
    distant.x = other.x + BLAST_RADIUS + 30
    distant.y = other.y
    const barrel2: PropNode = { ...barrel, id: 'boom-far', x: other.x + 16, y: other.y, room: other.roomId ?? 'room-start', zone: other.zone }
    other.chart!.props.push(barrel2)
    const farHp = distant.hp
    step(other, { ...still, interact: true }, 0.05)
    for (let i = 0; i < 24 && barrel2.state === 'live'; i += 1) step(other, still, 0.05)
    expect(barrel2.state).toBe('spent')
    expect(distant.hp).toBe(farHp)
  })

  it('paints a white flash, fire, smoke, and a dark outline', () => {
    const colors = new Set<string>()
    for (let frame = 0; frame < BOOM_FRAMES; frame += 1) {
      const painted = pen()
      drawBoomFrame(painted.ctx, 80, 80, 2, frame)
      for (const color of painted.colors) colors.add(color)
    }
    expect(colors.has('#fffaf2')).toBe(true)
    expect(colors.has('#ffb020')).toBe(true)
    expect(colors.has('#1a120e')).toBe(true)
    expect(colors.has('#6e645c')).toBe(true)
    expect(colors.has('#8a5a32')).toBe(true)
    const strip = pen()
    drawBoomStrip(strip.ctx, 900, 220)
    expect(strip.colors.length).toBeGreaterThan(40)
    const fuse = pen()
    drawFuse(fuse.ctx, 120, 80, 2, 0.7, 1, 0.12)
    expect(fuse.colors).toContain('#e10600')
    expect(fuse.colors).toContain('#fff6d0')
  })

  it('lets the player walk out before the blast and chains a neighbor on a short fuse', () => {
    const save = freshSave()
    deploy(save, [{ kind: 'sword', n: 1 }])
    const run = save.run!
    for (const prop of run.chart!.props) prop.state = 'spent'
    const barrel: PropNode = {
      id: 'fuse-a',
      room: run.roomId ?? 'room-start',
      zone: run.zone,
      kind: 'barrel',
      x: -30,
      y: run.y,
      state: 'live',
      loot: [],
      lock: 'none',
    }
    const neighbor: PropNode = {
      ...barrel,
      id: 'fuse-b',
      x: 18,
    }
    run.chart!.props.push(barrel, neighbor)
    run.x = barrel.x + 16
    for (const foe of run.foes) {
      if (!run.slain.includes(foe.id)) run.slain.push(foe.id)
      foe.hp = 0
    }
    const foe = run.foes[0]!
    run.slain = run.slain.filter((id) => id !== foe.id)
    foe.hp = 40
    foe.zone = run.zone
    foe.room = run.roomId
    foe.x = neighbor.x + 32
    foe.y = neighbor.y
    const foeHp = foe.hp
    const hp = run.hp
    step(run, { ...still, interact: true }, 0.05)
    run.x = -90
    let steps = 0
    while (barrel.state === 'live' && steps < 30) {
      step(run, still, 0.05)
      steps += 1
    }
    expect(barrel.state).toBe('spent')
    expect(run.hp).toBe(hp)
    expect(foe.hp).toBe(foeHp)
    expect(neighbor.state).toBe('live')
    expect(neighbor.fuse ?? 0).toBeCloseTo(CHAIN_FUSE, 2)
    let chain = 0
    while (neighbor.state === 'live' && chain < 12) {
      step(run, still, 0.05)
      chain += 1
    }
    expect(chain * 0.05).toBeGreaterThan(0.2)
    expect(chain * 0.05).toBeLessThan(0.45)
    expect(neighbor.state).toBe('spent')
    expect(foe.hp).toBe(foeHp - 24)
    expect(run.hp).toBe(hp)
  })
})
