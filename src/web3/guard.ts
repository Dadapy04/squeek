/** Drops reads that finished after the account or chain changed. */
export function createGeneration(): { next: () => number; current: (ticket: number) => boolean } {
  let ticket = 0
  return {
    next: () => {
      ticket += 1
      return ticket
    },
    current: (value: number) => value === ticket,
  }
}
