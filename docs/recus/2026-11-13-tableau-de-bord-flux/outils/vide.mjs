// usage: node vide.mjs <url> : hauteur des colonnes et blanc sous le pied de page du Flux, à 1440 × 900
import { launch, open } from "./lib/setup.mjs";
const S = new URL(".", import.meta.url).pathname; const [URL_] = process.argv.slice(2);
const b = await launch(); const p = await open(b, { base: S + (process.env.BASE ?? "base.json") }); await p.go(URL_, "#/flux"); await p.settle(2000);
console.log(await p.evaluate(() => { const lane = document.querySelector(".flow-lane").getBoundingClientRect(); const foot = document.querySelector(".flow-footer").getBoundingClientRect();
  const view = document.querySelector(".flow-board-page").parentElement.getBoundingClientRect();
  return `colonne ${Math.round(lane.height)} px · blanc sous les raccourcis ${Math.round(view.bottom - foot.bottom)} px · hauteur de vue ${Math.round(view.height)} px`; }));
await b.close();
