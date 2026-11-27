// Temps d'une recherche sémantique « tous patients », de la lecture en base au classement (embedding de la question exclu).
// Mode "actuel" : la boucle de searchAllPatientsDocuments (une lecture par patient, vecteurs en hex, rankPassages).
// Mode "repare" : rankAllPatientsPassages (une requête, vecteurs décodés en Float32Array, produit scalaire typé).
// node --no-warnings --experimental-strip-types --import ./alias-loader.mjs bench-semantique.mjs <base> <actuel|repare> [questions]
import { performance } from "node:perf_hooks";
import { makeQuestions, ms, openSearchDb } from "./commun-semantique.mjs";
const store = await import("../../../../src/modules/consultations/local-ai/embedding-store.ts");
const { rankPassages, MODEL_CALIBRATION, SEARCH_INDEX_KEYS } = await import("../../../../src/modules/consultations/local-ai/passage-search.ts");
const [base, mode, n = "5"] = process.argv.slice(2);
const { db, adapter, stats } = openSearchDb(base);
const generation = "passages";
const filters = { sourceTypes: ["soap", "document", "protocol"], sections: ["subjective", "objective", "assessment", "plan", "document", "protocol"] };
const questions = makeQuestions(db, SEARCH_INDEX_KEYS[generation], Number(n), 7);
async function actuel(question) {
  const patients = await adapter.select("SELECT id,name FROM patients ORDER BY id");
  const ranked = [];
  for (const patient of patients) {
    const scope = { patientId: patient.id, ...filters };
    const rows = await store.readPatientSearchRows(adapter, scope, generation);
    ranked.push(...rankPassages(rows, question.vector, scope, question.text, 5, [], MODEL_CALIBRATION.embeddinggemma).map((row) => ({ ...row, patientName: patient.name })));
  }
  return ranked.sort((a, b) => b.score - a.score || a.patientId.localeCompare(b.patientId) || a.sourceId.localeCompare(b.sourceId)).slice(0, 5);
}
const repare = (question) => store.rankAllPatientsPassages(adapter, filters, question.text, question.vector, generation);
const run = mode === "actuel" ? actuel : repare;
const times = [];
let last = null;
for (const question of questions) {
  for (const k of Object.keys(stats)) stats[k] = 0;
  const t = performance.now();
  last = await run(question);
  times.push({ totalMs: ms(t), selects: stats.selects, MB: Math.round(stats.bytes / 1e4) / 100, sqlMs: Math.round(stats.sqlMs), jsonMs: Math.round(stats.jsonMs) });
}
const sorted = times.map((x) => x.totalMs).sort((a, b) => a - b);
console.log(JSON.stringify({ base: base.split("/").pop(), mode, questions: questions.length, medianMs: sorted[Math.floor(sorted.length / 2)], premierMs: times[0].totalMs, runs: times, dernier: last.map((r) => [r.patientId, r.sourceId, r.score]) }, null, 1));
