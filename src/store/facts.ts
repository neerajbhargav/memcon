import { getDatabase } from './database.js';
import { Fact, FactCategory } from '../types.js';

export function saveFact(input: {
  key: string;
  content: string;
  category: FactCategory;
  source: string;
  tags?: string[];
  confidence?: number;
  expiresAt?: string | null;
}): Fact {
  const db = getDatabase();
  const now = new Date().toISOString();
  const existing = getFactByKey(input.key);

  const tagsJson = JSON.stringify(input.tags || []);
  const confidence = input.confidence ?? 1.0;

  if (existing) {
    if (existing.content === input.content) {
      // Content identical, return existing
      return existing;
    }

    const nextVersion = existing.version + 1;
    db.prepare(`
      UPDATE facts
      SET content = ?, category = ?, source = ?, tags = ?, confidence = ?, updated_at = ?, version = ?
      WHERE key = ?
    `).run(input.content, input.category, input.source, tagsJson, confidence, now, nextVersion, input.key);

    // Track history
    db.prepare(`
      INSERT INTO history (id, fact_id, fact_key, old_content, new_content, source, changed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(cryptoRandomId(), existing.id, existing.key, existing.content, input.content, input.source, now);

    // Sync FTS
    db.prepare(`DELETE FROM facts_fts WHERE key = ?`).run(input.key);
    db.prepare(`INSERT INTO facts_fts (key, content, tags) VALUES (?, ?, ?)`).run(input.key, input.content, tagsJson);

    return {
      ...existing,
      content: input.content,
      category: input.category,
      source: input.source,
      tags: input.tags || [],
      confidence,
      updatedAt: now,
      version: nextVersion,
    };
  }

  const newId = cryptoRandomId();
  db.prepare(`
    INSERT INTO facts (id, key, content, category, source, tags, confidence, created_at, updated_at, expires_at, version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `).run(newId, input.key, input.content, input.category, input.source, tagsJson, confidence, now, now, input.expiresAt || null);

  // Track initial history
  db.prepare(`
    INSERT INTO history (id, fact_id, fact_key, old_content, new_content, source, changed_at)
    VALUES (?, ?, ?, NULL, ?, ?, ?)
  `).run(cryptoRandomId(), newId, input.key, input.content, input.source, now);

  // Sync FTS
  db.prepare(`INSERT INTO facts_fts (key, content, tags) VALUES (?, ?, ?)`).run(input.key, input.content, tagsJson);

  return {
    id: newId,
    key: input.key,
    content: input.content,
    category: input.category,
    source: input.source,
    tags: input.tags || [],
    confidence,
    createdAt: now,
    updatedAt: now,
    expiresAt: input.expiresAt || null,
    version: 1,
  };
}

export function getFactByKey(key: string): Fact | null {
  const db = getDatabase();
  const row = db.prepare(`SELECT * FROM facts WHERE key = ?`).get(key) as any;
  if (!row) return null;
  return rowToFact(row);
}

export function getAllFacts(category?: FactCategory): Fact[] {
  const db = getDatabase();
  let rows: any[];
  if (category) {
    rows = db.prepare(`SELECT * FROM facts WHERE category = ? ORDER BY updated_at DESC`).all(category);
  } else {
    rows = db.prepare(`SELECT * FROM facts ORDER BY updated_at DESC`).all();
  }
  return rows.map(rowToFact);
}

export function searchFacts(query: string, category?: FactCategory, limit: number = 10): Fact[] {
  const db = getDatabase();
  let rows: any[];
  if (category) {
    rows = db.prepare(`
      SELECT f.* FROM facts f
      JOIN facts_fts fts ON f.key = fts.key
      WHERE fts MATCH ? AND f.category = ?
      LIMIT ?
    `).all(query, category, limit);
  } else {
    rows = db.prepare(`
      SELECT f.* FROM facts f
      JOIN facts_fts fts ON f.key = fts.key
      WHERE fts MATCH ?
      LIMIT ?
    `).all(query, limit);
  }

  // Fallback to LIKE if FTS yields nothing (useful for simple substring matching)
  if (rows.length === 0) {
    const likeQuery = `%${query}%`;
    if (category) {
      rows = db.prepare(`
        SELECT * FROM facts
        WHERE (key LIKE ? OR content LIKE ? OR tags LIKE ?) AND category = ?
        LIMIT ?
      `).all(likeQuery, likeQuery, likeQuery, category, limit);
    } else {
      rows = db.prepare(`
        SELECT * FROM facts
        WHERE key LIKE ? OR content LIKE ? OR tags LIKE ?
        LIMIT ?
      `).all(likeQuery, likeQuery, likeQuery, limit);
    }
  }

  return rows.map(rowToFact);
}

export function deleteFact(key: string): boolean {
  const db = getDatabase();
  const res = db.prepare(`DELETE FROM facts WHERE key = ?`).run(key);
  if (res.changes > 0) {
    db.prepare(`DELETE FROM facts_fts WHERE key = ?`).run(key);
    return true;
  }
  return false;
}

function rowToFact(row: any): Fact {
  let tags: string[] = [];
  try {
    tags = JSON.parse(row.tags || '[]');
  } catch {
    tags = [];
  }
  return {
    id: row.id,
    key: row.key,
    content: row.content,
    category: row.category as FactCategory,
    source: row.source,
    tags,
    confidence: row.confidence,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    expiresAt: row.expires_at,
    version: row.version,
  };
}

function cryptoRandomId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
