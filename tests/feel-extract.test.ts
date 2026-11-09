import { describe, expect, it } from 'vitest'
import { cameraFrame, cameraScale, legacyFrame } from '../src/extract/camera.ts'
import { IDLE_AIM, SWING_ACTIVE, SWING_TOTAL, SWING_WIND, bladeOffset, swordAim } from '../src/extract/sim.ts'

describe('extraction camera and swing', () => {
  it('opens the portrait and landscape frames without shrinking the knight away', () => {
    const portrait = { w: 390, h: 640 }
    const landscape = { w: 844, h: 390 }
    const oldP = legacyFrame(portrait.w, portrait.h)
    const nowP = cameraFrame(portrait.w, portrait.h)
    const nowL = cameraFrame(landscape.w, landscape.h)
    expect(nowP.visibleW).toBeGreaterThan(oldP.visibleW + 40)
    const scale = cameraScale(landscape.w, landscape.h)
    const gutter = Math.min(landscape.w * 0.22, 200)
    const previous = Math.max(landscape.w - gutter, landscape.w * 0.78) / 220
    expect(landscape.w / scale).toBeCloseTo((landscape.w / previous) * 1.485, 0)
    expect(nowL.knightPx).toBeGreaterThan(80)
    expect(cameraFrame(667, 340).knightPx).toBeGreaterThan(64)
    const desk = 1440
    const deskScale = cameraScale(desk, 900)
    const deskGutter = Math.min(desk * 0.22, 200)
    const deskFit = Math.max(desk - deskGutter, desk * 0.78) / 220
    expect(desk / deskScale).toBeCloseTo((desk / deskFit) * 1.22, 0)
    expect(cameraScale(390, 844)).toBeCloseTo(Math.max(1.35, 844 / 300), 5)
  })

  it('sweeps the blade across the front semicircle after a short wind-up', () => {
    expect(bladeOffset(0)).toBeGreaterThan(-0.5)
    expect(bladeOffset(SWING_WIND)).toBeCloseTo(-Math.PI / 2, 5)
    expect(bladeOffset(SWING_WIND + SWING_ACTIVE / 2)).toBeCloseTo(0, 1)
    expect(bladeOffset(SWING_WIND + SWING_ACTIVE)).toBeCloseTo(Math.PI / 2, 5)
    expect(bladeOffset(SWING_TOTAL)).toBeCloseTo(-0.4, 1)
    expect(swordAim(0, 0)).toBe(IDLE_AIM)
    expect(swordAim(Math.PI / 2, 0)).toBe(IDLE_AIM)
    expect(IDLE_AIM).toBeCloseTo(-Math.PI / 2, 5)
  })
})