// Equipe rouge. usage: node rouge.mjs <url> <dossier>
// 1. debordements a 1440 et 1024 px ; 2. textes pires cas injectes (libelles longs) ; 3. chiffres roules non rognes.
import { launch, open } from "./lib/setup.mjs"; import { ECRANS } from "./lib/parcours.mjs"; import fs from "fs";
const S = new URL(".", import.meta.url).pathname; const [URL_, OUT] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true }); const b = await launch(); const res = {};
const overflow = `(() => { const out = []; for (const el of document.querySelectorAll("body *")) { const r = el.getBoundingClientRect(); if (!r.width || r.top > innerHeight || r.bottom < 0) continue; const cs = getComputedStyle(el); if (el.scrollWidth > el.clientWidth + 1 && cs.overflowX === "visible" && el.clientWidth > 0 && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) out.push(el.tagName + "." + (el.className?.baseVal ?? el.className).toString().slice(0, 50) + " : " + el.textContent.trim().slice(0, 30) + " (" + el.scrollWidth + ">" + el.clientWidth + ")"); } const doc = document.scrollingElement; return { n: out.length, ex: out.slice(0, 8), pageX: doc.scrollWidth > doc.clientWidth }; })()`;
for (const width of [1440, 1024]) { const p = await open(b, { width, height: 900, base: S + "base.json" }); await p.go(URL_, "#/dashboard");
  for (const [name, reach, leave] of ECRANS) { try { await reach(p); res[`${width}/${name}`] = await p.evaluate(overflow); if (leave) await leave(p); } catch (e) { res[`${width}/${name}`] = "ERR " + e.message.split("\n")[0]; } }
  if (width === 1440) { // pires cas
    await ECRANS.find(([n]) => n === "patients")[1](p); await p.freeze();
    await p.evaluate(() => { const set = (el, text) => { if (!el) return; const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let t = null; while (w.nextNode()) if (w.currentNode.textContent.trim()) { t = w.currentNode; break; } if (t) t.textContent = text; };
      set(document.querySelector("[data-slot='stat-label'] > span:last-of-type"), "Rendez-vous de suivi post-opératoire à programmer avant la fin du trimestre");
      set([...document.querySelectorAll("table th")].find((e) => e.textContent.trim()), "Propriétaire-payeur (co-détenteur) du rendez-vous");
      set(document.querySelector("table tbody td span.truncate"), "Jean-Baptiste-Emmanuel de la Tour-du-Pin-Chambly (ex-refuge)");
      set([...document.querySelectorAll("[data-slot='button']")].find((e) => e.textContent.includes("Nouveau patient")), "Nouveau patient hospitalisé en urgence");
      set(document.querySelector("table tbody td span.rounded-full"), "En convalescence post-opératoire prolongée"); });
    await p.waitForTimeout(300); await p.screenshot({ path: OUT + "/pires-cas-patients.png" }); res["pires-cas"] = await p.evaluate(overflow);
    res["chiffre-roule"] = await p.evaluate(() => [...document.querySelectorAll("[data-slot='stat-value']")].map((v) => { const r = v.getBoundingClientRect(), pr = v.parentElement.getBoundingClientRect(); const inner = v.firstElementChild.getBoundingClientRect(); return { texte: v.textContent.slice(0, 8), depasseParent: r.right > pr.right + 0.5 || r.bottom > pr.bottom + 0.5 || r.top < pr.top - 0.5, hauteur: inner.height, largeur: Math.round(inner.width) }; })); }
  await p.context().close(); }
fs.writeFileSync(OUT + "/rouge.json", JSON.stringify(res, null, 1)); for (const [k, v] of Object.entries(res)) console.log(k, JSON.stringify(v).slice(0, 330)); await b.close();
