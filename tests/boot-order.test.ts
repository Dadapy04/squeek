import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const boot = readFileSync(new URL('../src/extract/boot.ts', import.meta.url), 'utf8')

describe('extraction boot order', () => {
  it('looks up the block button before the first field paint', () => {
    const lookup = boot.indexOf("querySelector<HTMLButtonElement>('#block')")
    const firstShow = boot.indexOf('show(outcome')
    expect(lookup).toBeGreaterThan(0)
    expect(firstShow).toBeGreaterThan(lookup)
  })

  it('attaches the deploy and attack listeners before opening a saved run', () => {
    const deploy = boot.indexOf("deployBtn.addEventListener('click'")
    const attack = boot.indexOf("bindTap('#attack'")
    const firstShow = boot.indexOf('show(outcome')
    expect(deploy).toBeGreaterThan(0)
    expect(attack).toBeGreaterThan(deploy)
    expect(firstShow).toBeGreaterThan(attack)
  })
})
