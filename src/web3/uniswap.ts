import { isAddress, UNISWAP_CHAIN_SLUG, UNISWAP_SWAP_ORIGIN } from './chain.ts'

/**
 * Official interface path observed for this testnet:
 * https://app.uniswap.org/explore/pools/unichain_sepolia/…
 * Support article lists Unichain among interface testnets:
 * https://support.uniswap.org/hc/en-us/articles/14580495154445-Testnets-on-Uniswap
 *
 * The Trading API docs fetched for this pass do not list chain 1301, and that
 * API wants a credential. This module does not call it and does not invent one.
 */
export function uniswapSwapUrl(token: string): string | null {
  if (!isAddress(token)) return null
  const output = token.trim()
  const url = new URL('/swap', UNISWAP_SWAP_ORIGIN)
  url.searchParams.set('chain', UNISWAP_CHAIN_SLUG)
  url.searchParams.set('inputCurrency', 'ETH')
  url.searchParams.set('outputCurrency', output)
  if (url.hostname !== 'app.uniswap.org') return null
  if (url.searchParams.get('chain') !== UNISWAP_CHAIN_SLUG) return null
  return url.toString()
}
