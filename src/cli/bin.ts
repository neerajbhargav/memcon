#!/usr/bin/env node
import { Command } from 'commander';
import { runInitCommand } from './commands/init.js';
import { runSyncCommand } from './commands/sync.js';
import { runServeCommand } from './commands/serve.js';
import { runStatusCommand } from './commands/status.js';
import { runHandoffCommand } from './commands/handoff.js';
import { runResolveCommand } from './commands/resolve.js';
import { runExportCommand, runImportCommand } from './commands/export.js';
import { installDaemon, uninstallDaemon, getDaemonStatus } from '../daemon/installer.js';
import chalk from 'chalk';

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
  .description('Start memcon MCP server over stdio, HTTP REST/SSE server, and file watcher daemon')
  .option('-p, --port <port>', 'HTTP REST/SSE server port', '13370')
  .action((options) => runServeCommand({ port: Number(options.port) }));

program
  .command('status')
  .description('View cross-agent context dashboard, stored facts, and conflicts')
  .action(() => runStatusCommand());

program
  .command('resolve')
  .description('Interactively resolve divergent facts / conflicts across agents')
  .action(() => runResolveCommand());

program
  .command('export [path]')
  .description('Export stored facts and handoffs to a JSON backup file')
  .action((path) => runExportCommand(path));

program
  .command('import <path>')
  .description('Import facts and handoffs from a JSON backup file')
  .action((path) => runImportCommand(path));

const daemonCmd = program
  .command('daemon')
  .description('Manage background OS daemon (macOS LaunchAgent / Linux systemd)');

daemonCmd
  .command('install')
  .description('Install and launch background OS daemon on user login')
  .action(() => {
    const res = installDaemon();
    if (res.success) console.log(chalk.green(`\n✅ ${res.message}\n`));
    else console.log(chalk.red(`\n❌ ${res.message}\n`));
  });

daemonCmd
  .command('uninstall')
  .description('Stop and remove background OS daemon')
  .action(() => {
    const res = uninstallDaemon();
    if (res.success) console.log(chalk.green(`\n✅ ${res.message}\n`));
    else console.log(chalk.red(`\n❌ ${res.message}\n`));
  });

daemonCmd
  .command('status')
  .description('Check OS background daemon status')
  .action(() => {
    const st = getDaemonStatus();
    console.log(chalk.bold(`\nDaemon Status: ${st.message}\n`));
  });

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
