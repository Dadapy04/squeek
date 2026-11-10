import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { setLocale } from '../src/extract/i18n.ts'
import { MAP_SPRITE_IDS, mapLabel, spriteStats } from '../src/extract/map-sprites.ts'

const KINDS = [
  'vendor',
  'chest',
  'chest-open',
  'barrel',
  'crate',
  'lever',
  'crack',
  'shrine',
  'puddle',
  'lava',
  'web',
  'debris',
  'thorn',
  'key',
  'vein-copper',
  'vein-silver',
  'vein-gold',
  'vein-spore',
  'vein-gem',
  'vein-abyss',
  'vein-big',
]

describe('map prop sprites', () => {
  it('gives every new map entity a multi-color sprite instead of a flat rect', () => {
    expect(MAP_SPRITE_IDS.slice().sort()).toEqual(KINDS.slice().sort())
    for (const id of KINDS) {
      const stats = spriteStats(id)
      expect(stats.colors, id).toBeGreaterThanOrEqual(3)
      expect(stats.clear, id).toBeGreaterThan(4)
      expect(stats.opaque, id).toBeGreaterThan(12)
      expect(stats.topShare, id).toBeLessThan(0.72)
    }
    const dress = readFileSync(new URL('../src/extract/view.ts', import.meta.url), 'utf8')
    const body = dress.slice(dress.indexOf('function drawDungeonDress'), dress.indexOf('function floorFill'))
    expect(body).not.toContain("fillStyle = '#f2c04a'")
    expect(body).not.toContain("prop.kind === 'vendor'")
    expect(body).toContain('blitMotif')
  })

  it('names the merchant and a vein in both languages', () => {
    setLocale('en')
    expect(mapLabel('vendor')).toBe('Seller')
    expect(mapLabel('vein', 'gold', true)).toBe('A great gold vein')
    expect(mapLabel('chest')).toBe('Locked chest')
    setLocale('id')
    expect(mapLabel('vendor')).toBe('Penjual')
    expect(mapLabel('vein', 'copper')).toBe('Tembaga')
    expect(mapLabel('barrel')).toBe('Tong peledak')
    setLocale('en')
  })
})
