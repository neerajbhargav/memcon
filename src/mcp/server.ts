import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { saveFact, searchFacts, getAllFacts, getFactByKey, deleteFact } from '../store/facts.js';
import { createHandoff, claimHandoff, getPendingHandoffs } from '../store/handoffs.js';
import { detectConflicts } from '../store/conflicts.js';
import { scanAgents } from '../discovery/scanner.js';
import { emitUniversalContextMd } from '../emitters/context-md.js';
import { FactCategory } from '../types.js';

export function startMcpServer() {
  const server = new Server(
    {
      name: 'memcon',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'memcon_remember',
          description: 'Store a fact, decision, rule, or session state in the shared memcon context',
          inputSchema: {
            type: 'object',
            properties: {
              content: { type: 'string', description: 'The fact or context content' },
              category: {
                type: 'string',
                enum: ['rule', 'session-state', 'decision', 'technical', 'handoff'],
                description: 'Fact category (defaults to session-state)',
              },
              key: { type: 'string', description: 'Unique key for dedup (auto-generated if omitted)' },
              source: { type: 'string', description: 'Source agent name (defaults to active agent)' },
              tags: { type: 'array', items: { type: 'string' } },
            },
            required: ['content'],
          },
        },
        {
          name: 'memcon_recall',
          description: 'Search the shared context across all agents for relevant facts, rules, or state',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search term or topic' },
              category: {
                type: 'string',
                enum: ['rule', 'session-state', 'decision', 'technical', 'handoff'],
              },
              limit: { type: 'number', default: 10 },
            },
            required: ['query'],
          },
        },
        {
          name: 'memcon_update',
          description: 'Update an existing fact by key in the shared context',
          inputSchema: {
            type: 'object',
            properties: {
              key: { type: 'string', description: 'The unique key of the fact to update' },
              content: { type: 'string', description: 'New content for the fact' },
              source: { type: 'string', description: 'Source agent making the update' },
            },
            required: ['key', 'content'],
          },
        },
        {
          name: 'memcon_forget',
          description: 'Remove a fact from the shared context',
          inputSchema: {
            type: 'object',
            properties: {
              key: { type: 'string', description: 'The unique key of the fact to remove' },
            },
            required: ['key'],
          },
        },
        {
          name: 'memcon_handoff',
          description: 'Package a task or investigation for another agent to claim',
          inputSchema: {
            type: 'object',
            properties: {
              summary: { type: 'string', description: 'Short title of what was being worked on' },
              context: { type: 'string', description: 'Detailed findings, progress, and next steps' },
              from_agent: { type: 'string', description: 'Name of the current agent' },
              to_agent: { type: 'string', description: 'Target agent (optional, "any" if open to all)' },
            },
            required: ['summary', 'context'],
          },
        },
        {
          name: 'memcon_claim_handoff',
          description: 'Claim a pending task handoff from another agent',
          inputSchema: {
            type: 'object',
            properties: {
              handoff_id: { type: 'string', description: 'ID of the handoff package to claim' },
              agent_name: { type: 'string', description: 'Name of the claiming agent' },
            },
            required: ['handoff_id', 'agent_name'],
          },
        },
        {
          name: 'memcon_status',
          description: 'Get overall status of shared context, stored facts, pending handoffs, and active agents',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      if (name === 'memcon_remember') {
        const content = String(args?.content || '');
        const category = (args?.category as FactCategory) || 'session-state';
        const key = args?.key ? String(args.key) : `fact.${Date.now()}.${Math.random().toString(36).substring(2, 7)}`;
        const source = args?.source ? String(args.source) : 'mcp-client';
        const tags = Array.isArray(args?.tags) ? args.tags.map(String) : [];

        const saved = saveFact({ key, content, category, source, tags });
        emitUniversalContextMd();

        return {
          content: [
            {
              type: 'text',
              text: `Fact saved successfully: [${saved.key}] (Category: ${saved.category}, Version: ${saved.version})`,
            },
          ],
        };
      }

      if (name === 'memcon_recall') {
        const query = String(args?.query || '');
        const category = args?.category as FactCategory | undefined;
        const limit = Number(args?.limit) || 10;

        const results = searchFacts(query, category, limit);
        emitUniversalContextMd();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      if (name === 'memcon_update') {
        const key = String(args?.key || '');
        const content = String(args?.content || '');
        const source = String(args?.source || 'mcp-client');

        const existing = getFactByKey(key);
        if (!existing) {
          return {
            content: [{ type: 'text', text: `Fact with key "${key}" not found.` }],
            isError: true,
          };
        }

        const updated = saveFact({
          key,
          content,
          category: existing.category,
          source,
          tags: existing.tags,
        });

        emitUniversalContextMd();

        return {
          content: [
            {
              type: 'text',
              text: `Fact "${key}" updated (Version: ${updated.version}).`,
            },
          ],
        };
      }

      if (name === 'memcon_forget') {
        const key = String(args?.key || '');
        const success = deleteFact(key);
        emitUniversalContextMd();

        return {
          content: [
            {
              type: 'text',
              text: success ? `Fact "${key}" deleted.` : `Fact "${key}" not found.`,
            },
          ],
        };
      }

      if (name === 'memcon_handoff') {
        const summary = String(args?.summary || '');
        const context = String(args?.context || '');
        const fromAgent = String(args?.from_agent || 'mcp-client');
        const toAgent = args?.to_agent ? String(args.to_agent) : null;

        const handoff = createHandoff({ fromAgent, toAgent, summary, context });
        emitUniversalContextMd();

        return {
          content: [
            {
              type: 'text',
              text: `Handoff package created successfully [${handoff.id}]. Pending claim.`,
            },
          ],
        };
      }

      if (name === 'memcon_claim_handoff') {
        const handoffId = String(args?.handoff_id || '');
        const agentName = String(args?.agent_name || 'mcp-client');

        const claimed = claimHandoff(handoffId, agentName);
        if (!claimed) {
          return {
            content: [{ type: 'text', text: `Handoff [${handoffId}] not found or already claimed.` }],
            isError: true,
          };
        }

        emitUniversalContextMd();

        return {
          content: [
            {
              type: 'text',
              text: `Handoff [${claimed.id}] claimed by ${agentName}.\n\nContext:\n${claimed.context}`,
            },
          ],
        };
      }

      if (name === 'memcon_status') {
        const facts = getAllFacts();
        const handoffs = getPendingHandoffs();
        const conflicts = detectConflicts();
        const agents = scanAgents();

        const summary = {
          totalFacts: facts.length,
          factsByCategory: {
            rule: facts.filter(f => f.category === 'rule').length,
            'session-state': facts.filter(f => f.category === 'session-state').length,
            decision: facts.filter(f => f.category === 'decision').length,
            technical: facts.filter(f => f.category === 'technical').length,
          },
          pendingHandoffs: handoffs.length,
          conflicts: conflicts.length,
          agents: agents.map(a => ({
            name: a.displayName,
            type: a.type,
            installed: a.installed,
          })),
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(summary, null, 2),
            },
          ],
        };
      }

      throw new Error(`Tool not found: ${name}`);
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  });

  const transport = new StdioServerTransport();
  server.connect(transport);
}
