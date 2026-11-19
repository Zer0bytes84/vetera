// Bandes et panneaux d'Hospitalisation (liste, emplacements, detail) : bordure, ombre, rayon, fond. Usage : node hospi-mesure.mjs <url>
import { launch, open } from "./banc.mjs";
const URL_ = process.argv[2];
const browser = await launch();
for (const mode of ["light", "dark"]) {
  const page = await open(browser, { mode });
  await page.goto(URL_, { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000);
  await page.getByRole("button", { name: "Hospitalisation", exact: true }).first().click(); await page.waitForTimeout(2500);
  const tab = page.getByRole("tab", { name: "Hospitalisation" }); if (await tab.count()) { await tab.first().click(); await page.waitForTimeout(2500); }
  const measure = () => page.evaluate(() => {
    const st = (e) => { const c = getComputedStyle(e); return `r ${c.borderTopLeftRadius} bord ${c.borderTopWidth} ombre ${c.boxShadow === "none" ? "non" : c.boxShadow.slice(0, 30)}`; };
    const v = document.querySelector(".hospitalisation-view");
    const bands = [...v.querySelectorAll("[data-slot=band]")].map(st);
    const panels = [...v.querySelectorAll("[data-slot=panel]")].map(st);
    const lined = [...v.querySelectorAll("*")].filter((e) => { const c = getComputedStyle(e); return parseFloat(c.borderTopWidth) > 0 && !["INPUT", "SELECT", "TEXTAREA", "BUTTON", "TD", "TH", "LI", "TABLE"].includes(e.tagName) && !e.closest("button, [role=tablist], [data-slot=tabs-list], table"); }).map((e) => `${e.tagName.toLowerCase()}.${[...e.classList].slice(0, 2).join(".")}`);
    const count = (a) => Object.entries(a.reduce((m, x) => ((m[x] = (m[x] || 0) + 1), m), {})).map(([k, n]) => `${n}× ${k}`);
    return { bandes: count(bands), panneaux: count(panels), elementsATrait: [...new Set(lined)].slice(0, 8) };
  });
  const out = {};
  for (const view of ["Séjours", "Emplacements"]) { await page.getByRole("tab", { name: view, exact: true }).first().click(); await page.waitForTimeout(1200); out[view] = await measure(); }
  await page.getByRole("tab", { name: "Séjours", exact: true }).first().click(); await page.waitForTimeout(800);
  await page.getByRole("button", { name: "Ouvrir le séjour" }).nth(1).click(); await page.waitForTimeout(2000);
  out.detail = await measure();
  console.log(mode, JSON.stringify(out));
  await page.context().close();
}
await browser.close();
