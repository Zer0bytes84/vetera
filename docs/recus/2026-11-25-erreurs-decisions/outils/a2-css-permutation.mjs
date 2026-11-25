// Pour une feuille dont l'ordre des règles a changé : mêmes règles ? Et parmi les paires de règles qui ont échangé leur
// place, combien déclarent une même propriété sur un sujet qui peut être le même élément (même classe, même attribut
// ou même id dans le dernier sélecteur composé, ou un sujet sans classe) ? Une telle paire peut changer la cascade.
// Usage : node css-permutation.mjs <avant.css> <après.css>
import { readFileSync } from "node:fs";
import postcss from "/home/user/vetera/node_modules/postcss/lib/postcss.js";
const [A, B] = process.argv.slice(2);
const rules = (f) => {
  const out = [];
  postcss.parse(readFileSync(f, "utf8")).walkRules((r) => {
    let ctx = ""; for (let p = r.parent; p && p.type !== "root"; p = p.parent) ctx = `@${p.name} ${p.params}|${ctx}`;
    out.push({ key: `${ctx}${r.selector}{${r.nodes.filter((n) => n.type === "decl").map((d) => `${d.prop}:${d.value}${d.important ? "!" : ""}`).join(";")}}`, ctx, sel: r.selectors, props: new Set(r.nodes.filter((n) => n.type === "decl").map((d) => d.prop)) });
  });
  return out;
};
const a = rules(A), b = rules(B);
const ms = (l) => l.map((r) => r.key).sort().join("\n");
console.log(`règles : ${a.length} / ${b.length}, mêmes règles : ${ms(a) === ms(b) ? "oui" : "NON"}`);
// Position de chaque règle d'avant dans l'après (occurrences identiques appariées dans l'ordre).
const pos = new Map(); b.forEach((r, i) => { (pos.get(r.key) ?? pos.set(r.key, []).get(r.key)).push(i); });
const where = a.map((r) => pos.get(r.key)?.shift() ?? -1);
// Le sujet : le dernier sélecteur composé, réduit à ses classes, id, attributs et balise (pseudo-classes retirées).
const subject = (s) => { const last = s.trim().replace(/:(is|where|not|has)\([^)]*\)/g, "").split(/\s*[\s>+~]\s*/).pop().replace(/::?[\w-]+(\([^)]*\))?/g, ""); return new Set(last.match(/[.#][\w-]+|\[[^\]=]+|^[a-z][\w-]*/g) ?? []); };
let swapped = 0, risky = [];
for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) {
  if (where[i] < where[j]) continue;
  swapped++;
  const common = [...a[i].props].filter((p) => a[j].props.has(p));
  if (!common.length) continue;
  const meet = a[i].sel.some((x) => a[j].sel.some((y) => { const sx = subject(x), sy = subject(y); return !sx.size || !sy.size || [...sx].some((t) => sy.has(t)) || (a[i].ctx !== a[j].ctx && false); }));
  if (meet) risky.push(`${a[i].sel.join(", ").slice(0, 70)}  /  ${a[j].sel.join(", ").slice(0, 70)}  : ${common.join(", ")}`);
}
console.log(`paires échangées : ${swapped}, dont à risque (même propriété, sujet commun possible) : ${risky.length}`);
for (const r of risky.slice(0, 15)) console.log(`  ${r}`);
