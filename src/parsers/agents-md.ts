import fs from 'fs';
import { FactCategory } from '../types.js';

export function parseAgentsMd(filePath: string): Array<{
  key: string;
  content: string;
  category: FactCategory;
  source: string;
  tags: string[];
}> {
  if (!fs.existsSync(filePath)) return [];

  const raw = fs.readFileSync(filePath, 'utf-8');
  const sections = raw.split(/(?=\n##\s+)/);
  const results: Array<{
    key: string;
    content: string;
    category: FactCategory;
    source: string;
    tags: string[];
  }> = [];

  let idx = 1;
  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    let category: FactCategory = 'rule';
    const lower = trimmed.toLowerCase();
    if (lower.includes('status') || lower.includes('session')) category = 'session-state';
    else if (lower.includes('architecture') || lower.includes('repo') || lower.includes('stack')) category = 'technical';
    else if (lower.includes('decision') || lower.includes('contract')) category = 'decision';

    const headerMatch = trimmed.match(/^##\s+(.+)$/m);
    const sectionName = headerMatch ? headerMatch[1].toLowerCase().replace(/[^a-z0-9]+/g, '-') : `section-${idx++}`;

    results.push({
      key: `agents-md.${sectionName}`,
      content: trimmed,
      category,
      source: 'agents-md',
      tags: ['agents-md', category],
    });
  }

  return results;
}
