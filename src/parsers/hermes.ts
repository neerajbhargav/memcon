import fs from 'fs';
import path from 'path';
import os from 'os';
import { FactCategory } from '../types.js';
import { isSelfGenerated } from '../util/self.js';

export function parseHermesMemories(hermesMemDir?: string): Array<{
  key: string;
  content: string;
  category: FactCategory;
  source: string;
  tags: string[];
}> {
  const homeDir = os.homedir();
  const dir = hermesMemDir || path.join(homeDir, '.hermes', 'memories');
  if (!fs.existsSync(dir)) return [];

  const results: Array<{
    key: string;
    content: string;
    category: FactCategory;
    source: string;
    tags: string[];
  }> = [];

  const memoryFile = path.join(dir, 'MEMORY.md');
  // A MEMORY.md that memcon wrote is not a source — ingesting it replaces Hermes's
  // own memories with memcon's summary of them, one truncation deeper each pass.
  if (fs.existsSync(memoryFile) && !isSelfGenerated(fs.readFileSync(memoryFile, 'utf-8'))) {
    const raw = fs.readFileSync(memoryFile, 'utf-8');
    // Split by markdown headers (# or ##) or § delimiters
    const sections = raw.split(/(?=\n#|\n§|\n-\s+\*\*)/);
    
    let idx = 1;
    for (const section of sections) {
      const trimmed = section.trim();
      if (!trimmed || trimmed.startsWith('# Hermes Agent Memory')) continue;

      let category: FactCategory = 'technical';
      if (trimmed.toLowerCase().includes('rule') || trimmed.toLowerCase().includes('must')) category = 'rule';
      else if (trimmed.toLowerCase().includes('user') || trimmed.toLowerCase().includes('identity')) category = 'decision';
      else if (trimmed.toLowerCase().includes('state') || trimmed.toLowerCase().includes('status')) category = 'session-state';

      const key = `hermes.memory-${idx++}`;
      results.push({
        key,
        content: trimmed,
        category,
        source: 'hermes',
        tags: ['hermes'],
      });
    }
  }

  const userFile = path.join(dir, 'USER.md');
  if (fs.existsSync(userFile)) {
    const raw = fs.readFileSync(userFile, 'utf-8').trim();
    if (raw) {
      results.push({
        key: 'hermes.user-profile',
        content: raw,
        category: 'decision',
        source: 'hermes',
        tags: ['hermes', 'user-profile'],
      });
    }
  }

  return results;
}
