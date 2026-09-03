#!/usr/bin/env python3
"""Claude Code UserPromptSubmit hook: inject top brain matches for the prompt's 2-3 key nouns.
Always exits 0. A retrieval hook that can block a prompt is worse than no hook."""
import json, os, re, subprocess, sys
STOP = set("""
a about above actually add after again against all also am an
and any are as ask at back bad be because been before
being below best better between both branch build built but by can
cant change changed changes check checking code commit could current currently deploy
deployed did do does doing done dont down during each else few
file files find first fix for from further get give go going
good had handle handled handling has have having he help her here
hers him his how i if in into is issue issues it
its itself just know last let lets like look make making many
may maybe me might more most much must my need needs new
next no nor not now of off old on once only or
other ought our out over own please problem problems put re really
repo review right run said same script see should show so some
start still stuff such sure take tell test testing tests than that
the their them then there these they thing things think this those
thought through to too try under until up update updated us use
using very want was way we well were what when where which
while who whom why will with without work working would wrong you
your yours
""".split())
try:
    p = json.load(sys.stdin).get("prompt", "")
except Exception:
    sys.exit(0)
cands = [w for w in re.findall(r"[a-z][a-z0-9_-]{2,}", p.lower()) if w not in STOP]
seen, terms = set(), []
for w in sorted(cands, key=len, reverse=True):   # longer tokens are usually the discriminating nouns
    if w not in seen:
        seen.add(w); terms.append(w)
    if len(terms) == 3: break
if not terms:
    sys.exit(0)
env = dict(os.environ, PATH=os.path.expanduser("~/.bun/bin") + ":" + os.environ.get("PATH", ""))
try:
    out = subprocess.run(["gbrain", "search", " ".join(terms)], capture_output=True,
                         text=True, timeout=12, env=env).stdout
except Exception:
    sys.exit(0)
if out.strip():
    print(json.dumps({"hookSpecificOutput": {
        "hookEventName": "UserPromptSubmit",
        "additionalContext": "Brain matches for %s:\n%s" % (terms, out[:4000])}}))
sys.exit(0)
