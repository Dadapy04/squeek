import { apiUrl, onlineEnabled, phoneLayout, walletConnectId, walletOffer } from './online-flag.ts'
import type { RunReport } from './run-report.ts'
import { EXTRACT_SAVE_KEY, loadExtract, onSaveWrote } from './save.ts'
import { decideSync, hasLocalProgress } from './sync-choice.ts'
import { t } from './i18n.ts'
import type { ExtractSave } from './sim.ts'

const SESSION_KEY = 'npcs-burrow-pixel-extract.session.v1'
const CLOUD_KEY = 'npcs-burrow-pixel-extract.cloud.v1'

interface Session {
  token: string
  address: string
  name: string | null
}

interface CloudMeta {
  address: string
  revision: number | null
  dirty: boolean
}

interface RemoteSave {
  revision: number
  updatedAt: number
  blob: string
}

interface Hooks {
  getSave: () => ExtractSave
  setSave: (next: ExtractSave) => void
  storage: Storage | null
}

let hooks: Hooks | null = null
let applying = false
let pending: RemoteSave | null = null
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

function readMeta(storage: Storage | null): CloudMeta | null {
  if (!storage) return null
  try {
    const parsed = JSON.parse(storage.getItem(CLOUD_KEY) ?? '') as CloudMeta
    if (!parsed?.address) return null
    return parsed
  } catch {
    return null
  }
}

function writeMeta(storage: Storage | null, meta: CloudMeta | null): void {
  if (!storage) return
  if (!meta) storage.removeItem(CLOUD_KEY)
  else storage.setItem(CLOUD_KEY, JSON.stringify(meta))
}

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

function setText(id: string, text: string): void {
  const el = document.getElementById(id)
  if (el) el.textContent = text
}

function showConflict(on: boolean): void {
  const keep = document.getElementById('cloudKeep')
  const use = document.getElementById('cloudUse')
  if (keep) keep.hidden = !on
  if (use) use.hidden = !on
}

export function refreshOnline(): void {
  if (!onlineEnabled() || !hooks) return
  const session = readSession(hooks.storage)
  const meta = readMeta(hooks.storage)
  if (!session) {
    setText('onlineStatus', t('online.guest'))
    setText('onlineStatusRun', t('online.guest'))
    setText('cloudStatus', t('online.device'))
    showConflict(false)
    paintWalletChrome()
    return
  }
  const label = session.name || shortAddress(session.address)
  setText('onlineStatus', t('online.who', { name: label }))
  setText('onlineStatusRun', t('online.who', { name: label }))
  if (pending) setText('cloudStatus', t('online.newer'))
  else if (meta?.dirty) setText('cloudStatus', t('online.device'))
  else setText('cloudStatus', t('online.synced'))
  showConflict(pending != null)
  paintWalletChrome()
}

async function api(path: string, init: RequestInit = {}, auth = true): Promise<Response> {
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json')
  const session = hooks ? readSession(hooks.storage) : null
  if (auth && session) headers.set('authorization', `Bearer ${session.token}`)
  return fetch(`${apiUrl()}${path}`, { ...init, headers })
}

function blobOf(save: ExtractSave): string {
  return JSON.stringify(save)
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

async function upload(forceRevision?: number): Promise<void> {
  if (!hooks) return
  const session = readSession(hooks.storage)
  if (!session) return
  const meta = readMeta(hooks.storage)
  const revision = forceRevision ?? meta?.revision ?? null
  let response: Response
  try {
    response = await api('/v1/save', { method: 'PUT', body: JSON.stringify({ revision, blob: blobOf(hooks.getSave()) }) })
  } catch {
    setText('cloudStatus', t('online.offline'))
    return
  }
  if (response.status === 409) {
    pending = await response.json() as RemoteSave
    refreshOnline()
    return
  }
  if (!response.ok) return
  const body = await response.json() as { revision: number }
  pending = null
  writeMeta(hooks.storage, { address: session.address, revision: body.revision, dirty: false })
  refreshOnline()
}

async function reconcile(): Promise<void> {
  if (!hooks) return
  const session = readSession(hooks.storage)
  if (!session) return
  let response: Response
  try {
    response = await api('/v1/save')
  } catch {
    setText('cloudStatus', t('online.offline'))
    return
  }
  if (!response.ok) return
  const body = await response.json() as { empty?: boolean; revision?: number; updatedAt?: number; blob?: string }
  const remote = body.empty || body.revision == null || body.blob == null ? null : { revision: body.revision, updatedAt: body.updatedAt ?? 0, blob: body.blob }
  const meta = readMeta(hooks.storage)
  const localMeta = meta && meta.address === session.address ? meta : { address: session.address, revision: null, dirty: hasLocalProgress(hooks.getSave()) }
  const choice = decideSync(
    { dirty: localMeta.dirty, revision: localMeta.revision, progress: hasLocalProgress(hooks.getSave()) },
    remote ? { revision: remote.revision } : null,
  )
  if (choice === 'upload') {
    writeMeta(hooks.storage, localMeta)
    await upload(remote ? remote.revision : 0)
    return
  }
  if (choice === 'download' && remote) {
    applying = true
    try { hooks.setSave(saveFromBlob(remote.blob)) } finally { applying = false }
    writeMeta(hooks.storage, { address: session.address, revision: remote.revision, dirty: false })
    pending = null
    refreshOnline()
    return
  }
  if (choice === 'ask' && remote) {
    pending = remote
    writeMeta(hooks.storage, { ...localMeta, dirty: true })
    refreshOnline()
  }
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

function show(id: string, on: boolean): void {
  const el = document.getElementById(id)
  if (el) el.hidden = !on
}

function paintWalletChrome(): void {
  const session = hooks ? readSession(hooks.storage) : null
  const soon = walletOffer({ injected: injected() != null, mobile: phoneLike() }) === 'soon' && !session
  show('onlineSoon', soon)
  show('onlineSign', !soon)
  show('walletInject', !soon)
  show('walletWc', !soon && walletConnectId() !== '')
  show('walletNameLabel', !soon)
  show('walletNameSave', !soon)
  show('walletOut', !soon)
}

async function signIn(provider: Eip1193): Promise<void> {
  if (!hooks) return
  const accounts = await provider.request({ method: 'eth_requestAccounts' }) as string[]
  const address = accounts[0]
  if (!address) return
  const nonce = await api('/v1/auth/nonce', { method: 'POST', body: JSON.stringify({ address }) }, false)
  if (!nonce.ok) return
  const issued = await nonce.json() as { message: string }
  const signature = await provider.request({ method: 'personal_sign', params: [issued.message, address] }) as string
  const verified = await api('/v1/auth/verify', { method: 'POST', body: JSON.stringify({ message: issued.message, signature }) }, false)
  if (!verified.ok) return
  const session = await verified.json() as Session
  writeSession(hooks.storage, session)
  const name = document.getElementById('walletName') as HTMLInputElement | null
  if (name) name.value = session.name ?? ''
  await reconcile()
  refreshOnline()
}

async function connectInjected(): Promise<void> {
  const provider = injected()
  if (!provider) {
    setText('cloudStatus', t('online.noWallet'))
    return
  }
  try {
    await signIn(provider)
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
    const provider = await mod.EthereumProvider.init({
      projectId,
      optionalChains: [1],
      showQrModal: true,
      methods: ['personal_sign'],
      rpcMap: { 1: 'https://cloudflare-eth.com' },
      metadata: {
        name: 'Squeek',
        description: 'Squeek extraction survival',
        url: typeof location !== 'undefined' ? location.origin : 'https://dadapy04.github.io',
        icons: [],
      },
    })
    await provider.connect()
    await signIn(provider as unknown as Eip1193)
  } catch {
    setText('cloudStatus', t('online.cancelled'))
  }
}

async function disconnect(): Promise<void> {
  if (!hooks) return
  try { await api('/v1/auth/logout', { method: 'POST' }) } catch { /* local sign-out still happens */ }
  writeSession(hooks.storage, null)
  pending = null
  runToken = null
  refreshOnline()
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

export async function takeRunSeed(): Promise<number | undefined> {
  if (!onlineEnabled() || !hooks || !readSession(hooks.storage)) return undefined
  try {
    const response = await api('/v1/runs/start', { method: 'POST', body: '{}' })
    if (!response.ok) return undefined
    const body = await response.json() as { seed: number; token: string }
    runToken = body.token
    return body.seed
  } catch {
    runToken = null
    return undefined
  }
}

export async function noteExtract(report: RunReport): Promise<void> {
  if (!runToken || !hooks || !readSession(hooks.storage)) return
  const token = runToken
  runToken = null
  try {
    const response = await api('/v1/runs/extract', { method: 'POST', body: JSON.stringify({ token, ...report }) })
    if (!response.ok) {
      setText('cloudStatus', t('online.rejected'))
      return
    }
    const body = await response.json() as { ranked?: boolean }
    if (body.ranked === false) setText('cloudStatus', t('online.flagged'))
  } catch {
    setText('cloudStatus', t('online.offline'))
  }
}

export function mountOnline(next: Hooks): void {
  hooks = next
  onSaveWrote(() => {
    if (applying || !onlineEnabled()) return
    const session = hooks ? readSession(hooks.storage) : null
    if (!session || !hooks) return
    const meta = readMeta(hooks.storage) ?? { address: session.address, revision: null, dirty: false }
    writeMeta(hooks.storage, { ...meta, address: session.address, dirty: true })
    void upload()
  })
  if (!onlineEnabled()) return
  const box = document.getElementById('onlineBox')
  if (box) box.hidden = false
  const runStatus = document.getElementById('onlineStatusRun')
  if (runStatus) runStatus.hidden = false
  document.getElementById('walletInject')?.addEventListener('click', () => { void connectInjected() })
  document.getElementById('walletWc')?.addEventListener('click', () => { void connectWalletConnect() })
  document.getElementById('walletOut')?.addEventListener('click', () => { void disconnect() })
  document.getElementById('walletNameSave')?.addEventListener('click', () => { void saveName() })
  document.getElementById('cloudKeep')?.addEventListener('click', () => {
    if (!pending) return
    const revision = pending.revision
    pending = null
    void upload(revision)
  })
  document.getElementById('cloudUse')?.addEventListener('click', () => {
    if (!hooks || !pending) return
    const remote = pending
    const session = readSession(hooks.storage)
    applying = true
    try { hooks.setSave(saveFromBlob(remote.blob)) } finally { applying = false }
    if (session) writeMeta(hooks.storage, { address: session.address, revision: remote.revision, dirty: false })
    pending = null
    refreshOnline()
  })
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
  refreshOnline()
  if (readSession(next.storage)) void reconcile()
}
