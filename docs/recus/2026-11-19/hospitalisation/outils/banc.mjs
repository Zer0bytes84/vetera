// Banc du lot : l'application assemblee (ou le serveur de dev), base du navigateur = store.json, et lectures SQLite
// natives (soins, sejours, rappels) servies depuis une COPIE de base en lecture seule.
import { chromium } from "/media/psf/Home/.dev-browser/node_modules/playwright-core/index.mjs";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
const STORE = fs.readFileSync("/home/parallels/work/whatsapp-banc/store.json", "utf8");
const EXE = "/home/parallels/.cache/ms-playwright/chromium-1254/chrome-linux-arm64/chrome";
export const launch = () => chromium.launch({ executablePath: EXE, args: ["--no-sandbox", "--disable-gpu", "--font-render-hinting=none"] });
export async function open(browser, { mode = "light", width = 1440, height = 900, db = "/home/parallels/work/lot-banc/base-hospi.db", clock = new Date("2026-11-18T10:00:00+01:00"), scale = 1 } = {}) {
  const SQL = new DatabaseSync(db, { readOnly: true });
  const ctx = await browser.newContext({ viewport: { width, height }, locale: "fr-FR", timezoneId: "Europe/Paris", deviceScaleFactor: scale, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  page.errors = [];
  page.on("pageerror", (e) => page.errors.push(`PAGEERR ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") page.errors.push(m.text().slice(0, 200)); });
  await page.exposeFunction("__benchSelect", (sql, binds) => {
    const named = sql.replace(/\$(\d+)/g, "?$1");
    return SQL.prepare(named).all(...binds.map((b) => (typeof b === "boolean" ? Number(b) : b ?? null)));
  });
  // Toute reponse JS qui definit runDbRead (module source en dev, morceau en build) lit par la copie.
  await page.route(/\.(js|ts|tsx)(\?.*)?$/, async (route) => {
    const r = await route.fetch(); const js = await r.text();
    if (!js.includes("function runDbRead(operation) {")) return route.fulfill({ response: r, body: js });
    await route.fulfill({ response: r, body: js.replace("function runDbRead(operation) {", "function runDbRead(operation) { if (window.__benchSelect) return operation({ select: (sql, binds) => window.__benchSelect(sql, binds ?? []), execute: async () => ({ rowsAffected: 0 }) });") });
  });
  await page.clock.setFixedTime(clock);
  await page.addInitScript(([m, store]) => {
    if (!localStorage.getItem("vetera.browser-db.v1")) localStorage.setItem("vetera.browser-db.v1", store);
    localStorage.setItem("auth_token", "banc"); localStorage.setItem("theme-config", JSON.stringify({ skin: "clean" })); localStorage.setItem("theme", m);
    localStorage.setItem("baitari:last-seen-version", "9.9.9"); localStorage.setItem("baitari-guided-tour-v1", JSON.stringify({ dismissed: true }));
  }, [mode, STORE]);
  return page;
}
