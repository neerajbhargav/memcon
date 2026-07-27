import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import { parseClaudeCodeMemories } from '../../parsers/claude-code.js';
import { parseHermesMemories } from '../../parsers/hermes.js';
import { parseCursorRules } from '../../parsers/cursor.js';
import { parseAgentsMd } from '../../parsers/agents-md.js';
import { saveFact, getAllFacts } from '../../store/facts.js';
import { emitUniversalContextMd } from '../../emitters/context-md.js';
import { emitCursorRule } from '../../emitters/cursor.js';
import { emitHermesMemory } from '../../emitters/hermes.js';
import { emitAgentsMdSection } from '../../emitters/agents-md.js';
import { detectConflicts } from '../../store/conflicts.js';

export async function runSyncCommand() {
  const spinner = ora('Synchronizing cross-agent context...').start();

  const claudeFacts = parseClaudeCodeMemories();
  const hermesFacts = parseHermesMemories();
  const cursorFacts = parseCursorRules(path.join(process.cwd(), '.cursor', 'rules'));
  const agentsMdFacts = parseAgentsMd(path.join(process.cwd(), 'AGENTS.md'));

  const allFacts = [...claudeFacts, ...hermesFacts, ...cursorFacts, ...agentsMdFacts];
  for (const fact of allFacts) {
    saveFact(fact);
  }

  const universalPath = emitUniversalContextMd();
  emitCursorRule();
  emitHermesMemory();
  emitAgentsMdSection();

  const conflicts = detectConflicts();
  const totalFacts = getAllFacts().length;

  spinner.succeed(`Sync complete (${totalFacts} facts synced, ${conflicts.length} conflicts).`);

  console.log(chalk.gray(`\n  Emitted universal context → ${universalPath}`));
  if (conflicts.length > 0) {
    console.log(chalk.yellow(`\n  ⚠️ ${conflicts.length} divergence/conflict(s) detected. Run 'memcon status' for details.`));
  } else {
    console.log(chalk.green(`  ✨ All agent memories in sync.\n`));
  }
}
