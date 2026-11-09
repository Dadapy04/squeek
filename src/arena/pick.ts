/** Stable identity for the upgrade list. Equal keys must not rebuild the buttons. */
export function cardSignature(phase: string, offers: readonly string[], stacks: Readonly<Record<string, number>>): string {
  if (phase !== 'pick') return ''
  return offers.map((id) => `${id}:${stacks[id] ?? 0}`).join('|')
}
