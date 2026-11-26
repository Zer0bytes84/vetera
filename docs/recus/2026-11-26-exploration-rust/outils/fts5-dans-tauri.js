// Le SQLite embarqué par tauri-plugin-sql sait-il FTS5 ? Table temporaire seulement (connexion courante, rien d'écrit dans la base).
const { getDatabase } = await import("/src/services/sqlite/database.ts");
const db = await getDatabase();
const out = {};
try {
  await db.execute("CREATE VIRTUAL TABLE IF NOT EXISTS temp.banc_fts USING fts5(patient_id UNINDEXED, texte, tokenize = 'unicode61 remove_diacritics 2')");
  let t = performance.now();
  await db.execute("DELETE FROM temp.banc_fts");
  await db.execute("INSERT INTO temp.banc_fts(patient_id, texte) SELECT patient_id, chunk_text FROM embeddings WHERE model_key = 'embeddinggemma-300m-onnx-fp32-wasm-768-passages800-v3'");
  out.indexationMs = Math.round(performance.now() - t);
  const times = [];
  for (const q of ["boiterie", "meloxicam", "insuffisance renale", "otite externe"]) {
    t = performance.now();
    const rows = await db.select("SELECT patient_id, snippet(banc_fts, 1, '[', ']', '…', 12) AS extrait FROM banc_fts WHERE banc_fts MATCH ? ORDER BY rank LIMIT 20", [q]);
    times.push({ q, ms: Math.round((performance.now() - t) * 10) / 10, rows: rows.length });
  }
  out.requetes = times;
  await db.execute("DROP TABLE temp.banc_fts");
  out.fts5 = true;
} catch (e) { out.fts5 = false; out.erreur = String(e).slice(0, 300); }
return out;
