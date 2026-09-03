# memcon

**One memory. Every agent.**

`memcon` is an MIT-licensed CLI and MCP server that gives AI coding agents on one machine a shared context layer. It discovers the agents you have installed (Claude Code, Hermes, Cursor, Codex, Antigravity, Windsurf, Copilot), reads their memory and rule files, normalizes what it finds into a local SQLite store, and emits a unified context block back into each agent's native surface, in that agent's dialect.

It is a working v1 with known sharp edges. Read [Status](#status) before you run it against files you care about.

---

## Status

- **Not on npm yet.** `npx memcon` does not work. Install from source (below).
- **v1 is bidirectional and daemon-based.** That design caused three real incidents on the author's machine (self-ingestion loop, a truncated `AGENTS.md`, and an 805 KB always-loaded context file). The current `main` carries the self-emission guards that stop the loop; the daemon still exists.
- **v2 is being redesigned as emitter-only, budgeted, and daemon-free.** The spec is [issue #1](https://github.com/neerajbhargav/memcon/issues/1). Contributions welcome there.
- **The lazy, file-only version of the same idea needs no code at all.** See [`weekend-kit/`](./weekend-kit/) for the templates: a router, a decisions register, a live-state file, a handoff log, and a retrieval hook. Most people should start there.

---

## What it does

- **Agent auto-discovery**: finds installed agents and their config and memory stores.
- **Dual architecture (MCP + files)**: an MCP server for agents that speak MCP, plus file emitters for surfaces that only read plain files (`AGENTS.md`, `.cursor/rules/*.mdc`, `~/.hermes/memories/MEMCON-CONTEXT.md`, `~/.memcon/CONTEXT.md`).
- **Sync**: reads agent memories, dedupes into `~/.memcon/store.db`, emits unified context back out.
- **Handoff packages**: hand an in-flight task from one agent to another (`memcon handoff`).
- **Conflict detection**: flags when two agents hold contradicting facts.
- **Self-emission guards** (`src/util/self.ts`): parsers strip memcon's own emitted blocks before ingesting; the watcher ignores memcon's own writes. This is what stops the file-doubling loop.

## Install (from source)

```bash
git clone https://github.com/neerajbhargav/memcon.git
cd memcon
npm install
npm run build
npm link            # puts `memcon` on your PATH
memcon --help
```

Requires Node 20+.

## Commands

```bash
memcon init      # discover agents, import existing memories, set up store.db, configure MCP clients
memcon sync      # one-shot bidirectional sync
memcon serve     # MCP server (stdio) + file watcher daemon
memcon status    # facts by category, active agents, pending handoffs, conflicts
memcon handoff --from claude-code --summary "..." --context "..."
memcon handoff                       # list pending
memcon handoff --claim <id> --as cursor
memcon resolve   # walk detected conflicts
memcon export / memcon import        # portable JSON
```

## MCP tools

`memcon_remember`, `memcon_recall`, `memcon_update`, `memcon_forget`, `memcon_handoff`, `memcon_claim_handoff`, `memcon_status`.

## Supported agents

| Agent | Storage it reads | Emits to |
|---|---|---|
| Claude Code | `~/.claude/projects/*/memory/` | `~/.memcon/CONTEXT.md` |
| Hermes | `~/.hermes/memories/MEMORY.md` | `~/.hermes/memories/MEMCON-CONTEXT.md` (never overwrites `MEMORY.md`) |
| Cursor | `.cursor/rules/*.mdc` | `.cursor/rules/memcon-context.mdc` |
| Codex | `AGENTS.md` | a fenced `memcon:session-state` block in `AGENTS.md` |
| Antigravity | `~/.gemini/` | `CONTEXT.md` |
| Windsurf | `.windsurfrules` | `.windsurfrules` |
| Copilot | `.github/copilot-instructions.md` | same file |

## Two warnings

1. **The `AGENTS.md` fence.** memcon owns everything between its start and end HTML-comment markers. If you type the literal start-marker text anywhere *above* the fence (for example while documenting it), the next sync will treat everything after your copy as its own and overwrite it. Refer to the markers descriptively, never verbatim. Keep `AGENTS.md` under version control.
2. **The daemon is greedy.** `memcon serve` watches your memory directories. Run it only if you understand what it will emit and where. Prefer `memcon sync` from a script you control.

## Why this exists

Written up here: *The laziest way to never re-explain your work to an AI again* (link in the repo description once published). Short version: four agents on one machine kept re-asking questions that had been answered and recorded. Recording was never the problem. The read path was.

## License

MIT © Neeraj Bhargav Rondla
