import { TARGET_CHAIN_ID, normalizeAddress } from './chain.ts'
import { readErc20Balance, type BalanceResult } from './erc20.ts'
import { createGeneration } from './guard.ts'
import { classifyReceipt, type ReceiptVerdict } from './receipt.ts'
import { ethGetReceipt, ethGetTransaction } from './rpc.ts'

const inflight = new Set<string>()

export interface VerifyOutcome {
  dropped: boolean
  duplicate: boolean
  verdict: ReceiptVerdict | null
  balance: BalanceResult | null
}

export async function verifyHash(input: {
  hash: string
  account: string | null
  token: string | null
  ticket: number
  current: (ticket: number) => boolean
  rpcUrl?: string
}): Promise<VerifyOutcome> {
  const hash = input.hash.trim().toLowerCase()
  if (!/^0x[0-9a-f]{64}$/.test(hash)) {
    return { dropped: false, duplicate: false, verdict: { status: 'notfound', purchaseProven: false, reason: 'Hash tidak berbentuk transaksi.' }, balance: null }
  }
  if (inflight.has(hash)) return { dropped: false, duplicate: true, verdict: null, balance: null }
  inflight.add(hash)
  try {
    const [transaction, receipt] = await Promise.all([
      ethGetTransaction(hash, input.rpcUrl),
      ethGetReceipt(hash, input.rpcUrl),
    ])
    if (!input.current(input.ticket)) return { dropped: true, duplicate: false, verdict: null, balance: null }
    if (!transaction.ok) return { dropped: false, duplicate: false, verdict: { status: 'notfound', purchaseProven: false, reason: transaction.error }, balance: null }
    if (!receipt.ok) return { dropped: false, duplicate: false, verdict: { status: 'notfound', purchaseProven: false, reason: receipt.error }, balance: null }
    const verdict = classifyReceipt({
      transaction: transaction.result as { from?: string } | null,
      receipt: receipt.result as { status?: string; logs?: { address?: string; topics?: string[] }[] } | null,
      account: input.account,
      token: input.token,
    })
    let balance: BalanceResult | null = null
    if (verdict.purchaseProven && input.account && input.token) {
      balance = await readErc20Balance(input.token, input.account, input.rpcUrl)
      if (!input.current(input.ticket)) return { dropped: true, duplicate: false, verdict: null, balance: null }
    }
    return { dropped: false, duplicate: false, verdict, balance }
  } finally {
    inflight.delete(hash)
  }
}

export function freshGuard(): ReturnType<typeof createGeneration> {
  return createGeneration()
}

export function sameAccount(left: string | null, right: string | null): boolean {
  const a = left ? normalizeAddress(left) : null
  const b = right ? normalizeAddress(right) : null
  return a === b
}

export const VERIFY_CHAIN = TARGET_CHAIN_ID
