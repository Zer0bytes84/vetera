// Same cleanup as cssclean.mjs, the sidebar tone kept (correction of 5 November 2026).
import fs from "node:fs";
import postcss from "/Users/zohir/Documents/08 - Projets numériques/Projects 2026/BAITARI 5/bAItari/node_modules/postcss/lib/postcss.js";
const DEAD = [
  /data-variant="?(glass|minimal|inset|floating)"?\]/,
  /data-header-pattern="(aurora|tide|spectrum|topography|quiet)"/,
  /data-density="(compact|spacious)"/,
  /data-chrome-style="classic"/,
  /header-pattern|pattern-(aurora|tide|spectrum|topography|quiet)/,
];
const report = {};
for (const file of process.argv.slice(2)) {
  const root = postcss.parse(fs.readFileSync(file, "utf8"));
  let dropped = 0;
  root.walkRules((rule) => {
    if (rule.parent?.type === "atrule" && /keyframes/.test(rule.parent.name)) return;
    const out = rule.selectors.filter((s) => { const dead = DEAD.some((re) => re.test(s)); if (dead) dropped++; return !dead; });
    if (!out.length) rule.remove(); else if (out.length !== rule.selectors.length) rule.selectors = out;
  });
  root.walkAtRules("keyframes", (a) => { if (["header-aurora-drift", "header-mesh-breathe"].includes(a.params)) a.remove(); });
  root.walkAtRules((at) => { if (at.nodes && at.nodes.length === 0 && at.name !== "layer") at.remove(); });
  fs.writeFileSync(file, root.toString());
  report[file] = dropped;
}
console.log(JSON.stringify(report));
