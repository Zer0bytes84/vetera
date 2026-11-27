// Outils communs aux bancs de la recherche sémantique « tous patients ».
import { DatabaseSync } from "node:sqlite";
import { performance } from "node:perf_hooks";

/** Base SQLite vue comme la voit l'app : chaque select traverse JSON.stringify + JSON.parse (figure l'IPC de tauri-plugin-sql). */
export function openSearchDb(path) {
  const db = new DatabaseSync(path, { readOnly: true });
  const stats = { selects: 0, bytes: 0, sqlMs: 0, jsonMs: 0 };
  const adapter = {
    select: async (sql, params = []) => {
      stats.selects++;
      let t = performance.now();
      const rows = db.prepare(sql).all(...params);
      stats.sqlMs += performance.now() - t;
      t = performance.now();
      const s = JSON.stringify(rows);
      stats.bytes += s.length;
      const back = JSON.parse(s);
      stats.jsonMs += performance.now() - t;
      return back;
    },
    execute: async () => {
      throw new Error("Base en lecture seule pour le banc.");
    },
  };
  return { db, adapter, stats };
}

// Générateur pseudo-aléatoire déterministe (mulberry32).
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Textes de questions : mots de la clinique synthétique, formes fléchies, marques, sigles, nombres, et des questions sans réponse lexicale.
const TEXTS = [
  "boiterie", "boiteries postérieures", "vomissements", "vomissement chronique", "diarrhée", "prurit", "otite", "otite externe",
  "dermatite", "toux", "fièvre", "abattement anorexie", "polyurie polydipsie", "amaigrissement", "douleur abdominale",
  "palpation douloureuse", "souffle cardiaque", "tachycardie", "déshydratation", "vaccination rappel", "CHPPiRL", "rage",
  "antiparasitaire", "méloxicam", "Metacam", "amoxicilline clavulanique", "Synulox", "prednisolone", "radiographie",
  "échographie abdominale", "hémogramme biochimie", "créatinine urée", "ALAT", "glycémie", "insuffisance rénale chronique",
  "IRC", "hyperthyroïdie", "diabète sucré", "arthrose", "luxation rotule", "gale démodécie", "plaie suture", "castration",
  "stérilisation", "détartrage extraction dentaire", "contrôle dans dix jours", "boiterie méloxicam", "otite prurit dermatite",
  "vomissements diarrhée déshydratation", "toux fièvre abattement", "créatinine 2", "méloxicam 0,1 mg/kg", "10 jours",
  "chat qui ne mange plus", "chien fatigué", "insuffisance cardiaque", "fracture du fémur", "épilepsie", "cystite", "conjonctivite",
];

/** 200 questions : un texte, et un vecteur voisin de 1 à 3 extraits réels de la clinique (sinon tous les cosinus seraient proches de 0). */
export function makeQuestions(db, modelKey, count = 200, seed = 20261126) {
  const random = rng(seed);
  const total = db.prepare("SELECT count(*) AS n FROM embeddings WHERE model_key=?").get(modelKey).n;
  const pick = db.prepare("SELECT embedding FROM embeddings WHERE model_key=? ORDER BY rowid LIMIT 1 OFFSET ?");
  const questions = [];
  for (let i = 0; i < count; i++) {
    const text = TEXTS[Math.floor(random() * TEXTS.length)] + (random() < 0.15 ? " " + TEXTS[Math.floor(random() * TEXTS.length)] : "");
    const mix = new Float64Array(768);
    const parts = 1 + Math.floor(random() * 3);
    for (let p = 0; p < parts; p++) {
      const blob = pick.get(modelKey, Math.floor(random() * total)).embedding;
      const v = new Float32Array(blob.buffer, blob.byteOffset, 768);
      const w = 1 / (p + 1);
      for (let j = 0; j < 768; j++) mix[j] += w * v[j];
    }
    // Bruit gaussien (Box-Muller), du même ordre que les composantes d'un vecteur unitaire.
    for (let j = 0; j < 768; j++) {
      const g = Math.sqrt(-2 * Math.log(random() || 1e-12)) * Math.cos(2 * Math.PI * random());
      mix[j] += 0.03 * g;
    }
    questions.push({ text, vector: Array.from(mix) });
  }
  return questions;
}

export const ms = (t) => Math.round((performance.now() - t) * 10) / 10;
