import { apiUrl, onlineEnabled, phoneLayout, walletButtons, walletConnectId } from './online-flag.ts'
import { freshGate, reduceGate, setRunOpen, type GateState } from './account-gate.ts'
import { resolveRunToken, tokenOnReload } from './run-token.ts'
import { nameTagLabel, needsNickname, paintBasePortrait, setNameTag, shortAddress } from './name-tag.ts'
import type { RunReport } from './run-report.ts'
import { EXTRACT_SAVE_KEY, loadExtract, setPersistSuspended } from './save.ts'
import { t } from './i18n.ts'
import type { ExtractSave } from './sim.ts'

const SESSION_KEY = 'npcs-burrow-pixel-extract.session.v1'
const RUN_KEY = 'npcs-burrow-pixel-extract.run.v1'
interface Session {
  token: string
  address: string
  name: string | null
}

interface Hooks {
  getSave: () => ExtractSave
  setSave: (next: ExtractSave) => void
  storage: Storage | null
}

let hooks: Hooks | null = null
let gate: GateState = freshGate()
let heldProvider: Eip1193 | null = null
let acceptRunEnd = false
let deferredWallet: { session: Session; state: unknown } | null = null
let guestBlob: string | null = null
let runToken: string | null = null

function readSession(storage: Storage | null): Session | null {
  if (!storage) return null
  try {
    const parsed = JSON.parse(storage.getItem(SESSION_KEY) ?? '') as Session
    if (!parsed?.token || !parsed.address) return null
    return parsed
  } catch {
    return null
  }
}

function writeSession(storage: Storage | null, session: Session | null): void {
  if (!storage) return
  if (!session) storage.removeItem(SESSION_KEY)
  else storage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function walletLive(): boolean {
  return guestBlob != null && hooks != null && readSession(hooks.storage) != null
}

function setText(id: string, text: string): void {
  const el = document.getElementById(id)
  if (el) el.textContent = text
}

export function refreshOnline(): void {
  if (!onlineEnabled() || !hooks) return
  const session = readSession(hooks.storage)
  if (!session || !walletLive()) {
    setText('onlineStatus', t('online.guest'))
    setText('onlineStatusRun', t('online.guest'))
    setText('cloudStatus', t('online.device'))
    paintAccountBadge(null, null)
    paintWalletChrome()
    return
  }
  const label = nameTagLabel(session.name, session.address)
  setText('onlineStatus', t('online.who', { name: label }))
  setText('onlineStatusRun', t('online.who', { name: label }))
  setText('cloudStatus', t('online.synced'))
  paintAccountBadge(session.address, session.name)
  paintWalletChrome()
}

function paintAccountBadge(address: string | null, name: string | null): void {
  const live = address != null
  const nick = (name ?? '').trim()
  const addr = live ? shortAddress(address) : ''
  setNameTag(live ? nameTagLabel(name, address) : null)
  paintBasePortrait(live ? nameTagLabel(name, address) : null)
  for (const id of ['accountBadge', 'accountBadgeBase']) {
    const badge = document.getElementById(id)
    if (!badge) continue
    badge.dataset.state = live ? 'in' : 'out'
    badge.replaceChildren()
    const dot = document.createElement('i')
    dot.className = 'dot'
    dot.setAttribute('aria-hidden', 'true')
    badge.append(dot)
    if (!live) {
      badge.append(document.createTextNode(t('online.guest')))
      continue
    }
    if (nick && needsNickname(nick) === false) {
      const strong = document.createElement('b')
      strong.textContent = nick.slice(0, 16)
      badge.append(strong)
    }
    const tail = document.createElement('span')
    tail.className = 'addr'
    tail.textContent = addr
    badge.append(tail)
  }
  const ask = document.getElementById('walletNameAsk')
  if (ask) ask.hidden = !live || !needsNickname(name)
}

let toastTimer = 0

export function showAccountToast(text: string): void {
  const toast = document.getElementById('accountToast')
  if (!toast) return
  toast.textContent = text
  toast.hidden = false
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => { toast.hidden = true }, 2200)
}

async function api(path: string, init: RequestInit = {}, auth = true): Promise<Response> {
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json')
  const session = hooks ? readSession(hooks.storage) : null
  if (auth && session) headers.set('authorization', `Bearer ${session.token}`)
  return fetch(`${apiUrl()}${path}`, { ...init, headers })
}

function saveFromBlob(blob: string): ExtractSave {
  const box = new Map<string, string>([[EXTRACT_SAVE_KEY, blob]])
  const storage: Storage = {
    get length() { return box.size },
    clear: () => box.clear(),
    getItem: (key) => box.get(key) ?? null,
    key: (index) => [...box.keys()][index] ?? null,
    removeItem: (key) => { box.delete(key) },
    setItem: (key, value) => { box.set(key, value) },
  }
  return loadExtract(storage)
}

interface Eip1193 {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
}

function injected(): Eip1193 | null {
  const eth = (window as Window & { ethereum?: Eip1193 }).ethereum
  return eth?.request ? eth : null
}

function phoneLike(): boolean {
  return phoneLayout({
    width: window.innerWidth,
    height: window.innerHeight,
    coarse: window.matchMedia('(pointer: coarse)').matches,
    ua: navigator.userAgent,
  })
}

function utf8Hex(message: string): string {
  const bytes = new TextEncoder().encode(message)
  return `0x${[...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`
}

function show(id: string, on: boolean): void {
  const el = document.getElementById(id)
  if (el) el.hidden = !on
}

function paintWalletChrome(): void {
  const buttons = walletButtons({
    injected: injected() != null,
    mobile: phoneLike(),
    walletConnect: walletConnectId() !== '',
  })
  show('walletInject', buttons.injected)
  show('walletWc', buttons.walletConnect)
}

function inRun(): boolean {
  return Boolean(hooks?.getSave().run)
}

export function walletSettled(): boolean {
  return gate.settled
}

export function permitRunEnd(): void {
  acceptRunEnd = true
}

export function takeRunEndPermit(): boolean {
  const allowed = acceptRunEnd
  acceptRunEnd = false
  return allowed
}

export function noteRunBoundary(): void {
  const result = setRunOpen(gate, inRun())
  gate = result.state
  if (!inRun() && heldProvider) {
    const provider = heldProvider
    heldProvider = null
    void signIn(provider, false)
    return
  }
  if (result.apply?.presence === 'wallet' && deferredWallet) {
    const held = deferredWallet
    deferredWallet = null
    commitWallet(held.session, held.state, true)
  }
}

/** A late WalletConnect restore. Returns deferred when a run is on screen. */
export function offerSessionRestore(address: string): 'applied' | 'deferred' | 'ignored' {
  const running = inRun()
  const result = reduceGate({ ...gate, inRun: running }, { type: 'restored', address, name: null })
  gate = result.state
  if (running && gate.deferred) return 'deferred'
  if (result.apply) return 'applied'
  return 'ignored'
}

function paintDepartLock(): void {
  const button = document.getElementById('deploy') as HTMLButtonElement | null
  const note = document.getElementById('deployError')
  if (!button) return
  if (!gate.settled) {
    button.disabled = true
    button.dataset.checking = '1'
    if (note) {
      note.hidden = false
      note.textContent = t('online.checking')
    }
    return
  }
  if (button.dataset.checking) {
    button.disabled = false
    delete button.dataset.checking
    if (note && note.textContent === t('online.checking')) note.hidden = true
  }
}

async function signIn(provider: Eip1193, explicit: boolean): Promise<void> {
  if (!hooks) return
  if (inRun()) {
    heldProvider = provider
    const result = reduceGate({ ...gate, inRun: true }, { type: 'restored', address: 'pending', name: null })
    gate = result.state
    return
  }
  const accounts = await provider.request({ method: 'eth_requestAccounts' }) as string[]
  const address = accounts[0]
  if (!address) return
  let chainId = 1
  try {
    const chainHex = await provider.request({ method: 'eth_chainId' }) as string
    const parsed = typeof chainHex === 'string' ? Number.parseInt(chainHex, 16) : Number.NaN
    if (Number.isInteger(parsed) && parsed > 0) chainId = parsed
  } catch { /* keep chain 1 if the wallet will not say */ }
  const uri = `${location.origin}${location.pathname}`
  const nonce = await api('/v1/auth/nonce', { method: 'POST', body: JSON.stringify({ address, chainId, uri }) }, false)
  if (!nonce.ok) return
  const issued = await nonce.json() as { message: string }
  const signature = await provider.request({ method: 'personal_sign', params: [utf8Hex(issued.message), address] }) as string
  const verified = await api('/v1/auth/verify', { method: 'POST', body: JSON.stringify({ message: issued.message, signature }) }, false)
  if (!verified.ok) return
  const session = await verified.json() as Session
  writeSession(hooks.storage, session)
  const account = await api('/v1/account')
  if (account.status === 404 || account.status === 410) {
    writeSession(hooks.storage, null)
    setText('cloudStatus', t('online.updating'))
    refreshOnline()
    return
  }
  if (!account.ok) {
    writeSession(hooks.storage, null)
    setText('cloudStatus', t('online.offline'))
    refreshOnline()
    return
  }
  const body = await account.json() as { state: unknown; abandoned?: boolean }
  const result = reduceGate({ ...gate, inRun: inRun() }, explicit
    ? { type: 'explicit-connect', address: session.address, name: session.name }
    : { type: 'restored', address: session.address, name: session.name })
  gate = result.state
  if (!result.apply) {
    deferredWallet = { session, state: body.state }
    return
  }
  commitWallet(session, body.state, true)
  if (body.abandoned) showAccountToast(t('online.abandoned'))
}

function commitWallet(session: Session, state: unknown, toast: boolean): void {
  if (!hooks) return
  writeSession(hooks.storage, session)
  guestBlob = hooks.storage?.getItem(EXTRACT_SAVE_KEY) ?? guestBlob ?? ''
  setPersistSuspended(true)
  hooks.setSave(saveFromBlob(JSON.stringify(state)))
  const name = document.getElementById('walletName') as HTMLInputElement | null
  if (name) name.value = session.name ?? ''
  refreshOnline()
  if (needsNickname(session.name)) name?.focus()
  if (toast) showAccountToast(t('online.toastOn'))
}

async function connectInjected(): Promise<void> {
  const provider = injected()
  if (!provider) {
    setText('cloudStatus', t('online.noWallet'))
    return
  }
  try {
    await signIn(provider, true)
  } catch {
    setText('cloudStatus', t('online.cancelled'))
  }
}

async function connectWalletConnect(): Promise<void> {
  const projectId = walletConnectId()
  if (!projectId) {
    setText('cloudStatus', t('online.wcMissing'))
    return
  }
  try {
    const mod = await import('@walletconnect/ethereum-provider')
    const here = typeof location !== 'undefined'
    const origin = here ? location.origin : 'https://squeekextract.xyz'
    const icon = `${origin}${here && location.pathname.startsWith('/squeek') ? '/squeek/favicon.svg' : '/favicon.svg'}`
    const provider = await mod.EthereumProvider.init({
      projectId,
      optionalChains: [1],
      showQrModal: true,
      methods: ['personal_sign', 'eth_requestAccounts'],
      events: ['accountsChanged', 'chainChanged'],
      rpcMap: { 1: 'https://cloudflare-eth.com' },
      metadata: {
        name: 'Squeek',
        description: 'Squeek extraction survival',
        url: origin,
        icons: [icon],
      },
    })
    watchProvider(provider)
    await provider.connect()
    await signIn(provider, true)
  } catch {
    setText('cloudStatus', t('online.cancelled'))
  }
}

function watchProvider(provider: unknown): void {
  const live = provider as { on?: (event: 'disconnect' | 'connect', listener: () => void) => void; accounts?: string[] }
  live.on?.('disconnect', () => {
    const result = reduceGate({ ...gate, inRun: inRun() }, { type: 'dropped' })
    gate = result.state
  })
  live.on?.('connect', () => {
    const address = live.accounts?.[0]
    if (!address || !hooks) return
    const session = readSession(hooks.storage)
    const result = reduceGate({ ...gate, inRun: inRun() }, { type: 'reconnected', address, name: session?.name ?? null })
    gate = result.state
  })
}

async function settleWallet(): Promise<void> {
  paintDepartLock()
  try {
    const session = hooks ? readSession(hooks.storage) : null
    if (session) {
      const account = await api('/v1/account')
      if (account.ok) {
        const body = await account.json() as { state: unknown; abandoned?: boolean }
        const result = reduceGate({ ...gate, inRun: inRun() }, { type: 'restored', address: session.address, name: session.name })
        gate = result.state
        if (result.apply) commitWallet(session, body.state, false)
        else deferredWallet = { session, state: body.state }
        if (body.abandoned && result.apply) showAccountToast(t('online.abandoned'))
      } else if (account.status === 401 && hooks) {
        writeSession(hooks.storage, null)
      }
    }
    await Promise.race([
      probeWalletConnect(),
      new Promise((resolve) => setTimeout(resolve, 4000)),
    ])
  } catch { /* a failed check leaves the guest save in place */ }
  const done = reduceGate(gate, { type: 'settled' })
  gate = done.state
  paintDepartLock()
  refreshOnline()
}

async function probeWalletConnect(): Promise<void> {
  const projectId = walletConnectId()
  if (!projectId || !hooks) return
  const mod = await import('@walletconnect/ethereum-provider')
  const here = typeof location !== 'undefined'
  const origin = here ? location.origin : 'https://squeekextract.xyz'
  const icon = `${origin}${here && location.pathname.startsWith('/squeek') ? '/squeek/favicon.svg' : '/favicon.svg'}`
  const provider = await mod.EthereumProvider.init({
    projectId,
    optionalChains: [1],
    showQrModal: false,
    methods: ['personal_sign', 'eth_requestAccounts'],
    events: ['accountsChanged', 'chainChanged'],
    rpcMap: { 1: 'https://cloudflare-eth.com' },
    metadata: {
      name: 'Squeek',
      description: 'Squeek extraction survival',
      url: origin,
      icons: [icon],
    },
  })
  watchProvider(provider)
  const address = provider.accounts?.[0]
  if (!address) return
  const session = readSession(hooks.storage)
  if (!session || session.address.toLowerCase() !== address.toLowerCase()) return
  const result = reduceGate({ ...gate, inRun: inRun() }, { type: 'reconnected', address: session.address, name: session.name })
  gate = result.state
}

async function disconnect(): Promise<void> {
  if (!hooks || inRun()) return
  if (runToken) await noteDeath(1)
  try { await api('/v1/auth/logout', { method: 'POST' }) } catch { /* local sign-out still happens */ }
  const kept = guestBlob
  guestBlob = null
  runToken = null
  setPersistSuspended(false)
  writeSession(hooks.storage, null)
  if (kept != null) hooks.setSave(saveFromBlob(kept || '{}'))
  refreshOnline()
  showAccountToast(t('online.toastOff'))
}

async function saveName(): Promise<void> {
  if (!hooks) return
  const input = document.getElementById('walletName') as HTMLInputElement | null
  const name = input?.value.trim() ?? ''
  const response = await api('/v1/profile', { method: 'PUT', body: JSON.stringify({ name }) })
  if (!response.ok) return
  const session = readSession(hooks.storage)
  if (!session) return
  writeSession(hooks.storage, { ...session, name: name || null })
  refreshOnline()
}

async function loadBoard(): Promise<void> {
  const list = document.getElementById('boardList')
  if (!list) return
  const metric = (document.getElementById('boardDepth') as HTMLButtonElement | null)?.dataset.on === '1' ? 'depth' : 'value'
  const span = (document.getElementById('boardWeek') as HTMLButtonElement | null)?.dataset.on === '1' ? 'week' : 'all'
  list.replaceChildren()
  let response: Response
  try {
    response = await api(`/v1/leaderboard?metric=${metric}&span=${span}`, {}, false)
  } catch {
    setText('cloudStatus', t('online.offline'))
    return
  }
  if (!response.ok) return
  const body = await response.json() as { rows: { address: string; name: string | null; value: number; depth: number }[] }
  if (body.rows.length === 0) {
    const empty = document.createElement('li')
    empty.textContent = t('online.empty')
    list.append(empty)
    return
  }
  body.rows.forEach((row) => {
    const item = document.createElement('li')
    const who = row.name || shortAddress(row.address)
    item.textContent = metric === 'depth' ? `${who} · ${row.depth}` : `${who} · ${row.value}`
    list.append(item)
  })
}

function markBoard(id: string, group: string): void {
  for (const other of group === 'metric' ? ['boardValue', 'boardDepth'] : ['boardWeek', 'boardAll']) {
    const button = document.getElementById(other)
    if (button) button.dataset.on = other === id ? '1' : '0'
  }
}

/** Ask for a seed. The token is not armed until the local run actually starts. */
export async function takeRunSeed(picks: { kind: string; n: number }[] = [], bringShield = false): Promise<{ seed: number; token: string; state?: unknown; carried?: unknown; error?: string } | undefined> {
  if (!onlineEnabled() || !hooks || !readSession(hooks.storage)) return undefined
  try {
    const response = await api('/v1/runs/start', { method: 'POST', body: JSON.stringify({ picks, bringShield }) })
    const body = await response.json().catch(() => ({})) as { seed?: number; token?: string; error?: string; abandoned?: boolean; state?: { activeRun?: unknown } }
    if (body.abandoned) showAccountToast(t('online.abandoned'))
    if (body.state && walletLive()) hooks.setSave(saveFromBlob(JSON.stringify({ ...body.state, activeRun: null })))
    if (!response.ok || !body.token || body.seed == null) return { seed: 0, token: '', error: body.error ?? 'offline' }
    const carried = body.state?.activeRun
    return { seed: body.seed, token: body.token, state: body.state, carried }
  } catch {
    return undefined
  }
}

export function armRun(token: string | undefined): void {
  runToken = token ?? null
  if (!hooks?.storage) return
  if (!token) hooks.storage.removeItem(RUN_KEY)
  else hooks.storage.setItem(RUN_KEY, JSON.stringify({ token }))
}

function rejectText(body: { reason?: string; error?: string; depth?: number; elapsedMs?: number }): string {
  const depth = body.depth ?? 1
  const sec = Math.max(0, Math.round((body.elapsedMs ?? 0) / 1000))
  const reason = body.reason || body.error
  if (reason === 'too-fast') return t('online.why.fast', { depth, sec })
  if (reason === 'cap') return t('online.why.cap', { depth })
  if (reason === 'coins') return t('online.why.coins')
  if (reason === 'total') return t('online.why.total')
  if (reason === 'depth') return t('online.why.depth')
  if (reason === 'log') return t('online.why.log')
  if (reason === 'time') return t('online.why.time')
  if (reason === 'token') return t('online.why.token')
  if (reason === 'stash-full') return t('err.stashFull')
  return t('online.rejected')
}

export interface RunNotice {
  ok: boolean
  ranked: boolean | null
  message: string
}

function notRanked(reason: string): string {
  return t('online.notRanked', { reason })
}

export function deathNote(): string {
  return t('result.fell')
}

export function guestExtractNote(): string {
  return `${t('result.guest')}\n${t('result.guestBoard')}`
}

export function keptRecordNote(best: number): string {
  return t('online.kept', { n: best })
}

function tellRank(message: string): void {
  setText('cloudStatus', message)
  showAccountToast(message)
}

function storedRunToken(): string | null {
  if (!hooks?.storage) return null
  try {
    const token = String((JSON.parse(hooks.storage.getItem(RUN_KEY) ?? '') as { token?: string }).token ?? '')
    return token || null
  } catch {
    return null
  }
}

function liveToken(): string | null {
  const token = resolveRunToken(runToken, storedRunToken(), 'keep')
  if (token) runToken = token
  return token
}

export async function noteExtract(report: RunReport): Promise<RunNotice> {
  const token = liveToken()
  if (!token || !hooks || !readSession(hooks.storage)) {
    const message = notRanked(t('online.why.token'))
    tellRank(message)
    return { ok: false, ranked: false, message }
  }
  try {
    const response = await api('/v1/runs/extract', { method: 'POST', body: JSON.stringify({ token, ...report }) })
    const body = await response.json().catch(() => ({})) as { reason?: string; error?: string; depth?: number; elapsedMs?: number; ranked?: boolean; record?: boolean; bestValue?: number; state?: unknown }
    if (body.state) {
      permitRunEnd()
      hooks.setSave(saveFromBlob(JSON.stringify(body.state)))
    }
    if (!response.ok) {
      const message = notRanked(rejectText(body))
      tellRank(message)
      if (body.state) armRun(resolveRunToken(token, token, 'close') ?? undefined)
      return { ok: false, ranked: false, message }
    }
    armRun(resolveRunToken(token, token, 'close') ?? undefined)
    if (body.ranked === false) {
      const message = notRanked(t('online.flagged'))
      tellRank(message)
      return { ok: true, ranked: false, message }
    }
    const message = body.record === false && typeof body.bestValue === 'number' ? keptRecordNote(body.bestValue) : t('online.ranked')
    setText('cloudStatus', message)
    return { ok: true, ranked: true, message }
  } catch {
    const message = notRanked(t('online.why.net'))
    tellRank(message)
    return { ok: false, ranked: null, message }
  }
}

export async function noteDeath(depth: number): Promise<RunNotice> {
  const token = liveToken()
  if (!token || !hooks || !readSession(hooks.storage)) {
    const message = t('online.why.token')
    tellRank(message)
    return { ok: false, ranked: false, message }
  }
  try {
    const response = await api('/v1/runs/die', { method: 'POST', body: JSON.stringify({ token, depth }) })
    const body = await response.json().catch(() => ({})) as { state?: unknown; error?: string }
    if (body.state) {
      permitRunEnd()
      hooks.setSave(saveFromBlob(JSON.stringify(body.state)))
    }
    if (!response.ok) {
      const message = t('online.why.net')
      tellRank(message)
      return { ok: false, ranked: false, message }
    }
    armRun(undefined)
    return { ok: true, ranked: false, message: deathNote() }
  } catch {
    const message = t('online.why.net')
    tellRank(message)
    return { ok: false, ranked: null, message }
  }
}

export async function walletAct(path: string, body: unknown, apply = true): Promise<{ ok: boolean; reason?: string; gained?: number; coins?: number }> {
  if (!hooks || !walletLive()) return { ok: false, reason: 'offline' }
  try {
    const response = await api(path, { method: 'POST', body: JSON.stringify(body ?? {}) })
    const payload = await response.json().catch(() => ({})) as { ok?: boolean; error?: string; state?: unknown; gained?: number }
    if (apply && payload.state) hooks.setSave(saveFromBlob(JSON.stringify(payload.state)))
    if (!response.ok || payload.ok === false) return { ok: false, reason: payload.error }
    const coins = typeof (payload.state as { coins?: unknown } | undefined)?.coins === 'number'
      ? (payload.state as { coins: number }).coins
      : undefined
    return { ok: true, gained: payload.gained, coins }
  } catch {
    setText('cloudStatus', t('online.offline'))
    return { ok: false, reason: 'offline' }
  }
}

export function mountOnline(next: Hooks): void {
  hooks = next
  if (!onlineEnabled()) return
  const box = document.getElementById('onlineBox')
  if (box) box.hidden = false
  const runStatus = document.getElementById('onlineStatusRun')
  if (runStatus) runStatus.hidden = false
  document.getElementById('walletInject')?.addEventListener('click', () => { void connectInjected() })
  document.getElementById('walletWc')?.addEventListener('click', () => { void connectWalletConnect() })
  document.getElementById('walletOut')?.addEventListener('click', () => { void disconnect() })
  document.getElementById('walletNameSave')?.addEventListener('click', () => { void saveName() })
  document.getElementById('openBoard')?.addEventListener('click', () => {
    const board = document.getElementById('board')
    if (!board) return
    board.hidden = false
    void loadBoard()
  })
  document.getElementById('boardClose')?.addEventListener('click', () => {
    const board = document.getElementById('board')
    if (board) board.hidden = true
  })
  for (const id of ['boardValue', 'boardDepth', 'boardWeek', 'boardAll']) {
    document.getElementById(id)?.addEventListener('click', () => {
      markBoard(id, id === 'boardValue' || id === 'boardDepth' ? 'metric' : 'span')
      void loadBoard()
    })
  }
  const value = document.getElementById('boardValue')
  const all = document.getElementById('boardAll')
  if (value) value.dataset.on = '1'
  if (all) all.dataset.on = '1'
  void recoverStoredRun()
  void settleWallet()
  refreshOnline()
}

async function recoverStoredRun(): Promise<void> {
  if (!hooks?.storage) return
  const stored = storedRunToken()
  const action = tokenOnReload(inRun(), stored)
  if (action === 'restore' && stored) {
    runToken = stored
    return
  }
  if (action !== 'abandon' || !stored || !readSession(hooks.storage)) return
  try {
    const response = await api('/v1/runs/die', { method: 'POST', body: JSON.stringify({ token: stored, depth: 1 }) })
    if (response.ok || response.status === 409 || response.status === 401) hooks.storage.removeItem(RUN_KEY)
  } catch { /* the next sign-in closes a delve that is still open */ }
}
