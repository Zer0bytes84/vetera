#!/usr/bin/env node
// Builds the evaluation corpus from a COPY of a clinic database, opened read-only.
// Usage: node scripts/eval-local-ai/extract-cases.mjs --db <baitari.db> --out <folder>
//        [--annotations <annotations.json>] [--with-synthetic]
// Nothing is ever written to the source database; the copy is deleted at the end.
import { DatabaseSync } from "node:sqlite";
import { createHash, randomBytes } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, value, index, all) => {
    if (value.startsWith("--")) pairs.push([value.slice(2), all[index + 1]?.startsWith("--") ? true : all[index + 1] ?? true]);
    return pairs;
  }, []),
);
if (!args.db || !args.out) {
  console.error("Usage : --db <baitari.db> --out <dossier> [--annotations <fichier>] [--with-synthetic]");
  process.exit(1);
}
const source = resolve(args.db);
const out = resolve(args.out);
const work = mkdtempSync(join(tmpdir(), "baitari-eval-"));
// SQLite keeps recent writes in the WAL: copy it with the database.
for (const suffix of ["", "-wal", "-shm"])
  if (existsSync(source + suffix)) copyFileSync(source + suffix, join(work, "copy.db" + suffix));
const db = new DatabaseSync(join(work, "copy.db"), { readOnly: true });

const camel = (row) =>
  Object.fromEntries(Object.entries(row).map(([key, value]) => [key.replace(/_([a-z])/g, (_, c) => c.toUpperCase()), value]));
const all = (sql, ...params) => db.prepare(sql).all(...params).map(camel);
// Opaque identifiers: the report never carries a database identifier.
const salt = randomBytes(16).toString("hex");
const opaque = (id) => createHash("sha256").update(salt + id).digest("hex").slice(0, 12);

const patientBundle = new Map();
const bundle = (patientId) => {
  if (!patientBundle.has(patientId))
    patientBundle.set(patientId, {
      patient: all("SELECT * FROM patients WHERE id = ?", patientId)[0],
      appointments: all("SELECT * FROM appointments WHERE patient_id = ?", patientId),
      soaps: all("SELECT * FROM consultation_soaps WHERE patient_id = ?", patientId),
      notes: all("SELECT * FROM notes WHERE patient_id = ?", patientId),
    });
  return patientBundle.get(patientId);
};

// A. Real dictations with the note the veterinarian finally kept.
const soapCases = all(
  "SELECT * FROM consultation_soaps WHERE transcript IS NOT NULL AND length(trim(transcript)) > 0",
).map((soap) => {
  const data = bundle(soap.patientId);
  return {
    id: opaque(soap.id),
    origin: "dictée conservée",
    transcript: soap.transcript,
    appointmentId: soap.appointmentId,
    patientId: soap.patientId,
    reference: { subjective: soap.subjective, objective: soap.objective, assessment: soap.assessment, plan: soap.plan },
    previousDraft: soap.aiDraft,
  };
});

// B, C. Questions written and annotated by a veterinarian (see annotations.example.json).
const annotations = args.annotations ? JSON.parse(readFileSync(resolve(args.annotations), "utf8")) : {};
const searchCases = (annotations.search ?? []).map((item, index) => {
  bundle(item.patientId);
  return { id: `q${index + 1}`, ...item };
});
const documentCases = (annotations.documents ?? []).map((item, index) => {
  const [file] = all("SELECT * FROM consultation_documents WHERE id = ?", item.documentId);
  const [note] = file ? [] : all("SELECT * FROM notes WHERE id = ?", item.documentId);
  if (!file && !note) throw new Error(`Document annoté introuvable : ${item.documentId}`);
  return {
    id: `d${index + 1}`,
    question: item.question,
    expectedPages: item.expectedPages ?? [],
    noAnswer: Boolean(item.noAnswer),
    file: file ? { name: file.fileName, mimeType: file.mimeType, dataUrl: file.dataUrl } : null,
    note: note ? { title: note.title, content: note.content } : null,
  };
});

// Synthetic cases only measure latency and memory; they never count in a quality score.
const synthetic = args["with-synthetic"]
  ? [JSON.parse(readFileSync(new URL("./synthetic-latency-case.json", import.meta.url), "utf8"))]
  : [];

const corpus = {
  createdAt: new Date().toISOString(),
  source: { file: source.split("/").pop(), soaps: soapCases.length, search: searchCases.length, documents: documentCases.length },
  patients: Object.fromEntries(patientBundle),
  soapCases,
  searchCases,
  documentCases,
  synthetic,
};
db.close();
rmSync(work, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
writeFileSync(join(out, "cases.json"), JSON.stringify(corpus));
console.log(
  `Corpus : ${soapCases.length} dictée(s), ${searchCases.length} question(s) de recherche, ${documentCases.length} question(s) de document, ${synthetic.length} cas fictif(s) de latence.`,
);
console.log(`Écrit dans ${join(out, "cases.json")} (contient des données cliniques : ne pas le sortir du poste).`);
