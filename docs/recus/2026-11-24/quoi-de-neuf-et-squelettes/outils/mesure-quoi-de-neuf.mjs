import { launch, context, page as newPage } from "./banc.mjs";
import fs from "node:fs";
const [URL_, OUT] = process.argv.slice(2);
const SIZES = [[1440, 900], [1280, 720], [1366, 768], [1280, 600], [1024, 500], [1440, 1200]];
const browser = await launch();
const rows = [];
for (const mode of ["light", "dark"]) for (const [w, h] of SIZES) {
  // L'application réelle, au premier lancement après la mise à jour depuis la 5.1.1.
  const ctx = await context(browser, { mode, width: w, height: h });
  await ctx.addInitScript(() => localStorage.setItem("baitari:last-seen-version", "5.1.1"));
  const page = await newPage(ctx); const errors = page.errors;
  await page.goto(URL_);
  await page.waitForSelector(".whats-new-dialog", { timeout: 15000 });
  await page.waitForTimeout(600);
  const r = await page.evaluate(() => {
    const box = (el) => { const b = el.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), height: Math.round(b.height) }; };
    const d = document.querySelector(".whats-new-dialog");
    const head = d.querySelector(".whats-new-head"), panel = d.querySelector(".whats-new-panel");
    const btn = [...d.querySelectorAll("button")].find((b) => b.textContent.includes("Compris"));
    const vis = (b) => b.top >= 0 && b.bottom <= innerHeight;
    const items = panel.querySelectorAll("li");
    return { dialog: box(d), head: box(head), button: box(btn), panel: { ...box(panel), scrollHeight: panel.scrollHeight, clientHeight: panel.clientHeight },
      headVisible: vis(box(head)), buttonVisible: vis(box(btn)), dialogInside: vis(box(d)), items: items.length,
      title: d.querySelector("h2")?.textContent,
      focusAOuverture: (document.activeElement?.textContent || document.activeElement?.getAttribute("aria-label") || document.activeElement?.tagName || "").trim().slice(0, 40) };
  });
  await page.screenshot({ path: `${OUT}/${mode}-${w}x${h}.png` });
  // La dernière nouveauté est-elle atteignable, au clavier ?
  await page.focus(".whats-new-panel");
  await page.keyboard.press("End");
  await page.waitForTimeout(300);
  r.lastItemVisibleAfterEnd = await page.evaluate(() => {
    const p = document.querySelector(".whats-new-panel"); const li = [...p.querySelectorAll("li")].at(-1);
    const a = p.getBoundingClientRect(), b = li.getBoundingClientRect(); return b.top >= a.top - 1 && b.bottom <= a.bottom + 1 && b.bottom <= innerHeight;
  });
  rows.push({ mode, viewport: `${w}x${h}`, ...r, errors });
  await ctx.close();
}
await browser.close();
fs.writeFileSync(`${OUT}/mesure.json`, JSON.stringify(rows, null, 1));
for (const x of rows) console.log(x.mode.padEnd(5), x.viewport.padEnd(9), `fenêtre ${x.dialog.top}..${x.dialog.bottom} (h ${x.dialog.height})`, `en-tête ${x.headVisible ? "vu" : "HORS"}`, `Compris ${x.buttonVisible ? "vu" : "HORS"}`, `panneau ${x.panel.clientHeight}/${x.panel.scrollHeight}`, `dernière nouveauté au clavier ${x.lastItemVisibleAfterEnd ? "oui" : "NON"}`, x.items, "nouveautés", `focus « ${x.focusAOuverture} »`, x.errors.length ? "ERREURS " + x.errors.join(" | ").slice(0, 200) : "");
