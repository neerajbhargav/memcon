import fs from 'fs';
import path from 'path';
import { parseFrontmatter } from './frontmatter.js';
import { FactCategory } from '../types.js';

export function parseCursorRules(rulesDir: string): Array<{
  key: string;
  content: string;
  category: FactCategory;
  source: string;
  tags: string[];
}> {
  if (!fs.existsSync(rulesDir)) return [];

  const results: Array<{
    key: string;
    content: string;
    category: FactCategory;
    source: string;
    tags: string[];
  }> = [];

  try {
    const files = fs.readdirSync(rulesDir);
    for (const file of files) {
      if (!file.endsWith('.mdc')) continue;
      const filePath = path.join(rulesDir, file);
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = parseFrontmatter(raw);

      const ruleName = path.basename(file, '.mdc');
      const key = `cursor.${ruleName}`;
      
      results.push({
        key,
        content: parsed.body,
        category: 'rule',
        source: 'cursor',
        tags: ['cursor', 'rule', ...(parsed.attributes.globs ? [parsed.attributes.globs] : [])],
      });
    }
  } catch {
    // Ignore read errors
  }

  return results;
}
