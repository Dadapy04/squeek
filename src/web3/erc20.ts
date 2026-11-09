import { decodeAbiString, decodeUint, encodeBalanceOf, encodeDecimals, encodeName, encodeSymbol } from './abi.ts'
import { normalizeAddress } from './chain.ts'
import { ethCall, ethGetBalance, ethGetCode, hasContractCode, type RpcResponse } from './rpc.ts'

export interface TokenRead {
  ok: true
  address: string
  symbol: string
  name: string
  decimals: number
}

export interface TokenReadFailure {
  ok: false
  error: string
}

export type TokenMetadata = TokenRead | TokenReadFailure

export interface BalanceRead {
  ok: true
  value: bigint
}

export interface BalanceFailure {
  ok: false
  error: string
}

export type BalanceResult = BalanceRead | BalanceFailure

export async function readTokenMetadata(address: string, rpcUrl?: string): Promise<TokenMetadata> {
  const token = normalizeAddress(address)
  if (!token) return { ok: false, error: 'Alamat token tidak valid' }
  const code = await ethGetCode(token, rpcUrl)
  if (!code.ok) return { ok: false, error: code.error }
  if (!hasContractCode(code.result)) return { ok: false, error: 'Tidak ada kode kontrak di Unichain Sepolia' }
  const [symbol, name, decimals] = await Promise.all([
    readString(token, encodeSymbol(), rpcUrl),
    readString(token, encodeName(), rpcUrl),
    readDecimals(token, rpcUrl),
  ])
  if (!symbol.ok) return symbol
  if (!decimals.ok) return decimals
  return {
    ok: true,
    address: token,
    symbol: symbol.value,
    name: name.ok ? name.value : symbol.value,
    decimals: decimals.value,
  }
}

export async function readErc20Balance(token: string, account: string, rpcUrl?: string): Promise<BalanceResult> {
  const tokenAddress = normalizeAddress(token)
  const holder = normalizeAddress(account)
  if (!tokenAddress || !holder) return { ok: false, error: 'Alamat saldo tidak valid' }
  const call = await ethCall(tokenAddress, encodeBalanceOf(holder), rpcUrl)
  if (!call.ok) return { ok: false, error: call.error }
  if (typeof call.result !== 'string') return { ok: false, error: 'Saldo token tidak terbaca' }
  const value = decodeUint(call.result)
  if (value === null) return { ok: false, error: 'Saldo token bukan bilangan' }
  return { ok: true, value }
}

export async function readNativeBalance(account: string, rpcUrl?: string): Promise<BalanceResult> {
  const holder = normalizeAddress(account)
  if (!holder) return { ok: false, error: 'Alamat dompet tidak valid' }
  const call = await ethGetBalance(holder, rpcUrl)
  if (!call.ok) return { ok: false, error: call.error }
  if (typeof call.result !== 'string') return { ok: false, error: 'Saldo ETH tidak terbaca' }
  try {
    return { ok: true, value: BigInt(call.result) }
  } catch {
    return { ok: false, error: 'Saldo ETH bukan bilangan' }
  }
}

async function readString(token: string, data: string, rpcUrl?: string): Promise<{ ok: true; value: string } | TokenReadFailure> {
  const call = await ethCall(token, data, rpcUrl)
  return decodeCallString(call)
}

function decodeCallString(call: RpcResponse): { ok: true; value: string } | TokenReadFailure {
  if (!call.ok) return { ok: false, error: call.error }
  if (typeof call.result !== 'string') return { ok: false, error: 'Teks token tidak terbaca' }
  const text = decodeAbiString(call.result)
  if (!text) return { ok: false, error: 'Teks token kosong' }
  return { ok: true, value: text }
}

async function readDecimals(token: string, rpcUrl?: string): Promise<{ ok: true; value: number } | TokenReadFailure> {
  const call = await ethCall(token, encodeDecimals(), rpcUrl)
  if (!call.ok) return { ok: false, error: call.error }
  if (typeof call.result !== 'string') return { ok: false, error: 'Desimal tidak terbaca' }
  const value = decodeUint(call.result)
  if (value === null || value > 36n) return { ok: false, error: 'Desimal token tidak masuk akal' }
  return { ok: true, value: Number(value) }
}
