import { launch, open } from "./lib/setup.mjs"; import { ECRANS } from "./lib/parcours.mjs"; const S = new URL(".", import.meta.url).pathname; const [URL_, OUT, MODE = "light"] = process.argv.slice(2);
const b = await launch(); const p = await open(b, { mode: MODE, dsf: 2, base: S + "base.json" }); await p.go(URL_, "#/dashboard"); await ECRANS.find(([n]) => n === "dossier-patient")[1](p); await p.freeze();
await p.evaluate(() => { const el = document.querySelector(".page-header-line") ?? document.querySelector("h1").parentElement; const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); });
await p.screenshot({ path: OUT, clip: { x: 270, y: 90, width: 930, height: 60 } }); await b.close();
