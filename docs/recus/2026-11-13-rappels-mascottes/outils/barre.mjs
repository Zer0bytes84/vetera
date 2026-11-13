// usage: node barre.mjs <url> : lignes occupées par la barre de filtres des Rappels, et style de chaque groupe
import { launch, open } from "./lib/setup.mjs";
const S = new URL(".", import.meta.url).pathname; const [URL_] = process.argv.slice(2);
const b = await launch(); const p = await open(b, { base: S + "base.json" }); await p.go(URL_, "#/taches"); await p.settle(2000);
console.log(await p.evaluate(() => { const bar = document.querySelector(".reminders-filter-bar"); const kids = [...bar.children];
  const tops = new Set(kids.map((k) => Math.round(k.getBoundingClientRect().top / 8))); const cs = (e) => getComputedStyle(e);
  const seg = bar.querySelector(".reminder-segments"), tabs = bar.querySelector("[role=tablist]");
  return `lignes=${tops.size} hauteur=${Math.round(bar.getBoundingClientRect().height)} px · origine: fond=${cs(seg).backgroundColor} r=${cs(seg).borderRadius} h=${Math.round(seg.getBoundingClientRect().height)} · statut: fond=${cs(tabs).backgroundColor} r=${cs(tabs).borderRadius} h=${Math.round(tabs.getBoundingClientRect().height)} · filet bas=${cs(bar).borderBottomWidth}`; }));
await b.close();
