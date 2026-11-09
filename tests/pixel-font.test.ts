import { describe, expect, it } from 'vitest'
import { backingRatio } from '../src/extract/camera.ts'
import { setLocale, t, type MsgKey } from '../src/extract/i18n.ts'
import { GLYPH, glyphHasInk, glyphRows, missingGlyphs } from '../src/extract/pixel-font.ts'
import { TITLE_LINE } from '../src/extract/soul-title.ts'
import { titleLayout, titlePrompt } from '../src/extract/title.ts'

const PIXEL_KEYS: MsgKey[] = [
  'title.tap',
  'title.click',
  'exit.sign',
  'stairs.hint',
  'stairs.down',
  'hud.floor',
  'floor.title',
  'banner.weak',
  'banner.boss',
  'hit.glance',
  'hit.weak',
  'foe.stat',
  'foe.moth',
  'foe.burrow',
  'foe.spore',
  'foe.beetle',
  'foe.jelly',
  'foe.swarm',
  'foe.mole',
  'foe.web',
  'foe.ember',
  'foe.leech',
  'foe.bomber',
  'foe.wisp',
  'foe.crusher',
]

function paint(key: MsgKey): string {
  return t(key, { n: 3, power: 24, need: 36, name: 'Raja Liang', depth: 2, hp: 44, dmg: 12 })
}

describe('pixel font', () => {
  it('draws P instead of leaving a hole in TAP', () => {
    expect(glyphHasInk('P')).toBe(true)
    expect(glyphRows('P')).not.toEqual(glyphRows(' '))
    expect(missingGlyphs('TAP TO START')).toEqual([])
    expect(glyphRows('?').some((row) => row.includes('1'))).toBe(true)
    expect(missingGlyphs('TAP\u0001')).toEqual(['\u0001'])
  })

  it('covers every canvas string in both languages', () => {
    for (const row of Object.values(GLYPH)) {
      expect(row).toHaveLength(7)
      for (const line of row) expect(line).toHaveLength(5)
    }
    for (const locale of ['en', 'id'] as const) {
      setLocale(locale)
      for (const key of PIXEL_KEYS) {
        const text = paint(key)
        expect(missingGlyphs(text), `${locale} ${key}: ${text}`).toEqual([])
      }
      expect(missingGlyphs(titlePrompt(false))).toEqual([])
      expect(missingGlyphs(titlePrompt(true))).toEqual([])
    }
    expect(missingGlyphs(TITLE_LINE)).toEqual([])
    expect(missingGlyphs('SQUEEK')).toEqual([])
    expect(missingGlyphs('EXTRACTION SURVIVAL')).toEqual([])
    setLocale('en')
  })

  it('keeps the title prompt inside phone and desktop frames', () => {
    const views = [[844, 390], [390, 844], [667, 375], [360, 740], [1440, 900]]
    for (const locale of ['en', 'id'] as const) {
      setLocale(locale)
      for (const prompt of [titlePrompt(false), titlePrompt(true)]) {
        for (const [w, h] of views) {
          const layout = titleLayout(w!, h!, prompt)
          expect(layout.promptPx).toBeLessThanOrEqual(w! - layout.margin * 2)
          expect(layout.namePx).toBeLessThanOrEqual(w! - layout.margin * 2)
        }
      }
    }
  })

  it('caps the backing store on phones', () => {
    expect(backingRatio(390, 844, 3)).toBe(1)
    expect(backingRatio(844, 390, 3)).toBe(1)
    expect(backingRatio(360, 740, 2.75)).toBe(1)
    expect(backingRatio(1440, 1000, 3)).toBe(2)
    expect(backingRatio(1440, 1000, 1)).toBe(1)
  })
})
