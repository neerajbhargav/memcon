import fs from 'fs';
import path from 'path';
import os from 'os';
import { getAllFacts } from '../store/facts.js';

export function emitAgentsMdSection(targetFile?: string): string | null {
  const filePath = targetFile || path.join(process.cwd(), 'AGENTS.md');
  const fallbackHomePath = path.join(os.homedir(), 'AGENTS.md');

  const actualPath = fs.existsSync(filePath) ? filePath : (fs.existsSync(fallbackHomePath) ? fallbackHomePath : null);
  if (!actualPath) return null;

  const facts = getAllFacts();
  const sessionStates = facts.filter(f => f.category === 'session-state');

  let stateBlock = `<!-- memcon:session-state:start -->\n## Live Session State (Managed by memcon)\n`;
  if (sessionStates.length === 0) {
    stateBlock += `*No active session state recorded.*\n`;
  } else {
    for (const s of sessionStates) {
      stateBlock += `- **${s.key}** (${s.source}, updated ${s.updatedAt}): ${s.content.replace(/\n/g, ' ')}\n`;
    }
  }
  stateBlock += `<!-- memcon:session-state:end -->`;

  let fileContent = fs.readFileSync(actualPath, 'utf-8');

  const regex = /<!-- memcon:session-state:start -->[\s\S]*?<!-- memcon:session-state:end -->/;
  if (regex.test(fileContent)) {
    fileContent = fileContent.replace(regex, stateBlock);
  } else {
    fileContent = fileContent.trim() + '\n\n' + stateBlock + '\n';
  }

  fs.writeFileSync(actualPath, fileContent, 'utf-8');
  return actualPath;
}
