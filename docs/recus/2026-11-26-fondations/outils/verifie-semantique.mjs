// Égalité du chemin réparé (rankAllPatientsPassages) avec la référence enregistrée avant le changement :
// mêmes cinq résultats, même ordre, même nature (texte ou sémantique), écart de score maximal publié.
// node --no-warnings --experimental-strip-types --import ./alias-loader.mjs verifie-semantique.mjs <base> <reference.json> [index]
// Avec « index », le canal des termes exacts passe par l'index lexical (base migrée, index rempli).
import { readFileSync } from "node:fs";
import { makeQuestions, openSearchDb } from "./commun-semantique.mjs";
const store = await import("../../../../src/modules/consultations/local-ai/embedding-store.ts");
const { SEARCH_INDEX_KEYS } = await import("../../../../src/modules/consultations/local-ai/passage-search.ts");
const [base, referencePath, withIndex] = process.argv.slice(2);
const reference = JSON.parse(readFileSync(referencePath, "utf8"));
const { db, adapter } = openSearchDb(base);
const questions = makeQuestions(db, SEARCH_INDEX_KEYS[reference.generation], reference.questions);
let identical = 0, maxDelta = 0, results = 0;
const differences = [];
for (const [index, question] of questions.entries()) {
  const expected = reference.results[index];
  if (expected.text !== question.text) throw new Error("Questions régénérées différentes de la référence.");
  const got = (await store.rankAllPatientsPassages(adapter, reference.filters, question.text, question.vector, reference.generation, withIndex === "index"))
    .map((r) => ({ patientId: r.patientId, sourceId: r.sourceId, section: r.section, chunkIndex: r.chunkIndex, score: r.score, match: r.match }));
  const same = got.length === expected.top.length && got.every((g, i) => {
    const e = expected.top[i];
    maxDelta = Math.max(maxDelta, Math.abs(g.score - e.score));
    return g.patientId === e.patientId && g.sourceId === e.sourceId && g.section === e.section && g.chunkIndex === e.chunkIndex && g.match === e.match;
  });
  results += got.length;
  if (same) identical++;
  else differences.push({ index, text: question.text, expected: expected.top, got });
}
console.log(JSON.stringify({ base: base.split("/").pop(), indexLexical: withIndex === "index", questions: questions.length, identiques: identical, resultats: results, ecartScoreMax: maxDelta, differences: differences.slice(0, 5) }, null, 1));
process.exit(differences.length ? 1 : 0);
