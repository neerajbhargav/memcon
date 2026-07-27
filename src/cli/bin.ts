#!/usr/bin/env node
import { Command } from 'commander';
import { runInitCommand } from './commands/init.js';
import { runSyncCommand } from './commands/sync.js';
import { runServeCommand } from './commands/serve.js';
import { runStatusCommand } from './commands/status.js';
import { runHandoffCommand } from './commands/handoff.js';

const program = new Command();

program
  .name('memcon')
  .description('Universal cross-agent context transfer & shared memory layer')
  .version('0.1.0');

program
  .command('init')
  .description('Auto-discover agents and initialize memcon shared context store')
  .option('-v, --verbose', 'Enable verbose logging')
  .action((options) => runInitCommand(options));

program
  .command('sync')
  .description('Perform a one-shot bidirectional context sync across all agents')
  .action(() => runSyncCommand());

program
  .command('serve')
  .description('Start memcon MCP server over stdio and file watcher daemon')
  .action(() => runServeCommand());

program
  .command('status')
  .description('View cross-agent context dashboard, stored facts, and conflicts')
  .action(() => runStatusCommand());

program
  .command('handoff')
  .description('Manage task handoffs between AI agents')
  .option('-s, --summary <summary>', 'Summary of task being handed off')
  .option('-c, --context <context>', 'Detailed context and findings')
  .option('-f, --from <agent>', 'Agent creating the handoff')
  .option('-t, --to <agent>', 'Target agent to receive handoff')
  .option('--claim <id>', 'Claim a pending handoff by ID')
  .option('--as <agent>', 'Agent name claiming the handoff')
  .action((options) => runHandoffCommand(options));

program.parse(process.argv);
