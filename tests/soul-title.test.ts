import { describe, expect, it } from 'vitest'
import { fadeStart, letterDrift, noteSoulTitle, resetSoulTitle, titleAlpha, titleBox, titleGlyph, titleScale, TITLE_HOLD, TITLE_LINE } from '../src/extract/soul-title.ts'

describe('soul melter title', () => {
  it('punches in from 1.6, overshoots, then holds for about 0.7s', () => {
    expect(titleScale(0)).toBeCloseTo(1.6)
    expect(titleScale(0.21)).toBeGreaterThan(1.02)
    expect(titleScale(0.5)).toBe(1)
    expect(titleAlpha(0.5)).toBe(1)
    expect(fadeStart() - 0.28).toBeCloseTo(TITLE_HOLD)
    expect(titleAlpha(fadeStart() + 0.2)).toBeLessThan(1)
    expect(titleAlpha(fadeStart() + 0.2)).toBeGreaterThan(0)
    const drift = letterDrift(TITLE_LINE.length - 1, TITLE_LINE.length, fadeStart() + 0.3)
    expect(drift.x).toBeGreaterThan(4)
    expect(drift.y).toBeLessThan(0)
    expect(letterDrift(0, TITLE_LINE.length, 0.4)).toEqual({ x: 0, y: 0 })
    expect(titleGlyph('S').some((row) => row.includes('1'))).toBe(true)
    expect(titleGlyph(' ').every((row) => !row.includes('1'))).toBe(true)
  })

  it('sits in the upper middle of a landscape phone, clear of the controls', () => {
    for (const [width, height] of [[844, 390], [932, 430]] as const) {
      const box = titleBox(width, height)
      expect(box.top).toBeGreaterThan(48)
      expect(box.bottom).toBeLessThan(height - 150)
      expect(box.left).toBeGreaterThan(8)
      expect(box.right).toBeLessThan(width - 8)
      expect(box.bottom).toBeLessThan(height * 0.55)
    }
  })

  it('begins when the burst fires and keeps drawing after the cast ends', () => {
    resetSoulTitle()
    const run = { seed: 4, age: 2, soul: { cast: 0.4 } }
    expect(noteSoulTitle(run, 0.5)).toBeNull()
    run.soul.cast = 0.34
    run.age = 2.06
    const started = noteSoulTitle(run, 0.56)
    expect(started).toBeCloseTo(0.01)
    run.soul.cast = 0
    run.age = 2.5
    const held = noteSoulTitle(run, 0)
    expect(held).toBeGreaterThan(0.4)
    expect(held).toBeLessThan(fadeStart())
  })
})
