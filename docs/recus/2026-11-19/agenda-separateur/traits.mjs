// Agenda, vues Jour / Semaine / Mois : chaque élément qui dessine un trait vertical (bordure gauche/droite, ombre
// interne, élément de 1-2 px de large, dégradé de fond), avec sa position ; captures.
import fs from "node:fs";
import { launch, open, boot } from "/home/parallels/work/data-answer-banc/banc.mjs";
const [URL_, OUT] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const browser = await launch();
const report = {};
for (const mode of ["light", "dark"]) for (const vue of ["Jour", "Semaine", "Mois"]) {
  const page = await open(browser, { mode, width: 1440, height: 900, scale: 2 });
  await boot(page, URL_);
  await page.getByRole("button", { name: "Agenda", exact: true }).first().click({ timeout: 15000 }); await page.waitForTimeout(2500);
  await page.getByRole("button", { name: vue, exact: true }).or(page.getByRole("tab", { name: vue, exact: true })).or(page.getByRole("radio", { name: vue, exact: true })).first().click({ timeout: 8000 }); await page.waitForTimeout(1500);
  report[`${vue}-${mode}`] = await page.evaluate(() => {
    const main = document.querySelector("main") ?? document.body; const out = [];
    const desc = (el) => `${el.tagName.toLowerCase()}${el.dataset.slot ? `[${el.dataset.slot}]` : ""}.${[...el.classList].slice(0, 6).join(".")}`;
    for (const el of main.querySelectorAll("*")) {
      const c = getComputedStyle(el); const r = el.getBoundingClientRect(); if (!r.width || !r.height || r.height < 20) continue;
      const vis = (w, s, col) => parseFloat(w) > 0 && s !== "none" && !/, 0\)$/.test(col) && col !== "transparent";
      if (vis(c.borderLeftWidth, c.borderLeftStyle, c.borderLeftColor)) out.push(["border-left", desc(el), Math.round(r.left), Math.round(r.top), Math.round(r.height), c.borderLeftColor]);
      if (vis(c.borderRightWidth, c.borderRightStyle, c.borderRightColor)) out.push(["border-right", desc(el), Math.round(r.right), Math.round(r.top), Math.round(r.height), c.borderRightColor]);
      if (/inset/.test(c.boxShadow)) out.push(["inset-shadow", desc(el), Math.round(r.left), Math.round(r.top), Math.round(r.height), c.boxShadow.slice(0, 60)]);
      if (r.width <= 2 && r.height > 30 && c.backgroundColor !== "rgba(0, 0, 0, 0)") out.push(["barre", desc(el), Math.round(r.left), Math.round(r.top), Math.round(r.height), c.backgroundColor]);
      for (const p of ["::before", "::after"]) { const pc = getComputedStyle(el, p); if (pc.content !== "none" && (vis(pc.borderLeftWidth, pc.borderLeftStyle, pc.borderLeftColor) || vis(pc.borderRightWidth, pc.borderRightStyle, pc.borderRightColor) || (parseFloat(pc.width) <= 2 && pc.backgroundColor !== "rgba(0, 0, 0, 0)"))) out.push([`pseudo${p}`, desc(el), Math.round(r.left), Math.round(r.top), Math.round(r.height), `${pc.borderLeftWidth} ${pc.borderLeftColor} ${pc.borderRightWidth} ${pc.borderRightColor} w=${pc.width} bg=${pc.backgroundColor}`]); }
    }
    return out;
  });
  report[`${vue}-${mode}-erreurs`] = page.errors;
  await page.screenshot({ path: `${OUT}/${vue}-${mode}.png` });
  await page.context().close();
}
fs.writeFileSync(`${OUT}/traits.json`, JSON.stringify(report, null, 1));
for (const [k, v] of Object.entries(report)) if (k === "Jour-light") for (const t of v) console.log(JSON.stringify(t));
await browser.close();
