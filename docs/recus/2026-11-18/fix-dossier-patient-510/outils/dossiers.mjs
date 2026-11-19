// Ouvre la fiche de chaque patient de la liste et releve l'erreur exacte jetee par la vue (garde-fou « Cette vue n'a pas
// pu etre chargee »). Usage : node dossiers.mjs <url> [store=store.json] [nombre max]
import { chromium } from "/media/psf/Home/.dev-browser/node_modules/playwright-core/index.mjs";
import fs from "node:fs";
const URL_ = process.argv[2] ?? "http://127.0.0.1:5211/";
const STORE = fs.readFileSync(`/home/parallels/work/whatsapp-banc/${process.argv[3] ?? "store.json"}`, "utf8");
const MAX = Number(process.argv[4] ?? 50);
const patients = JSON.parse(STORE).tables.patients.filter((p) => !p.archivedAt).slice(0, MAX);
const browser = await chromium.launch({ executablePath: "/home/parallels/.cache/ms-playwright/chromium-1254/chrome-linux-arm64/chrome", args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR", timezoneId: "Europe/Paris" });
await ctx.addInitScript((db) => {
  if (!localStorage.getItem("vetera.browser-db.v1")) localStorage.setItem("vetera.browser-db.v1", db);
  localStorage.setItem("auth_token", "banc");
  localStorage.setItem("theme-config", JSON.stringify({ skin: "clean" }));
  localStorage.setItem("baitari:last-seen-version", "5.1.0");
  localStorage.setItem("baitari-guided-tour-v1", JSON.stringify({ dismissed: true }));
}, STORE);
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(`PAGEERR ${e.message}`));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 600)); });
await page.goto(URL_, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(4000);
const results = [];
for (const { id, name: patientName } of patients) {
  await page.goto(URL_ + "#/patients", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  for (let i = 0; i < 20 && (await page.getByText("Chargement du module").count()); i++) await page.waitForTimeout(500);
  const ok = page.getByRole("button", { name: "Compris" });
  if (await ok.count()) { await ok.click(); await page.waitForTimeout(400); }
  await page.getByPlaceholder("Nom ou propriétaire").fill(patientName);
  await page.waitForTimeout(500);
  errors.length = 0;
  const row = page.locator(`[data-row-id="${id}"]`);
  if (!(await row.count())) { results.push({ id, plante: null, titre: "ligne introuvable" }); continue; }
  await row.click();
  await page.waitForTimeout(2500);
  for (let i = 0; i < 20 && (await page.getByText("Chargement du module").count()); i++) await page.waitForTimeout(500);
  const crashed = await page.getByText("Cette vue n’a pas pu être chargée").count();
  const name = await page.locator("h1, h2").first().innerText().catch(() => "?");
  results.push({ id, plante: crashed > 0, titre: name.trim().slice(0, 40), erreurs: [...errors].slice(0, 3) });
}
console.log(JSON.stringify(results, null, 1));
console.log(`${results.filter((r) => r.plante).length} / ${results.length} fiches plantent`);
await browser.close();
