import { getDatabase } from './database.js';
import { Handoff } from '../types.js';

export function createHandoff(input: {
  fromAgent: string;
  toAgent?: string | null;
  summary: string;
  context: string;
}): Handoff {
  const db = getDatabase();
  const id = `hf-${Math.random().toString(36).substring(2, 9)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO handoffs (id, from_agent, to_agent, summary, context, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'pending', ?)
  `).run(id, input.fromAgent, input.toAgent || null, input.summary, input.context, now);

  return {
    id,
    fromAgent: input.fromAgent,
    toAgent: input.toAgent || null,
    summary: input.summary,
    context: input.context,
    status: 'pending',
    createdAt: now,
  };
}

export function claimHandoff(handoffId: string, agentName: string): Handoff | null {
  const db = getDatabase();
  const now = new Date().toISOString();

  const res = db.prepare(`
    UPDATE handoffs
    SET status = 'claimed', claimed_at = ?, claimed_by = ?
    WHERE id = ? AND status = 'pending'
  `).run(now, agentName, handoffId);

  if (res.changes === 0) return null;
  return getHandoffById(handoffId);
}

export function getPendingHandoffs(toAgent?: string): Handoff[] {
  const db = getDatabase();
  let rows: any[];
  if (toAgent) {
    rows = db.prepare(`
      SELECT * FROM handoffs
      WHERE status = 'pending' AND (to_agent IS NULL OR to_agent = ? OR to_agent = 'any')
      ORDER BY created_at DESC
    `).all(toAgent);
  } else {
    rows = db.prepare(`
      SELECT * FROM handoffs
      WHERE status = 'pending'
      ORDER BY created_at DESC
    `).all();
  }
  return rows.map(rowToHandoff);
}

export function getHandoffById(id: string): Handoff | null {
  const db = getDatabase();
  const row = db.prepare(`SELECT * FROM handoffs WHERE id = ?`).get(id) as any;
  if (!row) return null;
  return rowToHandoff(row);
}

function rowToHandoff(row: any): Handoff {
  return {
    id: row.id,
    fromAgent: row.from_agent,
    toAgent: row.to_agent,
    summary: row.summary,
    context: row.context,
    status: row.status,
    createdAt: row.created_at,
    claimedAt: row.claimed_at,
    claimedBy: row.claimed_by,
  };
}
