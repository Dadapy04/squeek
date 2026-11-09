import { TARGET_CHAIN_HEX, TARGET_CHAIN_ID, TARGET_CHAIN_NAME, TARGET_EXPLORER, TARGET_NATIVE_SYMBOL, TARGET_RPC_URL, chainHexToId, normalizeAddress } from './chain.ts'

export interface Eip1193 {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
  on?: (event: string, listener: (...args: unknown[]) => void) => void
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void
  disconnect?: () => Promise<void>
}

export interface WalletLink {
  address: string | null
  chainId: number | null
  kind: 'none' | 'injected' | 'walletconnect'
  provider: Eip1193 | null
}

export function injectedProvider(): Eip1193 | null {
  const eth = (globalThis as { ethereum?: Eip1193 }).ethereum
  return eth && typeof eth.request === 'function' ? eth : null
}

export async function connectInjected(provider: Eip1193): Promise<WalletLink> {
  const accounts = await provider.request({ method: 'eth_requestAccounts' })
  const chain = await provider.request({ method: 'eth_chainId' })
  return {
    address: firstAddress(accounts),
    chainId: typeof chain === 'string' ? chainHexToId(chain) : null,
    kind: 'injected',
    provider,
  }
}

export async function readInjectedPermission(provider: Eip1193): Promise<WalletLink> {
  const accounts = await provider.request({ method: 'eth_accounts' })
  const chain = await provider.request({ method: 'eth_chainId' })
  const address = firstAddress(accounts)
  if (!address) return { address: null, chainId: typeof chain === 'string' ? chainHexToId(chain) : null, kind: 'none', provider: null }
  return { address, chainId: typeof chain === 'string' ? chainHexToId(chain) : null, kind: 'injected', provider }
}

/** Official WalletConnect provider. No project id means no modal and no invented QR. */
export async function connectWalletConnect(projectId: string): Promise<WalletLink> {
  const id = projectId.trim()
  if (!id) throw new Error('WalletConnect butuh Project ID publik. QR tidak dibuat dan akun tidak didaftarkan.')
  const { EthereumProvider } = await import('@walletconnect/ethereum-provider')
  const origin = typeof location === 'undefined' ? 'https://localhost' : location.origin
  const provider = await EthereumProvider.init({
    projectId: id,
    chains: [TARGET_CHAIN_ID],
    showQrModal: true,
    rpcMap: { [TARGET_CHAIN_ID]: TARGET_RPC_URL },
    methods: ['eth_requestAccounts', 'eth_accounts', 'eth_chainId', 'wallet_switchEthereumChain', 'wallet_addEthereumChain'],
    metadata: {
      name: 'NPCS Burrow',
      description: 'Panel testnet Unichain Sepolia. Bukan permainan lama.',
      url: origin,
      icons: [new URL('/favicon.svg', origin).href],
    },
  })
  await provider.connect()
  const accounts = await provider.request({ method: 'eth_accounts' })
  const chain = await provider.request({ method: 'eth_chainId' })
  return {
    address: firstAddress(accounts),
    chainId: typeof chain === 'string' ? chainHexToId(chain) : provider.chainId,
    kind: 'walletconnect',
    provider: provider as unknown as Eip1193,
  }
}

export async function disconnectWallet(link: WalletLink): Promise<void> {
  if (link.kind === 'walletconnect') await link.provider?.disconnect?.()
}

export async function switchToUnichainSepolia(provider: Eip1193): Promise<void> {
  try {
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: TARGET_CHAIN_HEX }] })
  } catch (err) {
    const code = typeof err === 'object' && err && 'code' in err ? Number((err as { code: number }).code) : 0
    if (code !== 4902) throw err
    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: TARGET_CHAIN_HEX,
        chainName: TARGET_CHAIN_NAME,
        nativeCurrency: { name: 'Ether', symbol: TARGET_NATIVE_SYMBOL, decimals: 18 },
        rpcUrls: [TARGET_RPC_URL],
        blockExplorerUrls: [TARGET_EXPLORER],
      }],
    })
  }
}

function firstAddress(accounts: unknown): string | null {
  if (!Array.isArray(accounts) || typeof accounts[0] !== 'string') return null
  return normalizeAddress(accounts[0])
}
