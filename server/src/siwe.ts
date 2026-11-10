import { secp256k1 } from '@noble/curves/secp256k1.js'
import { keccak_256 } from '@noble/hashes/sha3.js'

const enc = new TextEncoder()

export function isAddress(value: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(value)
}

export function normAddress(value: string): string {
  return value.toLowerCase()
}

/** EIP-55 mixed-case form. The message must carry this, not a lowercase address. */
export function checksumAddress(value: string): string {
  const lower = normAddress(value).slice(2)
  const hash = bytesToHex(keccak_256(enc.encode(lower)))
  let out = '0x'
  for (let i = 0; i < lower.length; i += 1) {
    const digit = Number.parseInt(hash[i] ?? '0', 16)
    out += digit >= 8 ? lower[i]!.toUpperCase() : lower[i]
  }
  return out
}

export function uriAllowed(uri: string, domain: string): boolean {
  try {
    const url = new URL(uri)
    const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
    const https = url.protocol === 'https:' || (local && url.protocol === 'http:')
    return https && url.host === domain
  } catch {
    return false
  }
}

export function siweMessage(input: {
  domain: string
  address: string
  uri: string
  nonce: string
  issuedAt: string
  expirationTime: string
  chainId?: number
}): string {
  const address = checksumAddress(input.address)
  return [
    `${input.domain} wants you to sign in with your Ethereum account:`,
    address,
    '',
    'Sign in to Squeek. No transaction, no gas, no approval.',
    '',
    `URI: ${input.uri}`,
    'Version: 1',
    `Chain ID: ${input.chainId ?? 1}`,
    `Nonce: ${input.nonce}`,
    `Issued At: ${input.issuedAt}`,
    `Expiration Time: ${input.expirationTime}`,
  ].join('\n')
}

export function readNonce(message: string): string | null {
  return /^Nonce: ([A-Za-z0-9_-]{16,128})$/m.exec(message)?.[1] ?? null
}

export function readMessageAddress(message: string): string | null {
  const line = message.split('\n')[1] ?? ''
  return isAddress(line) ? normAddress(line) : null
}

function hashPersonal(message: string): Uint8Array {
  const bytes = enc.encode(message)
  const prefix = enc.encode(`\u0019Ethereum Signed Message:\n${bytes.length}`)
  const joined = new Uint8Array(prefix.length + bytes.length)
  joined.set(prefix, 0)
  joined.set(bytes, prefix.length)
  return keccak_256(joined)
}

function hexToBytes(hex: string): Uint8Array {
  const raw = hex.startsWith('0x') ? hex.slice(2) : hex
  if (raw.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(raw)) throw new Error('bad hex')
  const out = new Uint8Array(raw.length / 2)
  for (let i = 0; i < out.length; i += 1) out[i] = Number.parseInt(raw.slice(i * 2, i * 2 + 2), 16)
  return out
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** Recover the signer of a personal_sign signature. Returns lowercase 0x address or null. */
export function recoverAddress(message: string, signature: string): string | null {
  try {
    const sig = hexToBytes(signature)
    if (sig.length !== 65) return null
    let v = sig[64] ?? 0
    if (v >= 27) v -= 27
    if (v !== 0 && v !== 1) return null
    const compact = secp256k1.Signature.fromCompact(sig.slice(0, 64)).addRecoveryBit(v)
    const pub = compact.recoverPublicKey(hashPersonal(message)).toRawBytes(false)
    const hash = keccak_256(pub.slice(1))
    return `0x${bytesToHex(hash.slice(-20))}`
  } catch {
    return null
  }
}

export function randomNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return bytesToHex(bytes)
}
