import fs from 'fs';
import path from 'path';
import os from 'os';
import { parseFrontmatter } from './frontmatter.js';
import { Fact, FactCategory } from '../types.js';

export function parseClaudeCodeMemories(memoryDir?: string): Array<{
  key: string;
  content: string;
  category: FactCategory;
  source: string;
  tags: string[];
}> {
  const homeDir = os.homedir();
  const rootDir = memoryDir || path.join(homeDir, '.claude', 'projects');

  if (!fs.existsSync(rootDir)) return [];

  const results: Array<{
    key: string;
    content: string;
    category: FactCategory;
    source: string;
    tags: string[];
  }> = [];

  try {
    const projects = fs.readdirSync(rootDir, { withFileTypes: true });
    for (const proj of projects) {
      if (!proj.isDirectory()) continue;
      const memFolder = path.join(rootDir, proj.name, 'memory');
      if (!fs.existsSync(memFolder)) continue;

      const files = fs.readdirSync(memFolder);
      for (const file of files) {
        if (!file.endsWith('.md') || file === 'MEMORY.md' || file === '_memory_index.md') continue;
        const filePath = path.join(memFolder, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const parsed = parseFrontmatter(fileContent);

        const name = parsed.attributes.name || path.basename(file, '.md');
        const typeStr = parsed.attributes.metadata?.type || parsed.attributes.type || 'session-state';
        
        let category: FactCategory = 'session-state';
        if (typeStr.includes('rule') || typeStr.includes('guideline')) category = 'rule';
        else if (typeStr.includes('decision')) category = 'decision';
        else if (typeStr.includes('tech') || typeStr.includes('infra')) category = 'technical';

        const key = `claude-code.${name.replace(/\.md$/, '')}`;
        results.push({
          key,
          content: parsed.body,
          category,
          source: 'claude-code',
          tags: ['claude-code', typeStr],
        });
      }
    }
  } catch {
    // Ignore read errors
  }

  return results;
}
