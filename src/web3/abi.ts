/** Well-known selectors. Hardcoded so a local hash implementation cannot drift. */
const SELECTORS = {
  symbol: '0x95d89b41',
  decimals: '0x313ce567',
  name: '0x06fdde03',
  balanceOf: '0x70a08231',
} as const

export const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

export function encodeBalanceOf(account: string): string {
  return SELECTORS.balanceOf + account.toLowerCase().replace(/^0x/, '').padStart(64, '0')
}

export function encodeSymbol(): string {
  return SELECTORS.symbol
}

export function encodeDecimals(): string {
  return SELECTORS.decimals
}

export function encodeName(): string {
  return SELECTORS.name
}

export function decodeUint(data: string): bigint | null {
  const hex = data.startsWith('0x') ? data.slice(2) : data
  if (!hex || hex.length < 64 || /[^0-9a-fA-F]/.test(hex.slice(0, 64))) return null
  try {
    return BigInt(`0x${hex.slice(0, 64)}`)
  } catch {
    return null
  }
}

/** ABI dynamic string, or a bytes32 symbol used by some older tokens. */
export function decodeAbiString(data: string): string | null {
  const hex = (data.startsWith('0x') ? data.slice(2) : data).toLowerCase()
  if (!hex || /[^0-9a-f]/.test(hex)) return null
  if (hex.length === 64) {
    const text = bytes32ToText(hex)
    return text || null
  }
  if (hex.length < 128) return null
  const offset = Number(BigInt(`0x${hex.slice(0, 64)}`))
  if (!Number.isFinite(offset) || offset < 0) return null
  const start = offset * 2
  if (start + 64 > hex.length) return null
  const length = Number(BigInt(`0x${hex.slice(start, start + 64)}`))
  if (!Number.isFinite(length) || length < 0 || length > 128) return null
  const body = hex.slice(start + 64, start + 64 + length * 2)
  if (body.length !== length * 2) return null
  const text = new TextDecoder().decode(hexToBytes(body)).trim()
  return text || null
}

export function formatUnits(value: bigint, decimals: number): string {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) throw new Error('desimal tidak valid')
  const negative = value < 0n
  const magnitude = negative ? -value : value
  const base = 10n ** BigInt(decimals)
  const whole = magnitude / base
  const fraction = (magnitude % base).toString().padStart(decimals, '0').replace(/0+$/, '')
  const text = fraction ? `${whole.toString()}.${fraction}` : whole.toString()
  return negative ? `-${text}` : text
}

export function topicToAddress(topic: string): string | null {
  const hex = topic.toLowerCase().replace(/^0x/, '')
  if (hex.length < 40) return null
  return `0x${hex.slice(-40)}`
}

function bytes32ToText(hex: string): string {
  const end = hex.search(/00+$/) === -1 ? hex.length : hex.search(/(00)+$/)
  const trimmed = hex.slice(0, end % 2 === 0 ? end : end - 1)
  if (!trimmed) return ''
  return new TextDecoder().decode(hexToBytes(trimmed)).replace(/\u0000/g, '').trim()
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}
