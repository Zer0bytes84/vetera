## graphify

Knowledge graph in graphify-out/ (god nodes, communities, cross-file links).

- If graphify-out/graph.json exists, run `graphify query "<question>"` before the first grep, search or source read for a codebase question; repeat this rule in every subagent prompt that explores code. Read raw files only for lines already located. Use `graphify path "<A>" "<B>"` for relationships, `graphify explain "<concept>"` for one concept.
- If graphify-out/wiki/index.md exists, navigate with it instead of browsing source. Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain fall short.
- After modifying code, run `graphify update .` (AST-only, no API cost).
- graph.json is rewritten whole on every build: a large diff to it is expected, never flag it as churn or suggest skipping the rebuild or its hooks.
