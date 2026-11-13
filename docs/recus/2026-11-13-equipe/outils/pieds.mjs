// usage: node pieds.mjs <url> : texte et coupure des lignes de pied des cartes de la bande Équipe
import { launch, open } from "./lib/setup.mjs";
const S = new URL(".", import.meta.url).pathname; const [URL_] = process.argv.slice(2);
const b = await launch(); const p = await open(b, { base: S + (process.env.BASE ?? "base.json") }); await p.go(URL_, "#/equipe"); await p.settle(2000);
console.log(await p.evaluate(() => { const band = document.querySelector("[data-slot=band]"); const sub = band.querySelector("h3 + p, h2 + p");
  const rows = [...band.querySelectorAll("[data-slot=panel] p")].filter((e) => !e.matches("[data-slot=stat-label]")).map((e) => `${e.scrollWidth > e.clientWidth + 1 ? "COUPÉE" : "entière"} « ${e.textContent} »`);
  return [`sous-titre ${sub && sub.scrollWidth > sub.clientWidth + 1 ? "COUPÉ" : "entier"} « ${sub?.textContent} »`, ...rows].join("\n"); }));
await b.close();
