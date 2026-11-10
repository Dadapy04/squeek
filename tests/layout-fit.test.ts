import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CONTROL_FIT, claimPlacement, controlsFit } from '../src/extract/layout.ts'

describe('landscape control fit', () => {
  it('fits a phone landscape and a shorter one', () => {
    expect(controlsFit(390).fits).toBe(true)
    expect(controlsFit(430).fits).toBe(true)
    expect(controlsFit(320).fits).toBe(true)
    expect(controlsFit(CONTROL_FIT.bar).fits).toBe(false)
  })

  it('keeps the stylesheet on the same compact button size', () => {
    const css = readFileSync(new URL('../src/extract/extract.css', import.meta.url), 'utf8')
    expect(css).toContain(`width: ${CONTROL_FIT.small}px`)
    expect(css).toContain(`width: ${CONTROL_FIT.sword}px`)
    expect(css).toContain(`width: ${CONTROL_FIT.stick}px`)
    expect(css).toContain('border-radius: 50%')
    expect(css).toContain('position: absolute')
    expect(css).not.toContain('min-height: 44px')
    expect(css).toContain('#moveZone { position: absolute; z-index: 2; left: 0; top: var(--hud-top, calc(36px + var(--safe-t))); bottom: 0; width: 48%; touch-action: none; }')
    expect(css).toContain('#slots .slot { pointer-events: auto; }')
    expect(css).not.toContain('bottom: calc(62px + env(safe-area-inset-bottom))')
    expect(css).toContain('#actions #claim {\n  right: 156px;\n  bottom: 68px;')
    expect(css).toContain('#actions #claim { right: 148px; bottom: 62px;')
    expect(css).toContain('#actions #claim { right: 188px; bottom: 80px;')
    expect(css).not.toContain('bottom: 156px')
    expect(css).not.toContain('bottom: 198px')
  })

  it('keeps Take beside the sword and clear of the top shortcuts', () => {
    const screens = [
      [844, 340, 2, 0],
      [844, 340, 2, 21],
      [667, 320, 2, 0],
      [667, 300, 2, 21],
      [844, 390, 1, 0],
      [932, 430, 1, 0],
      [1280, 800, 1, 0],
      [1440, 900, 1, 0],
      [390, 844, 2, 21],
    ] as const
    for (const [width, height, rows, safeBottom] of screens) {
      const spot = claimPlacement(width, height, rows, safeBottom)
      expect(spot, `${width}x${height} rows ${rows}`).toEqual({ clear: true, belowHud: true, bySword: true })
    }
  })
})
