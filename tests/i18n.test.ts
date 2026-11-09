import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DICT, dictionaryKeys, setLocale, t, type MsgKey } from '../src/extract/i18n.ts'

const BANNED = /\b(Simpanan|Bengkel|Pedagang|Kedalaman|Kalahkan|KEBAL|Perisai|Berangkat|Jatuhkan|Asuransi|Menyerah|Bawaan|Galian|Tangkis|Pelebur|Pangkalan|Perban|Biasa|Langka|Pusaka|Legenda|Terlalu lemah|Layar penuh|Nyawa|koin)\b/

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path, out)
    else if (name.endsWith('.ts')) out.push(path)
  }
  return out
}

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
}

function literals(source: string): string[] {
  const found: string[] = []
  const re = /(['"`])(?:\\.|(?!\1)[^\\])*\1/g
  for (const match of source.matchAll(re)) found.push(match[0].slice(1, -1))
  return found
}

describe('languages', () => {
  it('has a non-empty Indonesian and English line for every key', () => {
    const keys = dictionaryKeys()
    expect(keys.length).toBeGreaterThan(40)
    for (const key of keys) {
      const row = DICT[key]
      expect(row.id.trim().length, key).toBeGreaterThan(0)
      expect(row.en.trim().length, key).toBeGreaterThan(0)
    }
    setLocale('en')
    expect(t('hud.floor', { n: 3 })).toBe('Depth 3/7')
    expect(t('rarity.pusaka')).toBe('Heirloom')
    expect(t('hit.glance')).toBe('GLANCE')
    expect(t('stairs.hint')).toBe('Defeat the boss to open the way down')
    setLocale('id')
    expect(t('hud.floor', { n: 3 })).toBe('Kedalaman 3/7')
    expect(t('banner.weak', { power: 24, need: 36 })).toBe('Pedangmu terlalu lemah (daya 24 / butuh 36)')
    setLocale('en')
  })

  it('keeps Indonesian UI copy inside the dictionary', () => {
    const root = new URL('../src/extract/', import.meta.url)
    const files = walk(root.pathname).filter((path) => !path.endsWith(`${join('extract', 'i18n.ts')}`) && !path.endsWith('/i18n.ts'))
    const hits: string[] = []
    for (const path of files) {
      const body = stripComments(readFileSync(path, 'utf8'))
      literals(body).forEach((text, index) => {
        if (BANNED.test(text)) hits.push(`${path} #${index}: ${text.slice(0, 80)}`)
      })
    }
    const html = stripComments(readFileSync(new URL('../index.html', import.meta.url), 'utf8'))
    const text = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, '\n')
    if (BANNED.test(text)) hits.push(`index.html: ${text.match(BANNED)?.[0]}`)
    expect(hits).toEqual([])
  })

  it('switches the live label without touching save ids', () => {
    const key: MsgKey = 'btn.deploy'
    setLocale('id')
    expect(t(key)).toBe('Berangkat')
    setLocale('en')
    expect(t(key)).toBe('Head out')
  })
})
