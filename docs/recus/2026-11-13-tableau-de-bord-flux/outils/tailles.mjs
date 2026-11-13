// usage: node tailles.mjs <url> <ecran> : tailles de police des textes visibles, par taille, avec exemples
import { launch, open } from "./lib/setup.mjs";
const S = new URL(".", import.meta.url).pathname; const [URL_, ECRAN = "dashboard"] = process.argv.slice(2);
const b = await launch(); const p = await open(b, { base: S + (process.env.BASE ?? "base.json"), height: 2400 }); await p.go(URL_, "#/" + ECRAN); await p.settle(2500);
const r = await p.evaluate(() => { const out = {}; const main = document.querySelector("main") ?? document.body;
  const w = document.createTreeWalker(main, NodeFilter.SHOW_TEXT); let n;
  while ((n = w.nextNode())) { const t = n.textContent.trim(); if (!t) continue; const e = n.parentElement; const r = e.getBoundingClientRect(); if (!r.width) continue;
    const cs = getComputedStyle(e); if (cs.visibility === "hidden" || e.closest("[aria-hidden=true] svg")) continue;
    const k = cs.fontSize + " " + cs.fontWeight; (out[k] ??= []).push(t.slice(0, 28)); }
  return Object.entries(out).map(([k, v]) => `${k} ×${v.length} : ${[...new Set(v)].slice(0, 8).join(" | ")}`).sort(); });
console.log(r.join("\n")); await b.close();
