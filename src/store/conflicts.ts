import { getDatabase } from './database.js';
import { Conflict, Fact } from '../types.js';
import { getAllFacts } from './facts.js';

export function detectConflicts(): Conflict[] {
  const facts = getAllFacts();
  const db = getDatabase();

  // Find keys where history shows updates from different sources
  const keySourceMap = new Map<string, Set<string>>();

  const historyRows = db.prepare(`
    SELECT fact_key, source FROM history GROUP BY fact_key, source
  `).all() as Array<{ fact_key: string; source: string }>;

  for (const row of historyRows) {
    if (!keySourceMap.has(row.fact_key)) {
      keySourceMap.set(row.fact_key, new Set());
    }
    keySourceMap.get(row.fact_key)!.add(row.source);
  }

  const conflicts: Conflict[] = [];

  for (const [key, sources] of keySourceMap.entries()) {
    if (sources.size > 1) {
      const fact = facts.find(f => f.key === key);
      if (fact) {
        conflicts.push({
          key,
          facts: [fact],
          hasDiverged: true,
        });
      }
    }
  }

  return conflicts;
}
