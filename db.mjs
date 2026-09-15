import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dataDir = path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'app.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  -- Anonymous per-browser session. No PII — just an opaque id a cookie points
  -- to, so a returning visitor can see their own upload/download history.
  CREATE TABLE IF NOT EXISTS sessions (
    id           TEXT PRIMARY KEY,
    created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    last_seen_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  -- Admin login (single password from ADMIN_PASSWORD env var) sessions.
  CREATE TABLE IF NOT EXISTS admin_sessions (
    id         TEXT PRIMARY KEY,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    expires_at TEXT NOT NULL
  );

  -- Links the admin mints to grant upload access, shared out of band.
  -- Disabling one blocks any further uploads through it immediately.
  CREATE TABLE IF NOT EXISTS upload_tokens (
    id          TEXT PRIMARY KEY,
    label       TEXT,
    enabled     INTEGER NOT NULL DEFAULT 1,
    max_uses    INTEGER,
    use_count   INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    disabled_at TEXT
  );

  -- One row per encrypted blob. The server never sees the encryption key or
  -- the original filename — both live only in the client, so most columns
  -- here are just lifecycle bookkeeping.
  CREATE TABLE IF NOT EXISTS files (
    id                     TEXT PRIMARY KEY,
    size_bytes             INTEGER NOT NULL,
    upload_token_id        TEXT REFERENCES upload_tokens(id) ON DELETE SET NULL,
    uploader_session_id    TEXT REFERENCES sessions(id) ON DELETE SET NULL,
    created_at             TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    expires_at             TEXT,
    claimed_at             TEXT,
    claimed_by_session_id  TEXT REFERENCES sessions(id) ON DELETE SET NULL,
    deleted_at             TEXT,
    delete_reason          TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_files_uploader ON files(uploader_session_id);
  CREATE INDEX IF NOT EXISTS idx_files_claimed_by ON files(claimed_by_session_id);

  -- Anonymous audit trail: what happened, when, from which anonymous session.
  -- session_id is NULL for system-triggered events (expiry sweeps).
  CREATE TABLE IF NOT EXISTS audit_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id    TEXT NOT NULL,
    session_id TEXT,
    event      TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  CREATE INDEX IF NOT EXISTS idx_audit_file ON audit_log(file_id);
`);

// Purge expired admin sessions on boot.
db.prepare(`DELETE FROM admin_sessions WHERE expires_at < strftime('%Y-%m-%dT%H:%M:%fZ','now')`).run();

export default db;
