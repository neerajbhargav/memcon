import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { scanAgents } from '../../discovery/scanner.js';
import { parseClaudeCodeMemories } from '../../parsers/claude-code.js';
import { parseHermesMemories } from '../../parsers/hermes.js';
import { parseCursorRules } from '../../parsers/cursor.js';
import { parseAgentsMd } from '../../parsers/agents-md.js';
import { saveFact, getAllFacts } from '../../store/facts.js';
import { emitUniversalContextMd } from '../../emitters/context-md.js';
import { emitCursorRule } from '../../emitters/cursor.js';
import { emitHermesMemory } from '../../emitters/hermes.js';
import { emitAgentsMdSection } from '../../emitters/agents-md.js';

export async function runInitCommand(options: { verbose?: boolean }) {
  console.log(chalk.bold.cyan('\n🧠 memcon — Initializing cross-agent context system...\n'));

  const spinner = ora('Scanning for AI coding agents on this system...').start();
  const agents = scanAgents();
  spinner.succeed(`Discovered ${agents.length} agent types.`);

  for (const agent of agents) {
    if (agent.installed) {
      console.log(chalk.green(`  ✅ ${agent.displayName.padEnd(20)} (${agent.type})`));
    } else {
      console.log(chalk.dim(`  ⚪ ${agent.displayName.padEnd(20)} (Not detected)`));
    }
  }

  const importSpinner = ora('\nIngesting initial memory files and rules...').start();

  const claudeFacts = parseClaudeCodeMemories();
  const hermesFacts = parseHermesMemories();
  const cursorFacts = parseCursorRules(path.join(process.cwd(), '.cursor', 'rules'));
  const agentsMdFacts = parseAgentsMd(path.join(process.cwd(), 'AGENTS.md'));

  const allFacts = [...claudeFacts, ...hermesFacts, ...cursorFacts, ...agentsMdFacts];
  for (const fact of allFacts) {
    saveFact(fact);
  }

  importSpinner.succeed(`Imported ${allFacts.length} initial facts into SQLite database.`);

  const emitSpinner = ora('Emitting unified context and rules to agent stores...').start();
  const universalPath = emitUniversalContextMd();
  const cursorPath = emitCursorRule();
  const hermesPath = emitHermesMemory();
  const agentsMdPath = emitAgentsMdSection();
  emitSpinner.succeed('Emitted unified context files.');

  // Auto-configure MCP in ~/.claude.json if exists
  configureClaudeCodeMcp();
  configureCursorMcp();

  const totalStored = getAllFacts().length;
  console.log(chalk.bold.green(`\n✨ Initialization complete!`));
  console.log(chalk.white(`   Database: ~/.memcon/store.db (${totalStored} facts stored)`));
  console.log(chalk.white(`   Universal Context: ${universalPath}`));
  if (cursorPath) console.log(chalk.white(`   Cursor Rules: ${cursorPath}`));
  if (hermesPath) console.log(chalk.white(`   Hermes Memory: ${hermesPath}`));

  console.log(chalk.cyan('\nNext steps:'));
  console.log(`  - Run ${chalk.bold('memcon serve')} to start the MCP server & live watcher daemon`);
  console.log(`  - Run ${chalk.bold('memcon sync')} for one-shot manual synchronization`);
  console.log(`  - Run ${chalk.bold('memcon status')} to view memory dashboard\n`);
}

function configureClaudeCodeMcp() {
  const claudeJsonPath = path.join(os.homedir(), '.claude.json');
  try {
    let config: any = {};
    if (fs.existsSync(claudeJsonPath)) {
      config = JSON.parse(fs.readFileSync(claudeJsonPath, 'utf-8'));
    }

    if (!config.mcpServers) config.mcpServers = {};
    if (!config.mcpServers.memcon) {
      config.mcpServers.memcon = {
        command: 'npx',
        args: ['-y', 'memcon', 'serve'],
      };
      fs.writeFileSync(claudeJsonPath, JSON.stringify(config, null, 2), 'utf-8');
      console.log(chalk.dim(`  → Added memcon MCP server to ~/.claude.json`));
    }
  } catch {
    // Ignore config write failure
  }
}

function configureCursorMcp() {
  const cursorMcpPath = path.join(process.cwd(), '.cursor', 'mcp.json');
  try {
    const dir = path.dirname(cursorMcpPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    let config: any = {};
    if (fs.existsSync(cursorMcpPath)) {
      config = JSON.parse(fs.readFileSync(cursorMcpPath, 'utf-8'));
    }

    if (!config.mcpServers) config.mcpServers = {};
    if (!config.mcpServers.memcon) {
      config.mcpServers.memcon = {
        command: 'npx',
        args: ['-y', 'memcon', 'serve'],
      };
      fs.writeFileSync(cursorMcpPath, JSON.stringify(config, null, 2), 'utf-8');
      console.log(chalk.dim(`  → Added memcon MCP server to .cursor/mcp.json`));
    }
  } catch {
    // Ignore config write failure
  }
}
