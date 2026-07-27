import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { getMemconDir, loadConfig } from '../config/index.js';

let dbInstance: Database.Database | null = null;

export function getDatabase(dbPath?: string): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  const targetPath = dbPath || loadConfig().storePath || path.join(getMemconDir(), 'store.db');
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  dbInstance = new Database(targetPath);
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');

  initSchema(dbInstance);
  return dbInstance;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS facts (
      id          TEXT PRIMARY KEY,
      key         TEXT NOT NULL UNIQUE,
      content     TEXT NOT NULL,
      category    TEXT NOT NULL,
      source      TEXT NOT NULL,
      tags        TEXT,
      confidence  REAL DEFAULT 1.0,
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL,
      expires_at  TEXT,
      version     INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS history (
      id          TEXT PRIMARY KEY,
      fact_id     TEXT NOT NULL,
      fact_key    TEXT NOT NULL,
      old_content TEXT,
      new_content TEXT NOT NULL,
      source      TEXT NOT NULL,
      changed_at  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agents (
      id                     TEXT PRIMARY KEY,
      name                   TEXT NOT NULL UNIQUE,
      display_name           TEXT NOT NULL,
      type                   TEXT NOT NULL,
      installed              INTEGER DEFAULT 0,
      config_path            TEXT,
      memory_path            TEXT,
      last_sync              TEXT,
      status                 TEXT DEFAULT 'active',
      mcp_supported          INTEGER DEFAULT 1,
      file_sync_supported    INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS handoffs (
      id          TEXT PRIMARY KEY,
      from_agent  TEXT NOT NULL,
      to_agent    TEXT,
      summary     TEXT NOT NULL,
      context     TEXT NOT NULL,
      status      TEXT DEFAULT 'pending',
      created_at  TEXT NOT NULL,
      claimed_at  TEXT,
      claimed_by  TEXT
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS facts_fts USING fts5(key, content, tags);
  `);
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
