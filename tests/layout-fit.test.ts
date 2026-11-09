import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CONTROL_FIT, controlsFit } from '../src/extract/layout.ts'

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
  })
})
