import fs from 'fs';
import path from 'path';
import { getAllFacts } from '../store/facts.js';
import { getPendingHandoffs } from '../store/handoffs.js';
import { getMemconDir } from '../config/index.js';

export function emitUniversalContextMd(targetPath?: string): string {
  const facts = getAllFacts();
  const handoffs = getPendingHandoffs();

  const rules = facts.filter(f => f.category === 'rule');
  const sessionStates = facts.filter(f => f.category === 'session-state');
  const decisions = facts.filter(f => f.category === 'decision');
  const technicals = facts.filter(f => f.category === 'technical');

  let markdown = `# MEMCON UNIFIED CONTEXT
*Generated automatically by memcon on ${new Date().toISOString()}*

---

## 1. LOCKED DECISIONS & CONSTRAINTS
`;

  if (decisions.length === 0) {
    markdown += `*No decisions recorded yet.*\n\n`;
  } else {
    for (const d of decisions) {
      markdown += `### ${d.key} (Source: ${d.source})\n${d.content}\n\n`;
    }
  }

  markdown += `## 2. ACTIVE RULES & GUIDELINES\n`;
  if (rules.length === 0) {
    markdown += `*No active rules recorded yet.*\n\n`;
  } else {
    for (const r of rules) {
      markdown += `### ${r.key} (Source: ${r.source})\n${r.content}\n\n`;
    }
  }

  markdown += `## 3. CURRENT SESSION STATE\n`;
  if (sessionStates.length === 0) {
    markdown += `*No session state recorded yet.*\n\n`;
  } else {
    for (const s of sessionStates) {
      markdown += `### ${s.key} (Source: ${s.source}, Updated: ${s.updatedAt})\n${s.content}\n\n`;
    }
  }

  markdown += `## 4. TECHNICAL FACTS & ARCHITECTURE\n`;
  if (technicals.length === 0) {
    markdown += `*No technical facts recorded yet.*\n\n`;
  } else {
    for (const t of technicals) {
      markdown += `### ${t.key} (Source: ${t.source})\n${t.content}\n\n`;
    }
  }

  if (handoffs.length > 0) {
    markdown += `## 5. PENDING TASK HANDOFFS\n`;
    for (const h of handoffs) {
      markdown += `### Handoff [${h.id}] from ${h.fromAgent} (Created: ${h.createdAt})\n`;
      markdown += `**Summary:** ${h.summary}\n`;
      markdown += `**Context:** ${h.context}\n\n`;
    }
  }

  const outPath = targetPath || path.join(getMemconDir(), 'CONTEXT.md');
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outPath, markdown, 'utf-8');
  return outPath;
}
