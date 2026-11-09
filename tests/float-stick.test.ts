import { describe, expect, it } from 'vitest'
import { clampCenter, followBase, inMoveZone, MOVE_FRACTION, stickVector } from '../src/extract/float-stick.ts'
import { deploy, freshSave, step } from '../src/extract/sim.ts'

describe('floating stick', () => {
  it('leaves a tiny deadzone and reaches full speed on a short drag', () => {
    expect(stickVector(2, 0, 54)).toEqual({ x: 0, y: 0 })
    const nudge = stickVector(4, 0, 54)
    expect(nudge.x).toBeGreaterThan(0.35)
    expect(nudge.x).toBeLessThan(0.5)
    expect(nudge.y).toBeCloseTo(0)
    const full = stickVector(0, -40, 54)
    expect(full.y).toBeCloseTo(-1)
    expect(full.x).toBeCloseTo(0)
    const diag = stickVector(12, 12, 54)
    expect(diag.x).toBeCloseTo(diag.y)
    expect(diag.x).toBeGreaterThan(0.2)
  })

  it('follows the thumb past the rim and keeps the direction', () => {
    const radius = 54
    const base = followBase(220, 80, 100, 80, radius)
    const dx = 220 - base.x
    const dy = 80 - base.y
    expect(Math.hypot(dx, dy)).toBeCloseTo(radius)
    expect(stickVector(dx, dy, radius).x).toBeCloseTo(1)
    const turned = followBase(220, 160, base.x, base.y, radius)
    const next = stickVector(220 - turned.x, 160 - turned.y, radius)
    expect(next.y).toBeGreaterThan(0.5)
    expect(next.x).toBeGreaterThan(0.5)
  })

  it('trails the base when the finger leaves the radius and stays on screen', () => {
    const next = followBase(400, 200, 100, 200, 54)
    expect(next.x).toBeCloseTo(400 - 54)
    expect(next.y).toBeCloseTo(200)
    const clamped = clampCenter(next.x, next.y, 54, { left: 8, top: 40, right: 844, bottom: 330 })
    expect(clamped.x).toBeGreaterThanOrEqual(62)
    expect(clamped.x).toBeLessThanOrEqual(844 - 54)
    const edge = clampCenter(4, 8, 54, { left: 8, top: 40, right: 400, bottom: 300 })
    expect(edge.x).toBe(62)
    expect(edge.y).toBe(94)
  })

  it('only accepts the left movement zone', () => {
    expect(inMoveZone(100, 180, 844, 48, 330)).toBe(true)
    expect(inMoveZone(390, 180, 844, 48, 330)).toBe(true)
    expect(inMoveZone(500, 180, 844, 48, 330)).toBe(false)
    expect(inMoveZone(40, 20, 844, 48, 330)).toBe(false)
    expect(inMoveZone(40, 360, 844, 48, 330)).toBe(false)
  })

  it('starts a drag at the bottom-left edge and moves the player', () => {
    const width = 844
    const height = 390
    const top = 36
    const x = 60
    const y = height - 10
    expect(inMoveZone(x, y, width, top, height)).toBe(true)
    expect(x).toBeLessThanOrEqual(width * MOVE_FRACTION)
    const radius = 54
    const bounds = { left: 0, top, right: width, bottom: height }
    const origin = clampCenter(x, y, radius, bounds)
    expect(origin.y + radius).toBeLessThanOrEqual(height)
    expect(origin.x - radius).toBeGreaterThanOrEqual(0)
    const dragX = x + 48
    const dragY = y
    const base = followBase(dragX, dragY, origin.x, origin.y, radius)
    const held = clampCenter(base.x, base.y, radius, bounds)
    expect(held.y + radius).toBeLessThanOrEqual(height)
    const vec = stickVector(dragX - held.x, dragY - held.y, radius)
    expect(vec.x).toBeGreaterThan(0.3)
    const save = freshSave()
    expect(deploy(save, [{ kind: 'sword', n: 1 }], false)).toBeNull()
    const run = save.run!
    const before = run.x
    step(run, { moveX: vec.x, moveY: vec.y, attack: false, dodge: false, interact: false, block: false, use: null }, 0.05)
    expect(run.x).toBeGreaterThan(before + 0.5)
  })
})