// usage: node tour.mjs <url> <dossier> [modes] [ecrans]
import { launch, open } from "./lib/setup.mjs"; import { ECRANS } from "./lib/parcours.mjs"; import fs from "fs";
const S = new URL(".", import.meta.url).pathname; const [URL_, OUT, MODES = "light,dark", ONLY] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true }); const b = await launch(); const errs = [];
for (const mode of MODES.split(",")) {
  const p = await open(b, { mode, base: S + "base.json" }); await p.go(URL_, "#/dashboard");
  for (const [name, reach, leave] of ECRANS) { if (ONLY && !ONLY.split(",").includes(name)) continue;
    try { await reach(p); await p.mouse.move(700, 5); await p.freeze(); await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}/${mode}-${name}.png` }); if (leave) await leave(p); } catch (e) { errs.push(`${mode} ${name}: ${e.message.split("\n")[0]}`); } }
  errs.push(...p.errors.map((e) => `${mode} ${e}`)); await p.context().close();
}
console.log(errs.join("\n") || "aucune erreur"); await b.close();
