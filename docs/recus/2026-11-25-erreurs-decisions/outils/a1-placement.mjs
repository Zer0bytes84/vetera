import pw from "/opt/node-tools/node_modules/playwright/index.js"; const { chromium } = pw;
// Place de la barre des boutons de fenêtre (decorum) pour chaque variante de window-controls.css, en ltr et en rtl, fenêtre
// normale, agrandie, plein écran ; et écarts de styles calculés avec l'origine. Usage : node a1-placement.mjs <dossier des variantes>
const DIR = process.argv[2] ?? ".";
import fs from "node:fs";
const variants = ["origine", "trie", "sans-right", "sans-right-trie", "sans-right-left", "sans-right-left-trie"];
const states = [
  { name: "normal", attrs: {} },
  { name: "maximisee", attrs: { "data-window-maximized": "true" } },
  { name: "plein-ecran", attrs: { "data-window-fullscreen": "true" } },
];
const browser = await chromium.launch();
const out = {};
for (const dir of ["ltr", "rtl"]) for (const v of variants) for (const s of states) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const css = fs.readFileSync(`${DIR}/${v}.css`, "utf8");
  const attrs = Object.entries({ "data-window-controls": "decorum", ...s.attrs }).map(([k, x]) => `${k}="${x}"`).join(" ");
  await page.setContent(`<!doctype html><html ${attrs} dir="${dir}"><head><style>${css}</style></head><body>
  <div id="window-controls" data-tauri-decorum-tb><button class="decorum-tb-btn" id="decorum-tb-minimize">-</button><button class="decorum-tb-btn" id="decorum-tb-maximize">o</button><button class="decorum-tb-btn" id="decorum-tb-close">x</button></div></body></html>`);
  out[`${dir} ${v} ${s.name}`] = await page.evaluate(() => {
    const els = [...document.querySelectorAll("#window-controls, #window-controls button")];
    return els.map((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); const st = {}; for (const p of cs) st[p] = cs.getPropertyValue(p); return { id: e.id, rect: [r.left, r.top, r.width, r.height], st }; });
  });
  await page.close();
}
await browser.close();
const rows = [];
for (const dir of ["ltr", "rtl"]) for (const s of states) {
  const ref = out[`${dir} origine ${s.name}`];
  for (const v of variants) {
    const cur = out[`${dir} ${v} ${s.name}`];
    let diffs = [];
    cur.forEach((e, i) => { for (const p in e.st) if (e.st[p] !== ref[i].st[p]) diffs.push(`${e.id}.${p}: ${ref[i].st[p]} -> ${e.st[p]}`); });
    rows.push({ dir, etat: s.name, variante: v, barre: cur[0].rect, fermer: cur[3].rect, ecartsStyle: diffs.length, exemples: diffs.slice(0, 6) });
  }
}
fs.writeFileSync(`${DIR}/placement.json`, JSON.stringify(rows, null, 1));
for (const r of rows) console.log(r.dir, r.etat.padEnd(11), r.variante.padEnd(16), "barre", r.barre.join(","), "fermer", r.fermer.join(","), "écarts", r.ecartsStyle, r.exemples.slice(0,3).join(" | "));
