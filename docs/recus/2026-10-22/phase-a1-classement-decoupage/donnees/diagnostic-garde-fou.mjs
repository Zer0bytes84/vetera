// Décompose l'écart Alloprof : seuil cosinus 0,30 et garde-fou numérique, sur les vecteurs du challenge (v1 fp32, extraits 800).
import { readFileSync } from "node:fs";
import * as app from "./app-search.mjs";
import { loadDataset } from "./embed.mjs";
const run = JSON.parse(readFileSync(new URL("../cache/eg1-fp32--AlloprofRetrieval.json", import.meta.url), "utf8"));
const ds = await loadDataset("AlloprofRetrieval");
const text = new Map(ds.docs.map((d) => [d.id, d.text]));
const { chunk } = await import("./embed.mjs");
const pieces = new Map(ds.docs.map((d) => [d.id, chunk(d.text)]));
const byDoc = new Map();
let idx = new Map();
for (const c of run.chunks) { const i = idx.get(c.doc) ?? 0; idx.set(c.doc, i + 1); if (!byDoc.has(c.doc)) byDoc.set(c.doc, []); byDoc.get(c.doc).push({ v: c.vector, t: pieces.get(c.doc)[i] ?? "" }); }
const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
const qtext = new Map(ds.queries.map((q) => [q.id, q.text]));
const variants = { "aucun filtre": [false, false], "seuil 0,30": [true, false], "garde-fou numérique": [false, true], "les deux (app)": [true, true], "seuil + garde-fou doses": [true, "doses"] };
// Variante : le garde-fou ne s'applique que si la requête contient une quantité avec unité (dose).
const hasDose = (query) => /(\d+(?:[.,]\d+)?)\s*(mg|mcg|µg|ug|ml|kg|g|ui)\b/i.test(query);
let withNumbers = 0;
for (const q of run.queries) if (/\d/.test(qtext.get(q.id))) withNumbers++;
console.log(`questions contenant un nombre : ${withNumbers} / ${run.queries.length}`);
for (const [name, [threshold, numeric]] of Object.entries(variants)) {
  let r5 = 0, mrr = 0;
  for (const q of run.queries) {
    const t = qtext.get(q.id);
    const scored = [];
    for (const [doc, list] of byDoc) {
      let best = -1;
      for (const { v, t: passage } of list) {
        if ((numeric === true || (numeric === "doses" && hasDose(t))) && !app.matchesNumericConstraints(t, passage)) continue;
        const lexical = app.matchesSearchTerms(t, passage);
        const cos = dot(v, q.vector);
        if (threshold && !(cos >= 0.3 || (lexical && (cos >= 0.15 || app.matchesExactSearchTerms(t, passage))))) continue;
        best = Math.max(best, cos + (lexical ? 0.05 : 0));
      }
      if (best > -1) scored.push([doc, best]);
    }
    const ranked = scored.sort((a, b) => b[1] - a[1]).map((x) => x[0]);
    const rel = ds.rel.get(q.id);
    if (ranked.slice(0, 5).some((d) => rel.has(d))) r5++;
    const f = ranked.slice(0, 10).findIndex((d) => rel.has(d)); if (f >= 0) mrr += 1 / (f + 1);
  }
  console.log(`${name.padEnd(22)} Rappel@5 ${(100 * r5 / run.queries.length).toFixed(1)} %  MRR@10 ${(100 * mrr / run.queries.length).toFixed(1)}`);
}
