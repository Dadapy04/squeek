import { describe, expect, it } from 'vitest'
import { readMessageAddress, readNonce, recoverAddress, siweMessage } from '../src/siwe.ts'
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
  })
})
