import { describe, expect, it } from 'vitest'
import { decodeAbiString, decodeUint, formatUnits } from '../src/web3/abi.ts'
import { HISTORICAL_ETHEREUM_SEPOLIA, TARGET_CHAIN_HEX, TARGET_CHAIN_ID } from '../src/web3/chain.ts'
import { EMPTY_DEVELOPER_CONFIG, buyBlockers, loadDeveloperConfig, purchaseDisabled } from '../src/web3/config.ts'
import { readErc20Balance } from '../src/web3/erc20.ts'
import { createGeneration } from '../src/web3/guard.ts'
import { rememberPurchase } from '../src/web3/history.ts'
import { classifyReceipt } from '../src/web3/receipt.ts'
import { TARGET_RPC_URL } from '../src/web3/chain.ts'
import { uniswapSwapUrl } from '../src/web3/uniswap.ts'
import { TRANSFER_TOPIC } from '../src/web3/abi.ts'

describe('web3 foundation', () => {
  it('leaves Unichain token and pool empty and ignores the old Sepolia addresses', () => {
    expect(EMPTY_DEVELOPER_CONFIG.token).toBe('')
    expect(EMPTY_DEVELOPER_CONFIG.pool).toBe('')
    expect(loadDeveloperConfig(null).token).not.toBe(HISTORICAL_ETHEREUM_SEPOLIA.token.toLowerCase())
    expect(TARGET_CHAIN_ID).toBe(1301)
    const blockers = buyBlockers({ config: EMPTY_DEVELOPER_CONFIG, tokenOk: false, walletChainId: null, connected: false })
    expect(purchaseDisabled(blockers)).toBe(true)
    expect(blockers.some((item) => item.message.includes('1301'))).toBe(true)
  })

  it('builds an official Unichain Sepolia Uniswap link and never a mainnet link', () => {
    expect(uniswapSwapUrl('nope')).toBeNull()
    const url = uniswapSwapUrl('0x041A5c81Ad44e5678A5E06f75D21d57eC937890b')
    expect(url).toContain('https://app.uniswap.org/swap?')
    expect(url).toContain('chain=unichain_sepolia')
    expect(url).not.toContain('chain=ethereum')
    expect(url).not.toContain('chain=mainnet')
  })

  it('treats a failed balance read as an error, not zero', async () => {
    const previous = globalThis.fetch
    globalThis.fetch = (async () => new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, error: { message: 'rpc down' } }), { status: 200 })) as typeof fetch
    const balance = await readErc20Balance('0x041A5c81Ad44e5678A5E06f75D21d57eC937890b', '0x1111111111111111111111111111111111111111', 'https://example.test')
    globalThis.fetch = previous
    expect(balance.ok).toBe(false)
    if (!balance.ok) expect(balance.error).toContain('rpc down')
  })

  it('keeps token amounts in bigint units', () => {
    expect(formatUnits(1_500_000_000_000_000_000n, 18)).toBe('1.5')
    expect(decodeUint('0x' + 42n.toString(16).padStart(64, '0'))).toBe(42n)
    const encoded = '20'.padStart(64, '0') + '4'.padStart(64, '0') + Buffer.from('NPCS').toString('hex').padEnd(64, '0')
    expect(decodeAbiString(`0x${encoded}`)).toBe('NPCS')
  })

  it('separates receipt states and only proves a transfer to this wallet', () => {
    const account = '0x2222222222222222222222222222222222222222'
    const token = '0x3333333333333333333333333333333333333333'
    expect(classifyReceipt({ transaction: null, receipt: null, account, token }).status).toBe('notfound')
    expect(classifyReceipt({ transaction: { from: account }, receipt: null, account, token }).status).toBe('pending')
    expect(classifyReceipt({ transaction: { from: account }, receipt: { status: '0x0', logs: [] }, account, token }).status).toBe('reverted')
    const paid = classifyReceipt({
      transaction: { from: account },
      receipt: { status: '0x1', logs: [{ address: token, topics: [TRANSFER_TOPIC, '0x' + account.slice(2).padStart(64, '0'), '0x' + account.slice(2).padStart(64, '0')] }] },
      account,
      token,
    })
    expect(paid.status).toBe('confirmed')
    expect(paid.purchaseProven).toBe(true)
    const other = classifyReceipt({
      transaction: { from: account },
      receipt: { status: '0x1', logs: [] },
      account,
      token,
    })
    expect(other.purchaseProven).toBe(false)
  })

  it('drops a stale account read and does not duplicate a proven hash', () => {
    const guard = createGeneration()
    const first = guard.next()
    guard.next()
    expect(guard.current(first)).toBe(false)
    const storage = memory()
    const entry = { hash: '0x' + 'ab'.repeat(32), account: '0x2222222222222222222222222222222222222222', token: '0x3333333333333333333333333333333333333333', chainId: 1301 as const, savedAt: 1 }
    expect(rememberPurchase(storage, entry)).toHaveLength(1)
    expect(rememberPurchase(storage, entry)).toHaveLength(1)
  })

  it('reads the live Unichain Sepolia chain id when the public RPC answers', async () => {
    const response = await fetch(TARGET_RPC_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] }),
    })
    expect(response.ok).toBe(true)
    const body = (await response.json()) as { result?: string }
    expect(body.result?.toLowerCase()).toBe(TARGET_CHAIN_HEX)
  })
})

function memory(): Storage {
  const map = new Map<string, string>()
  return {
    get length() { return map.size },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (index) => [...map.keys()][index] ?? null,
    removeItem: (key) => { map.delete(key) },
    setItem: (key, value) => { map.set(key, value) },
  }
}
