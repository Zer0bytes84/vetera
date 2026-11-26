// Preuve du tri des proprietes CSS : dans chaque regle, memes declarations, et toute paire de declarations qui peuvent
// se recouvrir (meme propriete, raccourci et detail, meme famille) garde son ordre relatif. Usage : node css-ordre.mjs
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import postcss from "/home/parallels/work/baitari/node_modules/postcss/lib/postcss.js";
const files = execFileSync("git", ["diff", "--name-only", "HEAD"], { encoding: "utf8" }).split("\n").filter((f) => f.endsWith(".css"));
const GROUPS = [["inset", "top", "right", "bottom", "left"], ["gap", "row-gap", "column-gap", "grid-gap"], ["place-items", "place-content", "place-self", "align-items", "align-content", "align-self", "justify-items", "justify-content", "justify-self"]];
const family = (p) => {
  const prop = p.replace(/^-(webkit|moz|ms|o)-/, "");
  if (prop.startsWith("--")) return prop;
  for (const g of GROUPS) if (g.some((x) => prop === x || prop.startsWith(`${x}-`))) return g[0];
  return prop.split("-")[0];
};
const rules = (css, file) => {
  const out = [];
  postcss.parse(css, { from: file }).walkRules((rule) => {
    let ctx = rule.selector; let p = rule.parent;
    while (p && p.type !== "root") { ctx = `${p.type === "atrule" ? `@${p.name} ${p.params}` : p.selector} > ${ctx}`; p = p.parent; }
    out.push({ ctx, decls: rule.nodes.filter((n) => n.type === "decl").map((d) => `${d.prop}:${d.value}${d.important ? "!" : ""}`) });
  });
  return out;
};
let ok = 0; const bad = [];
for (const f of files) {
  const a = rules(execFileSync("git", ["show", `HEAD:${f}`], { encoding: "utf8", maxBuffer: 1 << 26 }), f);
  const b = rules(readFileSync(f, "utf8"), f);
  let fine = a.length === b.length;
  for (let i = 0; fine && i < a.length; i++) {
    const [x, y] = [a[i], b[i]];
    if (x.ctx !== y.ctx || [...x.decls].sort().join("\n") !== [...y.decls].sort().join("\n")) { fine = false; bad.push(`${f} : regle ${x.ctx} (declarations differentes)`); break; }
    const fam = (d) => family(d.split(":")[0]);
    for (let p = 0; p < x.decls.length && fine; p++) for (let q = p + 1; q < x.decls.length && fine; q++) {
      if (fam(x.decls[p]) !== fam(x.decls[q])) continue;
      if (y.decls.indexOf(x.decls[p]) > y.decls.indexOf(x.decls[q])) { fine = false; bad.push(`${f} : ${x.ctx} : « ${x.decls[p]} » passe apres « ${x.decls[q]} »`); }
    }
  }
  if (fine) ok++;
}
console.log(`${files.length} fichiers CSS : ${ok} sans inversion de declarations liees, ${files.length - ok} a examiner`);
for (const b of bad) console.log("  ", b.slice(0, 220));
