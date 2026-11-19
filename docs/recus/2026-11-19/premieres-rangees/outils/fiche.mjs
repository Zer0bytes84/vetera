// La premiere rangee de la fiche patient : bande, cartes (meme mesure que les autres pages), captures clair et sombre.
import { chromium } from "/media/psf/Home/.dev-browser/node_modules/playwright-core/index.mjs";
import fs from "node:fs";
const [URL_, OUT] = process.argv.slice(2);
const STORE = fs.readFileSync("/home/parallels/work/whatsapp-banc/store.json", "utf8");
const browser = await chromium.launch({ executablePath: "/home/parallels/.cache/ms-playwright/chromium-1254/chrome-linux-arm64/chrome", args: ["--no-sandbox"] });
fs.mkdirSync(OUT, { recursive: true });
for (const mode of ["light", "dark"]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR", deviceScaleFactor: 2 });
  await ctx.addInitScript(([db, m]) => { if (!localStorage.getItem("vetera.browser-db.v1")) localStorage.setItem("vetera.browser-db.v1", db); localStorage.setItem("auth_token", "banc"); localStorage.setItem("theme", m); localStorage.setItem("theme-config", JSON.stringify({ skin: "clean" })); localStorage.setItem("baitari:last-seen-version", "9.9.9"); localStorage.setItem("baitari-guided-tour-v1", JSON.stringify({ dismissed: true })); }, [STORE, mode]);
  const page = await ctx.newPage();
  await page.goto(URL_ + "#/patients", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(3000);
  await page.getByText("Rex", { exact: true }).first().click(); await page.waitForTimeout(3500);
  await page.mouse.move(2, 2);
  const m = await page.evaluate(() => {
    const band = document.querySelector(".patient-record-summary");
    const grid = band.querySelector(".patient-record-indicators");
    const cards = [...grid.querySelectorAll(".patient-context-card, .medical-kpi")];
    const st = (el) => { const c = getComputedStyle(el); return { radius: c.borderTopLeftRadius, bg: c.backgroundColor, border: c.borderTopWidth, shadow: c.boxShadow }; };
    const b = band.getBoundingClientRect(); const r = cards.map((c) => c.getBoundingClientRect()); const R = (x) => Math.round(x * 10) / 10;
    const cs = getComputedStyle(grid); return { conteneur: { bg: cs.backgroundColor, shadow: cs.boxShadow, radius: cs.borderTopLeftRadius, gap: cs.columnGap }, padding: getComputedStyle(cards[0]).padding, bande: { ...st(band), padding: getComputedStyle(band).paddingLeft }, cartes: cards.map(st), hauteurs: r.map((x) => R(x.height)), ecarts: r.slice(1).map((x, i) => R(x.left - r[i].right)), marges: { gauche: R(r[0].left - b.left), droite: R(b.right - r.at(-1).right), bas: R(b.bottom - Math.max(...r.map((x) => x.bottom))) } };
  });
  console.log(mode, JSON.stringify(m));
  await page.locator(".patient-record-summary").first().screenshot({ path: `${OUT}/fiche-${mode}.png` });
  await ctx.close();
}
await browser.close();
