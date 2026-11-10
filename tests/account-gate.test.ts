import { describe, expect, it } from 'vitest'
import { freshGate, reduceGate, setRunOpen } from '../src/extract/account-gate.ts'

describe('account changes during a run', () => {
  it('defers a wallet restore that arrives while a guest run is playing', () => {
    let state = reduceGate(freshGate(), { type: 'settled' }).state
    state = setRunOpen(state, true).state
    const mid = reduceGate(state, { type: 'restored', address: '0xabc', name: null })
    expect(mid.apply).toBeNull()
    expect(mid.state.current.presence).toBe('guest')
    expect(mid.state.deferred).toEqual({ presence: 'wallet', address: '0xabc', name: null })
    expect(mid.canDepart).toBe(false)
    const back = setRunOpen(mid.state, false)
    expect(back.apply).toEqual({ presence: 'wallet', address: '0xabc', name: null })
    expect(back.state.current.presence).toBe('wallet')
    expect(back.state.inRun).toBe(false)
  })

  it('ignores a disconnect and reconnect blip during a wallet run', () => {
    let state = reduceGate(freshGate(), { type: 'settled' }).state
    state = reduceGate(state, { type: 'explicit-connect', address: '0xabc', name: 'obettt' }).state
    state = setRunOpen(state, true).state
    const dropped = reduceGate(state, { type: 'dropped' })
    expect(dropped.apply).toBeNull()
    expect(dropped.state.current).toEqual({ presence: 'wallet', address: '0xabc', name: 'obettt' })
    expect(dropped.state.deferred).toBeNull()
    const back = reduceGate(dropped.state, { type: 'reconnected', address: '0xabc', name: 'obettt' })
    expect(back.apply).toBeNull()
    expect(back.state.current.address).toBe('0xabc')
    expect(back.state.inRun).toBe(true)
  })

  it('applies an explicit disconnect only at base', () => {
    let state = reduceGate(freshGate(), { type: 'settled' }).state
    state = reduceGate(state, { type: 'explicit-connect', address: '0xabc', name: null }).state
    state = setRunOpen(state, true).state
    const during = reduceGate(state, { type: 'explicit-disconnect' })
    expect(during.apply).toBeNull()
    expect(during.state.current.presence).toBe('wallet')
    const home = setRunOpen(during.state, false).state
    const left = reduceGate(home, { type: 'explicit-disconnect' })
    expect(left.apply?.presence).toBe('guest')
    expect(left.canDepart).toBe(true)
  })

  it('blocks head out until the wallet check has settled', () => {
    const checking = freshGate()
    expect(reduceGate(checking, { type: 'restored', address: '0xabc', name: null }).canDepart).toBe(false)
    expect(reduceGate(checking, { type: 'settled' }).canDepart).toBe(true)
  })
})
