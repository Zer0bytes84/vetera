// Choisit des items de chaque sorte (souris et clavier) et relève où l'app arrive : l'adresse, la vue, la fenêtre fermée,
// l'événement émis. Usage : node clics.mjs <url> <sortie.json>
import fs from "node:fs";
import { launch, open, boot, openPalette, type } from "./banc.mjs";
const [URL_, OUT] = process.argv.slice(2);
const CASES = [
  ["action Nouveau patient (souris)", null, (p) => p.locator('[cmdk-item][data-value^="action:new-patient"]').click()],
  ["action Nouveau rendez-vous (souris)", null, (p) => p.locator('[cmdk-item][data-value^="action:new-appointment"]').click()],
  ["action Nouvelle facture (souris)", null, (p) => p.locator('[cmdk-item][data-value^="action:new-invoice"]').click()],
  ["action Assistant (souris)", null, (p) => p.locator('[cmdk-item][data-value^="action:open-assistant"]').click()],
  ["récent Rex (souris)", null, (p) => p.locator('[cmdk-item][data-value^="recent:patient:zz-p3"]').click()],
  ["suggestion 1re (souris)", null, (p) => p.locator('[cmdk-item][data-value^="suggestion:"]').first().click()],
  ["requête rex, Entrée", "rex", (p) => p.keyboard.press("Enter")],
  ["requête agenda, Entrée", "agenda", (p) => p.keyboard.press("Enter")],
  ["requête IRC, Entrée", "IRC", (p) => p.keyboard.press("Enter")],
  ["requête rdv minou, Entrée", "rdv minou", (p) => p.keyboard.press("Enter")],
  ["onglet Commandes, Paramètres (souris)", null, async (p) => { await p.getByRole("tab", { name: /Commandes/ }).click(); await p.locator('[cmdk-item][data-value^="navigation:parametres"]').click(); }],
  ["onglet Dossiers, suggestion IRC (souris)", null, async (p) => { await p.getByRole("tab", { name: /Dossiers/ }).click(); await p.locator('[cmdk-item][data-value^="semantic:sug:sug-irc"]').click(); }],
  ["aucun résultat, Créer un patient", "xyzqw", (p) => p.getByRole("button", { name: /Créer un patient nommé/ }).click()],
  ["effacer la requête", "rex", (p) => p.getByRole("button", { name: "Effacer la recherche" }).click()],
  ["Échap", "rex", (p) => p.keyboard.press("Escape")],
];
const browser = await launch();
const res = {};
for (const [name, q, act] of CASES) {
  const page = await open(browser, { mode: "light", scale: 1 });
  await page.addInitScript(() => { window.__ev = []; for (const e of ["vetera:new-patient", "vetera:new-appointment", "vetera:new-invoice", "vetera:quick-consultation", "vetera:open-prescription", "vetera:open-hospitalization", "vetera:open-anesthesia"]) window.addEventListener(e, () => window.__ev.push(e)); });
  await boot(page, URL_);
  await openPalette(page);
  if (q) await type(page, q, 2000);
  await act(page);
  await page.waitForTimeout(1200);
  res[name] = await page.evaluate(() => ({
    hash: location.hash,
    paletteOuverte: !!document.querySelector("[data-command-palette-input]"),
    requete: document.querySelector("[data-command-palette-input]")?.value ?? null,
    evenements: window.__ev,
    titre: document.querySelector("main h1, main h2")?.textContent?.trim()?.slice(0, 40) ?? null,
    dialogues: [...document.querySelectorAll('[role="dialog"]')].map((d) => d.getAttribute("aria-label") || d.querySelector("h2")?.textContent?.trim()?.slice(0, 40)).filter(Boolean),
    assistant: !!document.querySelector('[data-slot="assistant-panel"], .consultation-assistant-panel[data-open="true"]'),
  }));
  res[name].erreurs = page.errors;
  await page.context().close();
}
fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
for (const [n, r] of Object.entries(res)) console.log(n.padEnd(40), JSON.stringify(r));
await browser.close();
