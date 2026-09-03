import fs from 'fs';
import path from 'path';
import { getAllFacts } from '../store/facts.js';
import { CURSOR_RULE_BASENAME, isSelfFact, truncate } from '../util/self.js';

/**
 * This rule is alwaysApply, so it is prepended to every Cursor request — it has to
 * stay small. Facts are one-lined and the whole file is capped; the full corpus
 * lives in ~/.memcon/CONTEXT.md and is reachable via the memcon MCP server.
 */
const MAX_CHARS_PER_FACT = 500;
const MAX_TOTAL_CHARS = 24_000;

export function emitCursorRule(projectRoot: string = process.cwd()): string | null {
  const rulesDir = path.join(projectRoot, '.cursor', 'rules');
  if (!fs.existsSync(rulesDir)) {
    try {
      fs.mkdirSync(rulesDir, { recursive: true });
    } catch {
      return null;
    }
  }

  const facts = getAllFacts().filter((f) => !isSelfFact(f));
  const rules = facts.filter((f) => f.category === 'rule' || f.category === 'decision');
  const sessionStates = facts.filter((f) => f.category === 'session-state');

  let content = `---
description: Unified cross-agent rules and session context managed by memcon
alwaysApply: true
---

# MEMCON SHARED CONTEXT

Summaries only. Full text: \`~/.memcon/CONTEXT.md\`, or query the memcon MCP server.

## Project Rules & Constraints
`;

  let dropped = 0;
  const append = (line: string) => {
    if (content.length + line.length > MAX_TOTAL_CHARS) {
      dropped += 1;
      return;
    }
    content += line;
  };

  for (const r of rules) {
    append(`- **${r.key}**: ${truncate(r.content, MAX_CHARS_PER_FACT)}\n`);
  }

  if (sessionStates.length > 0) {
    append(`\n## Recent Session State\n`);
    for (const s of sessionStates) {
      append(`- **${s.key}** (updated ${s.updatedAt}): ${truncate(s.content, MAX_CHARS_PER_FACT)}\n`);
    }
  }

  if (dropped > 0) {
    content += `\n*${dropped} further fact(s) omitted to keep this always-applied rule small — see \`~/.memcon/CONTEXT.md\`.*\n`;
  }

  const outFile = path.join(rulesDir, CURSOR_RULE_BASENAME);
  fs.writeFileSync(outFile, content, 'utf-8');
  return outFile;
}
