// usage: node zooms.mjs <url> <dossier>  -> zooms a taille reelle x2 (clair et sombre) + mesure de l'alignement des montants
import { launch, open } from "./lib/setup.mjs"; import { ECRANS } from "./lib/parcours.mjs"; import fs from "fs";
const S = new URL(".", import.meta.url).pathname; const [URL_, OUT] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const Z = [ // nom, ecran, x, y, l, h
  ["titre-et-pastilles", "dossier-patient", 270, 90, 720, 60], ["points-medians", "dossier-patient", 320, 126, 900, 26],
  ["libelles-13px-tableau", "patients", 280, 505, 600, 132], ["entete-de-colonne", "patients", 960, 468, 440, 34], ["chiffres-cles", "patients", 272, 92, 1136, 222],
  ["fil-d-ariane", "agenda", 320, 24, 300, 30], ["date-agenda", "agenda", 290, 352, 480, 36],
  ["montants-tabulaires", "factures", 820, 465, 420, 420], ["tableau-factures", "factures", 280, 400, 1130, 200], ["boutons", "factures", 1090, 104, 310, 46],
  ["montants-journal", "journal", 900, 465, 360, 420], ["titres-de-bande", "tableau-de-bord", 272, 92, 620, 60],
];
const b = await launch(); const mesures = {};
for (const mode of ["light", "dark"]) { const p = await open(b, { mode, dsf: 2, base: S + "base.json" }); await p.go(URL_, "#/dashboard"); let cur = null;
  for (const [name, ecran, x, y, width, height] of Z) { if (cur !== ecran) { await ECRANS.find(([n]) => n === ecran)[1](p); await p.mouse.move(700, 5); await p.freeze(); await p.waitForTimeout(300); cur = ecran; }
    await p.screenshot({ path: `${OUT}/${mode}-${name}.png`, clip: { x, y, width, height } });
    if (mode === "light" && (name === "montants-tabulaires" || name === "montants-journal")) mesures[name] = await p.evaluate(() => { const cols = {}; for (const tr of document.querySelectorAll("table tbody tr")) [...tr.children].forEach((td, i) => { const w = document.createTreeWalker(td, NodeFilter.SHOW_TEXT); while (w.nextNode()) { const t = w.currentNode.textContent.trim(); if (!/^[+\-−]?[\d\s  ]+DA$/.test(t)) continue; const r = document.createRange(); r.selectNodeContents(w.currentNode); const q = r.getBoundingClientRect(); const cs = getComputedStyle(w.currentNode.parentElement); (cols[i] ??= []).push({ t, droite: +q.right.toFixed(2), largeurParChiffre: +(q.width / t.length).toFixed(3), num: cs.fontVariantNumeric, ls: cs.letterSpacing }); } }); return Object.fromEntries(Object.entries(cols).map(([i, v]) => [i, { n: v.length, droites: [...new Set(v.map((e) => e.droite))], num: [...new Set(v.map((e) => e.num))], ls: [...new Set(v.map((e) => e.ls))], ex: v.slice(0, 3).map((e) => e.t) }])); }); }
  await p.context().close(); }
fs.writeFileSync(`${OUT}/mesure-montants.json`, JSON.stringify(mesures, null, 1)); console.log(JSON.stringify(mesures)); await b.close();
