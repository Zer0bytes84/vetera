// Soins et Hospitalisation depuis la barre laterale : la vue charge-t-elle, la navigation part-elle, quelle erreur ?
// Usage : node clinique.mjs <url>
import { chromium } from "/media/psf/Home/.dev-browser/node_modules/playwright-core/index.mjs";
import fs from "node:fs";
const URL_ = process.argv[2];
const STORE = fs.readFileSync("/home/parallels/work/whatsapp-banc/store.json", "utf8");
const browser = await chromium.launch({ executablePath: "/home/parallels/.cache/ms-playwright/chromium-1254/chrome-linux-arm64/chrome", args: ["--no-sandbox"] });
const out = {};
for (const label of ["Soins", "Hospitalisation"]) {
  // Une session neuve par vue : le premier chargement est celui qui compte.
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR" });
  await ctx.addInitScript((db) => { if (!localStorage.getItem("vetera.browser-db.v1")) localStorage.setItem("vetera.browser-db.v1", db); localStorage.setItem("auth_token", "banc"); localStorage.setItem("baitari:last-seen-version", "5.1.0"); localStorage.setItem("baitari-guided-tour-v1", JSON.stringify({ dismissed: true })); }, STORE);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(`PAGEERR ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 300)); });
  await page.goto(URL_, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);
  const ok = page.getByRole("button", { name: "Compris" }); if (await ok.count()) await ok.click();
  const before = await page.evaluate(() => location.hash + "|" + document.title);
  await page.getByRole("button", { name: label, exact: true }).or(page.getByRole("link", { name: label, exact: true })).first().click();
  await page.waitForTimeout(3500);
  for (let i = 0; i < 20 && (await page.getByText("Chargement du module").count()); i++) await page.waitForTimeout(500);
  out[label] = {
    navigation: before !== (await page.evaluate(() => location.hash + "|" + document.title)) || (await page.locator("main").innerText()).includes(label),
    gardeFou: (await page.getByText("Cette vue n’a pas pu être chargée").count()) > 0,
    fil: (await page.locator("header").first().innerText()).replace(/\s+/g, " ").slice(0, 80),
    erreurs: errors.slice(0, 3),
  };
  await ctx.close();
}
console.log(JSON.stringify(out, null, 1));
await browser.close();
