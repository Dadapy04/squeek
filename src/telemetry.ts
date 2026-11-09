export const STATUS_URL = 'https://api.squeekchain.com/v1/status'
export const POLL_MS = 12_000
export const TIMEOUT_MS = 8_000

const MAX_RETRY_WAIT_MS = 15 * 60 * 1000

export const TELEMETRY = {
  perPollWorkCap: 16n,
  energyPerWork: 2,
  sessionEnergyCap: 200,
  sealEnergy: 16,
  maxSeals: 3,
} as const

export interface ParsedMeasurement {
  freshness: string
  observedAtMs: number
  receivedAtMs: number
  staleAfterSeconds: number
  counterEpoch: string
  cumulativeWorkUnits: bigint
  provenance: string
  coreStatus: string
  rpmMilli: number
  speedMmPerSecond: number
  distanceMm: number
}

export interface ParsedAnchor {
  blockHeight: bigint
  confirmedAtMs: number | null
  transactionHash: string | null
  settledThroughRound: bigint | null
}

export interface ParsedProjected {
  blockHeight: bigint | null
  lifecycle: string | null
}

export interface ParsedSubmission {
  lifecycle: string | null
  confirmedAtMs: number | null
}

export interface ParsedStatus {
  schemaVersion: number
  generatedAtMs: number | null
  installationId: string | null
  measurement: ParsedMeasurement | null
  fresh: boolean
  builderAvailable: boolean
  builderReason: string | null
  anchor: ParsedAnchor | null
  projected: ParsedProjected | null
  submission: ParsedSubmission | null
  oracleState: string | null
  queueState: string | null
  wheelModuleState: string | null
}

export type ParseResult = { ok: true; status: ParsedStatus } | { ok: false; error: string }

export interface TelemetrySession {
  epoch: string | null
  baselineWork: bigint | null
  sawFreshHeight: boolean
  baselineHeight: bigint | null
  energyGranted: number
  workCredited: bigint
  workIgnored: bigint
  seals: number
}

export interface RewardDecision {
  reason: string
  grantedWorkUnits: bigint
  grantedEnergy: number
  sealEnergy: number
  buff: 'none' | 'active'
  notes: string[]
  fresh: boolean
}

export interface PullResult {
  kind: 'ok' | 'not_modified' | 'rate_limited' | 'http_error' | 'timeout' | 'network' | 'parse'
  httpStatus: number | null
  retryAfterSeconds: number | null
  etag: string | null
  body: unknown
  message: string
}

export interface FetchResponse {
  ok: boolean
  status: number
  headers: { get(name: string): string | null }
  text(): Promise<string>
}

export type FetchLike = (url: string, init?: RequestInit) => Promise<FetchResponse>

class ParseError extends Error {}

const UINT = /^\d+$/

function fail(error: string): ParseResult {
  return { ok: false, error }
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function timeMs(v: unknown, field: string): number {
  if (typeof v !== 'string') throw new ParseError(field)
  const ms = Date.parse(v)
  if (!Number.isFinite(ms)) throw new ParseError(field)
  return ms
}

export function isMeasurementFresh(
  m: { freshness: string; receivedAtMs: number; staleAfterSeconds: number },
  nowMs: number,
): boolean {
  if (m.freshness !== 'online') return false
  const age = nowMs - m.receivedAtMs
  if (age < -60_000) return false
  if (age > m.staleAfterSeconds * 1000) return false
  return true
}

export function anchorIsConfirmed(anchor: ParsedAnchor | null): boolean {
  return !!anchor && anchor.confirmedAtMs != null
}

export function submissionIsConfirmed(submission: ParsedSubmission | null): boolean {
  return !!submission && submission.lifecycle === 'confirmed' && submission.confirmedAtMs != null
}

export function projectedIsOptimistic(projected: ParsedProjected | null): boolean {
  return !!projected && projected.lifecycle === 'optimistic'
}

function parseMeasurement(v: unknown): ParsedMeasurement {
  if (!isObj(v)) throw new ParseError('measurement')
  if (typeof v.freshness !== 'string') throw new ParseError('freshness')
  if (typeof v.counterEpoch !== 'string' || v.counterEpoch.length === 0) throw new ParseError('counterEpoch')
  if (typeof v.cumulativeWorkUnits !== 'string' || !UINT.test(v.cumulativeWorkUnits)) {
    throw new ParseError('cumulativeWorkUnits')
  }
  if (typeof v.provenance !== 'string' || v.provenance.length === 0) throw new ParseError('provenance')
  if (typeof v.coreStatus !== 'string' || v.coreStatus.length === 0) throw new ParseError('coreStatus')
  if (typeof v.staleAfterSeconds !== 'number' || !Number.isFinite(v.staleAfterSeconds) || v.staleAfterSeconds <= 0) {
    throw new ParseError('staleAfterSeconds')
  }
  for (const field of ['rpmMilli', 'speedMmPerSecond', 'distanceMm'] as const) {
    const n = v[field]
    if (typeof n !== 'number' || !Number.isSafeInteger(n)) throw new ParseError(field)
  }
  return {
    freshness: v.freshness,
    observedAtMs: timeMs(v.observedAt, 'observedAt'),
    receivedAtMs: timeMs(v.receivedAt, 'receivedAt'),
    staleAfterSeconds: v.staleAfterSeconds,
    counterEpoch: v.counterEpoch,
    cumulativeWorkUnits: BigInt(v.cumulativeWorkUnits),
    provenance: v.provenance,
    coreStatus: v.coreStatus,
    rpmMilli: v.rpmMilli as number,
    speedMmPerSecond: v.speedMmPerSecond as number,
    distanceMm: v.distanceMm as number,
  }
}

function parseAnchor(v: unknown): ParsedAnchor | null {
  if (!isObj(v)) return null
  if (typeof v.blockHeight !== 'string' || !UINT.test(v.blockHeight)) return null
  let confirmedAtMs: number | null = null
  if (v.confirmedAt != null) {
    if (typeof v.confirmedAt !== 'string') return null
    const ms = Date.parse(v.confirmedAt)
    if (!Number.isFinite(ms)) return null
    confirmedAtMs = ms
  }
  let settled: bigint | null = null
  if (typeof v.settledThroughRound === 'string' && UINT.test(v.settledThroughRound)) {
    settled = BigInt(v.settledThroughRound)
  }
  return {
    blockHeight: BigInt(v.blockHeight),
    confirmedAtMs,
    transactionHash: typeof v.transactionHash === 'string' ? v.transactionHash : null,
    settledThroughRound: settled,
  }
}

function parseProjected(v: unknown): ParsedProjected | null {
  if (!isObj(v)) return null
  let blockHeight: bigint | null = null
  if (typeof v.blockHeight === 'string' && UINT.test(v.blockHeight)) blockHeight = BigInt(v.blockHeight)
  return {
    blockHeight,
    lifecycle: typeof v.lifecycle === 'string' ? v.lifecycle : null,
  }
}

function parseSubmission(v: unknown): ParsedSubmission | null {
  if (v == null) return null
  if (!isObj(v)) return null
  let confirmedAtMs: number | null = null
  if (typeof v.confirmedAt === 'string') {
    const ms = Date.parse(v.confirmedAt)
    confirmedAtMs = Number.isFinite(ms) ? ms : null
  }
  return {
    lifecycle: typeof v.lifecycle === 'string' ? v.lifecycle : null,
    confirmedAtMs,
  }
}

function parseWheel(v: unknown): string | null {
  if (!Array.isArray(v)) return null
  for (const item of v) {
    if (!isObj(item)) continue
    if (item.instanceId === 'wheel' || item.moduleType === 'wheel.counter') {
      return typeof item.state === 'string' ? item.state : null
    }
  }
  return null
}

export function parseStatus(body: unknown, nowMs: number): ParseResult {
  try {
    if (!isObj(body)) return fail('body')
    if (body.schemaVersion !== 1) return fail('schemaVersion')
    if (!('measurement' in body)) return fail('measurement')
    const measurement = body.measurement === null ? null : parseMeasurement(body.measurement)
    let builderAvailable = false
    let builderReason: string | null = 'missing'
    let anchor: ParsedAnchor | null = null
    let projected: ParsedProjected | null = null
    if (isObj(body.builder)) {
      const status = typeof body.builder.status === 'string' ? body.builder.status : 'missing'
      if (status === 'available') {
        builderAvailable = true
        builderReason = null
        anchor = parseAnchor(body.builder.anchor)
        projected = parseProjected(body.builder.projected)
      } else {
        builderReason = typeof body.builder.reason === 'string' ? body.builder.reason : status
      }
    }
    const oracleState = isObj(body.oracle) && typeof body.oracle.state === 'string' ? body.oracle.state : null
    const queue = isObj(body.settlementQueue) ? body.settlementQueue : null
    const generatedAtMs = typeof body.generatedAt === 'string' ? timeMs(body.generatedAt, 'generatedAt') : null
    const fresh = measurement ? isMeasurementFresh(measurement, nowMs) : false
    return {
      ok: true,
      status: {
        schemaVersion: 1,
        generatedAtMs,
        installationId: typeof body.installationId === 'string' ? body.installationId : null,
        measurement,
        fresh,
        builderAvailable,
        builderReason,
        anchor,
        projected,
        submission: queue ? parseSubmission(queue.latestSubmission) : null,
        oracleState,
        queueState: queue && typeof queue.state === 'string' ? queue.state : null,
        wheelModuleState: parseWheel(body.modules),
      },
    }
  } catch (err) {
    if (err instanceof ParseError) return fail(err.message)
    return fail('parse')
  }
}

export function withFreshness(status: ParsedStatus, nowMs: number): ParsedStatus {
  if (!status.measurement) return { ...status, fresh: false }
  return { ...status, fresh: isMeasurementFresh(status.measurement, nowMs) }
}

export function createSession(): TelemetrySession {
  return {
    epoch: null,
    baselineWork: null,
    sawFreshHeight: false,
    baselineHeight: null,
    energyGranted: 0,
    workCredited: 0n,
    workIgnored: 0n,
    seals: 0,
  }
}

export function resetBaseline(session: TelemetrySession): void {
  session.epoch = null
  session.baselineWork = null
  session.sawFreshHeight = false
  session.baselineHeight = null
}

function takeEnergy(session: TelemetrySession, want: number): number {
  if (want <= 0) return 0
  const room = TELEMETRY.sessionEnergyCap - session.energyGranted
  const got = Math.max(0, Math.min(want, room))
  session.energyGranted += got
  return got
}

/**
 * Rewards only the rise in cumulativeWorkUnits after this page session's baseline.
 * The lifetime counter is never granted up front. Large gaps are capped per read
 * and the baseline jumps forward, so leftovers are not banked.
 * Confirmed anchor height can grant a seal. Optimistic projections cannot.
 */
export function ingest(session: TelemetrySession, status: ParsedStatus, source: 'live' | 'demo'): RewardDecision {
  const notes: string[] = []
  let grantedWorkUnits = 0n
  let grantedEnergy = 0
  let sealEnergy = 0
  let reason = 'no_measurement'
  const m = status.measurement
  if (!m) {
    return { reason, grantedWorkUnits, grantedEnergy, sealEnergy, buff: 'none', notes: ['Tidak ada measurement.'], fresh: false }
  }

  const trust = (source === 'live' && m.provenance === 'hardware') || (source === 'demo' && (m.provenance === 'simulated' || m.provenance === 'hardware'))

  if (session.epoch == null || session.baselineWork == null) {
    session.epoch = m.counterEpoch
    session.baselineWork = m.cumulativeWorkUnits
    reason = 'baseline'
    notes.push('Garis dasar sesi. Kerja yang sudah terakumulasi tidak dihitung.')
  } else if (m.counterEpoch !== session.epoch) {
    session.epoch = m.counterEpoch
    session.baselineWork = m.cumulativeWorkUnits
    reason = 'epoch_reset'
    notes.push('counterEpoch berubah. Penghitung direset tanpa bonus kejar.')
  } else if (m.cumulativeWorkUnits < session.baselineWork) {
    session.baselineWork = m.cumulativeWorkUnits
    reason = 'counter_decreased'
    notes.push('Penghitung turun. Penurunan diabaikan.')
  } else {
    const delta = m.cumulativeWorkUnits - session.baselineWork
    session.baselineWork = m.cumulativeWorkUnits
    if (delta === 0n) {
      reason = 'duplicate'
    } else if (!status.fresh) {
      reason = 'stale'
      session.workIgnored += delta
      notes.push('Bacaan stale. Kenaikan tidak menjadi energi dan tidak ditabung.')
    } else if (m.coreStatus === 'COUNTER_FAULT') {
      reason = 'fault'
      session.workIgnored += delta
      notes.push('COUNTER_FAULT. Kerja tidak dipakai.')
    } else if (!trust) {
      reason = 'not_hardware'
      session.workIgnored += delta
      notes.push('Provenance bukan hardware live. Tidak dihitung sebagai roda sungguhan.')
    } else {
      const cap = TELEMETRY.perPollWorkCap
      const credited = delta > cap ? cap : delta
      const ignored = delta - credited
      session.workIgnored += ignored
      session.workCredited += credited
      const wanted = Number(credited) * TELEMETRY.energyPerWork
      grantedEnergy = takeEnergy(session, wanted)
      grantedWorkUnits = credited
      reason = grantedEnergy > 0 ? 'granted' : 'session_cap'
      if (ignored > 0n) notes.push('Lonjakan dibatasi per bacaan. Sisanya tidak ditabung.')
      if (grantedEnergy < wanted) notes.push('Batas energi roda sesi ini tercapai.')
    }
  }

  if (
    status.builderAvailable &&
    anchorIsConfirmed(status.anchor) &&
    status.anchor &&
    status.fresh &&
    trust &&
    m.coreStatus !== 'COUNTER_FAULT'
  ) {
    const height = status.anchor.blockHeight
    if (!session.sawFreshHeight) {
      session.sawFreshHeight = true
      session.baselineHeight = height
      notes.push('Tinggi blok terkonfirmasi dicatat. Tidak ada segel untuk tinggi yang sudah ada.')
    } else if (session.baselineHeight != null && height > session.baselineHeight) {
      session.baselineHeight = height
      if (session.seals < TELEMETRY.maxSeals) {
        const got = takeEnergy(session, TELEMETRY.sealEnergy)
        if (got > 0) {
          session.seals += 1
          sealEnergy = got
          notes.push('Segel dari anchor dengan confirmedAt. Proyeksi optimistis tidak dapat segel.')
        }
      } else {
        notes.push('Batas segel sesi tercapai.')
      }
    }
  }

  const buff = status.fresh && trust && m.coreStatus === 'ACTIVE' ? 'active' : 'none'
  return { reason, grantedWorkUnits, grantedEnergy, sealEnergy, buff, notes, fresh: status.fresh }
}

export function parseRetryAfter(header: string | null, nowMs: number): number | null {
  if (!header) return null
  const trimmed = header.trim()
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const n = Number(trimmed)
    return Number.isFinite(n) ? n : null
  }
  const date = Date.parse(trimmed)
  if (!Number.isFinite(date)) return null
  return Math.max(0, (date - nowMs) / 1000)
}

export function nextDelayMs(
  result: Pick<PullResult, 'kind' | 'httpStatus' | 'retryAfterSeconds'>,
  consecutiveErrors: number,
): number {
  const limited =
    result.kind === 'rate_limited' || result.httpStatus === 429 || result.httpStatus === 503 || result.httpStatus === 504
  if (limited) {
    const retryMs = result.retryAfterSeconds == null ? 30_000 : result.retryAfterSeconds * 1000
    return Math.max(POLL_MS, Math.min(Math.max(0, retryMs), MAX_RETRY_WAIT_MS))
  }
  if (result.kind === 'ok' || result.kind === 'not_modified') return POLL_MS
  return Math.min(60_000, POLL_MS + Math.min(8, Math.max(0, consecutiveErrors)) * 4_000)
}

export async function pullStatus(opts: {
  url?: string
  etag: string | null
  fetchImpl: FetchLike
  signal: AbortSignal
  nowMs?: number
}): Promise<PullResult> {
  const url = opts.url ?? STATUS_URL
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (opts.etag) headers['If-None-Match'] = opts.etag
  try {
    // `window.fetch` throws "Illegal invocation" when called as a bare function
    // (`const send = fetch; send(url)`). Call it on the realm global.
    const res = await opts.fetchImpl.call(globalThis, url, {
      method: 'GET',
      headers,
      signal: opts.signal,
      credentials: 'omit',
      cache: 'no-store',
    })
    const etag = res.headers.get('ETag')
    const retryAfterSeconds = parseRetryAfter(res.headers.get('Retry-After'), opts.nowMs ?? Date.now())
    if (res.status === 304) {
      return { kind: 'not_modified', httpStatus: 304, retryAfterSeconds, etag, body: null, message: '304' }
    }
    if (res.status === 429) {
      return { kind: 'rate_limited', httpStatus: 429, retryAfterSeconds, etag, body: null, message: 'rate_limited' }
    }
    if (!res.ok) {
      return { kind: 'http_error', httpStatus: res.status, retryAfterSeconds, etag, body: null, message: `HTTP ${res.status}` }
    }
    const text = await res.text()
    try {
      return { kind: 'ok', httpStatus: res.status, retryAfterSeconds, etag, body: JSON.parse(text) as unknown, message: 'ok' }
    } catch {
      return { kind: 'parse', httpStatus: res.status, retryAfterSeconds, etag, body: null, message: 'json' }
    }
  } catch (err) {
    if (opts.signal.aborted && opts.signal.reason === 'timeout') {
      return { kind: 'timeout', httpStatus: null, retryAfterSeconds: null, etag: null, body: null, message: 'timeout' }
    }
    if (err instanceof Error && err.name === 'TimeoutError') {
      return { kind: 'timeout', httpStatus: null, retryAfterSeconds: null, etag: null, body: null, message: 'timeout' }
    }
    return {
      kind: 'network',
      httpStatus: null,
      retryAfterSeconds: null,
      etag: null,
      body: null,
      message: err instanceof Error ? err.message : 'network',
    }
  }
}

export function makeDemoBody(tick: number, nowMs: number): unknown {
  const work = 1000n + BigInt(Math.max(0, tick)) * 6n
  const height = 3082n + BigInt(Math.floor(Math.max(0, tick) / 4))
  const active = tick > 0 && tick % 3 === 0
  const iso = new Date(nowMs).toISOString()
  return {
    schemaVersion: 1,
    installationId: 'demo-local',
    generatedAt: iso,
    measurement: {
      freshness: 'online',
      observedAt: iso,
      receivedAt: iso,
      staleAfterSeconds: 120,
      counterEpoch: 'demo-epoch',
      cumulativeWorkUnits: work.toString(),
      provenance: 'simulated',
      coreStatus: active ? 'ACTIVE' : 'IDLE',
      rpmMilli: active ? 45000 : 0,
      speedMmPerSecond: active ? 640 : 0,
      distanceMm: 1200 + Math.max(0, tick) * 10,
    },
    builder: {
      status: 'available',
      anchor: {
        blockHeight: height.toString(),
        confirmedAt: new Date(nowMs - 60_000).toISOString(),
        transactionHash: `0x${'11'.repeat(32)}`,
        settledThroughRound: '644',
      },
      projected: {
        blockHeight: (height + 5n).toString(),
        lifecycle: 'optimistic',
      },
    },
    oracle: { state: 'accepted' },
    settlementQueue: {
      status: 'available',
      state: 'submitted',
      latestSubmission: {
        lifecycle: 'submitted',
        confirmedAt: null,
        transactionHash: `0x${'22'.repeat(32)}`,
      },
    },
    modules: [{ instanceId: 'wheel', moduleType: 'wheel.counter', state: 'ready' }],
  }
}

export function formatWib(ms: number): string {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hourCycle: 'h23',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  return `${fmt.format(new Date(ms))} WIB`
}

export function formatRpm(rpmMilli: number): string {
  return `${(rpmMilli / 1000).toFixed(1)} rpm`
}

export function coreLabel(status: string): string {
  if (status === 'IDLE') return 'Istirahat (IDLE)'
  if (status === 'ACTIVE') return 'Aktif (ACTIVE)'
  if (status === 'COUNTER_FAULT') return 'Gangguan (COUNTER_FAULT)'
  return status
}

export function shortHash(hash: string | null): string {
  if (!hash) return '—'
  if (hash.length < 14) return hash
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`
}
