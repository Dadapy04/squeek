import { secp256k1 } from '@noble/curves/secp256k1.js'
import { keccak_256 } from '@noble/hashes/sha3.js'

const enc = new TextEncoder()

function hex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function hashPersonal(message: string): Uint8Array {
  const bytes = enc.encode(message)
  const prefix = enc.encode(`\u0019Ethereum Signed Message:\n${bytes.length}`)
  const joined = new Uint8Array(prefix.length + bytes.length)
  joined.set(prefix, 0)
  joined.set(bytes, prefix.length)
  return keccak_256(joined)
}

export function addressOf(priv: Uint8Array): string {
  const pub = secp256k1.getPublicKey(priv, false)
  return `0x${hex(keccak_256(pub.slice(1)).slice(-20))}`
}

export function signPersonal(message: string, priv: Uint8Array): string {
  const sig = secp256k1.sign(hashPersonal(message), priv)
  const compact = sig.toCompactRawBytes()
  const out = new Uint8Array(65)
  out.set(compact, 0)
  out[64] = sig.recovery + 27
  return `0x${hex(out)}`
}

export const TEST_KEY = new Uint8Array(32).fill(7)
