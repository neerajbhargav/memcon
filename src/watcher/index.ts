import chokidar, { FSWatcher } from 'chokidar';
import path from 'path';
import os from 'os';
import { parseClaudeCodeMemories } from '../parsers/claude-code.js';
import { parseHermesMemories } from '../parsers/hermes.js';
import { parseCursorRules } from '../parsers/cursor.js';
import { parseAgentsMd } from '../parsers/agents-md.js';
import { saveFact } from '../store/facts.js';
import { emitUniversalContextMd } from '../emitters/context-md.js';
import { emitCursorRule } from '../emitters/cursor.js';
import { emitHermesMemory } from '../emitters/hermes.js';
import { emitAgentsMdSection } from '../emitters/agents-md.js';

export function startWatcher(projectRoot: string = process.cwd()): FSWatcher {
  const homeDir = os.homedir();

  const watchPaths = [
    path.join(homeDir, '.claude', 'projects'),
    path.join(homeDir, '.hermes', 'memories'),
    path.join(projectRoot, '.cursor', 'rules'),
    path.join(projectRoot, 'AGENTS.md'),
    path.join(homeDir, 'AGENTS.md'),
  ];

  const watcher = chokidar.watch(watchPaths, {
    ignoreInitial: false,
    ignored: /(^|[\/\\])\..*|(node_modules|dist)/,
    persistent: true,
    depth: 4,
  });

  const runSync = () => {
    // 1. Ingest
    const claudeFacts = parseClaudeCodeMemories();
    const hermesFacts = parseHermesMemories();
    const cursorFacts = parseCursorRules(path.join(projectRoot, '.cursor', 'rules'));
    const agentsMdFacts = parseAgentsMd(path.join(projectRoot, 'AGENTS.md'));

    const allIngested = [...claudeFacts, ...hermesFacts, ...cursorFacts, ...agentsMdFacts];
    for (const item of allIngested) {
      saveFact(item);
    }

    // 2. Emit
    emitUniversalContextMd();
    emitCursorRule(projectRoot);
    emitHermesMemory();
    emitAgentsMdSection(path.join(projectRoot, 'AGENTS.md'));
  };

  watcher.on('change', (filePath) => {
    // Debounce/sync on change
    runSync();
  });

  watcher.on('add', (filePath) => {
    runSync();
  });

  // Initial sync
  runSync();

  return watcher;
}
