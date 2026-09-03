import chokidar, { FSWatcher } from 'chokidar';
import fs from 'fs';
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
import { selfEmittedPaths } from '../util/self.js';

/** Trailing debounce: a burst of file events collapses into one sync. */
const SYNC_DEBOUNCE_MS = 1500;

/** After an emit, ignore events on files memcon writes so its own writes can't retrigger a sync. */
const SELF_WRITE_QUIET_MS = 2500;

/** Non-memory files that live in the watched trees (transcripts, locks, sqlite). */
const NOISE = /\.(jsonl|log|lock|db|db-wal|db-shm|sqlite|bak|tmp)$/i;

export function startWatcher(projectRoot: string = process.cwd()): FSWatcher {
  const homeDir = os.homedir();

  const watchPaths = [
    path.join(homeDir, '.claude', 'projects'),
    path.join(homeDir, '.hermes', 'memories'),
    path.join(projectRoot, '.cursor', 'rules'),
    path.join(projectRoot, 'AGENTS.md'),
    path.join(homeDir, 'AGENTS.md'),
  ];

  // Pure outputs: never read back, never a sync trigger.
  const selfPaths = new Set(selfEmittedPaths(projectRoot));

  // AGENTS.md is hand-maintained but carries a memcon-managed block, so it is both a
  // source and a target. Keep it as a source, but ignore the events our own write causes.
  const selfWritten = new Set([
    ...selfPaths,
    path.resolve(projectRoot, 'AGENTS.md'),
    path.resolve(homeDir, 'AGENTS.md'),
  ]);

  const watcher = chokidar.watch(watchPaths, {
    ignoreInitial: true,
    ignored: (p: string, stats?: fs.Stats) => {
      const base = path.basename(p);
      if (base === 'node_modules' || base === 'dist' || base === '.git' || base === '.DS_Store') return true;
      if (NOISE.test(base)) return true;
      if (selfPaths.has(path.resolve(p))) return true;
      // Only markdown carries memory. Directories fall through so dot-dirs
      // (~/.claude, ~/.hermes, .cursor) are still traversed.
      if (stats?.isFile() && !/\.(md|mdc)$/i.test(base)) return true;
      return false;
    },
    persistent: true,
    depth: 4,
  });

  let lastEmitAt = 0;
  let timer: NodeJS.Timeout | null = null;

  const runSync = () => {
    timer = null;

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

    lastEmitAt = Date.now();
  };

  const scheduleSync = (filePath: string) => {
    const resolved = path.resolve(filePath);
    if (selfPaths.has(resolved)) return;
    if (selfWritten.has(resolved) && Date.now() - lastEmitAt < SELF_WRITE_QUIET_MS) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(runSync, SYNC_DEBOUNCE_MS);
  };

  watcher.on('change', scheduleSync);
  watcher.on('add', scheduleSync);

  // Initial sync
  runSync();

  return watcher;
}
