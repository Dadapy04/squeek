import { describe, expect, it } from 'vitest'
import { onlineEnabled, phoneLayout, walletOffer } from '../src/extract/online-flag.ts'
import { reportFromRun } from '../src/extract/run-report.ts'
import { decideSync, hasLocalProgress } from '../src/extract/sync-choice.ts'
import { deploy, freshSave, freshValue } from '../src/extract/sim.ts'

describe('online flag and cloud choice', () => {
  it('stays off until an API url is set', () => {
    expect(onlineEnabled('')).toBe(false)
    expect(onlineEnabled('   ')).toBe(false)
    expect(onlineEnabled('https://squeek.example')).toBe(true)
    expect(walletOffer({ injected: true, mobile: false })).toBe('connect')
    expect(walletOffer({ injected: false, mobile: true })).toBe('soon')
    expect(walletOffer({ injected: true, mobile: true })).toBe('connect')
    expect(walletOffer({ injected: false, mobile: false })).toBe('connect')
    expect(phoneLayout({ width: 844, height: 390, coarse: false, ua: 'Mozilla/5.0' })).toBe(true)
    expect(phoneLayout({ width: 1280, height: 800, coarse: false, ua: 'Mozilla/5.0' })).toBe(false)
    expect(phoneLayout({ width: 1280, height: 800, coarse: false, ua: 'Mozilla/5.0 (iPhone)' })).toBe(true)
  })

  it('never downloads over a dirty local save', () => {
    expect(decideSync({ dirty: false, revision: null, progress: false }, null)).toBe('noop')
    expect(decideSync({ dirty: true, revision: 1, progress: true }, null)).toBe('upload')
    expect(decideSync({ dirty: false, revision: null, progress: false }, { revision: 3 })).toBe('download')
    expect(decideSync({ dirty: false, revision: null, progress: true }, { revision: 3 })).toBe('ask')
    expect(decideSync({ dirty: true, revision: 2, progress: true }, { revision: 3 })).toBe('ask')
    expect(decideSync({ dirty: false, revision: 2, progress: true }, { revision: 3 })).toBe('download')
    expect(decideSync({ dirty: true, revision: 3, progress: true }, { revision: 3 })).toBe('upload')
    expect(hasLocalProgress(freshSave())).toBe(false)
    const played = freshSave()
    played.ventures = 1
    expect(hasLocalProgress(played)).toBe(true)
  })

  it('reports the same loot total the run already counted', () => {
    const save = freshSave()
    deploy(save, [{ kind: 'sword', n: 1 }])
    const run = save.run!
    run.bag.push({ kind: 'scrap', n: 1, units: [{ coins: 8, rarity: 'biasa', origin: 'loot' }] })
    run.found = [{ id: 'spear-1', rarity: 'langka', perks: [], coins: 20, origin: 'loot' }]
    const report = reportFromRun(run)
    expect(report.value).toBe(freshValue(run))
    expect(report.events.some((event) => event.kind === 'extract' && event.depth === 1)).toBe(true)
    expect(report.events.filter((event) => event.kind === 'loot').map((event) => event.coins)).toEqual([8, 20])
  })
})
