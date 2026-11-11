import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { unstable_dev, type Unstable_DevWorker } from 'wrangler'
import { TEST_KEY, addressOf, signPersonal } from './wallet.ts'

let worker: Unstable_DevWorker
const address = addressOf(TEST_KEY)

async function json(path: string, init?: { method?: string; headers?: Record<string, string>; body?: string }): Promise<{ status: number; body: Record<string, unknown> }> {
  const response = await worker.fetch(`http://localhost${path}`, init)
  const body = await response.json() as Record<string, unknown>
  return { status: response.status, body }
}

beforeAll(async () => {
  worker = await unstable_dev('src/index.ts', {
    config: 'wrangler.toml',
    experimental: { disableExperimentalWarning: true },
    vars: {
      RUN_SECRET: 'test-secret',
      SIWE_DOMAIN: 'localhost',
      SIWE_URI: 'http://localhost/squeek',
      CORS_ORIGIN: 'http://localhost',
    },
    ip: '127.0.0.1',
    port: 0,
    persist: true,
    persistTo: `/tmp/squeek-api-test-${Date.now()}`,
  })
})

afterAll(async () => {
  await worker?.stop()
})

async function login(): Promise<string> {
  const nonce = await json('/v1/auth/nonce', { method: 'POST', body: JSON.stringify({ address }) })
  expect(nonce.status).toBe(200)
  const message = String(nonce.body.message)
  const signature = signPersonal(message, TEST_KEY)
  const verified = await json('/v1/auth/verify', { method: 'POST', body: JSON.stringify({ message, signature }) })
  expect(verified.status).toBe(200)
  return String(verified.body.token)
}

describe('worker endpoints', () => {
  it('signs in, stores a save, and refuses a stale revision', async () => {
    const token = await login()
    const auth = { authorization: `Bearer ${token}`, 'content-type': 'application/json' }
    const first = await json('/v1/save', { method: 'PUT', headers: auth, body: JSON.stringify({ revision: null, blob: '{"coins":3}' }) })
    expect(first.status).toBe(410)
    const account = await json('/v1/account', { headers: auth })
    expect(account.status).toBe(200)
    expect((account.body.state as { coins: number }).coins).toBe(0)
    const poor = await json('/v1/act/buy', { method: 'POST', headers: auth, body: JSON.stringify({ kind: 'bandage' }) })
    expect(poor.status).toBe(422)
    expect(poor.body.error).toBe('poor')
    const me = await json('/v1/me', { headers: auth })
    expect(me.body.address).toBe(address)
  })

  it('rejects a fast extract, ranks a plausible one once, and hides a flagged score', async () => {
    const token = await login()
    const auth = { authorization: `Bearer ${token}`, 'content-type': 'application/json' }
    const started = await json('/v1/runs/start', { method: 'POST', headers: auth, body: '{}' })
    expect(started.status).toBe(200)
    const runToken = String(started.body.token)
    const tooFast = await json('/v1/runs/extract', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        token: runToken,
        depth: 7,
        value: 8,
        events: [
          { kind: 'depth', depth: 1 }, { kind: 'depth', depth: 2 }, { kind: 'depth', depth: 3 },
          { kind: 'depth', depth: 4 }, { kind: 'depth', depth: 5 }, { kind: 'depth', depth: 6 },
          { kind: 'depth', depth: 7 }, { kind: 'loot', item: 'scrap', coins: 8 }, { kind: 'extract', depth: 7 },
        ],
      }),
    })
    expect(tooFast.status).toBe(422)
    expect(tooFast.body.reason).toBe('too-fast')
    const replayed = await json('/v1/runs/extract', { method: 'POST', headers: auth, body: JSON.stringify({ token: runToken, depth: 1, value: 88, events: [{ kind: 'loot', item: 'scrap', coins: 88 }, { kind: 'extract', depth: 1 }] }) })
    expect(replayed.status).toBe(409)
    expect(replayed.body.error).toBe('used')

    const again = await json('/v1/runs/start', { method: 'POST', headers: auth, body: '{}' })
    const goodToken = String(again.body.token)
    const wait = 13_000 - (Date.now() - Number(again.body.issuedAt))
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait + 50))
    const ranked = await json('/v1/runs/extract', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        token: goodToken,
        depth: 1,
        value: 20,
        events: [{ kind: 'depth', depth: 1 }, { kind: 'loot', item: 'scrap', coins: 8 }, { kind: 'loot', item: 'scrap', coins: 12 }, { kind: 'extract', depth: 1 }],
      }),
    })
    expect(ranked.status).toBe(200)
    expect(ranked.body.ranked).toBe(true)
    const replay = await json('/v1/runs/extract', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ token: goodToken, depth: 1, value: 20, events: [] }),
    })
    expect(replay.status).toBe(409)

    const board = await json('/v1/leaderboard?metric=value&span=all')
    const rows = board.body.rows as { address: string; value: number }[]
    expect(rows.some((row) => row.address === address && row.value === 20)).toBe(true)

    const forgedStart = await json('/v1/runs/start', { method: 'POST', headers: auth, body: '{}' })
    const forgedWait = 3_200 - (Date.now() - Number(forgedStart.body.issuedAt))
    if (forgedWait > 0) await new Promise((resolve) => setTimeout(resolve, forgedWait))
    const forged = await json('/v1/runs/extract', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        token: forgedStart.body.token,
        depth: 1,
        value: 88,
        events: [{ kind: 'loot', item: 'scrap', coins: 88 }, { kind: 'extract', depth: 1 }],
      }),
    })
    expect(forged.status).toBe(422)
    expect(forged.body.reason).toBe('coins')

    const richStart = await json('/v1/runs/start', { method: 'POST', headers: auth, body: '{}' })
    const richWait = 9_000 - (Date.now() - Number(richStart.body.issuedAt))
    if (richWait > 0) await new Promise((resolve) => setTimeout(resolve, richWait + 50))
    const coins = Array.from({ length: 10 }, () => 70)
    const flagged = await json('/v1/runs/extract', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        token: richStart.body.token,
        depth: 1,
        value: 700,
        events: [{ kind: 'depth', depth: 1 }, ...coins.map((coin) => ({ kind: 'loot', item: 'tombak', coins: coin })), { kind: 'extract', depth: 1 }],
      }),
    })
    expect(flagged.body.ranked).toBe(false)
    const after = await json('/v1/leaderboard?metric=value&span=all')
    const values = (after.body.rows as { address: string; value: number }[]).filter((row) => row.address === address).map((row) => row.value)
    expect(values).toEqual([20])
  })

  it('counts an abandoned open delve as a death and lets the next one start', async () => {
    const token = await login()
    const auth = { authorization: `Bearer ${token}`, 'content-type': 'application/json' }
    const started = await json('/v1/runs/start', { method: 'POST', headers: auth, body: JSON.stringify({ picks: [{ kind: 'sword', n: 1 }] }) })
    expect(started.status).toBe(200)
    const account = await json('/v1/account', { headers: auth })
    expect(account.body.abandoned).toBe(true)
    const state = account.body.state as { activeRun: unknown; stash: { kind: string; n: number }[] }
    expect(state.activeRun).toBeNull()
    expect(state.stash.some((stack) => stack.kind === 'sword' && stack.n >= 1)).toBe(true)
    const again = await json('/v1/runs/start', { method: 'POST', headers: auth, body: '{}' })
    expect(again.status).toBe(200)
    expect(again.body.abandoned).toBe(false)
  })

  it('rejects an oversized body and a forged loot log', async () => {
    const huge = await json('/v1/auth/nonce', { method: 'POST', body: JSON.stringify({ address, pad: 'x'.repeat(9000) }) })
    expect(huge.status).toBe(413)
    const blocked = await worker.fetch('http://localhost/v1/health', { headers: { origin: 'https://dadapy04.github.io' } })
    expect(blocked.headers.get('access-control-allow-origin')).toBeNull()
    const token = await login()
    const auth = { authorization: `Bearer ${token}`, 'content-type': 'application/json' }
    const started = await json('/v1/runs/start', { method: 'POST', headers: auth, body: '{}' })
    expect(started.status).toBe(200)
    const wait = 3_200 - (Date.now() - Number(started.body.issuedAt))
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
    const loot = Array.from({ length: 21 }, () => ({ kind: 'loot', item: 'scrap', coins: 8 }))
    const forged = await json('/v1/runs/extract', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        token: started.body.token,
        depth: 1,
        value: 168,
        events: [{ kind: 'depth', depth: 1 }, ...loot, { kind: 'extract', depth: 1 }],
      }),
    })
    expect(forged.status).toBe(422)
    expect(forged.body.reason).toBe('log')
    const again = await json('/v1/runs/extract', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ token: started.body.token, depth: 1, value: 8, events: [{ kind: 'depth', depth: 1 }, { kind: 'loot', item: 'scrap', coins: 8 }, { kind: 'extract', depth: 1 }] }),
    })
    expect(again.status).toBe(409)
  })

  it('rejects a blob upload even with no session', async () => {
    const denied = await json('/v1/save', { method: 'PUT', body: JSON.stringify({ blob: '{}' }) })
    expect(denied.status).toBe(410)
  })
})
