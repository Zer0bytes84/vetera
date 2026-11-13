// usage: node reduite.mjs <url> <dossier> : équipe réduite (base), recherche sans résultat, équipe d'une personne (BASE=base-seul.json), clair et sombre
import { launch, open } from "./lib/setup.mjs"; import fs from "fs";
const S = new URL(".", import.meta.url).pathname; const [URL_, OUT] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const b = await launch();
for (const mode of ["light", "dark"]) {
  const p = await open(b, { mode, base: S + "base.json" }); await p.go(URL_, "#/equipe"); await p.settle(2000); await p.freeze(); await p.mouse.move(5, 5);
  await p.getByLabel("Rechercher un membre").fill("zzz"); await p.waitForTimeout(500); await p.screenshot({ path: `${OUT}/${mode}-recherche-vide.png` }); await p.context().close();
  const q = await open(b, { mode, base: S + "base-seul.json" }); await q.go(URL_, "#/equipe"); await q.settle(2000); await q.freeze(); await q.mouse.move(5, 5);
  await q.screenshot({ path: `${OUT}/${mode}-equipe-d-une-personne.png` }); await q.context().close(); }
await b.close(); console.log("ok");
