import { describe, expect, it } from 'vitest'
import {
  STATUS_URL,
  anchorIsConfirmed,
  createSession,
  formatWib,
  ingest,
  isMeasurementFresh,
  nextDelayMs,
  parseStatus,
  projectedIsOptimistic,
  pullStatus,
  submissionIsConfirmed,
  type FetchLike,
} from '../src/telemetry.ts'
import { NOW, anchor, liveBody, measurement, projected, submission } from './fixture.ts'

function parsed(body: unknown, now = NOW) {
  const result = parseStatus(body, now)
  if (!result.ok) throw new Error(result.error)
  return result.status
}

describe('status parsing', () => {
  it('reads the public status shape without treating projection as confirmed', () => {
    const status = parsed(liveBody())
    expect(status.schemaVersion).toBe(1)
    expect(status.measurement?.cumulativeWorkUnits).toBe(28240n)
    expect(status.measurement?.coreStatus).toBe('IDLE')
    expect(status.measurement?.rpmMilli).toBe(0)
    expect(status.fresh).toBe(true)
    expect(status.wheelModuleState).toBe('ready')
    expect(anchorIsConfirmed(status.anchor)).toBe(true)
    expect(status.anchor?.blockHeight).toBe(3082n)
    expect(projectedIsOptimistic(status.projected)).toBe(true)
    expect(status.projected?.blockHeight).toBe(3151n)
    expect(submissionIsConfirmed(status.submission)).toBe(false)
    expect(status.submission?.lifecycle).toBe('submitted')
    expect(status.submission?.confirmedAtMs).toBeNull()
  })

  it('keeps work units bigger than the safe integer range', () => {
    const body = liveBody()
    measurement(body).cumulativeWorkUnits = '9007199254740993'
    expect(parsed(body).measurement?.cumulativeWorkUnits).toBe(9007199254740993n)
  })

  it('rejects a schema change and malformed work', () => {
    const changed = liveBody()
    changed.schemaVersion = 2
    expect(parseStatus(changed, NOW).ok).toBe(false)
    const bad = liveBody()
    measurement(bad).cumulativeWorkUnits = 28240
    expect(parseStatus(bad, NOW).ok).toBe(false)
  })

  it('marks stale when freshness says so or the reading is older than staleAfterSeconds', () => {
    const flagged = liveBody()
    measurement(flagged).freshness = 'stale'
    expect(parsed(flagged).fresh).toBe(false)
    const old = liveBody()
    measurement(old).receivedAt = '2026-11-08T07:18:00.000Z'
    expect(isMeasurementFresh(parsed(old).measurement!, NOW)).toBe(false)
    expect(parsed(old).fresh).toBe(false)
  })

  it('does not call a submitted batch or an unconfirmed anchor confirmed', () => {
    const body = liveBody()
    anchor(body).confirmedAt = null
    submission(body).lifecycle = 'submitted'
    submission(body).confirmedAt = null
    const status = parsed(body)
    expect(anchorIsConfirmed(status.anchor)).toBe(false)
    expect(submissionIsConfirmed(status.submission)).toBe(false)
    submission(body).lifecycle = 'confirmed'
    submission(body).confirmedAt = '2026-11-08T07:20:00.000Z'
    expect(submissionIsConfirmed(parsed(body).submission)).toBe(true)
    expect(projectedIsOptimistic(parsed(body).projected)).toBe(true)
  })
})

describe('session rewards', () => {
  it('does not grant lifetime work on the first sample', () => {
    const session = createSession()
    const decision = ingest(session, parsed(liveBody()), 'live')
    expect(decision.reason).toBe('baseline')
    expect(decision.grantedEnergy).toBe(0)
    expect(decision.sealEnergy).toBe(0)
    expect(decision.buff).toBe('none')
    expect(session.baselineWork).toBe(28240n)
  })

  it('grants a same-epoch increase once and ignores a duplicate', () => {
    const session = createSession()
    ingest(session, parsed(liveBody()), 'live')
    const up = liveBody()
    measurement(up).cumulativeWorkUnits = '28250'
    const granted = ingest(session, parsed(up), 'live')
    expect(granted.reason).toBe('granted')
    expect(granted.grantedWorkUnits).toBe(10n)
    expect(granted.grantedEnergy).toBe(20)
    const again = ingest(session, parsed(up), 'live')
    expect(again.reason).toBe('duplicate')
    expect(again.grantedEnergy).toBe(0)
    expect(session.energyGranted).toBe(20)
  })

  it('caps a catch-up gap and does not bank the rest', () => {
    const session = createSession()
    ingest(session, parsed(liveBody()), 'live')
    const jump = liveBody()
    measurement(jump).cumulativeWorkUnits = '38240'
    const decision = ingest(session, parsed(jump), 'live')
    expect(decision.grantedWorkUnits).toBe(16n)
    expect(decision.grantedEnergy).toBe(32)
    expect(session.baselineWork).toBe(38240n)
    const later = liveBody()
    measurement(later).cumulativeWorkUnits = '38240'
    expect(ingest(session, parsed(later), 'live').grantedEnergy).toBe(0)
  })

  it('resets on a new epoch and ignores a decreasing counter', () => {
    const session = createSession()
    ingest(session, parsed(liveBody()), 'live')
    const epoch = liveBody()
    measurement(epoch).counterEpoch = 'new-epoch'
    measurement(epoch).cumulativeWorkUnits = '90000'
    const reset = ingest(session, parsed(epoch), 'live')
    expect(reset.reason).toBe('epoch_reset')
    expect(reset.grantedEnergy).toBe(0)
    expect(session.baselineWork).toBe(90000n)
    const down = liveBody()
    measurement(down).counterEpoch = 'new-epoch'
    measurement(down).cumulativeWorkUnits = '10'
    expect(ingest(session, parsed(down), 'live').reason).toBe('counter_decreased')
    expect(session.energyGranted).toBe(0)
  })

  it('does not pay stale, faulted, or non-hardware live readings', () => {
    const session = createSession()
    ingest(session, parsed(liveBody()), 'live')
    const stale = liveBody()
    measurement(stale).freshness = 'stale'
    measurement(stale).cumulativeWorkUnits = '28260'
    expect(ingest(session, parsed(stale), 'live').reason).toBe('stale')
    const fault = liveBody()
    measurement(fault).coreStatus = 'COUNTER_FAULT'
    measurement(fault).cumulativeWorkUnits = '28280'
    expect(ingest(session, parsed(fault), 'live').reason).toBe('fault')
    const sim = liveBody()
    measurement(sim).provenance = 'simulated'
    measurement(sim).cumulativeWorkUnits = '28300'
    expect(ingest(session, parsed(sim), 'live').reason).toBe('not_hardware')
    expect(session.energyGranted).toBe(0)
  })

  it('gives a seal only for a newly confirmed anchor, not an optimistic projection', () => {
    const session = createSession()
    const first = ingest(session, parsed(liveBody()), 'live')
    expect(first.sealEnergy).toBe(0)
    expect(session.seals).toBe(0)
    const optimistic = liveBody()
    projected(optimistic).blockHeight = '3200'
    measurement(optimistic).cumulativeWorkUnits = '28240'
    expect(ingest(session, parsed(optimistic), 'live').sealEnergy).toBe(0)
    const raised = liveBody()
    anchor(raised).blockHeight = '3083'
    anchor(raised).confirmedAt = '2026-11-08T07:22:40.000Z'
    projected(raised).blockHeight = '3204'
    projected(raised).lifecycle = 'optimistic'
    submission(raised).lifecycle = 'submitted'
    submission(raised).confirmedAt = null
    const seal = ingest(session, parsed(raised), 'live')
    expect(seal.sealEnergy).toBe(16)
    expect(session.seals).toBe(1)
    expect(submissionIsConfirmed(parsed(raised).submission)).toBe(false)
    const unconfirmed = liveBody()
    anchor(unconfirmed).blockHeight = '3084'
    anchor(unconfirmed).confirmedAt = null
    expect(ingest(session, parsed(unconfirmed), 'live').sealEnergy).toBe(0)
  })

  it('buffs only a fresh ACTIVE reading and allows opt-in demo samples', () => {
    const idle = createSession()
    ingest(idle, parsed(liveBody()), 'live')
    const active = liveBody()
    measurement(active).coreStatus = 'ACTIVE'
    measurement(active).rpmMilli = 45000
    measurement(active).cumulativeWorkUnits = '28240'
    expect(ingest(idle, parsed(active), 'live').buff).toBe('active')

    const demo = createSession()
    const sample = liveBody()
    measurement(sample).provenance = 'simulated'
    measurement(sample).counterEpoch = 'demo-epoch'
    measurement(sample).cumulativeWorkUnits = '1000'
    ingest(demo, parsed(sample), 'demo')
    measurement(sample).cumulativeWorkUnits = '1006'
    const granted = ingest(demo, parsed(sample), 'demo')
    expect(granted.reason).toBe('granted')
    expect(granted.grantedEnergy).toBe(12)
  })
})

describe('polling', () => {
  it('uses the documented status URL and waits out rate limits', () => {
    expect(STATUS_URL).toBe('https://api.squeekchain.com/v1/status')
    expect(new URL(STATUS_URL).search).toBe('')
    expect(nextDelayMs({ kind: 'rate_limited', httpStatus: 429, retryAfterSeconds: 2 }, 1)).toBe(12_000)
    expect(nextDelayMs({ kind: 'http_error', httpStatus: 503, retryAfterSeconds: 90 }, 1)).toBe(90_000)
    expect(nextDelayMs({ kind: 'ok', httpStatus: 200, retryAfterSeconds: null }, 0)).toBe(12_000)
  })

  it('invokes fetch on the realm global, matching a real browser fetch', async () => {
    function realmFetch(this: unknown, _url: string): Promise<{
      ok: boolean
      status: number
      headers: { get(name: string): string | null }
      text(): Promise<string>
    }> {
      if (this !== globalThis) {
        throw new TypeError("Failed to execute 'fetch' on 'Window': Illegal invocation")
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: { get: () => null },
        text: async () => JSON.stringify(liveBody()),
      })
    }
    const unbound = realmFetch
    expect(() => unbound(STATUS_URL)).toThrow(/Illegal invocation/)
    const result = await pullStatus({
      etag: null,
      fetchImpl: realmFetch,
      signal: new AbortController().signal,
      nowMs: NOW,
    })
    expect(result.kind).toBe('ok')
    expect(result.httpStatus).toBe(200)
  })

  it('classifies HTTP errors, bad JSON, timeouts, and network failures', async () => {
    const okFetch: FetchLike = async () => ({
      ok: false,
      status: 429,
      headers: { get: (name) => (name.toLowerCase() === 'retry-after' ? '30' : null) },
      text: async () => '{"error":"rate_limited"}',
    })
    const limited = await pullStatus({ etag: null, fetchImpl: okFetch, signal: new AbortController().signal, nowMs: NOW })
    expect(limited.kind).toBe('rate_limited')
    expect(limited.retryAfterSeconds).toBe(30)

    const badJson: FetchLike = async () => ({
      ok: true,
      status: 200,
      headers: { get: () => null },
      text: async () => '<html>nope</html>',
    })
    expect((await pullStatus({ etag: null, fetchImpl: badJson, signal: new AbortController().signal })).kind).toBe('parse')

    const timed = new AbortController()
    timed.abort('timeout')
    const failing: FetchLike = async () => {
      throw new Error('Failed to fetch')
    }
    expect((await pullStatus({ etag: null, fetchImpl: failing, signal: timed.signal })).kind).toBe('timeout')

    const network = new AbortController()
    expect((await pullStatus({ etag: null, fetchImpl: failing, signal: network.signal })).kind).toBe('network')
  })
})

describe('time labels', () => {
  it('renders UTC instants in Asia/Jakarta and marks WIB', () => {
    expect(formatWib(Date.parse('2026-11-08T00:00:00.000Z'))).toBe('08 Nov 2026, 07:00:00 WIB')
  })
})
