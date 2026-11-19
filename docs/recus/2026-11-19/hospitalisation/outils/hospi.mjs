// Hospitalisation avec les sejours ZZ-TEST : chaque sous-vue (Sejours, Occupation, Tournee, Emplacements) et le detail
// d'un sejour, clair et sombre, captures pleine page. Usage : node hospi.mjs <url> <sortie>
import fs from "node:fs";
import { launch, open } from "./banc.mjs";
const [URL_, OUT] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const browser = await launch();
for (const mode of ["light", "dark"]) {
  const page = await open(browser, { mode });
  await page.goto(URL_, { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000);
  await page.getByRole("button", { name: "Hospitalisation", exact: true }).first().click(); await page.waitForTimeout(2500);
  const tab = page.getByRole("tab", { name: "Hospitalisation" }); if (await tab.count()) { await tab.first().click(); await page.waitForTimeout(2500); }
  await page.mouse.move(2, 2);
  for (const view of ["Séjours", "Occupation", "Tournée", "Emplacements"]) {
    const t = page.getByRole("tab", { name: view, exact: true }); if (await t.count()) { await t.first().click(); await page.waitForTimeout(1500); }
    await page.mouse.move(2, 2);
    await page.screenshot({ path: `${OUT}/hospi-${view}-${mode}.png`, fullPage: true });
  }
  const t = page.getByRole("tab", { name: "Séjours", exact: true }); if (await t.count()) { await t.first().click(); await page.waitForTimeout(1200); }
  const open1 = page.getByRole("button", { name: "Ouvrir le séjour" }).first();
  if (await open1.count()) { await open1.click(); await page.waitForTimeout(2000); await page.mouse.move(2, 2); await page.screenshot({ path: `${OUT}/hospi-detail-${mode}.png`, fullPage: true }); }
  console.log(mode, "erreurs:", page.errors.length, page.errors.slice(0, 2).join(" | "));
  await page.context().close();
}
await browser.close();
