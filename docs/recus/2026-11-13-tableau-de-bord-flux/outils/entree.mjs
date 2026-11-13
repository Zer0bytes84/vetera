// usage: node entree.mjs <url> : opacité et décalage des cartes de chiffres clés, image par image, à l'arrivée sur le tableau de bord
import { launch, open } from "./lib/setup.mjs";
const S = new URL(".", import.meta.url).pathname; const [URL_] = process.argv.slice(2);
const b = await launch(); const p = await open(b, { base: S + "base.json", motion: "no-preference" }); await p.go(URL_, "#/patients"); await p.settle(2000);
await p.evaluate(() => { window.__samples = []; const t0 = performance.now(); const tick = () => { const cards = [...document.querySelectorAll("[data-slot=band] button[aria-label^='Voir']")];
  if (cards.length) window.__samples.push(`${Math.round(performance.now() - t0)} ms : ` + cards.map((c) => { const cs = getComputedStyle(c); return `${(+cs.opacity).toFixed(2)}/${cs.transform === "none" ? "0" : cs.transform.split(",")[5].trim().replace(")", "")}`; }).join(" "));
  if (performance.now() - t0 < 2500) requestAnimationFrame(tick); }; requestAnimationFrame(tick); location.hash = "#/dashboard"; });
await p.waitForTimeout(3000); const s = await p.evaluate(() => window.__samples);
console.log(s.filter((_, i) => i < 3 || i % 4 === 0).slice(0, 14).join("\n")); await b.close();
