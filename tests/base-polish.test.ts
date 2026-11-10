import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { setLocale, t } from '../src/extract/i18n.ts'

const css = readFileSync(new URL('../src/extract/extract.css', import.meta.url), 'utf8')
const boot = readFileSync(new URL('../src/extract/boot.ts', import.meta.url), 'utf8')
const logo = readFileSync(new URL('../public/squeek-logo.svg', import.meta.url), 'utf8')

describe('base polish', () => {
  it('draws the wordmark on one line inside its view box', () => {
    const box = logo.match(/viewBox="0 0 (\d+) (\d+)"/)
    expect(box).not.toBeNull()
    const width = Number(box?.[1])
    const height = Number(box?.[2])
    expect(height).toBe(8)
    expect(width).toBeGreaterThan(height * 8)
    expect(css).toContain('h1.logo img {\n  display: block;\n  width: min(100%, 640px);')
    expect(css).not.toContain('min(140px, 28vw)')
    for (const rect of logo.matchAll(/<rect x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)"/g)) {
      const x = Number(rect[1])
      const y = Number(rect[2])
      const w = Number(rect[3])
      const h = Number(rect[4])
      expect(x + w).toBeLessThanOrEqual(width)
      expect(y + h).toBeLessThanOrEqual(height)
    }
  })

  it('shows haul rows on the first frame', () => {
    expect(css).toContain('@keyframes loot-pop {\n  from { transform: translateY(10px); }\n  to { transform: none; }\n}')
    expect(boot).not.toContain('animationDelay')
  })

  it('keeps the Soul Melter sentence whole in both languages', () => {
    expect(css).toContain('max-height: none;')
    expect(css).not.toContain('max-height: 32px;')
    for (const locale of ['en', 'id'] as const) {
      setLocale(locale)
      for (const key of ['soul.near', 'soul.start', 'soul.far'] as const) {
        const line = t(key)
        expect(line.endsWith('-') || line.endsWith('—') || line.endsWith('–')).toBe(false)
        expect(line.includes('—')).toBe(false)
        expect(line.length).toBeGreaterThan(locale === 'en' ? 24 : 20)
      }
      expect(t('soul.near')).toMatch(locale === 'en' ? /Soul Melter is beside you\. Take it!/ : /Pelebur Jiwa ada di dekatmu\. Ambil!/)
      expect(t('soul.start')).toBe(t('soul.near'))
    }
    setLocale('en')
  })

  it('does not repeat the stash value inside the grid', () => {
    expect(boot).not.toContain("invHead(t('stash.value'")
    expect(boot).toContain("invHead('', t('stash.count'")
  })
})
