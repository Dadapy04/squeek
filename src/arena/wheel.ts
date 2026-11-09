/** Live SqueekChain wheel credit for the arena. Fixtures in tests are not production telemetry. */

export const STATUS_URL = 'https://api.squeekchain.com/v1/status'
export const WORK_CAP = 12
const SKEW_MS = 60_000
const UINT = /^\d+$/

export type FeedKind = 'unavailable' | 'resting' | 'running' | 'stale'

export type CreditReason =
  | 'unavailable'
  | 'parse'
  | 'http'
  | 'baseline'
  | 'reset'
  | 'reordered'
  | 'duplicate'
  | 'stale'
  | 'future'
  | 'fault'
  | 'not_hardware'
  | 'granted'
  | 'capped'

export interface WheelSession {
  installationId: string | null
  counterEpoch: string | null
  baseline: bigint | null
}

export interface WheelDecision {
  energy: number
  reason: CreditReason
  feed: FeedKind
  detail: string
  readAt: string | null
  rpm: number | null
  provenance: string | null
  work: string | null
  installationId: string | null
  counterEpoch: string | null
}

export function createWheelSession(): WheelSession {
  return { installationId: null, counterEpoch: null, baseline: null }
}

export function resetWheelBaseline(session: WheelSession): void {
  session.installationId = null
  session.counterEpoch = null
  session.baseline = null
}

export function unavailableDecision(detail: string, reason: CreditReason = 'unavailable'): WheelDecision {
  return {
    energy: 0,
    reason,
    feed: 'unavailable',
    detail,
    readAt: null,
    rpm: null,
    provenance: null,
    work: null,
    installationId: null,
    counterEpoch: null,
  }
}

export function applyWheelBody(session: WheelSession, body: unknown, nowMs: number, httpStatus: number): WheelDecision {
  if (httpStatus !== 200) return unavailableDecision(`HTTP ${httpStatus}`, 'http')
  const parsed = parseHardware(body, nowMs)
  if (!parsed.ok) return parsed.decision
  return credit(session, parsed.reading, nowMs)
}

interface HardwareReading {
  installationId: string
  counterEpoch: string
  work: bigint
  workText: string
  rpmMilli: number
  coreStatus: string
  provenance: string
  receivedAt: string
  receivedAtMs: number
  observedAtMs: number
  staleAfterSeconds: number
  freshness: string
}

function parseHardware(body: unknown, nowMs: number): { ok: true; reading: HardwareReading } | { ok: false; decision: WheelDecision } {
  if (!isObj(body)) return { ok: false, decision: unavailableDecision('Badan kosong', 'parse') }
  if (body.status === 'unavailable') {
    const reason = typeof body.reason === 'string' && body.reason.length > 0 ? body.reason : 'unavailable'
    return { ok: false, decision: unavailableDecision(reason) }
  }
  if (body.schemaVersion !== 1) return { ok: false, decision: unavailableDecision('Skema bukan 1', 'parse') }
  if (!('measurement' in body) || body.measurement == null) {
    return { ok: false, decision: unavailableDecision('Tidak ada measurement') }
  }
  if (!isObj(body.measurement)) return { ok: false, decision: unavailableDecision('measurement rusak', 'parse') }
  const m = body.measurement
  if (typeof body.installationId !== 'string' || body.installationId.length === 0) {
    return { ok: false, decision: unavailableDecision('installationId kosong', 'parse') }
  }
  if (typeof m.counterEpoch !== 'string' || m.counterEpoch.length === 0) {
    return { ok: false, decision: unavailableDecision('counterEpoch kosong', 'parse') }
  }
  if (typeof m.cumulativeWorkUnits !== 'string' || !UINT.test(m.cumulativeWorkUnits)) {
    return { ok: false, decision: unavailableDecision('cumulativeWorkUnits bukan hitungan', 'parse') }
  }
  if (m.provenance !== 'hardware' && m.provenance !== 'simulated' && m.provenance !== 'replay' && m.provenance !== 'derived') {
    return { ok: false, decision: unavailableDecision('provenance tidak dikenal', 'parse') }
  }
  if (typeof m.freshness !== 'string' || typeof m.coreStatus !== 'string') {
    return { ok: false, decision: unavailableDecision('freshness atau coreStatus kosong', 'parse') }
  }
  if (typeof m.staleAfterSeconds !== 'number' || !Number.isFinite(m.staleAfterSeconds) || m.staleAfterSeconds <= 0) {
    return { ok: false, decision: unavailableDecision('staleAfterSeconds', 'parse') }
  }
  if (typeof m.rpmMilli !== 'number' || !Number.isSafeInteger(m.rpmMilli) || m.rpmMilli < 0) {
    return { ok: false, decision: unavailableDecision('rpmMilli', 'parse') }
  }
  const receivedAtMs = timeMs(m.receivedAt)
  const observedAtMs = timeMs(m.observedAt)
  if (receivedAtMs == null || observedAtMs == null || typeof m.receivedAt !== 'string') {
    return { ok: false, decision: unavailableDecision('waktu bacaan', 'parse') }
  }
  void nowMs
  return {
    ok: true,
    reading: {
      installationId: body.installationId,
      counterEpoch: m.counterEpoch,
      work: BigInt(m.cumulativeWorkUnits),
      workText: m.cumulativeWorkUnits,
      rpmMilli: m.rpmMilli,
      coreStatus: m.coreStatus,
      provenance: m.provenance,
      receivedAt: m.receivedAt,
      receivedAtMs,
      observedAtMs,
      staleAfterSeconds: m.staleAfterSeconds,
      freshness: m.freshness,
    },
  }
}

function credit(session: WheelSession, reading: HardwareReading, nowMs: number): WheelDecision {
  const base = {
    readAt: reading.receivedAt,
    rpm: reading.rpmMilli / 1000,
    provenance: reading.provenance,
    work: reading.workText,
    installationId: reading.installationId,
    counterEpoch: reading.counterEpoch,
  }
  const age = nowMs - reading.receivedAtMs
  const observedSkew = reading.observedAtMs - nowMs
  if (age < -SKEW_MS || observedSkew > SKEW_MS) {
    return { ...empty(base), reason: 'future', feed: 'stale', detail: 'Cap waktu di depan. Diabaikan.' }
  }
  const stale = reading.freshness !== 'online' || age > reading.staleAfterSeconds * 1000
  const sameKey = session.installationId === reading.installationId && session.counterEpoch === reading.counterEpoch && session.baseline != null
  if (reading.provenance !== 'hardware') {
    return { ...empty(base), reason: 'not_hardware', feed: 'unavailable', detail: `Provenance ${reading.provenance}. Bukan hardware.` }
  }
  if (!sameKey) {
    const reset = session.baseline != null
    session.installationId = reading.installationId
    session.counterEpoch = reading.counterEpoch
    session.baseline = reading.work
    return { ...empty(base), reason: reset ? 'reset' : 'baseline', feed: stale ? 'stale' : face(reading, 0), detail: 'Garis dasar baru. Kerja lama tidak dihitung.' }
  }
  if (reading.work < session.baseline!) {
    return { ...empty(base), reason: 'reordered', feed: stale ? 'stale' : face(reading, 0), detail: 'Penghitung mundur. Diabaikan.' }
  }
  if (stale) {
    session.baseline = reading.work
    return { ...empty(base), reason: 'stale', feed: 'stale', detail: 'Bacaan basi. Kenaikan tidak masuk cadangan.' }
  }
  if (reading.coreStatus === 'COUNTER_FAULT') {
    session.baseline = reading.work
    return { ...empty(base), reason: 'fault', feed: 'unavailable', detail: 'COUNTER_FAULT. Kerja tidak dipakai.' }
  }
  const delta = reading.work - session.baseline!
  session.baseline = reading.work
  if (delta === 0n) {
    return { ...empty(base), reason: 'duplicate', feed: face(reading, 0), detail: face(reading, 0) === 'resting' ? 'Online, RPM 0. Bukan tambahan kerja.' : 'Penghitung sama.' }
  }
  const capped = delta > BigInt(WORK_CAP)
  const credited = capped ? WORK_CAP : Number(delta)
  return {
    ...empty(base),
    energy: credited,
    reason: capped ? 'capped' : 'granted',
    feed: 'running',
    detail: capped ? `Lonjakan dibatasi ${WORK_CAP} kerja. Sisanya tidak ditabung.` : `+${credited} kerja hardware.`,
  }
}

function face(reading: HardwareReading, credited: number): FeedKind {
  if (credited > 0) return 'running'
  if (reading.rpmMilli === 0 || reading.coreStatus === 'IDLE') return 'resting'
  if (reading.coreStatus === 'ACTIVE' || reading.rpmMilli > 0) return 'running'
  return 'resting'
}

function empty(base: Pick<WheelDecision, 'readAt' | 'rpm' | 'provenance' | 'work' | 'installationId' | 'counterEpoch'>): WheelDecision {
  return { energy: 0, reason: 'duplicate', feed: 'resting', detail: '', ...base }
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function timeMs(v: unknown): number | null {
  if (typeof v !== 'string') return null
  const ms = Date.parse(v)
  return Number.isFinite(ms) ? ms : null
}
