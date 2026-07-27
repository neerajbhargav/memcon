import fs from 'fs';
import path from 'path';
import { getAllFacts } from '../store/facts.js';

export function emitCursorRule(projectRoot: string = process.cwd()): string | null {
  const rulesDir = path.join(projectRoot, '.cursor', 'rules');
  if (!fs.existsSync(rulesDir)) {
    try {
      fs.mkdirSync(rulesDir, { recursive: true });
    } catch {
      return null;
    }
  }

  const facts = getAllFacts();
  const rules = facts.filter(f => f.category === 'rule' || f.category === 'decision');
  const sessionStates = facts.filter(f => f.category === 'session-state');

  let content = `---
description: Unified cross-agent rules and session context managed by memcon
alwaysApply: true
---

# MEMCON SHARED CONTEXT

## Project Rules & Constraints
`;

  for (const r of rules) {
    content += `- **${r.key}**: ${r.content.replace(/\n/g, ' ')}\n`;
  }

  if (sessionStates.length > 0) {
    content += `\n## Recent Session State\n`;
    for (const s of sessionStates) {
      content += `### ${s.key}\n${s.content}\n\n`;
    }
  }

  const outFile = path.join(rulesDir, 'memcon-context.mdc');
  fs.writeFileSync(outFile, content, 'utf-8');
  return outFile;
}
