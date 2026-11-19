// Tranche 1 dans l'app assemblée : une question par sujet, cartes, graphique, tableau trié au clic, en clair et sombre.
import fs from "node:fs";
import { launch, open, boot } from "./banc.mjs";
const OUT = process.argv[3]; fs.mkdirSync(OUT, { recursive: true });
const browser = await launch();
const report = {};
for (const mode of ["light", "dark"]) {
  for (const [name, q] of [["caisse", "Recettes et dépenses du mois dernier"], ["rendez-vous", "Rendez-vous du mois dernier"], ["patients", "Combien de patients ?"], ["taches", "Tâches ouvertes"]]) {
    const page = await open(browser, { mode, width: 1440, height: 1000, scale: 2 });
    await boot(page, process.argv[2]);
    await page.getByRole("button", { name: /Ouvrir l'Assistant IA/ }).click(); await page.waitForTimeout(1200);
    await page.getByRole("radio", { name: /Données/ }).click(); await page.waitForTimeout(500);
    const box = page.locator("[data-clinic-answers] textarea").first();
    await box.fill(q); await page.keyboard.press("Enter"); await page.waitForTimeout(1800);
    const r = await page.evaluate(() => {
      const root = document.querySelector("[data-clinic-answers]");
      const cards = [...root.querySelectorAll('[data-slot="stat-card"]')].map((c) => `${c.querySelector(".stat-card-label")?.textContent}: ${c.querySelector(".stat-card-value")?.textContent} (${c.getAttribute("data-tone")})`);
      const chart = root.querySelector(".answer-chart svg[role=img]")?.getAttribute("aria-label") ?? null;
      const headers = [...root.querySelectorAll("table thead button, table thead [aria-sort]")].map((h) => h.textContent?.trim());
      return { cards, chart, triables: headers.length };
    });
    // Sort: click the first sortable header and read the first column.
    const header = page.locator("[data-clinic-answers] table thead button").last();
    if (await header.count()) {
      const before = await page.locator("[data-clinic-answers] table tbody tr").first().innerText();
      await header.click(); await page.waitForTimeout(300);
      r.triApresClic = { avant: before.replace(/\s+/g, " ").slice(0, 50), apres: (await page.locator("[data-clinic-answers] table tbody tr").first().innerText()).replace(/\s+/g, " ").slice(0, 50), ariaSort: await page.locator("[data-clinic-answers] table thead [aria-sort]").first().getAttribute("aria-sort").catch(() => null) };
    }
    r.erreurs = page.errors;
    report[`${name}-${mode}`] = r;
    await page.locator("[data-clinic-answers] [data-question]").last().evaluate((el) => el.scrollIntoView({ block: "start" })); await page.waitForTimeout(300);
    await page.locator('[data-slot="assistant-panel"]').screenshot({ path: `${OUT}/${name}-${mode}.png` });
    const answerBox = page.locator("[data-clinic-answers] [data-slot=\"stat-card\"]").first();
    if (await answerBox.count()) await answerBox.locator("xpath=ancestor::*[contains(@class,\"answer-cards\")][1]").screenshot({ path: `${OUT}/${name}-cartes-${mode}.png` });
    const chartBox = page.locator("[data-clinic-answers] .answer-chart").first();
    if (await chartBox.count()) await chartBox.screenshot({ path: `${OUT}/${name}-graphique-${mode}.png` });
    await page.context().close();
  }
}
fs.writeFileSync(`${OUT}/tranche.json`, JSON.stringify(report, null, 1));
for (const [k, v] of Object.entries(report)) if (k.endsWith("light")) console.log(k, JSON.stringify(v));
await browser.close();
