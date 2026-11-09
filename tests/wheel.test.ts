import { describe, expect, it } from 'vitest'
import { applyWheelBody, createWheelSession, resetWheelBaseline, WORK_CAP } from '../src/arena/wheel.ts'

/** Test-only status bodies. Not a live wheel reading. */
const NOW = Date.parse('2026-11-08T19:26:06.418Z')

function fixture(work: string, patch: Record<string, unknown> = {}, measurement: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    installationId: 'test-install',
    generatedAt: '2026-11-08T19:26:06.418Z',
    measurement: {
      freshness: 'online',
      observedAt: '2026-11-08T19:26:06.265Z',
      receivedAt: '2026-11-08T19:26:06.418Z',
      staleAfterSeconds: 120,
      counterEpoch: 'epoch-a',
      cumulativeWorkUnits: work,
      provenance: 'hardware',
      coreStatus: 'IDLE',
      rpmMilli: 0,
      speedMmPerSecond: 0,
      distanceMm: 1,
      ...measurement,
    },
    builder: {
      status: 'available',
      projected: { cumulativeWork: '999999', lifecycle: 'optimistic', completedBlockCount: '40' },
    },
    ...patch,
  }
}

describe('wheel provenance', () => {
  it('does not turn an HTTP 200 unavailable body into zero work', () => {
    const session = createWheelSession()
    const decision = applyWheelBody(session, { status: 'unavailable', reason: 'indexer_unavailable', measurement: { cumulativeWorkUnits: '0' } }, NOW, 200)
    expect(decision.energy).toBe(0)
    expect(decision.feed).toBe('unavailable')
    expect(decision.work).toBeNull()
    expect(decision.detail).toBe('indexer_unavailable')
    expect(session.baseline).toBeNull()
  })

  it('ignores a non-200 body even when it contains a counter', () => {
    const session = createWheelSession()
    const decision = applyWheelBody(session, fixture('40'), NOW, 503)
    expect(decision.reason).toBe('http')
    expect(decision.work).toBeNull()
    expect(session.baseline).toBeNull()
  })

  it('baselines a fresh hardware reading and then credits only the delta', () => {
    const session = createWheelSession()
    const first = applyWheelBody(session, fixture('28705'), NOW, 200)
    expect(first.reason).toBe('baseline')
    expect(first.energy).toBe(0)
    expect(first.feed).toBe('resting')
    const next = applyWheelBody(session, fixture('28710', {}, { coreStatus: 'ACTIVE', rpmMilli: 12000 }), NOW + 1000, 200)
    expect(next.energy).toBe(5)
    expect(next.reason).toBe('granted')
    expect(next.feed).toBe('running')
    expect(next.work).toBe('28710')
  })

  it('ignores duplicates, reordered counters, and does not bank a capped jump', () => {
    const session = createWheelSession()
    applyWheelBody(session, fixture('100'), NOW, 200)
    expect(applyWheelBody(session, fixture('100'), NOW + 1000, 200).reason).toBe('duplicate')
    expect(applyWheelBody(session, fixture('90'), NOW + 2000, 200).reason).toBe('reordered')
    expect(session.baseline).toBe(100n)
    const jump = applyWheelBody(session, fixture('1000'), NOW + 3000, 200)
    expect(jump.energy).toBe(WORK_CAP)
    expect(jump.reason).toBe('capped')
    expect(session.baseline).toBe(1000n)
    expect(applyWheelBody(session, fixture('1000'), NOW + 4000, 200).energy).toBe(0)
  })

  it('resets on epoch, installation, and an explicit reconnect without a catch-up windfall', () => {
    const session = createWheelSession()
    applyWheelBody(session, fixture('50'), NOW, 200)
    const epoch = applyWheelBody(session, fixture('900', {}, { counterEpoch: 'epoch-b' }), NOW + 1000, 200)
    expect(epoch.reason).toBe('reset')
    expect(epoch.energy).toBe(0)
    expect(applyWheelBody(session, fixture('903', {}, { counterEpoch: 'epoch-b' }), NOW + 2000, 200).energy).toBe(3)
    const moved = applyWheelBody(session, fixture('50', { installationId: 'other' }, { counterEpoch: 'epoch-b' }), NOW + 3000, 200)
    expect(moved.reason).toBe('reset')
    expect(moved.energy).toBe(0)
    resetWheelBaseline(session)
    const again = applyWheelBody(session, fixture('5000', { installationId: 'other' }, { counterEpoch: 'epoch-b' }), NOW + 4000, 200)
    expect(again.reason).toBe('baseline')
    expect(again.energy).toBe(0)
  })

  it('drops stale, future, fault, and non-hardware readings', () => {
    const session = createWheelSession()
    applyWheelBody(session, fixture('10'), NOW, 200)
    const stale = applyWheelBody(session, fixture('40', {}, { freshness: 'stale' }), NOW + 1000, 200)
    expect(stale.reason).toBe('stale')
    expect(stale.energy).toBe(0)
    expect(session.baseline).toBe(40n)
    const future = applyWheelBody(session, fixture('80', {}, { receivedAt: '2026-11-08T19:30:00.000Z', observedAt: '2026-11-08T19:30:00.000Z' }), NOW + 2000, 200)
    expect(future.reason).toBe('future')
    expect(session.baseline).toBe(40n)
    const fault = applyWheelBody(session, fixture('55', {}, { coreStatus: 'COUNTER_FAULT' }), NOW + 3000, 200)
    expect(fault.reason).toBe('fault')
    expect(fault.energy).toBe(0)
    expect(session.baseline).toBe(55n)
    const sim = applyWheelBody(session, fixture('200', {}, { provenance: 'simulated' }), NOW + 4000, 200)
    expect(sim.reason).toBe('not_hardware')
    expect(session.baseline).toBe(55n)
    expect(applyWheelBody(session, fixture('58'), NOW + 5000, 200).energy).toBe(3)
  })

  it('does not spend builder.projected as live work', () => {
    const session = createWheelSession()
    applyWheelBody(session, fixture('10'), NOW, 200)
    const projected = applyWheelBody(session, fixture('10', { builder: { status: 'available', projected: { cumulativeWork: '5000', lifecycle: 'optimistic' } } }), NOW + 1000, 200)
    expect(projected.energy).toBe(0)
    expect(projected.reason).toBe('duplicate')
  })

  it('rejects a negative counter instead of crediting it', () => {
    const session = createWheelSession()
    const decision = applyWheelBody(session, fixture('-5'), NOW, 200)
    expect(decision.energy).toBe(0)
    expect(decision.work).toBeNull()
    expect(session.baseline).toBeNull()
  })
})
