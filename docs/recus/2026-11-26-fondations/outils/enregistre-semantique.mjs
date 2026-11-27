// Référence de la recherche sémantique « tous patients », AVANT toute modification : pour chaque question,
// les cinq premiers résultats du chemin actuel (une lecture par patient, readPatientSearchRows + rankPassages,
// puis le tri global de searchAllPatientsDocuments). Les lignes sont lues une fois puis réutilisées pour chaque
// question : la lecture ne dépend pas de la question, le classement si.
// node --no-warnings --experimental-strip-types --import ./alias-loader.mjs enregistre-semantique.mjs <base> <sortie.json> [n]
import { writeFileSync } from "node:fs";
import { makeQuestions, openSearchDb } from "./commun-semantique.mjs";
const { readPatientSearchRows } = await import("../../../../src/modules/consultations/local-ai/embedding-store.ts");
const { rankPassages, MODEL_CALIBRATION, SEARCH_INDEX_KEYS } = await import("../../../../src/modules/consultations/local-ai/passage-search.ts");
const [base, output, n = "200"] = process.argv.slice(2);
const { db, adapter } = openSearchDb(base);
const generation = "passages";
const filters = { sourceTypes: ["soap", "document", "protocol"], sections: ["subjective", "objective", "assessment", "plan", "document", "protocol"] };
const questions = makeQuestions(db, SEARCH_INDEX_KEYS[generation], Number(n));
const patients = db.prepare("SELECT id,name FROM patients ORDER BY id").all();
const perPatient = [];
for (const patient of patients) {
  const scope = { patientId: patient.id, ...filters };
  perPatient.push({ patient, scope, rows: await readPatientSearchRows(adapter, scope, generation) });
}
const results = questions.map((question, index) => {
  const ranked = [];
  for (const { patient, scope, rows } of perPatient) {
    // Aucun document géré dans la clinique synthétique : managedPatientChunks y rend [] pour chaque patient.
    ranked.push(...rankPassages(rows, question.vector, scope, question.text, 5, [], MODEL_CALIBRATION.embeddinggemma).map((row) => ({ ...row, patientName: patient.name })));
  }
  const top = ranked
    .sort((a, b) => b.score - a.score || a.patientId.localeCompare(b.patientId) || a.sourceId.localeCompare(b.sourceId))
    .slice(0, 5)
    .map((r) => ({ patientId: r.patientId, sourceId: r.sourceId, section: r.section, chunkIndex: r.chunkIndex, score: r.score, match: r.match }));
  if (index % 20 === 0) console.error(`question ${index}`);
  return { text: question.text, top };
});
const matches = results.reduce((s, r) => s + r.top.length, 0);
writeFileSync(output, JSON.stringify({ base: base.split("/").pop(), generation, filters, questions: questions.length, resultats: matches, results }) + "\n");
console.log(JSON.stringify({ questions: questions.length, resultats: matches, semantic: results.reduce((s, r) => s + r.top.filter((t) => t.match === "semantic").length, 0), text: results.reduce((s, r) => s + r.top.filter((t) => t.match === "text").length, 0) }));
