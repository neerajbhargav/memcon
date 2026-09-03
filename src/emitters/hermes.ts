import fs from 'fs';
import path from 'path';
import os from 'os';
import { getAllFacts } from '../store/facts.js';
import { HERMES_MIRROR_BASENAME, isSelfFact, truncate } from '../util/self.js';

/**
 * Writes memcon's view of shared context into ~/.hermes/memories as its OWN file.
 *
 * It deliberately does not touch MEMORY.md: that file is Hermes's own memory store,
 * and overwriting it destroys memories memcon cannot regenerate (and re-ingesting
 * the result replaces Hermes's text with a truncated summary of itself).
 */
const MAX_CHARS_PER_FACT = 300;

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

  const facts = getAllFacts().filter((f) => !isSelfFact(f));
  const rules = facts.filter((f) => f.category === 'rule' || f.category === 'decision');
  const sessionStates = facts.filter((f) => f.category === 'session-state');

  let content = `# Memcon Shared Context (generated — do not edit)

Cross-agent context collected by memcon. Hermes owns \`MEMORY.md\` in this directory;
memcon never writes it. Full text of every fact: \`~/.memcon/CONTEXT.md\`.

§ Active Project Rules
`;

  for (const r of rules) {
    content += `- ${r.key}: ${truncate(r.content, MAX_CHARS_PER_FACT)}\n`;
  }

  if (sessionStates.length > 0) {
    content += `\n§ Current Session State\n`;
    for (const s of sessionStates) {
      content += `- ${s.key}: ${truncate(s.content, MAX_CHARS_PER_FACT)}\n`;
    }
  }

  const outFile = path.join(dir, HERMES_MIRROR_BASENAME);
  fs.writeFileSync(outFile, content, 'utf-8');
  return outFile;
}
