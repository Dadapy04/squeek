/** Unichain Sepolia only. Mainnet is never a fallback. */

export const TARGET_CHAIN_ID = 1301
export const TARGET_CHAIN_HEX = '0x515'
export const TARGET_CHAIN_NAME = 'Unichain Sepolia'
export const TARGET_RPC_URL = 'https://sepolia.unichain.org'
export const TARGET_EXPLORER = 'https://sepolia.uniscan.xyz'
export const TARGET_NATIVE_SYMBOL = 'ETH'
export const UNISWAP_CHAIN_SLUG = 'unichain_sepolia'
export const UNISWAP_SWAP_ORIGIN = 'https://app.uniswap.org'

/**
 * Ethereum Sepolia facts supplied as history. They are not Unichain contracts
 * and must not be written into the 1301 defaults.
 */
export const HISTORICAL_ETHEREUM_SEPOLIA = {
  chainId: 11155111,
  token: '0x041A5c81Ad44e5678A5E06f75D21d57eC937890b',
  curve: '0x679EFFa6597a9335dc417FD4E25f83600049861F',
  note: 'Curve address is not a verified Uniswap pool, and neither address is an Unichain Sepolia contract.',
} as const

export const EMPTY_CONFIG_WARNING =
  'Tidak ada token atau pool NPCS resmi untuk Unichain Sepolia (1301). Alamat dikosongkan. Isi konfigurasi pengembang bukan bukti token resmi.'

export function isAddress(value: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(value.trim())
}

export function normalizeAddress(value: string): string | null {
  const trimmed = value.trim()
  if (!isAddress(trimmed)) return null
  return `0x${trimmed.slice(2).toLowerCase()}`
}

export function chainHexToId(hex: string): number | null {
  if (!/^0x[0-9a-fA-F]+$/.test(hex)) return null
  const id = Number(BigInt(hex))
  return Number.isSafeInteger(id) ? id : null
}

export function explorerAddress(address: string): string {
  return `${TARGET_EXPLORER}/address/${address}`
}

export function explorerTx(hash: string): string {
  return `${TARGET_EXPLORER}/tx/${hash}`
}

export function isTargetChain(chainId: number | null): boolean {
  return chainId === TARGET_CHAIN_ID
}
