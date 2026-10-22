#!/usr/bin/env node
// Turns one or two bench reports into a Markdown table (before / after).
// Usage: node scripts/eval-local-ai/report.mjs <avant.json> [<apres.json>] > RAPPORT.md
import { readFileSync } from "node:fs";

const [beforePath, afterPath] = process.argv.slice(2);
if (!beforePath) {
  console.error("Usage : report.mjs <avant.json> [<apres.json>]");
  process.exit(1);
}
const load = (path) => (path ? JSON.parse(readFileSync(path, "utf8")) : null);
const before = load(beforePath);
const after = load(afterPath);

const values = (rows, pick) => (rows ?? []).map(pick).filter((value) => typeof value === "number" && Number.isFinite(value));
const mean = (list) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : null);
const quantile = (list, q) => {
  if (!list.length) return null;
  const sorted = [...list].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
};
// Deterministic bootstrap (fixed seed) of the difference of means after − before.
const bootstrap = (a, b, rounds = 2000) => {
  if (a.length < 2 || b.length < 2) return null;
  let seed = 42;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const draw = (list) => mean(Array.from(list, () => list[Math.floor(random() * list.length)]));
  const diffs = Array.from({ length: rounds }, () => draw(b) - draw(a)).sort((x, y) => x - y);
  return [diffs[Math.floor(0.025 * rounds)], diffs[Math.floor(0.975 * rounds)]];
};
const format = (value, digits = 2) => (value === null || value === undefined ? "—" : Number(value).toFixed(digits).replace(".", ","));
const percent = (value) => (value === null ? "—" : `${format(value * 100, 0)} %`);

const lines = [];
const row = (label, pick, render = format) => {
  const a = values(before?.[section], pick);
  const b = values(after?.[section], pick);
  const ci = after ? bootstrap(a, b) : null;
  lines.push(
    `| ${label} | ${render(mean(a))} (n=${a.length}) | ${after ? `${render(mean(b))} (n=${b.length})` : "—"} | ${ci ? `[${format(ci[0])} ; ${format(ci[1])}]` : "—"} |`,
  );
};
const latency = (label, pick) => {
  const a = values(before?.[section], pick);
  const b = values(after?.[section], pick);
  lines.push(
    `| ${label} : médiane / 90e centile | ${format(quantile(a, 0.5))} / ${format(quantile(a, 0.9))} s | ${after ? `${format(quantile(b, 0.5))} / ${format(quantile(b, 0.9))} s` : "—"} | |`,
  );
};
const header = (title) => {
  lines.push("", `## ${title}`, "", `| Mesure | Avant (${before.label || "1"}) | Après (${after?.label || "—"}) | IC 95 % de l'écart |`, "|---|---|---|---|");
};

let section;
lines.push(`# Banc de l'assistant local`, "", `Avant : ${before.startedAt} · Après : ${after?.startedAt ?? "—"}`);
for (section of ["soap", "synthetic"]) {
  if (!before[section] && !after?.[section]) continue;
  header(section === "soap" ? "A. Notes SOAP sur dictées réelles" : "Cas fictif (latence et mémoire seulement)");
  row("Acceptée au 1er essai", (r) => (r.accepted && r.attempts === 1 ? 1 : 0), percent);
  row("Acceptée au final", (r) => (r.accepted ? 1 : 0), percent);
  row("Fidélité à la trame", (r) => r.fidelity, percent);
  row("Mots altérés par note", (r) => r.alteredWords);
  if (section === "soap") row("Bon rangement (vs note validée)", (r) => r.sectionAgreement, percent);
  row("Posologies inventées (doit être 0)", (r) => r.inventedDosages, (v) => format(v, 0));
  latency("Durée par note", (r) => r.totalSeconds);
  latency("Modèle prêt après", (r) => r.loadedAtSeconds);
}
if (before.syntheticSearch || after?.syntheticSearch) {
  header("Recherches fictives successives (latence seulement)");
  const at = (report, index) => report?.syntheticSearch?.[index]?.seconds;
  for (let index = 0; index < 5; index++)
    lines.push(`| Requête ${index + 1} | ${format(at(before, index))} s | ${format(at(after, index))} s | |`);
}
for (section of ["search"]) {
  const pickAll = (report) => report?.search?.results;
  if (!pickAll(before) && !pickAll(after)) continue;
  before.search_rows = pickAll(before);
  if (after) after.search_rows = pickAll(after);
  section = "search_rows";
  header("B. Recherche sur les dossiers");
  row("Rappel@5, lexical", (r) => r.lexical.recallAt5, percent);
  row("Rappel@5, hybride", (r) => r.hybrid.recallAt5, percent);
  row("MRR@10, hybride", (r) => r.hybrid.mrrAt10);
  row("nDCG@10, hybride", (r) => r.hybrid.ndcgAt10);
  latency("Durée d'une requête", (r) => r.querySeconds);
  lines.push(`| Sections refusées (trop longues) | ${before.search?.refusedSections ?? "—"} | ${after?.search?.refusedSections ?? "—"} | |`);
}
for (section of ["documents"]) {
  if (!before.documents && !after?.documents) continue;
  header("C. Lecture de documents avec citations");
  row("Réponses obtenues", (r) => (r.answered ? 1 : 0), percent);
  row("Citations pertinentes ou abstention correcte", (r) => r.relevant, percent);
  latency("Durée par question", (r) => r.totalSeconds);
}
lines.push(
  "",
  "Les seuils de livraison sont ceux de `docs/recus/2026-10-22/plan-assistant-gemma4/04-jeu-evaluation.md`. Un intervalle de confiance qui contient 0 ne permet pas de conclure à un écart.",
);
console.log(lines.join("\n"));
