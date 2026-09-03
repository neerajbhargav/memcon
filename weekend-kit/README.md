# Weekend kit: one memory for every AI agent

The file-only version of a shared memory layer for Claude Code, Codex, Cursor, and Hermes.
Six Markdown files, one search command, and an optional 48-line retrieval hook. No daemon, no database, no API key.

## The shape

```text
~/brain/
  AGENTS.md          # router: what to read, in what order, and the safety rules
  CURRENT.md         # volatile state; every claim carries checked_at + a verify command
  DECISIONS.md       # numbered rulings with rationale and what they supersede
  HANDOFF.md         # append-only, newest on top; three lines per session
  memory/            # durable facts, one topic per file, with provenance
  playbooks/         # repeatable procedures with prerequisites and verification
  recall-tests.md    # known questions -> the file that must answer them
```

## Install (10 minutes)

```bash
mkdir -p ~/brain/{memory,playbooks}
cp templates/AGENTS.md templates/CURRENT.md templates/DECISIONS.md templates/HANDOFF.md templates/recall-tests.md ~/brain/
cp templates/memory-topic.md ~/brain/memory/EXAMPLE.md
cp templates/playbook.md    ~/brain/playbooks/EXAMPLE.md
```

Then point each harness at the router:

- **Codex, Cursor, Hermes** read `AGENTS.md` natively. Copy `templates/AGENTS.md` into each repo you work in (or keep one at the root of the folder that holds your repos) and edit the paths.
- **Claude Code** reads `CLAUDE.md`. In each repo: `ln -s AGENTS.md CLAUDE.md` and commit the symlink.
- **Cursor-only behavior** (optional) goes in `.cursor/rules/*.mdc`; `AGENTS.md` alone is enough for most projects.

Search before you install anything else:

```bash
rg -n -i "webhook|retry" ~/brain
```

## Optional: index + prompt-time retrieval

When keyword search starts missing aliases and related concepts, add [gbrain](https://github.com/garrytan/gbrain). Commands from its [install guide](https://github.com/garrytan/gbrain/blob/master/docs/INSTALL.md):

```bash
bun install -g github:garrytan/gbrain#latest-stable
gbrain init --pglite
gbrain import ~/brain --no-embed
gbrain search "webhook retry"          # two or three nouns, never a sentence
```

Re-run `gbrain import ~/brain --no-embed` after you edit the brain.

For Claude Code only, `hooks/brain-context.py` runs on every prompt, extracts two or three discriminating terms, calls `gbrain search`, and injects a bounded block of matches. It has a 12-second timeout and always exits 0.

```bash
cp hooks/brain-context.py ~/.claude/hooks/
# merge hooks/settings.snippet.json into ~/.claude/settings.json
```

The other harnesses do not get automatic retrieval from this kit; they follow the router's instruction to search. That is deliberate. Add automation per harness only after manual search has proved worth automating.

## The habit that makes it work

Before every session ends:

1. Update `CURRENT.md` if live state changed (and update `checked_at`).
2. Append a three-line entry to `HANDOFF.md`.
3. Record a decision in `DECISIONS.md` only if a decision was actually made. Mark what it supersedes.
4. If you changed the router, index, or hook: run the questions in `recall-tests.md` and confirm search returns the named file.

## Rules

- One fact, one home. Update the owning file; never write the same fact into two by hand.
- Measurement beats text. Every stated state carries the command that produces it.
- A superseded decision gets a `> Superseded by Decision N` line under its heading and may not be cited as live.
- Routers point; they do not contain. If `AGENTS.md` grows past a screen, move the content into `memory/` or `playbooks/` and link it.
- Never store secrets, credentials, cookies, private records, or raw chat dumps in the brain.
- Hooks always exit 0. A retrieval hook that can block a prompt is worse than no hook.
- `HANDOFF.md` is append-only. Corrections are new dated lines, not edits.
- Anything done three times becomes a playbook.
