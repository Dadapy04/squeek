/** The extract token has to outlive a wallet blip and a reload during the same delve. */

export function resolveRunToken(memory: string | null, stored: string | null, event: 'keep' | 'close'): string | null {
  if (event === 'close') return null
  return memory || stored || null
}

export function tokenOnReload(hasRun: boolean, stored: string | null): 'restore' | 'abandon' | 'none' {
  if (!stored) return 'none'
  return hasRun ? 'restore' : 'abandon'
}
