// Une passe : chaque état de la palette, en clair et en sombre ; captures de la feuille, inventaire, finition.
// Usage : node passe.mjs <url> <dossier>
import fs from "node:fs";
import { launch, open, boot, openPalette, type, inventory, finish } from "./banc.mjs";
const [URL_, OUT] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const STATES = [
  ["ouverture", async () => {}],
  ["dossiers", async (p) => { await p.getByRole("tab", { name: /Dossiers/ }).click().catch(() => {}); await p.waitForTimeout(500); }],
  ["commandes", async (p) => { await p.getByRole("tab", { name: /Commandes/ }).click().catch(() => {}); await p.waitForTimeout(500); }],
  ["patient-rex", async (p) => type(p, "rex")],
  ["clinique-vaccin", async (p) => type(p, "vaccin", 2200)],
  ["clinique-irc", async (p) => type(p, "IRC", 2200)],
  ["clinique-metacam", async (p) => type(p, "Metacam", 2200)],
  ["intention-rdv", async (p) => type(p, "rdv minou")],
  ["intention-facture", async (p) => type(p, "facture arbi")],
  ["page-agenda", async (p) => type(p, "agenda")],
  ["aucun-resultat", async (p) => type(p, "xyzqw", 1800)],
  ["fleche-bas", async (p) => { await p.keyboard.press("ArrowDown"); await p.keyboard.press("ArrowDown"); await p.waitForTimeout(300); }],
];
const browser = await launch();
const result = {};
for (const mode of ["light", "dark"]) {
  result[mode] = {};
  for (const [name, act] of STATES) {
    const page = await open(browser, { mode });
    await boot(page, URL_);
    if (name === "ouverture") { await page.locator(".shell-header-search-field").screenshot({ path: `${OUT}/entete-champ-${mode}.png` }); }
    await openPalette(page);
    await act(page);
    await page.mouse.move(2, 2);
    result[mode][name] = { inventaire: await inventory(page), finition: await finish(page), erreurs: page.errors };
    await page.screenshot({ path: `${OUT}/${name}-${mode}.png` });
    await page.context().close();
  }
}
// Narrow window (the sheet's container query) and the header field on hover, open.
for (const mode of ["light", "dark"]) {
  const page = await open(browser, { mode, width: 600, height: 860 });
  await boot(page, URL_);
  const field = page.locator(".shell-header-search-field");
  if (await field.isVisible()) { await field.hover(); await page.waitForTimeout(300); await field.screenshot({ path: `${OUT}/entete-champ-survol-${mode}.png` }); }
  await page.keyboard.press("Control+k"); await page.waitForTimeout(800);
  if (!(await page.locator("[data-command-palette-input]").count())) { await page.keyboard.press("Meta+k"); await page.waitForTimeout(800); }
  result[mode].etroit = { inventaire: await inventory(page), finition: await finish(page), erreurs: page.errors };
  await page.screenshot({ path: `${OUT}/etroit-${mode}.png` });
  await page.context().close();
}
fs.writeFileSync(`${OUT}/releve.json`, JSON.stringify(result, null, 1));
for (const [n, r] of Object.entries(result.light)) console.log(n.padEnd(18), r.inventaire ? `onglets ${r.inventaire.tabs.map((t) => t.texte).join("/")} | ${r.inventaire.groups.map((g) => `${g.titre}(${g.items.length})`).join(" · ")} | 1er écran: ${r.inventaire.premierEcran.slice(0, 4).join(", ")}${r.inventaire.vide ? " | VIDE " + r.inventaire.vide.slice(0, 60) : ""} | err ${r.erreurs.length}` : "pas de palette");
await browser.close();
