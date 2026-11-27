// Écrit les 200 questions de la référence (texte et vecteur) en JSON, pour les scripts lancés dans la fenêtre de l'app.
import { writeFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { makeQuestions } from "./commun-semantique.mjs";
const { SEARCH_INDEX_KEYS } = await import("../../../../src/modules/consultations/local-ai/passage-search.ts");
const [base, out] = process.argv.slice(2);
const db = new DatabaseSync(base, { readOnly: true });
writeFileSync(out, JSON.stringify(makeQuestions(db, SEARCH_INDEX_KEYS.passages, 200)));
