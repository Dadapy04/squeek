import { TRANSFER_TOPIC, topicToAddress } from './abi.ts'
import { normalizeAddress, TARGET_CHAIN_ID } from './chain.ts'

export type ReceiptStatus = 'pending' | 'reverted' | 'notfound' | 'confirmed'

export interface TxLog {
  address?: string
  topics?: string[]
}

export interface ReceiptInput {
  transaction: { from?: string; to?: string; blockNumber?: string | null } | null
  receipt: { status?: string; logs?: TxLog[]; blockNumber?: string } | null
  account: string | null
  token: string | null
}

export interface ReceiptVerdict {
  status: ReceiptStatus
  purchaseProven: boolean
  reason: string
}

export function classifyReceipt(input: ReceiptInput): ReceiptVerdict {
  if (!input.transaction && !input.receipt) {
    return { status: 'notfound', purchaseProven: false, reason: 'Hash tidak ada di Unichain Sepolia.' }
  }
  if (!input.receipt) {
    return { status: 'pending', purchaseProven: false, reason: 'Transaksi ada, resi belum ada.' }
  }
  const status = (input.receipt.status || '').toLowerCase()
  if (status === '0x0') {
    return { status: 'reverted', purchaseProven: false, reason: 'Resi berstatus gagal. Bukan pembelian.' }
  }
  if (status !== '0x1') {
    return { status: 'pending', purchaseProven: false, reason: 'Status resi tidak dikenali. Bukan pembelian.' }
  }
  const account = input.account ? normalizeAddress(input.account) : null
  const token = input.token ? normalizeAddress(input.token) : null
  const from = input.transaction?.from ? normalizeAddress(input.transaction.from) : null
  if (!account || !token) {
    return {
      status: 'confirmed',
      purchaseProven: false,
      reason: 'Resi sukses di rantai 1301, tetapi dompet atau token belum cukup untuk membuktikan pembelian.',
    }
  }
  if (from && from !== account) {
    return {
      status: 'confirmed',
      purchaseProven: false,
      reason: 'Pengirim transaksi bukan dompet yang terhubung.',
    }
  }
  const paid = (input.receipt.logs ?? []).some((log) => logPaysToken(log, token, account))
  if (!paid) {
    return {
      status: 'confirmed',
      purchaseProven: false,
      reason: 'Resi sukses, tetapi tidak ada Transfer token ini ke dompet ini.',
    }
  }
  return {
    status: 'confirmed',
    purchaseProven: true,
    reason: `Transfer token ke dompet ini terbukti di rantai ${TARGET_CHAIN_ID}. Saldo harus dibaca ulang.`,
  }
}

function logPaysToken(log: TxLog, token: string, account: string): boolean {
  const address = log.address ? normalizeAddress(log.address) : null
  const topics = log.topics ?? []
  if (address !== token) return false
  if ((topics[0] || '').toLowerCase() !== TRANSFER_TOPIC) return false
  const to = topics[2] ? topicToAddress(topics[2]) : null
  return to === account
}
