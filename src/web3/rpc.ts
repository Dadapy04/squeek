import { TARGET_RPC_URL } from './chain.ts'

export interface RpcRequest {
  method: string
  params: unknown[]
}

export interface RpcResult {
  ok: true
  result: unknown
}

export interface RpcFailure {
  ok: false
  error: string
}

export type RpcResponse = RpcResult | RpcFailure

let nextId = 1

export async function rpcCall(request: RpcRequest, rpcUrl = TARGET_RPC_URL, timeoutMs = 8000): Promise<RpcResponse> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: nextId++, method: request.method, params: request.params }),
      signal: controller.signal,
    })
    if (!response.ok) return { ok: false, error: `RPC HTTP ${response.status}` }
    const body = (await response.json()) as { result?: unknown; error?: { message?: string } }
    if (body.error) return { ok: false, error: body.error.message || 'RPC menolak' }
    if (!('result' in body)) return { ok: false, error: 'RPC tanpa hasil' }
    return { ok: true, result: body.result }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'RPC gagal' }
  } finally {
    clearTimeout(timer)
  }
}

export async function ethChainId(rpcUrl = TARGET_RPC_URL): Promise<RpcResponse> {
  return rpcCall({ method: 'eth_chainId', params: [] }, rpcUrl)
}

export async function ethGetCode(address: string, rpcUrl = TARGET_RPC_URL): Promise<RpcResponse> {
  return rpcCall({ method: 'eth_getCode', params: [address, 'latest'] }, rpcUrl)
}

export async function ethCall(to: string, data: string, rpcUrl = TARGET_RPC_URL): Promise<RpcResponse> {
  return rpcCall({ method: 'eth_call', params: [{ to, data }, 'latest'] }, rpcUrl)
}

export async function ethGetBalance(address: string, rpcUrl = TARGET_RPC_URL): Promise<RpcResponse> {
  return rpcCall({ method: 'eth_getBalance', params: [address, 'latest'] }, rpcUrl)
}

export async function ethGetTransaction(hash: string, rpcUrl = TARGET_RPC_URL): Promise<RpcResponse> {
  return rpcCall({ method: 'eth_getTransactionByHash', params: [hash] }, rpcUrl)
}

export async function ethGetReceipt(hash: string, rpcUrl = TARGET_RPC_URL): Promise<RpcResponse> {
  return rpcCall({ method: 'eth_getTransactionReceipt', params: [hash] }, rpcUrl)
}

export function hasContractCode(code: unknown): boolean {
  return typeof code === 'string' && /^0x[0-9a-fA-F]*$/.test(code) && code !== '0x' && code.length > 2
}
