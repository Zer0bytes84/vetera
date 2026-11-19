// Chaque entree de la barre laterale, une session neuve chacune : garde-fou ou erreur ? Usage : node vues.mjs <url>
import { chromium } from "/media/psf/Home/.dev-browser/node_modules/playwright-core/index.mjs";
import fs from "node:fs";
const URL_ = process.argv[2];
const STORE = fs.readFileSync("/home/parallels/work/whatsapp-banc/store.json", "utf8");
const browser = await chromium.launch({ executablePath: "/home/parallels/.cache/ms-playwright/chromium-1254/chrome-linux-arm64/chrome", args: ["--no-sandbox"] });
const labels = ["Tableau de bord", "Patients", "Agenda", "Flux", "Rappels", "Soins", "Hospitalisation", "Documents", "Produits", "Finances", "Équipe"];
const out = [];
for (const label of labels) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR" });
  await ctx.addInitScript((db) => { if (!localStorage.getItem("vetera.browser-db.v1")) localStorage.setItem("vetera.browser-db.v1", db); localStorage.setItem("auth_token", "banc"); localStorage.setItem("baitari:last-seen-version", "5.1.0"); localStorage.setItem("baitari-guided-tour-v1", JSON.stringify({ dismissed: true })); }, STORE);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(`PAGEERR ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error" && !m.text().includes("Failed to load resource")) errors.push(m.text().slice(0, 160)); });
  await page.goto(URL_, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3500);
  const entry = page.getByRole("button", { name: label, exact: true }).or(page.getByRole("link", { name: label, exact: true })).first();
  let clic = "ok";
  try { await entry.click({ timeout: 5000 }); } catch (e) { clic = (e.message.match(/(intercepts pointer events|not visible|not enabled|Timeout)/) ?? ["echec"])[0]; }
  await page.waitForTimeout(3000);
  for (let i = 0; i < 20 && (await page.getByText("Chargement du module").count()); i++) await page.waitForTimeout(500);
  out.push({ vue: label, clic, gardeFou: (await page.getByText("Cette vue n’a pas pu être chargée").count()) > 0, erreurs: errors.length, premiere: errors[0] ?? "" });
  await ctx.close();
}
console.table(out);
await browser.close();
