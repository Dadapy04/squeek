import { boardSql, personalBestSql } from './board.ts'
import { ALTERS, RETIRE_BLOBS, SCHEMA } from './schema.ts'
import { applyDeath, applyExtract, buyMerchant, chooseWeapon, fieldBuy, freshAccount, mendShield, replayTutorialAccount, seeTip, sellCommon, sellUnit, settleOneWeapon, skipTutorial, startRun, undoRun, upgradeBag, upgradeWeapon, type Account, type LootRow, type Pick } from '../../shared/account.ts'
import { checksumAddress, isAddress, normAddress, randomNonce, readMessageAddress, readNonce, recoverAddress, siweMessage, uriAllowed } from './siwe.ts'
import { judgeRun, MIN_SECONDS, weekKey, type RunEvent } from './rules.ts'

export interface Env {
  DB: D1Database
  RUN_SECRET: string
  SIWE_DOMAIN: string
  SIWE_URI: string
  CORS_ORIGIN: string
}

const enc = new TextEncoder()
const NONCE_MS = 10 * 60 * 1000
const SESSION_MS = 30 * 24 * 60 * 60 * 1000

let schemaReady: Promise<void> | null = null

async function ensureSchema(db: D1Database): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      for (const sql of SCHEMA) await db.prepare(sql).run()
      for (const sql of ALTERS) {
        try { await db.prepare(sql).run() } catch { /* column already present */ }
      }
      await db.prepare(RETIRE_BLOBS).run()
    })()
  }
  await schemaReady
}

function json(body: unknown, status = 200, extra?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...extra },
  })
}

function corsHeaders(request: Request, env: Env): Headers {
  const origin = request.headers.get('origin') ?? ''
  const allowed = (env.CORS_ORIGIN || '').split(',').map((item) => item.trim()).filter(Boolean)
  const headers = new Headers()
  if (allowed.includes(origin) || allowed.includes('*')) {
    headers.set('access-control-allow-origin', origin || '*')
    headers.set('vary', 'origin')
  }
  headers.set('access-control-allow-methods', 'GET,POST,PUT,OPTIONS')
  headers.set('access-control-allow-headers', 'content-type,authorization')
  headers.set('access-control-max-age', '86400')
  return headers
}

function withCors(request: Request, env: Env, response: Response): Response {
  const headers = new Headers(response.headers)
  corsHeaders(request, env).forEach((value, key) => headers.set(key, value))
  return new Response(response.body, { status: response.status, headers })
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(value))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function hmac(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload))
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

function b64url(value: string): string {
  return btoa(value).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

function fromB64url(value: string): string {
  const pad = value.length % 4 === 0 ? '' : '='.repeat(4 - (value.length % 4))
  return atob(value.replaceAll('-', '+').replaceAll('_', '/') + pad)
}

async function allow(db: D1Database, key: string, limit: number, windowMs: number, now: number): Promise<boolean> {
  const row = await db.prepare('SELECT count, reset_at FROM limits WHERE key = ?').bind(key).first<{ count: number; reset_at: number }>()
  if (!row || row.reset_at <= now) {
    await db.prepare('INSERT INTO limits (key, count, reset_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = 1, reset_at = excluded.reset_at').bind(key, now + windowMs).run()
    return true
  }
  if (row.count >= limit) return false
  await db.prepare('UPDATE limits SET count = count + 1 WHERE key = ?').bind(key).run()
  return true
}

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json() as unknown
    return body && typeof body === 'object' ? body as Record<string, unknown> : null
  } catch {
    return null
  }
}

async function sessionAddress(request: Request, env: Env, now: number): Promise<string | null> {
  const header = request.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) return null
  const row = await env.DB.prepare('SELECT address, expires_at FROM sessions WHERE token_hash = ?').bind(await sha256(token)).first<{ address: string; expires_at: number }>()
  if (!row || row.expires_at <= now) return null
  return row.address
}

function clientIp(request: Request): string {
  return request.headers.get('cf-connecting-ip') || 'local'
}

async function issueToken(env: Env, fields: { id: string; address: string; seed: number; iat: number; exp: number }): Promise<string> {
  const payload = b64url(JSON.stringify(fields))
  return `${payload}.${await hmac(env.RUN_SECRET, payload)}`
}

async function readToken(env: Env, token: string): Promise<{ id: string; address: string; seed: number; iat: number; exp: number } | null> {
  const dot = token.lastIndexOf('.')
  if (dot <= 0) return null
  const payload = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const expect = await hmac(env.RUN_SECRET, payload)
  if (sig.length !== expect.length) return null
  let diff = 0
  for (let i = 0; i < sig.length; i += 1) diff |= sig.charCodeAt(i) ^ expect.charCodeAt(i)
  if (diff !== 0) return null
  try {
    const parsed = JSON.parse(fromB64url(payload)) as { id?: string; address?: string; seed?: number; iat?: number; exp?: number }
    if (!parsed.id || !parsed.address || !isAddress(parsed.address) || typeof parsed.seed !== 'number' || typeof parsed.iat !== 'number' || typeof parsed.exp !== 'number') return null
    return { id: parsed.id, address: normAddress(parsed.address), seed: parsed.seed, iat: parsed.iat, exp: parsed.exp }
  } catch {
    return null
  }
}

async function route(request: Request, env: Env, now: number): Promise<Response> {
  const url = new URL(request.url)
  const path = url.pathname.replace(/\/$/, '') || '/'
  if (request.method === 'GET' && path === '/v1/health') return json({ ok: true })

  if (request.method === 'POST' && path === '/v1/auth/nonce') {
    const body = await readJson(request)
    const address = typeof body?.address === 'string' ? body.address : ''
    if (!isAddress(address)) return json({ error: 'address' }, 400)
    const id = normAddress(address)
    if (!await allow(env.DB, `nonce:${id}`, 8, NONCE_MS, now)) return json({ error: 'rate' }, 429)
    const nonce = randomNonce()
    const issuedAt = new Date(now).toISOString()
    const expirationTime = new Date(now + NONCE_MS).toISOString()
    const chainRaw = Number(body?.chainId)
    const chainId = Number.isInteger(chainRaw) && chainRaw > 0 && chainRaw < 1_000_000 ? chainRaw : 1
    const requested = typeof body?.uri === 'string' ? body.uri : ''
    const uri = uriAllowed(requested, env.SIWE_DOMAIN) ? requested : env.SIWE_URI
    await env.DB.prepare('INSERT INTO nonces (nonce, address, expires_at) VALUES (?, ?, ?)').bind(nonce, id, now + NONCE_MS).run()
    const message = siweMessage({ domain: env.SIWE_DOMAIN, address: checksumAddress(id), uri, nonce, issuedAt, expirationTime, chainId })
    return json({ nonce, message, issuedAt, expirationTime })
  }

  if (request.method === 'POST' && path === '/v1/auth/verify') {
    const body = await readJson(request)
    const message = typeof body?.message === 'string' ? body.message : ''
    const signature = typeof body?.signature === 'string' ? body.signature : ''
    const nonce = readNonce(message)
    const claimed = readMessageAddress(message)
    if (!nonce || !claimed || !message.includes(env.SIWE_DOMAIN) || !message.includes(env.SIWE_URI)) return json({ error: 'message' }, 400)
    if (!await allow(env.DB, `verify:${claimed}`, 12, NONCE_MS, now)) return json({ error: 'rate' }, 429)
    const row = await env.DB.prepare('SELECT address, expires_at FROM nonces WHERE nonce = ?').bind(nonce).first<{ address: string; expires_at: number }>()
    if (!row || row.expires_at <= now || row.address !== claimed) return json({ error: 'nonce' }, 401)
    const signer = recoverAddress(message, signature)
    if (!signer || signer !== claimed) return json({ error: 'signature' }, 401)
    await env.DB.prepare('DELETE FROM nonces WHERE nonce = ?').bind(nonce).run()
    const tokenBytes = new Uint8Array(32)
    crypto.getRandomValues(tokenBytes)
    const token = [...tokenBytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
    await env.DB.prepare('INSERT INTO sessions (token_hash, address, expires_at) VALUES (?, ?, ?)').bind(await sha256(token), claimed, now + SESSION_MS).run()
    const profile = await env.DB.prepare('SELECT name FROM profiles WHERE address = ?').bind(claimed).first<{ name: string | null }>()
    return json({ token, address: claimed, expiresAt: now + SESSION_MS, name: profile?.name ?? null })
  }

  const address = await sessionAddress(request, env, now)

  if (request.method === 'POST' && path === '/v1/auth/logout') {
    if (!address) return json({ error: 'unauthorized' }, 401)
    const header = request.headers.get('authorization') ?? ''
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(token)).run()
    return json({ ok: true })
  }

  if (request.method === 'GET' && path === '/v1/me') {
    if (!address) return json({ error: 'unauthorized' }, 401)
    const profile = await env.DB.prepare('SELECT name FROM profiles WHERE address = ?').bind(address).first<{ name: string | null }>()
    return json({ address, name: profile?.name ?? null })
  }

  if (request.method === 'PUT' && path === '/v1/profile') {
    if (!address) return json({ error: 'unauthorized' }, 401)
    const body = await readJson(request)
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    if (name && !/^[A-Za-z0-9 ]{3,16}$/.test(name)) return json({ error: 'name' }, 400)
    if (!name) await env.DB.prepare('DELETE FROM profiles WHERE address = ?').bind(address).run()
    else await env.DB.prepare('INSERT INTO profiles (address, name) VALUES (?, ?) ON CONFLICT(address) DO UPDATE SET name = excluded.name').bind(address, name).run()
    return json({ address, name: name || null })
  }

  if (request.method === 'GET' && path === '/v1/save' || request.method === 'PUT' && path === '/v1/save') {
    return json({ error: 'blob-retired' }, 410)
  }

  if (request.method === 'GET' && path === '/v1/account') {
    if (!address) return json({ error: 'unauthorized' }, 401)
    const loaded = await loadAccount(env, address, now)
    const settled = await abandonOpenRuns(env, address, loaded.account, now)
    return json({ revision: settled.revision ?? loaded.revision, state: loaded.account, abandoned: settled.abandoned })
  }

  if (request.method === 'POST' && path.startsWith('/v1/act/')) {
    if (!address) return json({ error: 'unauthorized' }, 401)
    if (!await allow(env.DB, `act:${address}`, 60, NONCE_MS, now)) return json({ error: 'rate' }, 429)
    const body = await readJson(request)
    const loaded = await loadAccount(env, address, now)
    const account = loaded.account
    const action = path.slice('/v1/act/'.length)
    const result = runAction(account, action, body ?? {})
    if (!result.ok) return json({ error: result.reason, state: account }, 422)
    const revision = await storeAccount(env, address, account, now)
    return json({ revision, state: account, ...result })
  }

  if (request.method === 'POST' && path === '/v1/runs/start') {
    if (!address) return json({ error: 'unauthorized' }, 401)
    if (!await allow(env.DB, `start:${address}`, 12, NONCE_MS, now)) return json({ error: 'rate' }, 429)
    const body = await readJson(request)
    const loaded = await loadAccount(env, address, now)
    const settled = await abandonOpenRuns(env, address, loaded.account, now)
    const abandoned = settled.abandoned
    const id = crypto.randomUUID()
    const picks = Array.isArray(body?.picks) ? body.picks as Pick[] : []
    const started = startRun(loaded.account, picks, body?.bringShield === true, id)
    if (!started.ok) return json({ error: started.reason, state: loaded.account, abandoned }, 422)
    const seed = crypto.getRandomValues(new Uint32Array(1))[0]! || 1
    const exp = now + 6 * 60 * 60 * 1000
    const token = await issueToken(env, { id, address, seed, iat: now, exp })
    await env.DB.prepare('INSERT INTO runs (id, address, seed, token_hash, status, issued_at) VALUES (?, ?, ?, ?, ?, ?)').bind(id, address, seed, await sha256(token), 'open', now).run()
    const revision = await storeAccount(env, address, loaded.account, now)
    return json({ runId: id, seed, token, issuedAt: now, expiresAt: exp, revision, state: loaded.account, abandoned })
  }

  if (request.method === 'POST' && path === '/v1/runs/die') {
    if (!address) return json({ error: 'unauthorized' }, 401)
    const body = await readJson(request)
    const closed = await closeRun(env, address, body ?? {}, now, 'die')
    return json(closed.body, closed.status)
  }

  if (request.method === 'POST' && path === '/v1/runs/extract') {
    if (!address) return json({ error: 'unauthorized' }, 401)
    if (!await allow(env.DB, `extract:${address}`, 12, NONCE_MS, now)) return json({ error: 'rate' }, 429)
    const body = await readJson(request)
    const token = typeof body?.token === 'string' ? body.token : ''
    const parsed = await readToken(env, token)
    if (!parsed || parsed.address !== address || parsed.exp <= now) return json({ error: 'token' }, 401)
    const run = await env.DB.prepare('SELECT id, status, issued_at, token_hash FROM runs WHERE id = ? AND address = ?').bind(parsed.id, address).first<{ id: string; status: string; issued_at: number; token_hash: string }>()
    if (!run || run.token_hash !== await sha256(token)) return json({ error: 'token' }, 401)
    if (run.status !== 'open') return json({ error: 'used', status: run.status }, 409)
    const events = Array.isArray(body?.events) ? body.events as RunEvent[] : []
    const verdict = judgeRun({
      depth: Number(body?.depth),
      value: Number(body?.value),
      events,
      elapsedMs: now - run.issued_at,
    })
    const elapsedMs = now - run.issued_at
    const loaded = await loadAccount(env, address, now)
    if (loaded.account.activeRun?.id !== run.id) return json({ error: 'no-run' }, 422)
    if (!verdict.ok) {
      undoRun(loaded.account)
      await env.DB.prepare('UPDATE runs SET status = ?, reason = ?, depth = ?, value = ?, elapsed_ms = ? WHERE id = ?').bind('rejected', verdict.reason, Number(body?.depth) || null, Number(body?.value) || null, elapsedMs, run.id).run()
      const revision = await storeAccount(env, address, loaded.account, now)
      return json({ accepted: false, ranked: false, reason: verdict.reason, depth: Number(body?.depth) || null, value: Number(body?.value) || null, elapsedMs, revision, state: loaded.account }, 422)
    }
    const loot: LootRow[] = events.filter((event) => event.kind === 'loot' && event.item && event.coins != null).map((event) => ({ kind: event.item!, coins: event.coins! }))
    const applied = applyExtract(loaded.account, loot, verdict.depth)
    if (!applied.ok) return json({ error: applied.reason, state: loaded.account }, 422)
    await env.DB.prepare('UPDATE runs SET status = ?, depth = ?, value = ?, reason = ?, elapsed_ms = ? WHERE id = ?').bind(verdict.flagged ? 'flagged' : 'accepted', verdict.depth, verdict.value, verdict.reason ?? null, elapsedMs, run.id).run()
    await env.DB.prepare('INSERT INTO scores (run_id, address, depth, value, week, created_at, flagged) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(run.id, address, verdict.depth, verdict.value, weekKey(now), now, verdict.flagged ? 1 : 0).run()
    const best = await env.DB.prepare(personalBestSql()).bind(address).first<{ run_id: string; value: number; depth: number }>()
    const revision = await storeAccount(env, address, loaded.account, now)
    return json({
      accepted: true,
      ranked: !verdict.flagged,
      record: best?.run_id === run.id,
      bestValue: best?.value ?? verdict.value,
      value: verdict.value,
      depth: verdict.depth,
      flagged: verdict.flagged,
      revision,
      state: loaded.account,
    })
  }

  if (request.method === 'GET' && path === '/v1/leaderboard') {
    if (!await allow(env.DB, `board:${clientIp(request)}`, 60, 60 * 1000, now)) return json({ error: 'rate' }, 429)
    const metric = url.searchParams.get('metric') === 'depth' ? 'depth' : 'value'
    const span = url.searchParams.get('span') === 'week' ? 'week' : 'all'
    const week = weekKey(now)
    const rows = await env.DB.prepare(boardSql(metric)).bind(span, week, span, week).all<{ address: string; depth: number; value: number }>()
    const names = new Map<string, string>()
    for (const row of rows.results) {
      const profile = await env.DB.prepare('SELECT name FROM profiles WHERE address = ?').bind(row.address).first<{ name: string | null }>()
      if (profile?.name) names.set(row.address, profile.name)
    }
    return json({
      metric,
      span,
      rows: rows.results.map((row) => ({
        address: row.address,
        name: names.get(row.address) ?? null,
        value: row.value,
        depth: row.depth,
      })),
    })
  }

  return json({ error: 'not-found' }, 404)
}

/** A closed tab, refresh, or disconnect used to leave the delve open forever. Treat that as a death. */
async function abandonOpenRuns(env: Env, address: string, account: Account, now: number): Promise<{ abandoned: boolean; revision: number | null }> {
  const open = await env.DB.prepare(`SELECT id FROM runs WHERE address = ? AND status = 'open'`).bind(address).all<{ id: string }>()
  const stuck = account.activeRun != null || open.results.length > 0
  if (!stuck) return { abandoned: false, revision: null }
  if (account.activeRun) applyDeath(account, 1)
  await env.DB.prepare(`UPDATE runs SET status = 'dead', reason = 'abandoned', depth = COALESCE(depth, 1) WHERE address = ? AND status = 'open'`).bind(address).run()
  const revision = await storeAccount(env, address, account, now)
  return { abandoned: true, revision }
}

async function loadAccount(env: Env, address: string, now: number): Promise<{ account: Account; revision: number }> {
  const row = await env.DB.prepare('SELECT state, revision FROM accounts WHERE address = ?').bind(address).first<{ state: string; revision: number }>()
  if (!row) {
    const account = freshAccount()
    await env.DB.prepare('INSERT INTO accounts (address, state, revision, updated_at) VALUES (?, ?, 1, ?)').bind(address, JSON.stringify(account), now).run()
    return { account, revision: 1 }
  }
  const account = JSON.parse(row.state) as Account
  if (settleOneWeapon(account)) {
    const revision = await storeAccount(env, address, account, now)
    return { account, revision }
  }
  return { account, revision: row.revision }
}

async function storeAccount(env: Env, address: string, account: Account, now: number): Promise<number> {
  const row = await env.DB.prepare('SELECT revision FROM accounts WHERE address = ?').bind(address).first<{ revision: number }>()
  const revision = (row?.revision ?? 0) + 1
  await env.DB.prepare('INSERT INTO accounts (address, state, revision, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(address) DO UPDATE SET state = excluded.state, revision = excluded.revision, updated_at = excluded.updated_at').bind(address, JSON.stringify(account), revision, now).run()
  return revision
}

function runAction(account: Account, action: string, body: Record<string, unknown>): { ok: true } | { ok: false; reason: string } {
  if (action === 'buy') return buyMerchant(account, String(body.kind ?? ''))
  if (action === 'field-buy') return fieldBuy(account, String(body.kind ?? ''))
  if (action === 'sell') return sellUnit(account, String(body.kind ?? ''), typeof body.coins === 'number' ? body.coins : undefined, typeof body.spearId === 'string' ? body.spearId : undefined)
  if (action === 'sell-common') return sellCommon(account)
  if (action === 'upgrade') return upgradeWeapon(account, String(body.which ?? ''))
  if (action === 'bag') return upgradeBag(account)
  if (action === 'workshop') return mendShield(account, String(body.mode ?? ''))
  if (action === 'equip') return chooseWeapon(account, String(body.which ?? ''), typeof body.id === 'string' ? body.id : undefined)
  if (action === 'tutorial') {
    skipTutorial(account)
    return { ok: true }
  }
  if (action === 'tutorial-replay') {
    replayTutorialAccount(account)
    return { ok: true }
  }
  if (action === 'tutorial-seen') {
    seeTip(account, String(body.id ?? ''))
    return { ok: true }
  }
  return { ok: false, reason: 'action' }
}

async function closeRun(env: Env, address: string, body: Record<string, unknown>, now: number, mode: 'die'): Promise<{ status: number; body: Record<string, unknown> }> {
  const token = typeof body.token === 'string' ? body.token : ''
  const parsed = await readToken(env, token)
  if (!parsed || parsed.address !== address || parsed.exp <= now) return { status: 401, body: { error: 'token' } }
  const run = await env.DB.prepare('SELECT id, status, issued_at, token_hash FROM runs WHERE id = ? AND address = ?').bind(parsed.id, address).first<{ id: string; status: string; issued_at: number; token_hash: string }>()
  if (!run || run.token_hash !== await sha256(token)) return { status: 401, body: { error: 'token' } }
  if (run.status !== 'open') return { status: 409, body: { error: 'used' } }
  const loaded = await loadAccount(env, address, now)
  if (loaded.account.activeRun?.id !== run.id) return { status: 422, body: { error: 'no-run' } }
  const elapsedMs = now - run.issued_at
  const depth = Number(body.depth) || 1
  const floor = (MIN_SECONDS[Math.min(Math.max(depth, 1), MIN_SECONDS.length - 1)] ?? 75) * 1000
  const died = applyDeath(loaded.account, elapsedMs >= floor ? depth : 1)
  await env.DB.prepare('UPDATE runs SET status = ?, reason = ?, depth = ?, elapsed_ms = ? WHERE id = ?').bind('dead', mode, depth, elapsedMs, run.id).run()
  const revision = await storeAccount(env, address, loaded.account, now)
  return { status: 200, body: { ok: died.ok, revision, state: loaded.account, depth: died.ok ? died.depth : loaded.account.depth } }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return withCors(request, env, new Response(null, { status: 204 }))
    try {
      await ensureSchema(env.DB)
      const now = Date.now()
      return withCors(request, env, await route(request, env, now))
    } catch {
      schemaReady = null
      return withCors(request, env, json({ error: 'server' }, 500))
    }
  },
}
