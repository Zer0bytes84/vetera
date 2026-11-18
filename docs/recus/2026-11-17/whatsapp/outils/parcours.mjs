// Parcours au clic dans le banc : chaque bouton WhatsApp des Rappels et des fiches, le lien que l'app ouvre, decode.
// Usage : node parcours.mjs <dossier de sortie>
import fs from "node:fs";
import { launch, open } from "./banc.mjs";

const OUT = process.argv[2] ?? "sortie";
fs.mkdirSync(OUT, { recursive: true });
const result = { rappels: {}, fiches: {}, erreurs: {} };
const decode = (link) => { const u = new URL(link); return { lien: link, schema: u.protocol, numero: u.searchParams.get("phone"), texte: u.searchParams.get("text") }; };

async function clickAll(page, scope) {
  const rows = [];
  for (const row of await scope.locator("article.medical-reminder-row").all()) {
    const animal = (await row.locator("h3").first().textContent()).trim();
    const button = row.getByRole("button", { name: /WhatsApp/ });
    const entry = { animal, bouton: await button.count() };
    if (entry.bouton) {
      entry.libelle = await button.getAttribute("aria-label");
      const before = await page.evaluate(() => window.__opened.length);
      await button.click();
      await page.waitForTimeout(400);
      const opened = await page.evaluate(() => window.__opened);
      entry.ouvert = opened.length - before === 1 ? decode(opened.at(-1)) : `ouvertures : ${opened.length - before}`;
    }
    rows.push(entry);
  }
  return rows;
}

for (const mode of ["light", "dark"]) {
  const browser = await launch();
  const page = await open(browser, { mode });
  await page.go("#/taches");
  for (const view of ["En cours", "À venir", "Terminés", "Rappels du jour"]) {
    await page.locator("button, [role=tab], [role=radio]").filter({ hasText: new RegExp(`^${view}`) }).first().click();
    await page.waitForTimeout(1500);
    if (mode === "light") result.rappels[view] = await clickAll(page, page);
    if (view === "En cours" || view === "À venir") {
      const first = page.locator("article.medical-reminder-row").filter({ hasText: "ZZ-TEST" }).first();
      await page.mouse.move(5, 5);
      await first.screenshot({ path: `${OUT}/rappel-${view === "En cours" ? "en-cours" : "a-venir"}-${mode}.png` });
    }
  }
  for (const animal of ["Zoé l’Écureuil", "Médor", "Rex", "Minou", "Pistache"]) {
    await page.go("#/patients");
    await page.getByText(animal, { exact: true }).first().click();
    await page.waitForTimeout(2500);
    const block = page.locator("section.medical-owner").first();
    const button = block.getByRole("button", { name: /WhatsApp/ });
    const entry = { bouton: await button.count(), lienAppel: await block.locator("a[href^='tel:']").count() };
    if (entry.bouton && mode === "light") {
      entry.libelle = await button.getAttribute("aria-label");
      const before = await page.evaluate(() => window.__opened.length);
      await button.click();
      await page.waitForTimeout(400);
      const opened = await page.evaluate(() => window.__opened);
      entry.ouvert = opened.length - before === 1 ? decode(opened.at(-1)) : `ouvertures : ${opened.length - before}`;
    }
    if (mode === "light") result.fiches[animal] = entry;
    if (animal === "Zoé l’Écureuil" || animal === "Minou") {
      await page.mouse.move(5, 5);
      await block.scrollIntoViewIfNeeded();
      await block.screenshot({ path: `${OUT}/fiche-${animal === "Minou" ? "minou-sans-bouton" : "zoe"}-${mode}.png` });
    }
  }
  // Le reglage visible : Parametres > Mon cabinet, ligne « Indicatif pour WhatsApp ».
  await page.go("#/parametres");
  await page.getByRole("button", { name: /Mon cabinet/ }).or(page.getByRole("tab", { name: /Mon cabinet/ })).or(page.getByRole("link", { name: /Mon cabinet/ })).first().click();
  await page.waitForTimeout(2000);
  const row = page.locator(".settings-row").filter({ hasText: "Indicatif pour WhatsApp" });
  result.reglage = { lignes: await row.count(), texte: (await row.first().innerText()).replace(/\s+/g, " ") };
  await page.mouse.move(5, 5);
  await row.first().scrollIntoViewIfNeeded();
  await row.first().screenshot({ path: `${OUT}/reglage-indicatif-${mode}.png` });
  result.erreurs[mode] = page.errors;
  await browser.close();
}
fs.writeFileSync(`${OUT}/parcours.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
