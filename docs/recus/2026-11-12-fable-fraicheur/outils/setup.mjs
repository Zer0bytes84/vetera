import { chromium } from "/media/psf/Home/.dev-browser/node_modules/playwright-core/index.mjs";
import fs from "fs";
import { DatabaseSync } from "node:sqlite";
const SQL = new DatabaseSync(new URL("../base-test.db", import.meta.url).pathname, { readOnly: true });
// Le mode navigateur ne sait pas lire les factures (SQLite natif). Le banc sert au navigateur, sans toucher au depot,
// deux fichiers retouches : les lectures SQL passent par la copie de la base de test, en lecture seule.
const PATCHES = [
  [/\/src\/services\/sqlite\/database\.ts/, (js) => js.replace(/(export function runDbRead\(operation\) \{)/, "$1 if (window.__benchSelect) return operation({ select: (sql, binds) => window.__benchSelect(sql, binds ?? []) });")],
  [/\/src\/modules\/finances\/hooks\/use-finances-page-model\.tsx/, (js) => js.replace(/setInvoiceError\(null\);\s*if \(!isTauriRuntime\(\)\)/, "setInvoiceError(null); if (false)")],
];
export const EXE = "/home/parallels/.cache/ms-playwright/chromium-1254/chrome-linux-arm64/chrome";
export const FIXED = new Date("2026-11-12T10:00:00");
export const AVANT = "http://127.0.0.1:5198/", APRES = "http://127.0.0.1:5199/";
export const launch = () => chromium.launch({ executablePath: EXE, args: ["--no-sandbox", "--disable-gpu", "--font-render-hinting=none"] });
// Une page prete : base de test injectee, horloge figee, hasard a graine fixe, theme Clean dans le mode demande.
export async function open(browser, { mode = "light", dsf = 1, width = 1440, height = 900, base, motion = "reduce" }) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dsf, reducedMotion: motion, locale: "fr-FR", timezoneId: "Europe/Paris" });
  const page = await ctx.newPage();
  page.errors = [];
  page.on("pageerror", (e) => page.errors.push(`PAGEERR ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") page.errors.push(`console.error ${m.text().slice(0, 200)}`); });
  await page.exposeFunction("__benchSelect", (sql, binds) => SQL.prepare(sql).all(...binds.map((b) => (typeof b === "boolean" ? Number(b) : b ?? null))));
  for (const [re, fix] of PATCHES) await page.route(re, async (route) => { const r = await route.fetch(); const js = await r.text(); const out = fix(js); if (out === js) page.errors.push("PATCH SANS EFFET " + route.request().url()); await route.fulfill({ response: r, body: out }); });
  await page.clock.setFixedTime(FIXED);
  await page.addInitScript(([m, db]) => {
    if (!localStorage.getItem("vetera.browser-db.v1")) localStorage.setItem("vetera.browser-db.v1", db);
    localStorage.setItem("auth_token", "banc");
    localStorage.setItem("theme-config", JSON.stringify({ skin: "clean" }));
    localStorage.setItem("theme", m);
    localStorage.setItem("baitari:last-seen-version", "5.0.9");
    let seed = 1234567; Math.random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  }, [mode, fs.readFileSync(base, "utf8")]);
  page.settle = async (ms = 3000) => {
    await page.waitForTimeout(ms);
    for (let i = 0; i < 20 && await page.getByText("Chargement du module").count(); i++) await page.waitForTimeout(500);
    await page.evaluate(() => document.fonts.ready);
  };
  page.freeze = () => page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}" });
  page.go = async (url, hash) => { await page.goto(url + hash, { waitUntil: "domcontentloaded" }); await page.settle(); };
  return page;
}
