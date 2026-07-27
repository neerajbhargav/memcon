import fs from 'fs';
import path from 'path';
import os from 'os';
import { MemconConfig } from '../types.js';

const MEMCON_DIR = path.join(os.homedir(), '.memcon');
const CONFIG_FILE = path.join(MEMCON_DIR, 'config.json');
const DEFAULT_STORE_FILE = path.join(MEMCON_DIR, 'store.db');

export function getMemconDir(): string {
  if (!fs.existsSync(MEMCON_DIR)) {
    fs.mkdirSync(MEMCON_DIR, { recursive: true });
  }
  return MEMCON_DIR;
}

export function loadConfig(): MemconConfig {
  getMemconDir();
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      return {
        storePath: parsed.storePath || DEFAULT_STORE_FILE,
        autoSync: parsed.autoSync ?? true,
        syncIntervalMs: parsed.syncIntervalMs || 5000,
        mcpPort: parsed.mcpPort,
        ignorePaths: parsed.ignorePaths || ['node_modules', '.git', 'dist'],
        customWatchPaths: parsed.customWatchPaths || [],
        activeAgents: parsed.activeAgents || ['claude-code', 'hermes', 'cursor', 'codex', 'antigravity'],
      };
    } catch {
      // Fallback on corrupt file
    }
  }

  const defaultConfig: MemconConfig = {
    storePath: DEFAULT_STORE_FILE,
    autoSync: true,
    syncIntervalMs: 5000,
    ignorePaths: ['node_modules', '.git', 'dist'],
    customWatchPaths: [],
    activeAgents: ['claude-code', 'hermes', 'cursor', 'codex', 'antigravity'],
  };

  saveConfig(defaultConfig);
  return defaultConfig;
}

export function saveConfig(config: MemconConfig): void {
  getMemconDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}
