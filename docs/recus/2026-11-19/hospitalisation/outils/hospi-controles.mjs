// Les controles interactifs de chaque vue d'Hospitalisation (boutons, champs, listes) avec leur libelle, pour comparer
// avant et apres : une mise a niveau de presentation ne doit ni en ajouter ni en retirer. Usage : node hospi-controles.mjs <url> <sortie.json>
import fs from "node:fs";
import { launch, open } from "./banc.mjs";
const [URL_, OUT] = process.argv.slice(2);
const browser = await launch();
const page = await open(browser, { mode: "light" });
await page.goto(URL_, { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000);
await page.getByRole("button", { name: "Hospitalisation", exact: true }).first().click(); await page.waitForTimeout(2500);
const tab = page.getByRole("tab", { name: "Hospitalisation" }); if (await tab.count()) { await tab.first().click(); await page.waitForTimeout(2500); }
const controls = () => page.evaluate(() => {
  const root = document.querySelector(".hospitalisation-view");
  return [...root.querySelectorAll("button, input, select, textarea, [role=tab]")].map((e) => `${e.getAttribute("role") || e.tagName.toLowerCase()}:${(e.getAttribute("aria-label") || e.textContent || e.getAttribute("placeholder") || "").trim().replace(/\s+/g, " ").slice(0, 50)}${e.disabled ? " (inactif)" : ""}`).sort();
});
const result = {};
for (const view of ["Séjours", "Occupation", "Tournée", "Emplacements"]) {
  await page.getByRole("tab", { name: view, exact: true }).first().click(); await page.waitForTimeout(1200);
  result[view] = await controls();
}
await page.getByRole("tab", { name: "Tournée", exact: true }).first().click(); await page.waitForTimeout(800);
await page.getByRole("button", { name: "Soins et constantes" }).first().click(); await page.waitForTimeout(2000);
result["Tournée, patient choisi"] = await controls();
await page.getByRole("tab", { name: "Séjours", exact: true }).first().click(); await page.waitForTimeout(1000);
for (const [i, label] of [[0, "détail admis"], [1, "détail en cours"], [2, "détail sortie prévue"], [3, "détail sorti"]]) {
  await page.getByRole("button", { name: "Ouvrir le séjour" }).nth(i).click(); await page.waitForTimeout(2000);
  result[label] = await controls();
  await page.getByRole("button", { name: "Retour aux séjours" }).click(); await page.waitForTimeout(1500);
}
await page.getByRole("button", { name: "Admettre un patient" }).first().click(); await page.waitForTimeout(800);
result["dialogue admission"] = await page.getByRole("dialog").locator("button, input, select, textarea").evaluateAll((els) => els.map((e) => `${e.tagName.toLowerCase()}:${(e.getAttribute("aria-label") || e.textContent || "").trim().slice(0, 40)}`).sort());
result.erreurs = page.errors;
fs.writeFileSync(OUT, JSON.stringify(result, null, 1));
console.log(Object.entries(result).map(([k, v]) => `${k}: ${v.length}`).join(" | "));
await browser.close();
