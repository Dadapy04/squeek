import { describe, expect, it } from 'vitest'
import { setLocale } from '../src/extract/i18n.ts'

setLocale('en')
import { readFileSync } from 'node:fs'
import type { PropNode } from '../src/extract/dungeon.ts'
import { deploy, freshSave, PROP_REACH, step, usableProp, type Input, type Run } from '../src/extract/sim.ts'

const still: Input = { moveX: 0, moveY: 0, attack: false, dodge: false, interact: false, block: false, use: null, soul: false }
const KINDS = ['crack', 'lever', 'chest', 'shrine', 'barrel', 'crate', 'vendor'] as const

function started(): Run {
  const save = freshSave()
  expect(deploy(save, [{ kind: 'sword', n: 1 }])).toBeNull()
  return save.run!
}

function put(run: Run, kind: PropNode['kind'], x: number, y: number, extra: Partial<PropNode> = {}): PropNode {
  const prop: PropNode = {
    id: `test-${kind}`,
    room: run.roomId ?? 'room-start',
    zone: run.zone,
    kind,
    x,
    y,
    state: 'live',
    loot: ['scrap'],
    lock: kind === 'chest' ? 'key' : 'none',
    hp: kind === 'crack' ? 3 : undefined,
    ...extra,
  }
  run.chart!.props.push(prop)
  return prop
}

function swing(run: Run): void {
  run.attackCd = 0
  run.swing = 0
  run.stam = 100
  run.hurt = 0
  step(run, { ...still, attack: true }, 0.05)
  for (let i = 0; i < 8; i += 1) step(run, still, 0.05)
}

describe('prop interact', () => {
  it('offers Open beside every usable prop and not beside a hazard', () => {
    const boot = readFileSync(new URL('../src/extract/boot.ts', import.meta.url), 'utf8')
    expect(boot).toContain('usableProp(run)')
    expect(boot).toContain("t('hud.open')")
    for (const kind of KINDS) {
      const run = started()
      put(run, kind, run.x + 36, run.y)
      expect(usableProp(run)?.kind, kind).toBe(kind)
      const far = started()
      put(far, kind, far.x + PROP_REACH + 30, far.y)
      expect(usableProp(far), kind).toBeNull()
    }
    const hazard = started()
    put(hazard, 'puddle', hazard.x + 20, hazard.y)
    put(hazard, 'lava', hazard.x + 16, hazard.y)
    expect(usableProp(hazard)).toBeNull()
  })

  it('opens a cracked wall after three sword hits and unseals the secret door', () => {
    const run = started()
    const wall = put(run, 'crack', run.x + 30, run.y)
    const room = run.chart!.rooms.find((item) => item.id === run.roomId)!
    room.doors.push({ dir: 'w', to: 'room-secret-test', lock: 'secret' })
    run.facing = 0
    const foe = run.foes.find((item) => item.hp > 0)!
    foe.zone = run.zone
    foe.room = run.roomId
    foe.x = run.x + 10
    foe.y = run.y + 20
    swing(run)
    expect(wall.hp).toBe(2)
    expect(wall.state).toBe('live')
    expect(foe.heard).toBeGreaterThan(2)
    expect(run.bits?.length).toBeGreaterThan(0)
    expect(run.floats.filter((item) => item.text === 'The door is still shut')).toHaveLength(0)
    swing(run)
    expect(wall.hp).toBe(1)
    swing(run)
    expect(wall.hp).toBe(0)
    expect(wall.state).toBe('open')
    expect(run.flags).toContain('secret:room-secret-test')
    expect(usableProp(run)?.kind).not.toBe('crack')
  })

  it('blows a barrel inside the slash arc and ignores one behind the sword', () => {
    const run = started()
    const front = put(run, 'barrel', run.x + 28, run.y)
    run.facing = 0
    const hp = run.hp
    swing(run)
    expect(front.state).toBe('live')
    expect(front.fuse ?? 0).toBeGreaterThan(0.4)
    expect(run.hp).toBe(hp)
    expect(run.booms ?? []).toHaveLength(0)
    let steps = 0
    while (front.state === 'live' && steps < 24) {
      step(run, still, 0.05)
      steps += 1
    }
    expect(steps).toBeGreaterThanOrEqual(8)
    expect(steps).toBeLessThanOrEqual(16)
    expect(front.state).toBe('spent')
    expect(run.hp).toBe(hp - 18)
    expect(run.booms?.length).toBeGreaterThan(0)
    const again = started()
    const barrel = put(again, 'barrel', again.x + 24, again.y)
    const foe = again.foes.find((item) => item.hp > 0)!
    foe.zone = again.zone
    foe.room = again.roomId
    foe.x = barrel.x + 40
    foe.y = barrel.y
    const before = foe.hp
    again.facing = 0
    swing(again)
    expect(foe.hp).toBe(before)
    while (barrel.state === 'live') step(again, still, 0.05)
    expect(foe.hp).toBe(before - 24)
    const back = started()
    const rear = put(back, 'barrel', back.x - 28, back.y)
    back.facing = 0
    const safe = back.hp
    swing(back)
    expect(rear.state).toBe('live')
    expect(back.hp).toBe(safe)
  })
})
