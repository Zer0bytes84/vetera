// Le panneau assistant, onglet Données : position de l'en-tête dans la fenêtre, défilement des conteneurs, dégradé,
// avant et après une question. Usage : node panneau.mjs <url> <dossier> [largeur hauteur]
import fs from "node:fs";
import { launch, open, boot } from "./banc.mjs";
const [URL_, OUT, W = "1440", H = "900"] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const browser = await launch();
const result = {};
for (const mode of ["light", "dark"]) {
  const page = await open(browser, { mode, width: +W, height: +H, scale: 1 });
  await boot(page, URL_);
  await page.getByRole("button", { name: "Agenda", exact: true }).first().click().catch(() => {});
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: /Ouvrir l'Assistant IA/ }).click(); await page.waitForTimeout(1500);
  await page.getByRole("radio", { name: /Données/ }).click();
  await page.waitForTimeout(1200);
  const measure = (label) => page.evaluate((label) => {
    const panel = document.querySelector('[data-slot="assistant-panel"]');
    const header = panel?.querySelector(".assistant-panel-header");
    const r = (el) => { const b = el.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), height: Math.round(b.height) }; };
    const scrolled = []; for (let e = panel?.querySelector("[data-clinic-answers]"); e && e !== document.body; e = e.parentElement) if (e.scrollTop) scrolled.push(`${e.tagName.toLowerCase()}.${[...e.classList].slice(0, 3).join(".")} scrollTop=${Math.round(e.scrollTop)}`);
    const before = panel ? getComputedStyle(panel, "::before") : null;
    const close = panel?.querySelector('[aria-label="Fermer l’assistant"]');
    const vis = (el) => { if (!el) return false; const b = el.getBoundingClientRect(); return b.bottom > 0 && b.top < innerHeight && b.width > 0; };
    return { etape: label, fenetre: innerHeight, panneau: panel && r(panel), entete: header && r(header), enteteVisible: vis(header), boutonFermerVisible: vis(close), conteneursDefiles: scrolled, degrade: before && before.content !== "none" && before.backgroundImage !== "none" ? before.backgroundImage.slice(0, 60) : "aucun", ombre: panel && getComputedStyle(panel).boxShadow.slice(0, 60), bordure: panel && getComputedStyle(panel).borderLeftWidth };
  }, label);
  result[mode] = [await measure("onglet ouvert")];
  await page.screenshot({ path: `${OUT}/panneau-ouvert-${mode}.png` });
  const box = page.locator('[data-clinic-answers] textarea, [data-clinic-answers] [contenteditable], [data-clinic-answers] input').first();
  await box.fill("recettes du mois dernier"); await page.keyboard.press("Enter"); await page.waitForTimeout(2500);
  result[mode].push(await measure("après « recettes du mois dernier »"));
  await page.screenshot({ path: `${OUT}/panneau-reponse-${mode}.png` });
  await box.fill("rendez-vous de ce mois"); await page.keyboard.press("Enter"); await page.waitForTimeout(2500);
  result[mode].push(await measure("après une 2e question"));
  await page.screenshot({ path: `${OUT}/panneau-reponse2-${mode}.png` });
  result[mode].erreurs = page.errors;
  await page.context().close();
}
fs.writeFileSync(`${OUT}/panneau.json`, JSON.stringify(result, null, 1));
for (const m of result.light) console.log(JSON.stringify(m));
await browser.close();
