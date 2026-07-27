<<<<<<< HEAD
# memcon
=======
# memcon 🧠

**One memory. Every agent.**

`memcon` is an open-source CLI and Model Context Protocol (MCP) server that provides a universal, bidirectional shared memory and context transfer layer across AI coding assistants (**Claude Code**, **Hermes**, **Cursor**, **Codex**, **Google Antigravity**, **Windsurf**, **GitHub Copilot**, **Cline**, and more).

---

## Key Features

- 🔍 **Agent Auto-Discovery**: Automatically detects AI coding agents installed on your machine and locates their config and memory stores.
- ⚡ **Dual Architecture (MCP + Files)**: Native MCP server for agents supporting MCP (Claude Code, Cursor, Antigravity, Hermes, Codex) + File Emitters for tools/environments requiring plain files (`AGENTS.md`, `.cursor/rules/*.mdc`, `~/.memcon/CONTEXT.md`, `MEMORY.md`).
- 🔄 **Bidirectional Sync**: Reads memories from agent stores, normalizes and deduplicates them in a fast local SQLite database, and emits unified context back to all agents.
- 📦 **Task Handoff Packages**: Hand off an active task/investigation from one agent to another (`memcon handoff`).
- 🛡️ **Conflict & Divergence Detection**: Flags when different agents have conflicting beliefs or status updates.

---

## Quick Start

### Installation

```bash
# Run directly without installation
npx memcon init
```

Or install globally:

```bash
npm install -g memcon
```

---

## CLI Commands

### 1. Initialize
Auto-discovers installed agents, imports existing memories, sets up `store.db`, and configures MCP in client configs.

```bash
memcon init
```

### 2. Synchronize
Performs a one-shot bidirectional context ingestion and emission across all agents.

```bash
memcon sync
```

### 3. Serve (MCP Server & File Watcher Daemon)
Launches the MCP server (stdio transport) and continuous file watcher daemon.

```bash
memcon serve
```

### 4. Status Dashboard
Displays stored facts by category, active agents, pending handoffs, and detected conflicts.

```bash
memcon status
```

### 5. Task Handoff
Create or claim a task handoff package between agents.

```bash
# Create handoff
memcon handoff --from claude-code --summary "Skiptracer rate limit issue" --context "Found IDI 429 response on row 45"

# List pending handoffs
memcon handoff

# Claim handoff
memcon handoff --claim hf-abc123 --as cursor
```

---

## MCP Tools Exposed

When connected as an MCP server, `memcon` exposes the following 7 tools:

1. `memcon_remember(content, category?, key?, source?, tags?)` — Store a fact, decision, rule, or session state.
2. `memcon_recall(query, category?, limit?)` — Full-text search across shared context.
3. `memcon_update(key, content, source?)` — Update an existing fact by key.
4. `memcon_forget(key)` — Delete a fact from shared context.
5. `memcon_handoff(summary, context, from_agent?, to_agent?)` — Package a task for another agent.
6. `memcon_claim_handoff(handoff_id, agent_name)` — Claim a pending task handoff.
7. `memcon_status()` — Get overall memory summary, agent statuses, and conflicts.

---

## Supported Agents & Integration Matrix

| Agent | Architecture | Primary Storage / Output | MCP Support | File Fallback |
|---|---|---|---|---|
| **Claude Code** | Hybrid | `~/.claude/projects/*/memory/` | ✅ Yes | ✅ `memcon_context.md` |
| **Hermes** | Hybrid | `~/.hermes/memories/MEMORY.md` | ✅ Yes | ✅ `MEMORY.md` |
| **Cursor** | Hybrid | `.cursor/rules/*.mdc` | ✅ Yes | ✅ `memcon-context.mdc` |
| **Codex** | Hybrid | `AGENTS.md` | ✅ Yes | ✅ `AGENTS.md` section |
| **Antigravity** | MCP | `~/.gemini/` | ✅ Yes | ✅ `CONTEXT.md` |
| **Windsurf** | Hybrid | `.windsurfrules` | ✅ Yes | ✅ `.windsurfrules` |
| **Copilot** | File-based | `.github/copilot-instructions.md` | ⚪ N/A | ✅ `copilot-instructions.md` |

---

## License

MIT © Neeraj Bhargav Rondla
>>>>>>> 8121ce5 (feat: initial release of memcon - universal cross-agent context transfer & shared memory layer)
