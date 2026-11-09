import { HISTORY_KEY } from './config.ts'
import { normalizeAddress } from './chain.ts'

export interface VerifiedPurchase {
  hash: string
  account: string
  token: string
  chainId: 1301
  savedAt: number
}

export function loadHistory(storage: Storage | null): VerifiedPurchase[] {
  if (!storage) return []
  try {
    const raw = storage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.map(parseEntry).filter((item): item is VerifiedPurchase => item !== null).slice(0, 20)
  } catch {
    return []
  }
}

export function rememberPurchase(storage: Storage | null, entry: VerifiedPurchase): VerifiedPurchase[] {
  const current = loadHistory(storage)
  if (current.some((item) => item.hash === entry.hash)) return current
  const next = [entry, ...current].slice(0, 20)
  try {
    storage?.setItem(HISTORY_KEY, JSON.stringify(next))
  } catch {
    /* storage full: the in-memory list still returns */
  }
  return next
}

function parseEntry(value: unknown): VerifiedPurchase | null {
  if (typeof value !== 'object' || value === null) return null
  const row = value as Partial<VerifiedPurchase>
  if (typeof row.hash !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(row.hash)) return null
  const account = typeof row.account === 'string' ? normalizeAddress(row.account) : null
  const token = typeof row.token === 'string' ? normalizeAddress(row.token) : null
  if (!account || !token || row.chainId !== 1301) return null
  return {
    hash: row.hash.toLowerCase(),
    account,
    token,
    chainId: 1301,
    savedAt: typeof row.savedAt === 'number' ? row.savedAt : 0,
  }
}
