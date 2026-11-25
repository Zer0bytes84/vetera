// Pour chaque relevé de la seconde passe : les morceaux dont la place change dans la liste d'imports d'un morceau
// (leur exécution peut changer d'ordre), et leurs modules. Usage : node chunks-deplaces.mjs <base> <dossier passe2>
import { readdirSync, readFileSync } from "node:fs";
const [BASE, DIR] = process.argv.slice(2);
const base = JSON.parse(readFileSync(`${BASE}/assemblage.json`, "utf8")).chunks;
const byName = {}; for (const [k, v] of Object.entries(base)) (byName[k.split("|")[0]] ??= []).push(...v.modules);
const lis = (a, b) => { const pos = new Map(b.map((m, i) => [m, i])); const seq = a.filter((m) => pos.has(m)).map((m) => pos.get(m)); const tails = [], prev = []; seq.forEach((v, i) => { let lo = 0, hi = tails.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (seq[tails[mid]] < v) lo = mid + 1; else hi = mid; } prev[i] = lo ? tails[lo - 1] : -1; tails[lo] = i; }); const keep = new Set(); for (let i = tails.at(-1) ?? -1; i >= 0; i = prev[i]) keep.add(i); return a.filter((m) => pos.has(m)).filter((_, i) => !keep.has(i)); };
for (const f of readdirSync(DIR).filter((x) => x.endsWith(".txt"))) {
  for (const line of readFileSync(`${DIR}/${f}`, "utf8").split("\n")) {
    const m = line.match(/^\s+\[imports\] (.+?)\.imports: (.*) -> (.*)$/);
    if (!m) continue;
    for (const c of lis(m[2].split(","), m[3].split(","))) for (const mod of byName[c] ?? []) console.log(`${f.replace(/\.txt$/, "")}\t${c}\t${mod}`);
  }
}
