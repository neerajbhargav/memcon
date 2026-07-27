import http from 'http';
import { getAllFacts, saveFact, getFactByKey, deleteFact, searchFacts } from '../store/facts.js';
import { getPendingHandoffs, createHandoff, claimHandoff } from '../store/handoffs.js';
import { detectConflicts } from '../store/conflicts.js';
import { scanAgents } from '../discovery/scanner.js';
import { emitUniversalContextMd } from '../emitters/context-md.js';
import { FactCategory } from '../types.js';

const clients = new Set<http.ServerResponse>();

export function broadcastEvent(event: string, data: any) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    res.write(payload);
  }
}

export function startHttpServer(port: number = 13370): http.Server {
  const server = http.createServer((req, res) => {
    // Enable CORS for GUI webviews, VS Code extensions, web apps
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    // SSE Endpoint for Live GUI updates
    if (url.pathname === '/api/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });
      res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
      clients.add(res);

      req.on('close', () => {
        clients.delete(res);
      });
      return;
    }

    // JSON API routes
    if (req.method === 'GET' && url.pathname === '/api/status') {
      const facts = getAllFacts();
      const handoffs = getPendingHandoffs();
      const conflicts = detectConflicts();
      const agents = scanAgents();

      sendJson(res, 200, {
        totalFacts: facts.length,
        pendingHandoffs: handoffs.length,
        conflicts: conflicts.length,
        agents,
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/facts') {
      const category = url.searchParams.get('category') as FactCategory | undefined;
      const query = url.searchParams.get('query');
      if (query) {
        sendJson(res, 200, searchFacts(query, category || undefined));
      } else {
        sendJson(res, 200, getAllFacts(category || undefined));
      }
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/facts') {
      readJsonBody(req, (body) => {
        if (!body || !body.content) {
          sendJson(res, 400, { error: 'content is required' });
          return;
        }
        const key = body.key || `fact.${Date.now()}.${Math.random().toString(36).substring(2, 7)}`;
        const fact = saveFact({
          key,
          content: body.content,
          category: body.category || 'session-state',
          source: body.source || 'http-gui',
          tags: body.tags || [],
        });
        emitUniversalContextMd();
        broadcastEvent('fact_saved', fact);
        sendJson(res, 201, fact);
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/handoffs') {
      sendJson(res, 200, getPendingHandoffs());
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/handoffs') {
      readJsonBody(req, (body) => {
        if (!body || !body.summary || !body.context) {
          sendJson(res, 400, { error: 'summary and context are required' });
          return;
        }
        const handoff = createHandoff({
          fromAgent: body.fromAgent || 'gui-client',
          toAgent: body.toAgent || null,
          summary: body.summary,
          context: body.context,
        });
        emitUniversalContextMd();
        broadcastEvent('handoff_created', handoff);
        sendJson(res, 201, handoff);
      });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/handoffs/claim') {
      readJsonBody(req, (body) => {
        if (!body || !body.handoffId || !body.agentName) {
          sendJson(res, 400, { error: 'handoffId and agentName are required' });
          return;
        }
        const claimed = claimHandoff(body.handoffId, body.agentName);
        if (!claimed) {
          sendJson(res, 404, { error: 'Handoff not found or already claimed' });
          return;
        }
        emitUniversalContextMd();
        broadcastEvent('handoff_claimed', claimed);
        sendJson(res, 200, claimed);
      });
      return;
    }

    sendJson(res, 404, { error: 'Route not found' });
  });

  server.listen(port, '127.0.0.1', () => {
    // Listening on localhost:13370
  });

  return server;
}

function sendJson(res: http.ServerResponse, status: number, data: any) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function readJsonBody(req: http.IncomingMessage, callback: (body: any) => void) {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
  });
  req.on('end', () => {
    try {
      callback(JSON.parse(body));
    } catch {
      callback(null);
    }
  });
}
