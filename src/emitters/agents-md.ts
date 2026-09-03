import fs from 'fs';
import path from 'path';
import os from 'os';
import { getAllFacts } from '../store/facts.js';
import {
  MEMCON_BLOCK_START,
  MEMCON_BLOCK_END,
  MEMCON_BLOCK_RE,
  isSelfFact,
  truncate,
} from '../util/self.js';

/** AGENTS.md is a hand-maintained router doc — the managed block stays a pointer, not a payload. */
const MAX_FACTS = 20;
const MAX_CHARS_PER_FACT = 200;

export function emitAgentsMdSection(targetFile?: string): string | null {
  const filePath = targetFile || path.join(process.cwd(), 'AGENTS.md');
  const fallbackHomePath = path.join(os.homedir(), 'AGENTS.md');

  const actualPath = fs.existsSync(filePath) ? filePath : (fs.existsSync(fallbackHomePath) ? fallbackHomePath : null);
  if (!actualPath) return null;

  const facts = getAllFacts();
  const sessionStates = facts.filter((f) => f.category === 'session-state' && !isSelfFact(f));
  const shown = sessionStates.slice(0, MAX_FACTS);

  let stateBlock = `${MEMCON_BLOCK_START}\n## Live Session State (Managed by memcon)\n`;
  stateBlock += `<!-- Generated — do not edit by hand. Full context: ~/.memcon/CONTEXT.md -->\n`;
  if (shown.length === 0) {
    stateBlock += `*No active session state recorded.*\n`;
  } else {
    for (const s of shown) {
      stateBlock += `- **${s.key}** (${s.source}, updated ${s.updatedAt}): ${truncate(s.content, MAX_CHARS_PER_FACT)}\n`;
    }
    if (sessionStates.length > shown.length) {
      stateBlock += `- *…and ${sessionStates.length - shown.length} more — see \`~/.memcon/CONTEXT.md\`.*\n`;
    }
  }
  stateBlock += MEMCON_BLOCK_END;

  let fileContent = fs.readFileSync(actualPath, 'utf-8');

  // Greedy match: collapses legacy files where the block nested inside itself.
  if (MEMCON_BLOCK_RE.test(fileContent)) {
    fileContent = fileContent.replace(MEMCON_BLOCK_RE, stateBlock);
  } else {
    fileContent = fileContent.trim() + '\n\n' + stateBlock + '\n';
  }

  fs.writeFileSync(actualPath, fileContent, 'utf-8');
  return actualPath;
}
