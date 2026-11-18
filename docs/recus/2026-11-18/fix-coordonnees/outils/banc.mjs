// Banc navigateur du bouton WhatsApp : copie de la base avec les cas ZZ-TEST, horloge figee au 17 novembre 2026,
// theme Clean clair ou sombre. Aucune requete ne part vers wa.me : window.open est remplace par un enregistreur.
import { chromium } from "/media/psf/Home/.dev-browser/node_modules/playwright-core/index.mjs";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";

const HERE = new URL(".", import.meta.url).pathname;
const SQL = new DatabaseSync(`${HERE}base-test.db`, { readOnly: true });
const stores = new Map();
const readStore = (name) => { if (!stores.has(name)) stores.set(name, fs.readFileSync(`${HERE}${name}`, "utf8")); return stores.get(name); };
// Le mode navigateur ne lit pas les rappels (SQLite natif) : ses lectures SQL passent par la copie, en lecture seule.
const PATCHES = [
  [/\/src\/services\/sqlite\/database\.ts/, (js) => js.replace(/(export function runDbRead\(operation\) \{)/, "$1 if (window.__benchSelect) return operation({ select: (sql, binds) => window.__benchSelect(sql, binds ?? []) });")],
];
export const URL_ = "http://127.0.0.1:5211/";
const EXE = "/home/parallels/.cache/ms-playwright/chromium-1254/chrome-linux-arm64/chrome";
const FIXED = new Date("2026-11-17T10:00:00+01:00");

export const launch = () => chromium.launch({ executablePath: EXE, args: ["--no-sandbox", "--disable-gpu", "--font-render-hinting=none"] });

// clock : une date fixe (par defaut le 17 novembre 2026 a 10 h) ou { install: <date> } pour une horloge qui avance et se pilote.
export async function open(browser, { mode = "light", width = 1440, height = 900, store = "store.json", clock = FIXED } = {}) {
  const STORE = readStore(store);
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce", locale: "fr-FR", timezoneId: "Europe/Paris" });
  const page = await ctx.newPage();
  page.errors = [];
  page.on("pageerror", (e) => page.errors.push(`PAGEERR ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") page.errors.push(`console.error ${m.text().slice(0, 200)}`); });
  // Garde : aucune requete vers WhatsApp ne doit partir du banc.
  await ctx.route(/wa\.me|whatsapp\.com/, (route) => { page.errors.push(`REQUETE WHATSAPP ${route.request().url()}`); return route.abort(); });
  await page.exposeFunction("__benchSelect", (sql, binds) => SQL.prepare(sql).all(...binds.map((b) => (typeof b === "boolean" ? Number(b) : b ?? null))));
  for (const [re, fix] of PATCHES) await page.route(re, async (route) => { const r = await route.fetch(); const js = await r.text(); const out = fix(js); if (out === js) page.errors.push(`PATCH SANS EFFET ${route.request().url()}`); await route.fulfill({ response: r, body: out }); });
  if (clock instanceof Date) await page.clock.setFixedTime(clock); else await page.clock.install({ time: clock.install });
  await page.addInitScript(([m, db]) => {
    if (!localStorage.getItem("vetera.browser-db.v1")) localStorage.setItem("vetera.browser-db.v1", db);
    localStorage.setItem("auth_token", "banc");
    localStorage.setItem("theme-config", JSON.stringify({ skin: "clean" }));
    localStorage.setItem("theme", m);
    localStorage.setItem("baitari:last-seen-version", "5.0.10");
    localStorage.setItem("baitari-guided-tour-v1", JSON.stringify({ dismissed: true }));
    window.__opened = [];
    window.open = (url) => { window.__opened.push(String(url)); return null; };
  }, [mode, STORE]);
  page.go = async (hash) => {
    await page.goto(URL_ + hash, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    for (let i = 0; i < 20 && await page.getByText("Chargement du module").count(); i++) await page.waitForTimeout(500);
  };
  return page;
}
