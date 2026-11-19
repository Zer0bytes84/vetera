// Le reçu de la porte de lecture sous la réponse, puis Échap ferme le panneau ; et la page n'a pas défilé.
import { launch, open, boot } from "./banc.mjs";
const browser = await launch();
const page = await open(browser, { scale: 1 });
await boot(page, process.argv[2]);
await page.getByRole("button", { name: /Ouvrir l'Assistant IA/ }).click(); await page.waitForTimeout(1200);
await page.getByRole("radio", { name: /Données/ }).click(); await page.waitForTimeout(600);
const box = page.locator("[data-clinic-answers] textarea").first();
await box.fill("recettes du mois dernier"); await page.keyboard.press("Enter"); await page.waitForTimeout(2000);
const recu = await page.evaluate(() => [...document.querySelectorAll("[data-clinic-answers] *")].map((e) => e.textContent ?? "").find((t) => /Copie du navigateur|Porte de lecture/.test(t) && t.length < 200) ?? null);
const focusApres = await page.evaluate(() => document.activeElement?.tagName); const echapChamp = await (async () => { await box.focus(); await page.keyboard.press("Escape"); await page.waitForTimeout(400); return page.evaluate(() => document.querySelector(`[data-slot="assistant-panel"]`)?.getAttribute("data-state") ?? "démonté"); })(); await page.getByRole("radio", { name: /Données/ }).focus(); await page.keyboard.press("Escape"); await page.waitForTimeout(800);
const state = await page.evaluate(() => document.querySelector('[data-slot="assistant-panel"]')?.getAttribute("data-state") ?? "démonté");
console.log(JSON.stringify({ recu: recu?.slice(0, 60), focusApresReponse: focusApres, echapDansLeChamp: echapChamp, echapHorsChamp: state, erreurs: page.errors }));
await browser.close();
