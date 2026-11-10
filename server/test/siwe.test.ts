import { describe, expect, it } from 'vitest'
import { checksumAddress, readMessageAddress, readNonce, recoverAddress, siweMessage, uriAllowed } from '../src/siwe.ts'
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
    expect(uriAllowed('https://dadapy04.github.io/squeek/', 'dadapy04.github.io')).toBe(true)
    expect(uriAllowed('https://evil.example/squeek', 'dadapy04.github.io')).toBe(false)
  })
})
