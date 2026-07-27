import chalk from 'chalk';
import { getAllFacts } from '../../store/facts.js';
import { getPendingHandoffs } from '../../store/handoffs.js';
import { detectConflicts } from '../../store/conflicts.js';
import { scanAgents } from '../../discovery/scanner.js';

export async function runStatusCommand() {
  const facts = getAllFacts();
  const handoffs = getPendingHandoffs();
  const conflicts = detectConflicts();
  const agents = scanAgents();

  console.log(chalk.bold.cyan('\n🧠 memcon — Context Dashboard\n'));

  console.log(chalk.bold('Agents Detected:'));
  for (const a of agents) {
    const statusStr = a.installed ? chalk.green('Installed') : chalk.dim('Not Found');
    const mcpStr = a.mcpSupported ? chalk.blue('MCP') : chalk.gray('File');
    console.log(`  ${a.displayName.padEnd(20)} [${mcpStr}] ${statusStr}`);
  }

  console.log(chalk.bold('\nFact Summary:'));
  const rules = facts.filter(f => f.category === 'rule');
  const sessionStates = facts.filter(f => f.category === 'session-state');
  const decisions = facts.filter(f => f.category === 'decision');
  const technicals = facts.filter(f => f.category === 'technical');

  console.log(`  Total Facts:    ${chalk.bold(facts.length)}`);
  console.log(`  - Rules:        ${rules.length}`);
  console.log(`  - Decisions:    ${decisions.length}`);
  console.log(`  - Technical:    ${technicals.length}`);
  console.log(`  - Session State:${sessionStates.length}`);

  if (handoffs.length > 0) {
    console.log(chalk.bold.yellow(`\nPending Task Handoffs (${handoffs.length}):`));
    for (const h of handoffs) {
      console.log(`  [${chalk.bold(h.id)}] ${h.summary} (From: ${h.fromAgent})`);
    }
  } else {
    console.log(chalk.dim('\nNo pending task handoffs.'));
  }

  if (conflicts.length > 0) {
    console.log(chalk.bold.red(`\nDivergent Facts / Conflicts (${conflicts.length}):`));
    for (const c of conflicts) {
      console.log(`  - Key: ${chalk.red(c.key)} (Updated by multiple agents)`);
    }
  } else {
    console.log(chalk.green('\n✨ Zero conflicts detected across agents.'));
  }

  console.log('');
}
