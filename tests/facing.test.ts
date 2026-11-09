import { describe, expect, it } from 'vitest'
import { quarter, spriteFacing } from '../src/extract/pose.ts'
import {
  BLOCK_ARC,
  SWING_ACTIVE,
  SWING_TOTAL,
  SWING_WIND,
  bladeOffset,
  blockArcCenter,
  deploy,
  freshSave,
  slashArcCenter,
  step,
  swordAim,
  threatInFront,
  type Input,
} from '../src/extract/sim.ts'

const still: Input = { moveX: 0, moveY: 0, attack: false, dodge: false, interact: false, block: false, use: null }

function gap(a: number, b: number): number {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b))
}

const eight = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => (i * Math.PI) / 4)

describe('slash and block follow the body facing', () => {
  it('keeps the drawn slash, the hit arc, the block arc, and the sprite on the same heading', () => {
    expect(bladeOffset(SWING_WIND)).toBeCloseTo(-Math.PI / 2, 5)
    expect(bladeOffset(SWING_WIND + SWING_ACTIVE)).toBeCloseTo(Math.PI / 2, 5)
    expect(BLOCK_ARC).toBeCloseTo(1.05, 5)
    for (const facing of eight) {
      expect(Math.abs(gap(slashArcCenter(facing), facing))).toBeLessThan(0.001)
      expect(Math.abs(gap(blockArcCenter(facing), facing))).toBeLessThan(0.001)
      expect(Math.abs(gap(spriteFacing(facing), facing))).toBeLessThanOrEqual(Math.PI / 4 + 0.001)
      const mid = SWING_WIND + SWING_ACTIVE / 2
      expect(Math.abs(gap(swordAim(facing, SWING_TOTAL - mid), facing))).toBeLessThan(0.05)
      expect(Math.abs(gap(swordAim(facing, SWING_TOTAL - SWING_WIND), facing - Math.PI / 2))).toBeLessThan(0.05)
      expect(Math.abs(gap(swordAim(facing, SWING_TOTAL - (SWING_WIND + SWING_ACTIVE)), facing + Math.PI / 2))).toBeLessThan(0.05)
    }
    quarter(0)
    expect(quarter(Math.PI / 4 + 0.05)).toBe('e')
    expect(quarter(Math.PI / 4 + 0.3)).toBe('s')
    expect(quarter(Math.PI / 4 + 0.05)).toBe('s')
    expect(quarter(0)).toBe('e')
  })

  it('turns the sprite to the stick before the swing or the block starts', () => {
    for (const facing of eight) {
      const save = freshSave()
      deploy(save, [{ kind: 'sword', n: 1 }], true)
      const run = save.run!
      run.foes = []
      run.facing = facing + Math.PI
      step(run, { ...still, moveX: Math.cos(facing), moveY: Math.sin(facing), attack: true }, 0.05)
      expect(run.swing).toBeGreaterThan(0)
      expect(Math.abs(gap(run.facing, facing))).toBeLessThan(0.001)
      expect(Math.abs(gap(spriteFacing(run.facing), run.facing))).toBeLessThanOrEqual(Math.PI / 4 + 0.001)
      expect(run.stam).toBe(90)

      const held = freshSave()
      deploy(held, [{ kind: 'sword', n: 1 }], true)
      const block = held.run!
      block.foes = []
      block.facing = facing + Math.PI
      step(block, { ...still, moveX: Math.cos(facing), moveY: Math.sin(facing), block: true }, 0.05)
      expect(block.blocking).toBe(true)
      expect(block.shield).toBe(4)
      expect(Math.abs(gap(block.facing, facing))).toBeLessThan(0.001)
      expect(Math.abs(gap(blockArcCenter(block.facing), block.facing))).toBeLessThan(0.001)
      const aheadX = block.x + Math.cos(block.facing) * 20
      const aheadY = block.y + Math.sin(block.facing) * 20
      const behindX = block.x - Math.cos(block.facing) * 20
      const behindY = block.y - Math.sin(block.facing) * 20
      expect(threatInFront(block, aheadX, aheadY)).toBe(true)
      expect(threatInFront(block, behindX, behindY)).toBe(false)

      const idle = freshSave()
      deploy(idle, [{ kind: 'sword', n: 1 }])
      const parked = idle.run!
      parked.foes = []
      parked.facing = facing
      step(parked, { ...still, attack: true }, 0.05)
      expect(parked.swing).toBeGreaterThan(0)
      expect(Math.abs(gap(parked.facing, facing))).toBeLessThan(0.001)
      expect(Math.abs(gap(spriteFacing(parked.facing), parked.facing))).toBeLessThanOrEqual(Math.PI / 4 + 0.001)
    }
  })
})
