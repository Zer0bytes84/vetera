// Les vues qui ont planté en 5.1.0 (cycle de morceaux) : dossier patient, Soins, Hospitalisation ; et une page à graphiques.
import fs from "node:fs";
import { chromium } from "/media/psf/Home/.dev-browser/node_modules/playwright-core/index.mjs";
const STORE = fs.readFileSync("/home/parallels/work/recherche-banc/store-recherche.json", "utf8");
const browser = await chromium.launch({ executablePath: "/home/parallels/.cache/ms-playwright/chromium-1254/chrome-linux-arm64/chrome", args: ["--no-sandbox"] });
const out = {};
for (const [name, go] of [["dossier patient", async (p) => { await p.goto(process.argv[2] + "#/patient/zz-p3"); }], ["Soins", async (p) => { await p.locator(`[data-slot="sidebar-menu-button"][aria-label="Soins"]`).click(); }], ["Hospitalisation", async (p) => { await p.locator(`[data-slot="sidebar-menu-button"][aria-label="Hospitalisation"]`).click(); }], ["Finances", async (p) => { await p.locator(`[data-slot="sidebar-menu-button"][aria-label="Finances"]`).click(); }]]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript((s) => { localStorage.setItem("vetera.browser-db.v1", s); localStorage.setItem("auth_token", "banc"); localStorage.setItem("theme-config", JSON.stringify({ skin: "clean" })); localStorage.setItem("baitari:last-seen-version", "9.9.9"); localStorage.setItem("baitari-guided-tour-v1", JSON.stringify({ dismissed: true })); }, STORE);
  const page = await ctx.newPage(); const errs = []; page.on("pageerror", (e) => errs.push(e.message.slice(0, 120)));
  await page.goto(process.argv[2]); await page.waitForTimeout(2500); await go(page); await page.waitForTimeout(3500);
  const text = await page.evaluate(() => document.querySelector("main")?.innerText ?? "");
  out[name] = { erreurs: errs, planté: /Cette vue n.est pas disponible|Une erreur|not a function/.test(text), extrait: text.replace(/\s+/g, " ").slice(0, 70) };
  await ctx.close();
}
console.log(JSON.stringify(out, null, 1)); await browser.close();
