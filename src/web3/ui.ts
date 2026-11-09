import { formatUnits } from './abi.ts'
import { EMPTY_CONFIG_WARNING, HISTORICAL_ETHEREUM_SEPOLIA, TARGET_CHAIN_ID, TARGET_CHAIN_NAME, chainHexToId, explorerTx } from './chain.ts'
import { buyBlockers, loadDeveloperConfig, purchaseDisabled, saveDeveloperConfig } from './config.ts'
import { readErc20Balance, readNativeBalance, readTokenMetadata } from './erc20.ts'
import { createGeneration } from './guard.ts'
import { loadHistory, rememberPurchase } from './history.ts'
import { ethChainId } from './rpc.ts'
import { uniswapSwapUrl } from './uniswap.ts'
import { verifyHash } from './verify.ts'
import { connectInjected, connectWalletConnect, disconnectWallet, injectedProvider, readInjectedPermission, switchToUnichainSepolia, type WalletLink } from './wallet.ts'

export function mountWeb3(root: HTMLElement): void {
  const storage = probeStorage()
  const gen = createGeneration()
  let config = loadDeveloperConfig(storage)
  let link: WalletLink = { address: null, chainId: null, kind: 'none', provider: null }
  let tokenOk = false
  let tokenSymbol = ''
  let tokenDecimals = 18
  let busy = false

  root.innerHTML = `
    <div class="web3">
      <p class="web3-kicker">Testnet · bukan permainan · bukan token resmi</p>
      <h2>Dompet Unichain Sepolia</h2>
      <p class="web3-warn" id="web3Warn">${EMPTY_CONFIG_WARNING}</p>
      <p class="web3-note">Ethereum Sepolia lama (rantai ${HISTORICAL_ETHEREUM_SEPOLIA.chainId}) punya token dan curve yang <strong>bukan</strong> kontrak 1301 dan curve itu bukan pool Uniswap. Keduanya tidak diisi di sini.</p>
      <div class="web3-grid">
        <p>Status <strong id="web3Status">Terputus</strong></p>
        <p>Jaringan <strong id="web3Net">—</strong></p>
        <p>Alamat <strong id="web3Addr">—</strong></p>
        <p>ETH <strong id="web3Eth">—</strong></p>
        <p>Token <strong id="web3Token">belum dikonfigurasi</strong></p>
        <p>Saldo token <strong id="web3Bal">—</strong></p>
      </div>
      <div class="web3-actions">
        <button type="button" id="web3Connect">Hubungkan MetaMask</button>
        <button type="button" id="web3Wc">WalletConnect</button>
        <button type="button" id="web3Switch" hidden>Pindah ke 1301</button>
        <button type="button" id="web3Disconnect" hidden>Putuskan</button>
      </div>
      <p id="web3WcWarn" class="web3-warn"></p>
      <a id="web3Buy" class="web3-buy" hidden target="_blank" rel="noreferrer">Buka Uniswap</a>
      <p id="web3BuyBlock" class="web3-note"></p>
      <p class="web3-note">Membuka Uniswap bukan pembelian. Hash tidak ditebak dari situs itu.</p>
      <form id="web3Verify">
        <label>Hash transaksi <input id="web3Hash" autocomplete="off" spellcheck="false" placeholder="0x…" /></label>
        <button type="submit">Periksa resi</button>
      </form>
      <p id="web3Tx">Menunggu hash. Status: pending, reverted, notfound, atau confirmed.</p>
      <ul id="web3Hist"></ul>
      <details>
        <summary>Konfigurasi pengembang, bukan token resmi</summary>
        <form id="web3Config">
          <label>Token 1301 <input id="web3TokenIn" autocomplete="off" spellcheck="false" /></label>
          <label>Pool (opsional, tidak diverifikasi sebagai Uniswap) <input id="web3PoolIn" autocomplete="off" spellcheck="false" /></label>
          <label>Pasangan <input id="web3PairIn" maxlength="40" /></label>
          <label>WalletConnect Project ID publik <input id="web3Pid" autocomplete="off" spellcheck="false" /></label>
          <button type="submit">Simpan konfigurasi</button>
        </form>
      </details>
      <p class="web3-note">RPC baca ${TARGET_CHAIN_NAME} ${TARGET_CHAIN_ID}. Tidak ada seed, tidak ada transaksi otomatis.</p>
    </div>
  `

  const warn = must(root, 'web3Warn')
  const status = must(root, 'web3Status')
  const net = must(root, 'web3Net')
  const addr = must(root, 'web3Addr')
  const eth = must(root, 'web3Eth')
  const tokenLine = must(root, 'web3Token')
  const bal = must(root, 'web3Bal')
  const wcWarn = must(root, 'web3WcWarn')
  const buy = must(root, 'web3Buy') as HTMLAnchorElement
  const buyBlock = must(root, 'web3BuyBlock')
  const tx = must(root, 'web3Tx')
  const hist = must(root, 'web3Hist')
  const connectBtn = must(root, 'web3Connect') as HTMLButtonElement
  const wcBtn = must(root, 'web3Wc') as HTMLButtonElement
  const switchBtn = must(root, 'web3Switch') as HTMLButtonElement
  const disconnectBtn = must(root, 'web3Disconnect') as HTMLButtonElement
  const tokenIn = must(root, 'web3TokenIn') as HTMLInputElement
  const poolIn = must(root, 'web3PoolIn') as HTMLInputElement
  const pairIn = must(root, 'web3PairIn') as HTMLInputElement
  const pid = must(root, 'web3Pid') as HTMLInputElement

  fillForm()
  renderHistory()
  paint()
  void refreshNetwork()
  void silentInjected()

  connectBtn.addEventListener('click', () => void onConnect())
  wcBtn.addEventListener('click', () => void onWc())
  switchBtn.addEventListener('click', () => void onSwitch())
  disconnectBtn.addEventListener('click', () => void onDisconnect())
  must(root, 'web3Config').addEventListener('submit', (event) => {
    event.preventDefault()
    saveDeveloperConfig(storage, {
      token: tokenIn.value,
      pool: poolIn.value,
      pair: pairIn.value,
      walletConnectProjectId: pid.value,
    })
    config = loadDeveloperConfig(storage)
    fillForm()
    void refreshNetwork()
  })
  must(root, 'web3Verify').addEventListener('submit', (event) => {
    event.preventDefault()
    void onVerify((must(root, 'web3Hash') as HTMLInputElement).value)
  })

  function fillForm(): void {
    tokenIn.value = config.token
    poolIn.value = config.pool
    pairIn.value = config.pair
    pid.value = config.walletConnectProjectId
    wcWarn.textContent = config.walletConnectProjectId
      ? ''
      : 'WalletConnect belum punya Project ID publik. Tidak ada QR palsu dan tidak ada akun yang dibuat.'
  }

  function paint(): void {
    const connected = Boolean(link.address)
    status.textContent = connected ? `Terhubung · ${link.kind}` : 'Terputus'
    net.textContent = link.chainId === null ? TARGET_CHAIN_NAME : link.chainId === TARGET_CHAIN_ID ? `${TARGET_CHAIN_NAME} (${TARGET_CHAIN_ID})` : `Salah rantai ${link.chainId}`
    addr.textContent = link.address ?? '—'
    switchBtn.hidden = !connected || link.chainId === TARGET_CHAIN_ID || !link.provider
    disconnectBtn.hidden = !connected
    connectBtn.disabled = !injectedProvider()
    connectBtn.textContent = injectedProvider() ? 'Hubungkan MetaMask' : 'MetaMask tidak ada'
    const blockers = buyBlockers({ config, tokenOk, walletChainId: link.chainId, connected })
    const hard = blockers.filter((item) => item.code !== 'no-pool')
    warn.textContent = config.token ? 'Alamat ini konfigurasi pengembang. ERC-20 yang terbaca tidak berarti token resmi NPCS.' : EMPTY_CONFIG_WARNING
    buyBlock.textContent = blockers.map((item) => item.message).join(' ')
    const href = tokenOk && config.token ? uniswapSwapUrl(config.token) : null
    if (href && !purchaseDisabled(hard)) {
      buy.hidden = false
      buy.href = href
      buy.textContent = 'Buka Uniswap (bukan pembelian)'
    } else {
      buy.hidden = true
      buy.removeAttribute('href')
    }
  }

  async function refreshNetwork(): Promise<void> {
    const ticket = gen.next()
    tokenOk = false
    const chain = await ethChainId()
    if (!gen.current(ticket)) return
    if (chain.ok && typeof chain.result === 'string') {
      const id = chainHexToId(chain.result)
      if (!link.address) net.textContent = id === TARGET_CHAIN_ID ? `RPC 1301 hidup` : `RPC menjawab ${chain.result}`
    } else if (!link.address) net.textContent = `RPC: ${chain.ok ? 'tanpa rantai' : chain.error}`
    if (config.token) {
      const meta = await readTokenMetadata(config.token)
      if (!gen.current(ticket)) return
      if (meta.ok) {
        tokenOk = true
        tokenSymbol = meta.symbol
        tokenDecimals = meta.decimals
        tokenLine.textContent = `${meta.symbol} · ${meta.decimals} desimal · bukan label resmi`
      } else tokenLine.textContent = meta.error
    } else tokenLine.textContent = 'belum dikonfigurasi'
    await refreshBalances(ticket)
    paint()
  }

  async function refreshBalances(ticket: number): Promise<void> {
    if (!link.address) {
      eth.textContent = '—'
      bal.textContent = '—'
      return
    }
    const native = await readNativeBalance(link.address)
    if (!gen.current(ticket)) return
    eth.textContent = native.ok ? `${formatUnits(native.value, 18)} ETH` : native.error
    if (!config.token || !tokenOk) {
      bal.textContent = '—'
      return
    }
    const tokenBal = await readErc20Balance(config.token, link.address)
    if (!gen.current(ticket)) return
    bal.textContent = tokenBal.ok ? `${formatUnits(tokenBal.value, tokenDecimals)} ${tokenSymbol}` : tokenBal.error
  }

  async function silentInjected(): Promise<void> {
    const provider = injectedProvider()
    if (!provider) return
    try {
      const next = await readInjectedPermission(provider)
      if (!next.address) return
      adopt(next)
    } catch {
      /* permission read is optional */
    }
  }

  function adopt(next: WalletLink): void {
    link = next
    gen.next()
    bindProvider(next)
    paint()
    void refreshNetwork()
  }

  function bindProvider(next: WalletLink): void {
    const provider = next.provider
    if (!provider?.on) return
    provider.on('accountsChanged', (accounts: unknown) => {
      const list = Array.isArray(accounts) ? accounts : []
      link = { ...link, address: typeof list[0] === 'string' ? list[0] : null }
      gen.next()
      paint()
      void refreshNetwork()
    })
    provider.on('chainChanged', (chain: unknown) => {
      link = { ...link, chainId: typeof chain === 'string' ? chainHexToId(chain) : null }
      gen.next()
      paint()
      void refreshNetwork()
    })
    provider.on('disconnect', () => {
      link = { address: null, chainId: null, kind: 'none', provider: null }
      gen.next()
      paint()
    })
  }

  async function onConnect(): Promise<void> {
    const provider = injectedProvider()
    if (!provider || busy) return
    busy = true
    try {
      adopt(await connectInjected(provider))
    } catch (err) {
      status.textContent = err instanceof Error ? err.message : 'Hubungan ditolak'
    } finally {
      busy = false
    }
  }

  async function onWc(): Promise<void> {
    if (busy) return
    if (!config.walletConnectProjectId) {
      wcWarn.textContent = 'WalletConnect butuh Project ID publik. QR tidak dibuat.'
      return
    }
    busy = true
    try {
      adopt(await connectWalletConnect(config.walletConnectProjectId))
    } catch (err) {
      wcWarn.textContent = err instanceof Error ? err.message : 'WalletConnect gagal'
    } finally {
      busy = false
    }
  }

  async function onSwitch(): Promise<void> {
    if (!link.provider) return
    try {
      await switchToUnichainSepolia(link.provider)
    } catch (err) {
      net.textContent = err instanceof Error ? err.message : 'Gagal pindah rantai'
    }
  }

  async function onDisconnect(): Promise<void> {
    await disconnectWallet(link)
    link = { address: null, chainId: null, kind: 'none', provider: null }
    gen.next()
    eth.textContent = '—'
    bal.textContent = '—'
    paint()
  }

  async function onVerify(hash: string): Promise<void> {
    const ticket = gen.next()
    tx.textContent = 'Memeriksa…'
    const outcome = await verifyHash({
      hash,
      account: link.address,
      token: config.token || null,
      ticket,
      current: (value) => gen.current(value),
    })
    if (outcome.dropped) return
    if (outcome.duplicate) {
      tx.textContent = 'Hash ini sedang diperiksa.'
      return
    }
    const verdict = outcome.verdict
    if (!verdict) return
    tx.textContent = `${verdict.status}: ${verdict.reason}`
    if (verdict.purchaseProven && link.address && config.token) {
      rememberPurchase(storage, {
        hash: hash.trim().toLowerCase(),
        account: link.address,
        token: config.token,
        chainId: 1301,
        savedAt: Date.now(),
      })
      renderHistory()
      if (outcome.balance?.ok) bal.textContent = `${formatUnits(outcome.balance.value, tokenDecimals)} ${tokenSymbol}`
      else if (outcome.balance && !outcome.balance.ok) bal.textContent = outcome.balance.error
    }
  }

  function renderHistory(): void {
    const rows = loadHistory(storage)
    hist.innerHTML = ''
    if (!rows.length) {
      const item = document.createElement('li')
      item.textContent = 'Belum ada pembelian yang terbukti. Riwayat lengkap tidak dikarang.'
      hist.append(item)
      return
    }
    for (const row of rows) {
      const item = document.createElement('li')
      const linkEl = document.createElement('a')
      linkEl.href = explorerTx(row.hash)
      linkEl.target = '_blank'
      linkEl.rel = 'noreferrer'
      linkEl.textContent = `${row.hash.slice(0, 10)}…`
      item.append(linkEl, ` · ${row.account.slice(0, 8)}…`)
      hist.append(item)
    }
  }
}

function must(root: HTMLElement, id: string): HTMLElement {
  const found = root.querySelector(`#${id}`)
  if (!found) throw new Error(`#${id} hilang`)
  return found as HTMLElement
}

function probeStorage(): Storage | null {
  try {
    const key = '__npcs_web3__'
    localStorage.setItem(key, '1')
    localStorage.removeItem(key)
    return localStorage
  } catch {
    return null
  }
}
