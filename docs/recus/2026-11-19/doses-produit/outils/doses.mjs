// Le panneau de dose validée dans l'ordonnance : dossier de Gribouille (chat), onglet Ordonnances, nouvelle ordonnance,
// poids saisi, puis une molécule cherchée et choisie ; capture de la ligne, en clair et en sombre.
import fs from "node:fs";
import { launch, open, boot } from "./banc.mjs";
const OUT = process.argv[3]; fs.mkdirSync(OUT, { recursive: true });
const browser = await launch();
const report = {};
for (const mode of ["light", "dark"]) {
  for (const [name, search, kg] of [["tolfedine-4kg", "Tolfedine", "4"], ["capstar-12kg", "Capstar", "12"], ["antisedan", "Antisedan", "4"]]) {
    const page = await open(browser, { mode, width: 1440, height: 1000, scale: 2 });
    await boot(page, process.argv[2]);
    await page.goto(`${process.argv[2]}#/patient/mokqe7ghookikhre1f`); await page.waitForTimeout(2500);
    await page.getByRole("tab", { name: /Ordonnances/ }).or(page.getByRole("button", { name: /^Ordonnances/ })).first().click({ timeout: 20000 }); await page.waitForTimeout(800);
    await page.getByRole("button", { name: /Nouvelle ordonnance/ }).first().click(); await page.waitForTimeout(1500);
    await page.locator("#weight-input").fill(kg); await page.waitForTimeout(300);
    await page.getByRole("button", { name: /Ajouter un médicament/ }).first().click(); await page.waitForTimeout(800);
    const searchBox = page.getByPlaceholder(/Rechercher un médicament/).first();
    await searchBox.fill(search); await page.waitForTimeout(800);
    await page.getByRole("option", { name: new RegExp(search, "i") }).first().click().catch(async () => { await page.keyboard.press("Enter"); });
    await page.waitForTimeout(800);
    const panel = page.locator('[data-slot="validated-dose"]').first();
    const found = await panel.count();
    report[`${name}-${mode}`] = found ? (await panel.innerText()).replace(/\s+/g, " ").slice(0, 400) : "PANNEAU ABSENT";
    if (found) report[`${name}-${mode}-boites`] = await panel.evaluate((root) => Object.fromEntries([".validated-dose-by", ".validated-dose-icon", ".validated-dose-title", ".validated-dose-facts dt", ".validated-dose-source"].map((sel) => { const el = root.querySelector(sel); if (!el) return [sel, null]; const b = el.getBoundingClientRect(); return [sel, [b.x, b.y, b.width, b.height]]; })));
    if (found) { const box = await panel.boundingBox(); report[`${name}-${mode}-fondXY`] = [Math.round(box.x + 4), Math.round(box.y + box.height - 4)]; await page.screenshot({ path: `${OUT}/${name}-${mode}-page.png` }); }
    if (found) await panel.locator("xpath=ancestor::*[contains(@class,'@container')][1]").screenshot({ path: `${OUT}/${name}-${mode}.png` });
    else await page.screenshot({ path: `${OUT}/${name}-${mode}-page.png` });
    report[`${name}-${mode}-erreurs`] = page.errors;
    await page.context().close();
  }
}
fs.writeFileSync(`${OUT}/doses.json`, JSON.stringify(report, null, 1));
for (const [k, v] of Object.entries(report)) if (k.endsWith("light")) console.log(k, "→", v);
await browser.close();
