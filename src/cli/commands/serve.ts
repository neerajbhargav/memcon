import chalk from 'chalk';
import { startMcpServer } from '../../mcp/server.js';
import { startHttpServer } from '../../server/http.js';
import { startWatcher } from '../../watcher/index.js';

export async function runServeCommand(options?: { port?: number }) {
  const httpPort = options?.port || 13370;

  // 1. Start file watcher
  startWatcher(process.cwd());

  // 2. Start HTTP REST + SSE Server for GUI tools, extensions & tray apps
  startHttpServer(httpPort);

  // 3. Start MCP server over stdio
  startMcpServer();
}
