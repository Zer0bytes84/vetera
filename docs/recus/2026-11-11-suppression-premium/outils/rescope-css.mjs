// usage: node rescope.mjs <repo> <report.json>   (run with cwd = repo so postcss resolves)
import fs from "fs"; import path from "path";
import { createRequire } from "module";
const repo = process.argv[2]; const reportPath = process.argv[3];
const require = createRequire(repo + "/package.json");
const postcss = require("postcss");
const files = require("child_process").execSync(`grep -rlE 'data-visual-style|data-skin="premium"|data-clean-only' src --include='*.css'`, { cwd: repo }).toString().trim().split("\n");
const PREMIUM_ONLY = [/\[data-skin="premium"\]/, /:not\(\[data-skin="clean"\]\)/, /\[data-visual-style="classic"\]/];
const report = { files: {} };
for (const f of files) {
  const abs = path.join(repo, f); const src = fs.readFileSync(abs, "utf8");
  const root = postcss.parse(src, { from: abs });
  const info = { rescoped: 0, droppedSelectors: [], droppedRules: 0, simplifiedIs: 0 };
  const splitTop = (str) => { // [{text, sep}] keeping the separators ("," + whitespace) between top-level items
    const items = []; let depth = 0, cur = "", i = 0;
    while (i < str.length) {
      const c = str[i];
      if (c === "(" || c === "[") depth++; else if (c === ")" || c === "]") depth--;
      if (c === "," && depth === 0) { let j = i + 1; while (/\s/.test(str[j] ?? "")) j++; items.push({ text: cur, sep: str.slice(i, j) }); cur = ""; i = j; continue; }
      cur += c; i++;
    }
    items.push({ text: cur, sep: "" }); return items;
  };
  const LEAD = /^(\s*):is\(\s*\[data-visual-style="premium"\]\s*,\s*\.premium-analytics-dashboard\s*\)(\s+)(?=[^>+~\s])/;
  root.walkRules(rule => {
    if (rule.parent?.type === "atrule" && /keyframes$/.test(rule.parent.name)) return;
    const items = splitTop(rule.selector); const kept = []; let touched = false;
    for (const it of items) {
      const sel = it.text;
      if (PREMIUM_ONLY.some(re => re.test(sel))) { info.droppedSelectors.push(sel.replace(/\s+/g, " ").trim()); touched = true; continue; }
      let out = sel;
      if (/data-visual-style/.test(out)) {
        if (LEAD.test(out)) { out = out.replace(LEAD, '$1[data-skin="clean"]$2'); info.simplifiedIs++; }
        out = out.replace(/\[data-visual-style="premium"\]/g, '[data-skin="clean"]');
        info.rescoped++; touched = true;
      }
      kept.push({ text: out, sep: it.sep });
    }
    if (!touched) return;
    if (kept.length === 0) { info.droppedRules++; rule.remove(); return; }
    // rebuild with the original separators; the last kept item takes no separator
    rule.selector = kept.map((k, idx) => k.text + (idx < kept.length - 1 ? (k.sep || ", ") : "")).join("");
  });
  // empty at-rules
  let changed = true;
  while (changed) { changed = false; root.walkAtRules(a => { if (a.nodes && a.nodes.length === 0 && /^(media|supports|layer|container)$/.test(a.name)) { a.remove(); changed = true; } }); }
  fs.writeFileSync(abs, root.toString());
  report.files[f] = info;
}
fs.writeFileSync(reportPath, JSON.stringify(report, null, 1));
for (const [f, i] of Object.entries(report.files)) console.log(f, "rescoped", i.rescoped, "dropped-selectors", i.droppedSelectors.length, "dropped-rules", i.droppedRules, "is-simplified", i.simplifiedIs);
