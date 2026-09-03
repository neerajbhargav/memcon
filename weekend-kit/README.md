# Weekend kit: one memory for every AI agent, no code required

The file-only version of a shared memory layer for Claude Code, Codex, Cursor and Hermes.
Everything here is plain markdown plus one 30-line Python hook. Copy, rename, done.

## The shape

```
~/brain/
  memory/                 # Layer 0: one fact per file + MEMORY.md (one line per file)
  vault/                  # Layer 1: open this folder in Obsidian
    Home.md
    Decisions-Log.md      # numbered, dated, attributed rulings. Grep it before calling anything "open".
    CURRENT-STATE.md      # 10-second read: what's live now, one lane per agent
    SESSIONS-HANDOFF.md   # append-only, newest on top
    Memory-Sources.md     # one row per memory file -> which vault page covers it
    Daily Notes/          # history. Never rewritten.
    Systems/
```

## Steps

1. `mkdir -p ~/brain/memory ~/brain/vault/"Daily Notes" ~/brain/vault/Systems`
2. Copy `templates/*.md` into `~/brain/vault/` (and `templates/memory-file.md` as a model for `~/brain/memory/`).
3. Copy `templates/AGENTS.md` to the root of the folder that holds your repos. Then, there and in every repo:
   `ln -sf AGENTS.md CLAUDE.md` and commit the symlink.
4. Cursor: copy `templates/brain.mdc` to `~/.cursor/rules/brain.mdc`. Codex reads `AGENTS.md` by itself.
   Hermes: put the hard rules into `MEMORY.md` via its memory tool; put the read-first order into a `start-here` skill.
5. Index (needs bun): `bun install -g gbrain && gbrain init --pglite && gbrain import ~/brain/vault --no-embed && gbrain import ~/brain/memory --no-embed && gbrain extract links --dir ~/brain/vault`
6. Hook: copy `hooks/brain-context.py` to `~/.claude/hooks/` and merge `hooks/settings.snippet.json` into `~/.claude/settings.json`.
7. End of every day, in this order: **sync** (memory files + index) → **ingest** (vault pages in place, today's daily note, decisions, re-index, commit) → **report** (if you have a stakeholder).

## Rules

- One fact, one home. Update the owning layer; never write the same fact into two by hand.
- Measurement beats text. Every stated state carries the command that produces it.
- A superseded decision gets a `> ⛔ Superseded by Decision N` line under its heading and may not be cited as live.
- Search with two or three nouns, never a sentence.
- Never hand-edit generated files.
- Routers point; they don't contain.
- Hooks always exit 0.
- Daily notes are append-only. Corrections are dated lines in today's note.
- The agent never types a credential.
- Anything done three times becomes a skill.
