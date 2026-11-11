import { describe, expect, it } from 'vitest'
import { checksumAddress, readMessageAddress, readNonce, recoverAddress, signInMessageOk, signInTarget, siweMessage, uriAllowed } from '../src/siwe.ts'
import { TEST_KEY, addressOf, signPersonal } from './wallet.ts'

describe('SIWE personal_sign', () => {
  it('recovers the signer and rejects a tampered message', () => {
    const address = addressOf(TEST_KEY)
    const message = siweMessage({
      domain: 'localhost',
      address,
      uri: 'http://localhost/squeek',
      nonce: 'abc123abc123abcd',
      issuedAt: '2026-01-01T00:00:00.000Z',
      expirationTime: '2026-01-01T00:10:00.000Z',
    })
    expect(readNonce(message)).toBe('abc123abc123abcd')
    expect(readMessageAddress(message)).toBe(address)
    const signature = signPersonal(message, TEST_KEY)
    expect(recoverAddress(message, signature)).toBe(address)
    expect(recoverAddress(`${message}\n`, signature)).not.toBe(address)
    expect(recoverAddress(message, '0x11')).toBeNull()
    expect(message).toContain('No transaction, no gas, no approval.')
    expect(message).toContain('Chain ID: 1')
    expect(message.split('\n')[1]).toBe(checksumAddress(address))
    expect(checksumAddress('0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed')).toBe('0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed')
    expect(uriAllowed('https://squeekextract.xyz/', 'squeekextract.xyz')).toBe(true)
    expect(uriAllowed('https://dadapy04.github.io/squeek/', 'dadapy04.github.io')).toBe(true)
    expect(uriAllowed('https://evil.example/squeek', 'squeekextract.xyz')).toBe(false)
    const primary = 'squeekextract.xyz'
    const fallback = 'https://squeekextract.xyz'
    expect(signInTarget('https://squeekextract.xyz/', primary, fallback)).toEqual({ domain: 'squeekextract.xyz', uri: 'https://squeekextract.xyz/' })
    expect(signInTarget('https://www.squeekextract.xyz/', primary, fallback).domain).toBe('www.squeekextract.xyz')
    expect(signInTarget('https://dadapy04.github.io/squeek/', primary, fallback)).toEqual({ domain: primary, uri: fallback })
    expect(signInTarget('https://evil.example/', primary, fallback)).toEqual({ domain: primary, uri: fallback })
    const live = siweMessage({ domain: 'squeekextract.xyz', address, uri: 'https://squeekextract.xyz/', nonce: 'abc123abc123abcd', issuedAt: '2026-01-01T00:00:00.000Z', expirationTime: '2026-01-01T00:10:00.000Z' })
    const old = siweMessage({ domain: 'dadapy04.github.io', address, uri: 'https://dadapy04.github.io/squeek/', nonce: 'abc123abc123abcd', issuedAt: '2026-01-01T00:00:00.000Z', expirationTime: '2026-01-01T00:10:00.000Z' })
    expect(signInMessageOk(live, primary)).toBe(true)
    expect(signInMessageOk(old, primary)).toBe(false)
    expect(signInMessageOk(siweMessage({ domain: 'evil.example', address, uri: 'https://evil.example/', nonce: 'abc123abc123abcd', issuedAt: '2026-01-01T00:00:00.000Z', expirationTime: '2026-01-01T00:10:00.000Z' }), primary)).toBe(false)
  })
})
