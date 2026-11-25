// Compare deux versions d'une feuille règle par règle : chaque bloc de déclarations, avant puis après, est appliqué à un
// élément dans Chromium, en sens ltr puis rtl ; tous les styles calculés doivent être identiques.
// Usage : node css-blocs.mjs <reference.css> <variante.css>
import { readFileSync } from "node:fs";
import postcss from "/home/user/vetera/node_modules/postcss/lib/postcss.js";
import pw from "/opt/node-tools/node_modules/playwright/index.js";
const [A, B] = process.argv.slice(2);
const blocks = (f) => { const out = []; postcss.parse(readFileSync(f, "utf8"), { from: f }).walkRules((r) => out.push({ sel: r.selector.replace(/\s+/g, " ").slice(0, 70), decl: r.nodes.filter((n) => n.type === "decl").map((d) => `${d.prop}: ${d.value}${d.important ? " !important" : ""}`).join("; ") })); return out; };
const a = blocks(A), b = blocks(B);
if (a.length !== b.length) { console.log(`nombre de règles différent : ${a.length} / ${b.length}`); process.exit(2); }
const browser = await pw.chromium.launch();
const page = await browser.newPage();
await page.setContent("<div dir=ltr><div id=a1></div><div id=b1></div></div><div dir=rtl><div id=a2></div><div id=b2></div></div>");
const res = await page.evaluate((pairs) => {
  const out = [];
  pairs.forEach(([x, y], i) => {
    if (x.decl === y.decl) return;
    for (const d of ["1", "2"]) {
      const ea = document.getElementById("a" + d), eb = document.getElementById("b" + d);
      ea.style.cssText = x.decl; eb.style.cssText = y.decl;
      const ca = getComputedStyle(ea), cb = getComputedStyle(eb), ch = [];
      for (let k = 0; k < ca.length; k++) { const p = ca[k]; if (ca.getPropertyValue(p) !== cb.getPropertyValue(p)) ch.push(`${p}: ${ca.getPropertyValue(p)} -> ${cb.getPropertyValue(p)}`); }
      out.push({ regle: i, sel: x.sel, sens: d === "1" ? "ltr" : "rtl", ecarts: ch });
    }
  });
  return out;
}, a.map((x, i) => [x, b[i]]));
await browser.close();
const changed = res.filter((r) => r.ecarts.length);
console.log(`${A.split("/").pop()} -> ${B.split("/").pop()} : ${new Set(res.map((r) => r.regle)).size} règles réordonnées, ${changed.length} écarts`);
for (const r of changed) console.log(`  règle ${r.regle} (${r.sens}) ${r.sel} : ${r.ecarts.join(" | ")}`);
