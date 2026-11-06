// Removes CSS that can no longer match once the decorative settings are fixed.
import fs from "node:fs";
import postcss from "/Users/zohir/Documents/08 - Projets numériques/Projects 2026/BAITARI 5/bAItari/node_modules/postcss/lib/postcss.js";
const GUARD = ':where(:not([data-sidebar-tone="light"]))';
const DEAD = [
  /\[data-sidebar-tone/,
  /data-variant="?(glass|minimal|inset|floating)"?\]/,
  /data-header-pattern="(aurora|tide|spectrum|topography|quiet)"/,
  /data-density="(compact|spacious)"/,
  /data-chrome-style="classic"/,
  /header-pattern|pattern-(aurora|tide|spectrum|topography|quiet)/,
];
const report = {};
for (const file of process.argv.slice(2)) {
  const src = fs.readFileSync(file, "utf8");
  const root = postcss.parse(src);
  let dropped = 0, simplified = 0;
  root.walkRules((rule) => {
    if (rule.parent?.type === "atrule" && /keyframes/.test(rule.parent.name)) return;
    const out = [];
    for (let s of rule.selectors) {
      if (s.includes(GUARD)) { s = s.split(GUARD).join(""); simplified++; }
      if (DEAD.some((re) => re.test(s))) { dropped++; continue; }
      out.push(s);
    }
    if (!out.length) rule.remove();
    else if (out.join() !== rule.selectors.join()) rule.selectors = out;
  });
  root.walkAtRules((at) => { if (at.nodes && at.nodes.length === 0 && at.name !== "layer") at.remove(); });
  fs.writeFileSync(file, root.toString());
  report[file] = { simplified, dropped };
}
console.log(JSON.stringify(report, null, 1));
