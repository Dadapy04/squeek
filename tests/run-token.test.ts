import { describe, expect, it } from 'vitest'
import { resolveRunToken, tokenOnReload } from '../src/extract/run-token.ts'

describe('run token', () => {
  it('keeps the token through a wallet blip and restores it when the run is still open', () => {
    expect(resolveRunToken(null, 'tok-1', 'keep')).toBe('tok-1')
    expect(resolveRunToken('tok-1', 'tok-1', 'keep')).toBe('tok-1')
    expect(tokenOnReload(true, 'tok-1')).toBe('restore')
  })

  it('clears the token only when the run is closed, and abandons a stored token with no local run', () => {
    expect(resolveRunToken('tok-1', 'tok-1', 'close')).toBeNull()
    expect(tokenOnReload(false, 'tok-1')).toBe('abandon')
    expect(tokenOnReload(true, null)).toBe('none')
  })
})
