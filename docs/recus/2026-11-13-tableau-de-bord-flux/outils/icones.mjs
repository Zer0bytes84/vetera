// usage: node icones.mjs <url> <ecran> : familles des icônes visibles (svg ≤ 24 px) de la zone principale
import { launch, open } from "./lib/setup.mjs";
const S = new URL(".", import.meta.url).pathname; const [URL_, ECRAN = "dashboard"] = process.argv.slice(2);
const b = await launch(); const p = await open(b, { base: S + (process.env.BASE ?? "base.json"), height: 2400 }); await p.go(URL_, "#/" + ECRAN); await p.settle(2500);
const r = await p.evaluate(() => { const out = {}; const main = document.querySelector("main") ?? document.body;
  for (const svg of main.querySelectorAll("svg")) { const box = svg.getBoundingClientRect(); if (!box.width || box.width > 24 || box.height > 24) continue;
    const fam = svg.getAttribute("data-slot") === "icon" ? "heroicons" : svg.classList.contains("lucide") || [...svg.classList].some((c) => c.startsWith("lucide")) ? "lucide" : svg.getAttribute("viewBox") === "0 0 24 24" && svg.querySelector("path[stroke]") ? "trait 24 (hugeicons ?)" : "autre";
    const where = (svg.closest("[aria-label]")?.getAttribute("aria-label") ?? svg.parentElement.textContent.trim()).slice(0, 40);
    (out[fam] ??= []).push(where); }
  return Object.entries(out).map(([k, v]) => `${k} ×${v.length} : ${[...new Set(v)].slice(0, 12).join(" | ")}`); });
console.log(r.join("\n")); await b.close();
