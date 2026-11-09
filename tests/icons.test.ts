import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('item icons', () => {
  const css = readFileSync(new URL('../src/extract/extract.css', import.meta.url), 'utf8')

  it('draws a distinct 24px pixel icon for every carried kind', () => {
    expect(css).toContain('background-size: 24px 24px')
    expect(css).toContain('image-rendering: pixelated')
    for (const kind of ['sword', 'tombak', 'bilah', 'shield', 'bandage', 'tonic', 'ore', 'scrap', 'relic', 'shard']) {
      expect(css).toContain(`data-kind='${kind}'`)
      expect(css).toContain(`width='16' height='16'`)
    }
    expect(css).not.toContain('background-size: 8px 8px')
  })

  it('puts a pixel icon on every round action button', () => {
    expect(css).toContain('#actions button')
    expect(css).toContain('background-size: 16px 16px')
    expect(css).toContain('#useItem::before')
    expect(css).toContain("#useItem[data-kind='tonic']::before")
    expect(css).toContain("#useItem[data-empty='1']::before { filter: grayscale(1)")
    expect(css).toContain('#dodge { background-image:')
    expect(css).toContain('#block { background-image:')
    expect(css).toMatch(/#block \{ background-image:[^}]*2f6fd0/)
    expect(css).toMatch(/#dodge \{ background-image:[^}]*e7edf4/)
  })
})
