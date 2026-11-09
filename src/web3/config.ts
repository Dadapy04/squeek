import { EMPTY_CONFIG_WARNING, normalizeAddress, TARGET_CHAIN_ID } from './chain.ts'

export const CONFIG_KEY = 'npcs-web3.config.v1'
export const HISTORY_KEY = 'npcs-web3.history.v1'

export interface DeveloperTokenConfig {
  token: string
  pool: string
  pair: string
  walletConnectProjectId: string
}

export const EMPTY_DEVELOPER_CONFIG: DeveloperTokenConfig = {
  token: '',
  pool: '',
  pair: '',
  walletConnectProjectId: '',
}

export function parseDeveloperConfig(raw: unknown): DeveloperTokenConfig {
  if (typeof raw !== 'object' || raw === null) return { ...EMPTY_DEVELOPER_CONFIG }
  const row = raw as Partial<DeveloperTokenConfig>
  return {
    token: cleanAddress(row.token),
    pool: cleanAddress(row.pool),
    pair: cleanPair(row.pair),
    walletConnectProjectId: cleanProjectId(row.walletConnectProjectId),
  }
}

export function loadDeveloperConfig(storage: Storage | null): DeveloperTokenConfig {
  if (!storage) return { ...EMPTY_DEVELOPER_CONFIG }
  try {
    const raw = storage.getItem(CONFIG_KEY)
    if (!raw) return { ...EMPTY_DEVELOPER_CONFIG }
    return parseDeveloperConfig(JSON.parse(raw) as unknown)
  } catch {
    return { ...EMPTY_DEVELOPER_CONFIG }
  }
}

export function saveDeveloperConfig(storage: Storage | null, config: DeveloperTokenConfig): boolean {
  if (!storage) return false
  try {
    storage.setItem(CONFIG_KEY, JSON.stringify(parseDeveloperConfig(config)))
    return true
  } catch {
    return false
  }
}

function cleanAddress(value: unknown): string {
  if (typeof value !== 'string') return ''
  return normalizeAddress(value) ?? ''
}

function cleanPair(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, 40)
}

function cleanProjectId(value: unknown): string {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!/^[0-9a-fA-F-]{8,80}$/.test(trimmed)) return ''
  return trimmed
}

export interface BuyBlocker {
  code: 'no-token' | 'no-pool' | 'token-invalid' | 'wrong-chain' | 'no-wallet'
  message: string
}

export function buyBlockers(input: {
  config: DeveloperTokenConfig
  tokenOk: boolean
  walletChainId: number | null
  connected: boolean
}): BuyBlocker[] {
  const blockers: BuyBlocker[] = []
  if (!input.config.token) {
    blockers.push({ code: 'no-token', message: EMPTY_CONFIG_WARNING })
  } else if (!input.tokenOk) {
    blockers.push({
      code: 'token-invalid',
      message: 'Alamat tersimpan bukan kontrak ERC-20 yang terbaca di Unichain Sepolia. Beli dimatikan.',
    })
  }
  if (input.config.token && !input.config.pool) {
    blockers.push({
      code: 'no-pool',
      message: 'Pool tidak diisi. Tautan Uniswap tetap bisa dibuka untuk token yang lolos baca, tanpa mengklaim pool resmi.',
    })
  }
  if (input.connected && input.walletChainId !== null && input.walletChainId !== TARGET_CHAIN_ID) {
    blockers.push({
      code: 'wrong-chain',
      message: `Dompet di rantai ${input.walletChainId}, bukan Unichain Sepolia ${TARGET_CHAIN_ID}. Tidak ada pindah diam-diam ke mainnet.`,
    })
  }
  if (!input.connected) {
    blockers.push({ code: 'no-wallet', message: 'Hubungkan dompet dulu. Menyambungkan tidak mengirim transaksi.' })
  }
  return blockers
}

/** Purchase stays disabled when the token itself is missing or unread, or the wallet chain is wrong. */
export function purchaseDisabled(blockers: BuyBlocker[]): boolean {
  return blockers.some((item) => item.code === 'no-token' || item.code === 'token-invalid' || item.code === 'wrong-chain' || item.code === 'no-wallet')
}

export function isHistoricalSepoliaAddress(value: string): boolean {
  const normal = normalizeAddress(value)
  if (!normal) return false
  return (
    normal === '0x041a5c81ad44e5678a5e06f75d21d57ec937890b' ||
    normal === '0x679effa6597a9335dc417fd4e25f83600049861f'
  )
}
