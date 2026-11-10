export type BoardMetric = 'value' | 'depth'

/** One row per address. Value and depth always come from that same run. */
export function boardOrder(metric: BoardMetric): string {
  return metric === 'depth' ? 'depth DESC, value DESC, created_at DESC' : 'value DESC, depth DESC, created_at DESC'
}

export function boardSql(metric: BoardMetric): string {
  const order = boardOrder(metric)
  return `SELECT address, depth, value FROM scores AS picked
    WHERE picked.flagged = 0
      AND (? = 'all' OR picked.week = ?)
      AND picked.rowid = (
        SELECT candidate.rowid FROM scores AS candidate
        WHERE candidate.address = picked.address
          AND candidate.flagged = 0
          AND (? = 'all' OR candidate.week = ?)
        ORDER BY ${order}
        LIMIT 1
      )
    ORDER BY ${order}
    LIMIT 20`
}

/** The haul the value board keeps for one address. */
export function personalBestSql(): string {
  return `SELECT run_id, value, depth FROM scores
    WHERE address = ? AND flagged = 0
    ORDER BY value DESC, depth DESC, created_at DESC
    LIMIT 1`
}
