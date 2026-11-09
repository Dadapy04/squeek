export const NOW = Date.parse('2026-11-08T07:22:15.570Z')

export function liveBody(): Record<string, unknown> {
  return {
    schemaVersion: 1,
    installationId: 'sepolia-core-sepolia-20261103',
    generatedAt: '2026-11-08T07:22:15.570Z',
    measurement: {
      freshness: 'online',
      observedAt: '2026-11-08T07:22:15.150Z',
      receivedAt: '2026-11-08T07:22:15.247Z',
      staleAfterSeconds: 120,
      counterEpoch: 'c53e3951-4e69-4ad3-b59c-d122a064d15a',
      cumulativeWorkUnits: '28240',
      provenance: 'hardware',
      coreStatus: 'IDLE',
      rpmMilli: 0,
      speedMmPerSecond: 0,
      distanceMm: 8505186,
    },
    builder: {
      status: 'available',
      anchor: {
        blockHeight: '3082',
        confirmedAt: '2026-11-08T07:10:36.000Z',
        transactionHash: '0x715121eb628262a6bac0162d0af1c69942bd031d34eca13fb8e35d0e2db640c9',
        settledThroughRound: '644',
      },
      projected: {
        blockHeight: '3151',
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
        transactionHash: '0x06e43ed90c73c4583235bd9539a93d97eb90eb897e794901a234dd821e83309d',
      },
    },
    modules: [{ instanceId: 'wheel', moduleType: 'wheel.counter', state: 'ready' }],
  }
}

export function measurement(body: Record<string, unknown>): Record<string, unknown> {
  return body.measurement as Record<string, unknown>
}

export function anchor(body: Record<string, unknown>): Record<string, unknown> {
  return (body.builder as { anchor: Record<string, unknown> }).anchor
}

export function projected(body: Record<string, unknown>): Record<string, unknown> {
  return (body.builder as { projected: Record<string, unknown> }).projected
}

export function submission(body: Record<string, unknown>): Record<string, unknown> {
  return (body.settlementQueue as { latestSubmission: Record<string, unknown> }).latestSubmission
}
