import fs from 'fs';
import path from 'path';
import os from 'os';
import { getAllFacts } from '../store/facts.js';

export function emitHermesMemory(hermesMemDir?: string): string | null {
  const homeDir = os.homedir();
  const dir = hermesMemDir || path.join(homeDir, '.hermes', 'memories');
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {
      return null;
    }
  }

  const facts = getAllFacts();
  const rules = facts.filter(f => f.category === 'rule' || f.category === 'decision');
  const sessionStates = facts.filter(f => f.category === 'session-state');

  let content = `# Hermes Agent Memory (Managed by memcon)

§ System & User Context
- Mac arm64 environment managed via memcon cross-agent sync

§ Active Project Rules
`;

  for (const r of rules) {
    const brief = r.content.length > 150 ? r.content.substring(0, 147) + '...' : r.content;
    content += `- ${r.key}: ${brief.replace(/\n/g, ' ')}\n`;
  }

  if (sessionStates.length > 0) {
    content += `\n§ Current Session State\n`;
    for (const s of sessionStates) {
      const brief = s.content.length > 200 ? s.content.substring(0, 197) + '...' : s.content;
      content += `- ${s.key}: ${brief.replace(/\n/g, ' ')}\n`;
    }
  }

  const outFile = path.join(dir, 'MEMORY.md');
  fs.writeFileSync(outFile, content, 'utf-8');
  return outFile;
}
