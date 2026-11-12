// usage: node deadclasses.mjs <repo> <out.json>
import fs from "fs"; import path from "path"; import { createRequire } from "module"; import { execSync } from "child_process";
const repo = process.argv[2]; const require = createRequire(repo + "/package.json"); const postcss = require("postcss");
const list = (ext) => execSync(`grep -rlE '.' src index.html --include='*.${ext}'`, { cwd: repo, maxBuffer: 1e8 }).toString().trim().split("\n");
const srcFiles = [...list("ts"), ...list("tsx"), "index.html"].filter(f => !f.includes("/tests/"));
const text = srcFiles.map(f => fs.readFileSync(path.join(repo, f), "utf8")).join("\n");
const referenced = (cls) => text.includes(cls) || (cls.includes("-") && text.includes(cls.slice(0, cls.lastIndexOf("-") + 1) + "${")) ;
const stripGroups = (sel) => { let out = "", depth = 0, skip = false;
  for (let i = 0; i < sel.length; i++) { const rest = sel.slice(i);
    if (!skip && /^:(not|is|where|has|matches)\(/.test(rest)) { skip = true; depth = 0; i += rest.indexOf("(") - 1; continue; }
    if (skip) { const c = sel[i]; if (c === "(") depth++; if (c === ")") { depth--; if (depth <= 0) skip = false; } continue; }
    out += sel[i]; }
  return out.replace(/\[[^\]]*\]/g, ""); };
const files = execSync(`grep -rl '.' src --include='*.css'`, { cwd: repo }).toString().trim().split("\n");
const cache = new Map(); const dead = {}; const PRUNE = process.env.PRUNE === "1"; const removed = {};
const FULL = /(design-system\/premium\.css|design-system\/premium-workspace\.css|shell\/premium-sidebar\.css|finances\/finances-premium\.css)$/;
const SCOPED = /(premium-analytics|focus-trend-chart|dashboard-watch|widget-units|patient-reminders|prescription-safety|prescription-templates|care-page)\.css$/;
for (const f of files) {
  const root = postcss.parse(fs.readFileSync(path.join(repo, f), "utf8"));
  root.walkRules(rule => {
    if (rule.parent?.type === "atrule" && /keyframes$/.test(rule.parent.name)) return;
    const sels = rule.selectors; const allDead = [];
    for (const sel of sels) {
      const req = [...stripGroups(sel).matchAll(/\.((?:\\.|[-\w])+)/g)].map(m => m[1].replace(/\\(.)/g, "$1"));
      const bad = req.filter(c => { if (!cache.has(c)) cache.set(c, referenced(c)); return !cache.get(c); });
      if (bad.length) allDead.push({ sel: sel.replace(/\s+/g, " ").trim(), bad });
    }
    if (allDead.length === sels.length) {
      (dead[f] ??= []).push({ line: rule.source.start.line, selectors: allDead });
      if (PRUNE && (FULL.test(f) || (SCOPED.test(f) && sels.every(x => /\[data-skin="clean"\]/.test(x))))) { (removed[f] ??= []).push({ line: rule.source.start.line, selectors: allDead.map(x => x.sel), dead: [...new Set(allDead.flatMap(x => x.bad))] }); rule.remove(); }
    }
  });
  if (PRUNE && removed[f]) { let changed = true; while (changed) { changed = false; root.walkAtRules(a => { if (a.nodes && a.nodes.length === 0 && /^(media|supports|layer|container)$/.test(a.name)) { a.remove(); changed = true; } }); } fs.writeFileSync(path.join(repo, f), root.toString()); }
}
fs.writeFileSync(process.argv[3], JSON.stringify(PRUNE ? removed : dead, null, 1));
for (const [f, r] of Object.entries(dead)) console.log(f, r.length, "dead rules;", "classes:", [...new Set(r.flatMap(x => x.selectors.flatMap(s => s.bad)))].slice(0, 12).join(" "));
