// usage: node vide-rappels.mjs <url> <dossier> : l'état vide des Rappels (En cours, À venir, recherche sans résultat), clair et sombre
import { launch, open } from "./lib/setup.mjs"; import fs from "fs";
const S = new URL(".", import.meta.url).pathname; const [URL_, OUT] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const b = await launch();
for (const mode of ["light", "dark"]) { const p = await open(b, { mode, base: S + (process.env.BASE ?? "base.json") }); await p.go(URL_, "#/taches"); await p.settle(2000); await p.freeze(); await p.mouse.move(5, 5);
  await p.screenshot({ path: `${OUT}/${mode}-en-cours.png` });
  await p.getByRole("tab", { name: /À venir/ }).click(); await p.waitForTimeout(600); await p.screenshot({ path: `${OUT}/${mode}-a-venir.png` });
  await p.getByRole("tab", { name: /En cours/ }).click(); await p.getByLabel("Rechercher dans les rappels").fill("zzz"); await p.waitForTimeout(600); await p.screenshot({ path: `${OUT}/${mode}-recherche.png` });
  await p.context().close(); }
await b.close(); console.log("ok");
