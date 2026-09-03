# AGENTS.md (router: points, does not contain)

Read-first order, every session:
1. ~/brain/vault/CURRENT-STATE.md
2. ~/brain/memory/MEMORY.md (open the files it points at as needed)
3. This repo's AGENTS.md (wins on engineering facts)
4. grep -i ~/brain/vault/Decisions-Log.md before calling anything "open" or owed by a human

Retrieval: export PATH="$HOME/.bun/bin:$PATH"; gbrain search "<2-3 nouns>"; gbrain get <slug>

Hard rules:
- No destructive operations on <tables/files> without explicit confirmation.
- Secrets only in gitignored .env; never print a credential; never type one into a browser.
- Diff against origin/main, never HEAD. Check git status, branches and open PRs before editing.
- A decision carrying a ⛔ Superseded line is dead; cite its successor.
- Where a decision's text and a measurement disagree, the measurement wins.
- Browser: default browser for reads; the logged-in agent browser only when explicitly asked.

Before you stop: update your lane in CURRENT-STATE.md; append an entry to SESSIONS-HANDOFF.md.
