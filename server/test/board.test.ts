import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import { boardSql } from '../src/board.ts'

function board(metric: 'value' | 'depth', span = 'all', week = '2026-W45') {
  const db = new DatabaseSync(':memory:')
  db.exec(`CREATE TABLE scores (
    run_id TEXT PRIMARY KEY,
    address TEXT NOT NULL,
    depth INTEGER NOT NULL,
    value INTEGER NOT NULL,
    week TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    flagged INTEGER NOT NULL
  )`)
  const insert = db.prepare('INSERT INTO scores (run_id, address, depth, value, week, created_at, flagged) VALUES (?, ?, ?, ?, ?, ?, ?)')
  insert.run('a-rich', '0xaaa', 1, 400, '2026-W45', 10, 0)
  insert.run('a-deep', '0xaaa', 7, 80, '2026-W45', 20, 0)
  insert.run('b-only', '0xbbb', 3, 150, '2026-W45', 15, 0)
  insert.run('a-flag', '0xaaa', 7, 900, '2026-W45', 30, 1)
  insert.run('a-oldweek', '0xaaa', 2, 800, '2026-W44', 5, 0)
  const rows = db.prepare(boardSql(metric)).all(span, week, span, week) as { address: string; depth: number; value: number }[]
  db.close()
  return rows
}

describe('leaderboard rows', () => {
  it('keeps value and depth from the same run', () => {
    const byValue = board('value', 'week')
    const alpha = byValue.find((row) => row.address === '0xaaa')
    expect(alpha).toEqual({ address: '0xaaa', depth: 1, value: 400 })
    expect(byValue[0]?.address).toBe('0xaaa')
    const byDepth = board('depth', 'week')
    expect(byDepth.find((row) => row.address === '0xaaa')).toEqual({ address: '0xaaa', depth: 7, value: 80 })
    expect(byDepth[0]).toEqual({ address: '0xaaa', depth: 7, value: 80 })
    const week = board('value', 'week', '2026-W45')
    expect(week.find((row) => row.address === '0xaaa')).toEqual({ address: '0xaaa', depth: 1, value: 400 })
    const all = board('value', 'all', '2026-W45')
    expect(all.find((row) => row.address === '0xaaa')).toEqual({ address: '0xaaa', depth: 2, value: 800 })
  })
})
