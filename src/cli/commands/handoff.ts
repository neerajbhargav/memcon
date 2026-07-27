import chalk from 'chalk';
import { createHandoff, claimHandoff, getPendingHandoffs } from '../../store/handoffs.js';
import { emitUniversalContextMd } from '../../emitters/context-md.js';

export async function runHandoffCommand(options: {
  summary?: string;
  context?: string;
  from?: string;
  to?: string;
  claim?: string;
  as?: string;
}) {
  if (options.claim) {
    const agentName = options.as || 'user';
    const claimed = claimHandoff(options.claim, agentName);
    if (!claimed) {
      console.log(chalk.red(`\n❌ Could not claim handoff [${options.claim}]. It may not exist or is already claimed.\n`));
      return;
    }

    console.log(chalk.green(`\n✅ Handoff [${claimed.id}] claimed by ${agentName}!\n`));
    console.log(chalk.bold(`Summary: ${claimed.summary}`));
    console.log(chalk.dim(`From Agent: ${claimed.fromAgent}`));
    console.log(chalk.white(`\nContext:\n${claimed.context}\n`));
    emitUniversalContextMd();
    return;
  }

  if (options.summary && options.context) {
    const handoff = createHandoff({
      fromAgent: options.from || 'user',
      toAgent: options.to || null,
      summary: options.summary,
      context: options.context,
    });

    console.log(chalk.green(`\n📦 Created task handoff package [${handoff.id}]`));
    console.log(chalk.white(`   Summary: ${handoff.summary}`));
    console.log(chalk.white(`   From: ${handoff.fromAgent} → Target: ${handoff.toAgent || 'any agent'}\n`));
    emitUniversalContextMd();
    return;
  }

  // Otherwise list pending handoffs
  const pending = getPendingHandoffs();
  console.log(chalk.bold.cyan('\n📦 Pending Task Handoffs\n'));

  if (pending.length === 0) {
    console.log(chalk.dim('  No pending task handoffs.\n'));
    console.log(chalk.gray('  To create a handoff:'));
    console.log(chalk.gray('    memcon handoff --summary "Investigation title" --context "Findings and next steps" --from "claude-code"\n'));
    return;
  }

  for (const h of pending) {
    console.log(`  [${chalk.bold.yellow(h.id)}] ${h.summary}`);
    console.log(`    From: ${h.fromAgent} → To: ${h.toAgent || 'any agent'} | Created: ${h.createdAt}`);
    console.log(`    Claim command: ${chalk.cyan(`memcon handoff --claim ${h.id} --as <your-agent>`)}\n`);
  }
}
