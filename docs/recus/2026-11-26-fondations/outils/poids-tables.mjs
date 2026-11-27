// Lignes et octets JSON (ce que tauri-plugin-sql ferait traverser) de chaque table lue par la fiche patient.
// node --no-warnings poids-tables.mjs <base>
import { DatabaseSync } from "node:sqlite";
const db = new DatabaseSync(process.argv[2], { readOnly: true });
const out = {};
for (const { name } of db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all()) {
  if (name === "embeddings") continue;
  const rows = db.prepare("SELECT * FROM " + name).all();
  if (!rows.length) continue;
  const cols = Object.keys(rows[0]);
  out[name] = { rows: rows.length, kB: Math.round(JSON.stringify(rows).length / 1000), patientId: cols.includes("patient_id") };
}
console.log(JSON.stringify(out));
