# AGENTS.md — router. Points at knowledge; does not contain it.

# Read first
- read ~/brain/CURRENT.md
- search ~/brain/DECISIONS.md before calling anything open or owed by a human
- load only the relevant files from ~/brain/memory/ and ~/brain/playbooks/
- this repo's own notes win on engineering facts

# Retrieval
- rg -n -i "<two or three nouns>" ~/brain
- optional: gbrain search "<two or three nouns>"   (PATH needs ~/.bun/bin)

# Before stopping
- update ~/brain/CURRENT.md if live state changed (refresh checked_at)
- append a three-line entry to ~/brain/HANDOFF.md
- record a decision in ~/brain/DECISIONS.md only when a decision was actually made

# Safety
- never store secrets, credentials, cookies, or private records in the brain
- never print or type a credential
- reverify volatile state instead of repeating an old measurement
- no destructive operations without explicit confirmation
