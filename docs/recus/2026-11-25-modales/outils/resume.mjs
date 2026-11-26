import fs from "node:fs";
const [dir, motif = ""] = process.argv.slice(2);
const all = {}; for (const f of fs.readdirSync(dir).filter((f) => f.startsWith("releves") && f.endsWith(".json") && !f.includes("sombre")).sort((a, b) => fs.statSync(`${dir}/${a}`).mtimeMs - fs.statSync(`${dir}/${b}`).mtimeMs)) Object.assign(all, JSON.parse(fs.readFileSync(`${dir}/${f}`, "utf8")));
for (const [k, x] of Object.entries(all).filter(([k]) => k.includes(motif))) {
  if (x.echec) { console.log(`${k}: ÉCHEC ${x.echec}`); continue; }
  const a = x.action ?? {}; const pb = [];
  if (x.traits.length) pb.push(`traits ${x.traits.length}: ${x.traits[0]}`);
  if (x.ombres.length) pb.push(`ombres ${x.ombres.length}: ${x.ombres[0]}`);
  if (x.feuille.rayon !== "22px") pb.push(`rayon ${x.feuille.rayon}`);
  if (x.feuille.ombre) pb.push("ombre feuille");
  if (a.texte !== undefined && (!a.pilule || !a.aDroite || !a.dansBande)) pb.push(`action « ${a.texte} » pilule=${a.pilule} droite=${a.aDroite} bande=${a.dansBande}`);
  if (!x.fermeture?.visible) pb.push("fermeture invisible");
  if (x.horsEcran) pb.push("hors écran");
  if (x.tuile === false) pb.push("en-tête sans tuile");
  console.log(`${pb.length ? "✗" : "✓"} ${k} « ${x.titre} » focus=${x.focus}${pb.length ? "\n    " + pb.join("\n    ") : ""}`);
}
