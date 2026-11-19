// Banc de la Recherche : l'application assemblée comme la release, store du navigateur et base SQLite masqués (noms
// fictifs, consultations ZZ-TEST), lectures natives servies depuis la copie en lecture seule.
import { chromium } from "/media/psf/Home/.dev-browser/node_modules/playwright-core/index.mjs";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
const STORE = fs.readFileSync("/home/parallels/work/recherche-banc/store-recherche.json", "utf8");
const EXE = "/home/parallels/.cache/ms-playwright/chromium-1254/chrome-linux-arm64/chrome";
export const launch = () => chromium.launch({ executablePath: EXE, args: ["--no-sandbox", "--disable-gpu", "--font-render-hinting=none"] });
const RECENTS = JSON.stringify([
  { kind: "patient", id: "zz-p3", label: "Rex", sub: "Chien · Berger", at: 1763452800000 },
  { kind: "view", id: "agenda", label: "Agenda", sub: "Planning et rendez-vous", at: 1763449200000 },
]);
export async function open(browser, { mode = "light", width = 1440, height = 900, db = "/home/parallels/work/recherche-banc/base-recherche.db", clock = new Date("2026-11-18T10:00:00+01:00"), scale = 2, recents = true, hospi = true } = {}) {
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
  await page.route(/\.(js|ts|tsx)(\?.*)?$/, async (route) => {
    const r = await route.fetch(); const js = await r.text();
    if (!js.includes("function runDbRead(operation) {")) return route.fulfill({ response: r, body: js });
    await route.fulfill({ response: r, body: js.replace("function runDbRead(operation) {", "function runDbRead(operation) { if (window.__benchSelect) return operation({ select: (sql, binds) => window.__benchSelect(sql, binds ?? []), execute: async () => ({ rowsAffected: 0 }) });") });
  });
  await page.clock.setFixedTime(clock);
  await page.addInitScript(([m, store, rec]) => {
    if (!localStorage.getItem("vetera.browser-db.v1")) localStorage.setItem("vetera.browser-db.v1", store);
    localStorage.setItem("auth_token", "banc"); localStorage.setItem("theme-config", JSON.stringify({ skin: "clean" })); localStorage.setItem("theme", m);
    localStorage.setItem("baitari:last-seen-version", "9.9.9"); localStorage.setItem("baitari-guided-tour-v1", JSON.stringify({ dismissed: true }));
    if (rec) localStorage.setItem("vetera:palette-recents", rec); else localStorage.removeItem("vetera:palette-recents");
  }, [mode, STORE, recents ? RECENTS : null]);
  return page;
}
export async function boot(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3500);
  const ok = page.getByRole("button", { name: "Compris" }); if (await ok.count()) await ok.click();
  await page.waitForTimeout(500);
}
export async function openPalette(page) {
  await page.locator(".shell-header-search-field").click();
  await page.locator("[data-command-palette-input]").waitFor({ timeout: 5000 });
  await page.waitForTimeout(400);
}
export async function type(page, text, wait = 1400) {
  const input = page.locator("[data-command-palette-input]");
  await input.fill("");
  if (text) await input.pressSequentially(text, { delay: 30 });
  await page.waitForTimeout(wait);
}
// Inventory: every group heading and every item (its value, its visible text) in the order shown, plus the tabs.
export const inventory = (page) => page.evaluate(() => {
  const root = document.querySelector("[cmdk-root]");
  if (!root) return null;
  const vis = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
  const groups = [...root.querySelectorAll("[cmdk-group]")].filter((g) => !g.hidden && vis(g)).map((g) => ({
    titre: g.querySelector("[cmdk-group-heading]")?.textContent?.trim() ?? "",
    items: [...g.querySelectorAll("[cmdk-item]")].filter(vis).map((i) => ({ value: i.getAttribute("data-value"), texte: i.innerText.replace(/\s+/g, " ").trim(), actif: i.getAttribute("data-selected") === "true" })),
  }));
  const tabs = [...root.querySelectorAll('[role="tab"]')].filter(vis).map((t) => ({ texte: t.innerText.trim(), actif: t.getAttribute("aria-selected") === "true" }));
  const empty = root.querySelector("[cmdk-empty]");
  const list = root.querySelector("[cmdk-list]");
  return { tabs, groups, vide: empty && vis(empty) ? empty.innerText.replace(/\s+/g, " ").trim() : null, pied: root.lastElementChild?.innerText?.replace(/\s+/g, " ").trim() ?? null, premierEcran: list ? [...list.querySelectorAll("[cmdk-item]")].filter((i) => { const r = i.getBoundingClientRect(); const l = list.getBoundingClientRect(); return vis(i) && r.top < l.bottom && r.bottom > l.top; }).map((i) => i.innerText.split("\n")[0].trim()) : [] };
});
// Finish: every element of the palette that draws a line or a shadow, and the radii.
export const finish = (page) => page.evaluate(() => {
  const dlg = document.querySelector('[data-slot="dialog-content"]');
  if (!dlg) return null;
  const out = { traits: [], ombres: [], rayons: {} };
  const c0 = getComputedStyle(dlg);
  out.rayons.feuille = c0.borderTopLeftRadius; out.feuilleOmbre = c0.boxShadow; out.feuilleFond = c0.backgroundColor;
  for (const el of [dlg, ...dlg.querySelectorAll("*")]) {
    const c = getComputedStyle(el);
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const name = `${el.tagName.toLowerCase()}${el.getAttribute("cmdk-item") !== null ? "[item]" : ""}${el.getAttribute("cmdk-group-heading") !== null ? "[heading]" : ""}${el.dataset.slot ? `[${el.dataset.slot}]` : ""}`;
    for (const side of ["Top", "Right", "Bottom", "Left"]) if (parseFloat(c[`border${side}Width`]) > 0 && c[`border${side}Style`] !== "none" && !c[`border${side}Color`].endsWith(", 0)") && c[`border${side}Color`] !== "transparent") { out.traits.push(`${name} border-${side.toLowerCase()} ${c[`border${side}Width`]} ${c[`border${side}Color`]}`); }
    if (c.boxShadow !== "none") out.ombres.push(`${name} ${c.boxShadow.slice(0, 90)}`);
    if (el.tagName === "HR" || el.getAttribute("cmdk-separator") !== null) out.traits.push(`${name} séparateur`);
  }
  const uniq = (a) => Object.entries(a.reduce((m, x) => ((m[x] = (m[x] || 0) + 1), m), {})).map(([k, n]) => `${n}× ${k}`);
  out.traits = uniq(out.traits); out.ombres = uniq(out.ombres);
  return out;
});
