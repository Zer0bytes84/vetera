#!/usr/bin/env python3
import json, os, sys
try:
    data = json.load(sys.stdin)
except Exception:
    sys.exit(0)
ti = data.get("tool_input") or {}
path = ti.get("file_path") or ti.get("path") or ""
reason = None
if path:
    norm = path.replace("\\", "/") + "/"
    for seg in ("/node_modules/", "/dist/", "/target/", "/.git/"):
        if seg in norm:
            reason = "Lecture bloquee (economie de jetons): dossier lourd ou genere: " + path
            break
    if reason is None and os.path.isfile(path) and os.path.getsize(path) > 300000:
        reason = "Fichier volumineux (" + str(os.path.getsize(path) // 1024) + " Ko): lecture complete bloquee, utiliser offset/limit."
if reason:
    print(json.dumps({"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny", "permissionDecisionReason": reason}}))
sys.exit(0)
