// La release intégrée, assemblée comme en CI : chaque vue s'ouvre-t-elle sans erreur, en clair et en sombre ?
// Les vues de la panne 5.1.0 (dossier patient, Soins, Hospitalisation) et toutes celles que la release touche.
import fs from "node:fs";
import { launch, open, boot, openPalette } from "/home/parallels/work/data-answer-banc/banc.mjs";
const [URL_, OUT] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const PAGES = ["Tableau de bord", "Patients", "Agenda", "Flux", "Rappels", "Soins", "Hospitalisation", "Documents", "Produits", "Finances", "Équipe"];
const browser = await launch();
const report = {};
for (const mode of ["light", "dark"]) {
  for (const label of [...PAGES, "Dossier patient", "Recherche ⌘K"]) {
    const page = await open(browser, { mode, width: 1440, height: 900, scale: 1 });
    await boot(page, URL_);
    if (label === "Dossier patient") { await page.goto(`${URL_}#/patient/mokqe7ghookikhre1f`); await page.waitForTimeout(3000); }
    else if (label === "Recherche ⌘K") { await openPalette(page); await page.locator("[data-command-palette-input]").pressSequentially("Rex", { delay: 30 }); await page.waitForTimeout(1500); }
    else if (label !== "Tableau de bord") await page.getByRole("button", { name: label, exact: true }).or(page.getByRole("link", { name: label, exact: true })).first().click({ timeout: 8000 });
    await page.waitForTimeout(2500);
    for (let i = 0; i < 20 && (await page.getByText("Chargement du module").count()); i++) await page.waitForTimeout(500);
    const text = await page.evaluate(() => document.body.innerText);
    report[`${label} (${mode})`] = {
      messages: [...new Set(text.split("\n").filter((l) => /pas pu|indisponible|Réessayer/i.test(l)).map((l) => l.trim().slice(0, 90)))],
      vueEnPanne: /n'a pas pu être chargée|n’a pas pu être chargée|Une erreur est survenue/.test(text),
      erreurs: page.errors,
      titre: text.split("\n").find((l) => l.trim().length > 3)?.slice(0, 40),
    };
    await page.screenshot({ path: `${OUT}/${label.replace(/[^\p{L}\d]+/gu, "-")}-${mode}.png` });
    await page.context().close();
  }
}
fs.writeFileSync(`${OUT}/tour.json`, JSON.stringify(report, null, 1));
const bad = Object.entries(report).filter(([, v]) => v.vueEnPanne || v.erreurs.length);
console.log(`${Object.keys(report).length} vues ouvertes, ${bad.length} avec panne ou erreur`); for (const [k, v] of bad) console.log(k, JSON.stringify(v).slice(0, 300));
await browser.close();
