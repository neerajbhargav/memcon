import chalk from 'chalk';
import { startMcpServer } from '../../mcp/server.js';
import { startWatcher } from '../../watcher/index.js';

export async function runServeCommand() {
  // Start file watcher
  startWatcher(process.cwd());

  // Start MCP server over stdio
  startMcpServer();
}
