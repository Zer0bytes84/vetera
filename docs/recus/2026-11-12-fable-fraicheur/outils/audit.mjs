import { launch, open } from "./lib/setup.mjs"; import { ECRANS } from "./lib/parcours.mjs"; import fs from "fs";
const S = new URL(".", import.meta.url).pathname; const [URL_, OUT, MODE = "light"] = process.argv.slice(2);
const fn = fs.readFileSync(S + "lib/audit-page.js", "utf8"); const b = await launch(); const res = {};
const p = await open(b, { mode: MODE, base: S + "base.json" }); await p.go(URL_, "#/dashboard");
for (const [name, reach, leave] of ECRANS) { try { await reach(p); res[name] = await p.evaluate(`(${fn})()`); if (leave) await leave(p); } catch (e) { console.log("ERR", name, e.message.split("\n")[0]); } }
fs.writeFileSync(OUT, JSON.stringify(res, null, 1)); await b.close();
