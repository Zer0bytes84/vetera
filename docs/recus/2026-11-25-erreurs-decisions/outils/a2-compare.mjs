// Compare deux relevés d'assemblage : feuilles CSS (contenu), et pour chaque morceau JS l'ordre de ses modules, ses
// imports et ses CSS. Usage : node compare.mjs <relevé A> <relevé B> [--detail]
import { readdirSync, readFileSync } from "node:fs";
// L'ordre dans lequel le navigateur reçoit les feuilles : les <link> de index.html, puis, pour chaque import dynamique,
// les feuilles que le préchargement de Vite injecte, dans l'ordre de sa liste (__vite__mapDeps).
const bareName = (f) => f.replace(/-[A-Za-z0-9_-]{8}(?=\.(js|css|mjs)$)/, "");
const cssOrders = (dir) => {
  const html = readFileSync(`${dir}/dist/index.html`, "utf8");
  const res = { "index.html": [[...html.matchAll(/<link[^>]*stylesheet[^>]*href="\/?([^"]+)"/g)].map((m) => bareName(m[1])).join(" ")] };
  for (const f of readdirSync(`${dir}/dist/assets`).filter((x) => x.endsWith(".js"))) {
    const code = readFileSync(`${dir}/dist/assets/${f}`, "utf8");
    const m = code.match(/m\.f\|\|\(m\.f=(\[[^\]]*\])/);
    if (!m) continue;
    const deps = JSON.parse(m[1]);
    const seqs = [...code.matchAll(/__vite__mapDeps\(\[([\d,]*)\]\)/g)].map((c) => c[1].split(",").filter(Boolean).map((i) => deps[Number(i)]).filter((d) => d.endsWith(".css")).map(bareName).join(" ")).filter(Boolean);
    const k = bareName(`assets/${f}`);
    (res[k] ??= []).push(...seqs);
  }
  for (const k in res) res[k].sort();
  return res;
};
const [A, B, detail] = process.argv.slice(2);
const a = JSON.parse(readFileSync(`${A}/assemblage.json`, "utf8")), b = JSON.parse(readFileSync(`${B}/assemblage.json`, "utf8"));
const out = { css: [], morceaux: [], ordre: [], imports: [] };
const texte = [];
const deplaces = [];
for (const k of new Set([...Object.keys(a.css), ...Object.keys(b.css)])) if (a.css[k] !== b.css[k]) out.css.push(`${k}: ${a.css[k] ?? "absent"} -> ${b.css[k] ?? "absent"}`);
for (const k of new Set([...Object.keys(a.chunks), ...Object.keys(b.chunks)])) {
  const x = a.chunks[k], y = b.chunks[k];
  if (!x || !y) { out.morceaux.push(`${k}: ${x ? "disparu" : "nouveau"}`); continue; }
  if (x.modules.join() !== y.modules.join()) {
    const same = x.modules.length === y.modules.length && [...x.modules].sort().join() === [...y.modules].sort().join();
    const first = x.modules.findIndex((m, i) => m !== y.modules[i]);
    out.ordre.push(`${k}: ${same ? "mêmes modules, ordre changé" : "modules différents"} (dès ${x.modules[first]} -> ${y.modules[first]})`);
  }
  if (x.texte !== y.texte) texte.push(k);
  if (x.modules.join() !== y.modules.join()) {
    // Les modules déplacés : ceux qui sortent de la plus longue sous-suite commune aux deux ordres.
    const pos = new Map(y.modules.map((m, i) => [m, i]));
    const seq = x.modules.filter((m) => pos.has(m)).map((m) => pos.get(m));
    const tails = [], prev = new Array(seq.length), idx = [];
    seq.forEach((v, i) => { let lo = 0, hi = tails.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (seq[tails[mid]] < v) lo = mid + 1; else hi = mid; } prev[i] = lo ? tails[lo - 1] : -1; tails[lo] = i; });
    const keep = new Set(); for (let i = tails.at(-1) ?? -1; i >= 0; i = prev[i]) keep.add(i);
    deplaces.push(...x.modules.filter((m) => pos.has(m)).filter((_, i) => !keep.has(i)).map((m) => `${k.split("|")[0]} ${m}`));
  }
  for (const f of ["imports", "importsDynamiques", "css"]) if (x[f].join() !== y[f].join()) out.imports.push(`${k}.${f}: ${x[f].join(",")} -> ${y[f].join(",")}`);
}
out.cssOrdre = [];
const oa = cssOrders(A), ob = cssOrders(B);
for (const k of new Set([...Object.keys(oa), ...Object.keys(ob)])) if (JSON.stringify(oa[k] ?? []) !== JSON.stringify(ob[k] ?? [])) out.cssOrdre.push(`${k}: ${JSON.stringify(oa[k] ?? []).slice(0, 200)} -> ${JSON.stringify(ob[k] ?? []).slice(0, 200)}`);
const cssSame = out.css.length === 0 && out.cssOrdre.length === 0;
const n = out.css.length + out.cssOrdre.length + out.morceaux.length + out.ordre.length + out.imports.length;
console.log((n === 0 ? "IDENTIQUE" : `${cssSame ? "CSS_IDENTIQUE" : "CSS_CHANGE"} : css ${out.css.length}, ordre css ${out.cssOrdre.length}, morceaux ${out.morceaux.length}, ordre ${out.ordre.length}, imports ${out.imports.length}`) + ` (texte JS changé dans ${texte.length} morceaux)`);
if (detail && deplaces.length) console.log(`  [déplacés] ${deplaces.join(" ; ")}`);
if (detail && texte.length) console.log(`  [texte] ${texte.slice(0, 12).join(" ; ")}`);
if (detail && n) for (const [k, l] of Object.entries(out)) for (const s of l.slice(0, 12)) console.log(`  [${k}] ${s}`);
process.exit(n === 0 ? 0 : 1);
