import fs from 'fs';
import path from 'path';
import os from 'os';
import { AgentInfo } from '../types.js';
import { getDatabase } from '../store/database.js';

export function scanAgents(projectRoot: string = process.cwd()): AgentInfo[] {
  const homeDir = os.homedir();

  const agents: AgentInfo[] = [
    // 1. Claude Code
    {
      id: 'claude-code',
      name: 'claude-code',
      displayName: 'Claude Code',
      type: 'hybrid',
      installed: fs.existsSync(path.join(homeDir, '.claude')),
      configPath: path.join(homeDir, '.claude.json'),
      memoryPath: path.join(homeDir, '.claude', 'projects'),
      status: 'active',
      mcpSupported: true,
      fileSyncSupported: true,
    },
    // 2. Hermes
    {
      id: 'hermes',
      name: 'hermes',
      displayName: 'Hermes',
      type: 'hybrid',
      installed: fs.existsSync(path.join(homeDir, '.hermes')),
      configPath: path.join(homeDir, '.hermes', 'config.yaml'),
      memoryPath: path.join(homeDir, '.hermes', 'memories'),
      status: 'active',
      mcpSupported: true,
      fileSyncSupported: true,
    },
    // 3. Cursor
    {
      id: 'cursor',
      name: 'cursor',
      displayName: 'Cursor',
      type: 'hybrid',
      installed: fs.existsSync(path.join(projectRoot, '.cursor')) || fs.existsSync(path.join(homeDir, '.cursor')),
      configPath: path.join(projectRoot, '.cursor', 'mcp.json'),
      memoryPath: path.join(projectRoot, '.cursor', 'rules'),
      status: 'active',
      mcpSupported: true,
      fileSyncSupported: true,
    },
    // 4. Codex
    {
      id: 'codex',
      name: 'codex',
      displayName: 'Codex',
      type: 'hybrid',
      installed: fs.existsSync(path.join(projectRoot, 'AGENTS.md')) || fs.existsSync(path.join(homeDir, 'AGENTS.md')),
      configPath: path.join(projectRoot, 'AGENTS.md'),
      memoryPath: path.join(projectRoot, 'AGENTS.md'),
      status: 'active',
      mcpSupported: true,
      fileSyncSupported: true,
    },
    // 5. Antigravity (Gemini)
    {
      id: 'antigravity',
      name: 'antigravity',
      displayName: 'Google Antigravity',
      type: 'mcp',
      installed: fs.existsSync(path.join(homeDir, '.gemini')),
      configPath: path.join(homeDir, '.gemini', 'config'),
      memoryPath: path.join(homeDir, '.gemini', 'antigravity', 'knowledge'),
      status: 'active',
      mcpSupported: true,
      fileSyncSupported: true,
    },
    // 6. Windsurf
    {
      id: 'windsurf',
      name: 'windsurf',
      displayName: 'Windsurf',
      type: 'hybrid',
      installed: fs.existsSync(path.join(homeDir, '.codeium', 'windsurf')),
      configPath: path.join(homeDir, '.codeium', 'windsurf', 'mcp_config.json'),
      memoryPath: path.join(projectRoot, '.windsurfrules'),
      status: 'active',
      mcpSupported: true,
      fileSyncSupported: true,
    },
    // 7. Copilot
    {
      id: 'copilot',
      name: 'copilot',
      displayName: 'GitHub Copilot',
      type: 'file-based',
      installed: fs.existsSync(path.join(projectRoot, '.github', 'copilot-instructions.md')),
      configPath: path.join(projectRoot, '.github', 'copilot-instructions.md'),
      memoryPath: path.join(projectRoot, '.github', 'copilot-instructions.md'),
      status: 'active',
      mcpSupported: false,
      fileSyncSupported: true,
    },
    // 8. Cline
    {
      id: 'cline',
      name: 'cline',
      displayName: 'Cline',
      type: 'mcp',
      installed: fs.existsSync(path.join(homeDir, '.cline')),
      configPath: path.join(homeDir, '.cline', 'mcp.json'),
      status: 'active',
      mcpSupported: true,
      fileSyncSupported: true,
    },
  ];

  // Save/update agents table in database
  const db = getDatabase();
  for (const agent of agents) {
    db.prepare(`
      INSERT INTO agents (id, name, display_name, type, installed, config_path, memory_path, status, mcp_supported, file_sync_supported)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(name) DO UPDATE SET
        installed = excluded.installed,
        config_path = excluded.config_path,
        memory_path = excluded.memory_path,
        status = excluded.status,
        mcp_supported = excluded.mcp_supported,
        file_sync_supported = excluded.file_sync_supported
    `).run(
      agent.id,
      agent.name,
      agent.displayName,
      agent.type,
      agent.installed ? 1 : 0,
      agent.configPath || null,
      agent.memoryPath || null,
      agent.status,
      agent.mcpSupported ? 1 : 0,
      agent.fileSyncSupported ? 1 : 0
    );
  }

  return agents;
}
