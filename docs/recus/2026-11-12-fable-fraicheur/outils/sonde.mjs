// usage: node sonde.mjs <ecran> '<js expression>' [mode] [url]
import { launch, open, AVANT } from "./lib/setup.mjs"; import { ECRANS } from "./lib/parcours.mjs";
const S = new URL(".", import.meta.url).pathname; const [ecran, expr, mode = "light", url = AVANT] = process.argv.slice(2);
const b = await launch(); const p = await open(b, { mode, base: S + "base.json" }); await p.go(url, "#/dashboard");
await ECRANS.find(([n]) => n === ecran)[1](p); console.log(JSON.stringify(await p.evaluate(expr), null, 1)); if (p.errors.length) console.log(p.errors); await b.close();
