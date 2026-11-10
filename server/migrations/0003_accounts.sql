CREATE TABLE IF NOT EXISTS accounts (
  address TEXT PRIMARY KEY,
  state TEXT NOT NULL,
  revision INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

DELETE FROM saves;
