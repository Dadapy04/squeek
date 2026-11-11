export const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS nonces (
    nonce TEXT PRIMARY KEY,
    address TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    address TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS profiles (
    address TEXT PRIMARY KEY,
    name TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS accounts (
    address TEXT PRIMARY KEY,
    state TEXT NOT NULL,
    revision INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS saves (
    address TEXT PRIMARY KEY,
    revision INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    blob TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS runs (
    id TEXT PRIMARY KEY,
    address TEXT NOT NULL,
    seed INTEGER NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL,
    issued_at INTEGER NOT NULL,
    depth INTEGER,
    value INTEGER,
    reason TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS scores (
    run_id TEXT PRIMARY KEY,
    address TEXT NOT NULL,
    depth INTEGER NOT NULL,
    value INTEGER NOT NULL,
    week TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    flagged INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS limits (
    key TEXT PRIMARY KEY,
    count INTEGER NOT NULL,
    reset_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS scores_board ON scores (flagged, week, value DESC, depth DESC)`,
  `CREATE INDEX IF NOT EXISTS nonces_exp ON nonces (expires_at)`,
]

/** Added after the first deploy. Duplicate-column errors are ignored by the worker. */
export const ALTERS = [
  `ALTER TABLE runs ADD COLUMN elapsed_ms INTEGER`,
]

/** Old client blobs are retired. Wallet profiles start empty in `accounts`. */
export const RETIRE_BLOBS = `DELETE FROM saves`
