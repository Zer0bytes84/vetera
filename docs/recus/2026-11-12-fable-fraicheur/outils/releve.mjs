// usage: node releve.mjs <url> <sortie.json> [modes]
import { launch, open } from "./lib/setup.mjs"; import { ECRANS } from "./lib/parcours.mjs"; import fs from "fs";
const S = new URL(".", import.meta.url).pathname; const [URL_, OUT, MODES = "light,dark"] = process.argv.slice(2);
const fn = fs.readFileSync(S + "lib/releve-page.js", "utf8").replace(/^\/\/.*\n/, ""); const b = await launch(); const res = {};
for (const mode of MODES.split(",")) { const p = await open(b, { mode, base: S + "base.json" }); await p.go(URL_, "#/dashboard");
  for (const [name, reach, leave] of ECRANS) { try { await reach(p); res[`${mode}/${name}`] = await p.evaluate(`(${fn})()`); if (leave) await leave(p); } catch (e) { console.log("ERR", mode, name, e.message.split("\n")[0]); } }
  await p.context().close(); }
fs.writeFileSync(OUT, JSON.stringify(res)); console.log(Object.entries(res).map(([k, v]) => `${k}: ${v.length}`).join(", ")); await b.close();
