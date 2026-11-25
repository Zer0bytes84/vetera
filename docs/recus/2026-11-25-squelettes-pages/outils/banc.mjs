// Banc des squelettes : l'application dans le navigateur (serveur de dév. avec banc/vite.banc.config.ts), une
// vétérinaire connectée, les données de démonstration de l'application. Avec `delai`, chaque lecture arrive en retard,
// comme sur l'app de bureau (pont SQLite), et l'on relève ce que montre la première bande pendant et après.
import pw from "/opt/node-tools/node_modules/playwright/index.js";
export const launch = () => pw.chromium.launch();
const STORE = JSON.stringify({ tables: {
  users: [{ id: "banc-u1", email: "aissa@banc.local", displayName: "Aïssa Banc", role: "vet_principal", status: "active" }],
  sessions: [{ id: "banc-s1", userId: "banc-u1", token: "banc", expiresAt: "2030-01-01T00:00:00.000Z" }],
} });
export async function context(browser, { mode = "light", width = 1440, height = 900, scale = 1 } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, locale: "fr-FR", timezoneId: "Africa/Algiers", deviceScaleFactor: scale, reducedMotion: "reduce" });
  await ctx.addInitScript(([m, store]) => {
    if (!localStorage.getItem("vetera.browser-db.v1")) localStorage.setItem("vetera.browser-db.v1", store);
    localStorage.setItem("auth_token", "banc"); localStorage.setItem("theme", m);
    localStorage.setItem("baitari:last-seen-version", "5.2.0"); localStorage.setItem("baitari-guided-tour-v1", JSON.stringify({ dismissed: true }));
  }, [mode, STORE]);
  return ctx;
}
export async function page(ctx) {
  const p = await ctx.newPage();
  p.errors = [];
  p.on("pageerror", (e) => p.errors.push(`PAGEERR ${e.message}`.slice(0, 240)));
  p.on("console", (m) => { if (m.type() === "error") p.errors.push(m.text().slice(0, 240)); });
  return p;
}
