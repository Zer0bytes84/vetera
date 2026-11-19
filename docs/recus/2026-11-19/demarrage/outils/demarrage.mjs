// Premier chargement jusqu'au tableau de bord, sur l'app assemblée en production : temps (premier affichage, cartes
// du tableau de bord remplies), octets JS/CSS reçus avant que le tableau soit prêt, tâches longues du fil principal,
// temps de script. Trois passes à froid. Usage : node demarrage.mjs <url> <sortie.json>
import fs from "node:fs";
import { chromium } from "/media/psf/Home/.dev-browser/node_modules/playwright-core/index.mjs";
const [URL_, OUT] = process.argv.slice(2);
const STORE = fs.readFileSync("/home/parallels/work/recherche-banc/store-recherche.json", "utf8");
const browser = await chromium.launch({ executablePath: "/home/parallels/.cache/ms-playwright/chromium-1254/chrome-linux-arm64/chrome", args: ["--no-sandbox", "--disable-gpu"] });
const runs = [];
for (let i = 0; i < Number(process.env.RUNS ?? 3); i++) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR", timezoneId: "Europe/Paris" });
  await ctx.addInitScript((store) => {
    localStorage.setItem("vetera.browser-db.v1", store); localStorage.setItem("auth_token", "banc"); localStorage.setItem("theme-config", JSON.stringify({ skin: "clean" }));
    localStorage.setItem("theme", "light"); localStorage.setItem("baitari:last-seen-version", "9.9.9"); localStorage.setItem("baitari-guided-tour-v1", JSON.stringify({ dismissed: true }));
    window.__longtasks = []; new PerformanceObserver((list) => { for (const e of list.getEntries()) window.__longtasks.push({ start: Math.round(e.startTime), ms: Math.round(e.duration) }); }).observe({ type: "longtask", buffered: true });
    window.__lcp = 0; new PerformanceObserver((list) => { for (const e of list.getEntries()) window.__lcp = Math.round(e.startTime); }).observe({ type: "largest-contentful-paint", buffered: true });
  }, STORE);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Performance.enable");
  const requests = [];
  page.on("response", async (r) => { const u = r.url(); if (!u.startsWith(URL_)) return; const h = await r.allHeaders(); const b = await r.body().catch(() => Buffer.alloc(0)); requests.push({ url: u.replace(URL_, "/"), type: r.request().resourceType(), bytes: b.length, at: Date.now() }); });
  const t0 = Date.now();
  await page.goto(URL_, { waitUntil: "domcontentloaded" });
  // Ready = the dashboard's first row of cards carries numbers (or its empty states), whichever comes first.
  await page.waitForFunction(() => document.querySelectorAll('main [data-slot="band"] [data-slot="panel"]').length >= 3 && !document.body.innerText.includes("Chargement du module"), null, { timeout: 60000, polling: 50 });
  const ready = Date.now() - t0;
  await page.waitForTimeout(3000);
  const nav = await page.evaluate(() => { const n = performance.getEntriesByType("navigation")[0]; const p = performance.getEntriesByType("paint"); return { domContentLoaded: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd), fcp: Math.round(p.find((x) => x.name === "first-contentful-paint")?.startTime ?? 0), lcp: window.__lcp, longtasks: window.__longtasks }; });
  const metrics = Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));
  const before = requests.filter((r) => r.at - t0 <= ready);
  const sum = (list, type) => list.filter((r) => !type || r.type === type).reduce((s, r) => s + r.bytes, 0);
  runs.push({ pret: ready, ...nav, longtasksTotal: nav.longtasks.reduce((s, t) => s + t.ms, 0), longtasksAvantPret: nav.longtasks.filter((t) => t.start <= ready).reduce((s, t) => s + t.ms, 0), scriptMs: Math.round(metrics.ScriptDuration * 1000), layoutMs: Math.round(metrics.LayoutDuration * 1000), recalcStyleMs: Math.round(metrics.RecalcStyleDuration * 1000), taskMs: Math.round(metrics.TaskDuration * 1000), heapMo: Math.round(metrics.JSHeapUsedSize / 1e6), avantPret: { requetes: before.length, js: sum(before, "script"), css: sum(before, "stylesheet"), total: sum(before) }, apres3s: { requetes: requests.length, js: sum(requests, "script"), total: sum(requests) }, scriptsAvantPret: before.filter((r) => r.type === "script").sort((a, b) => b.bytes - a.bytes).slice(0, 25).map((r) => `${r.url} ${Math.round(r.bytes / 1024)} Ko`) });
  await ctx.close();
}
fs.writeFileSync(OUT, JSON.stringify(runs, null, 1));
for (const r of runs) console.log(JSON.stringify({ pret: r.pret, fcp: r.fcp, lcp: r.lcp, dcl: r.domContentLoaded, longtasksAvantPret: r.longtasksAvantPret, scriptMs: r.scriptMs, taskMs: r.taskMs, jsAvantPretKo: Math.round(r.avantPret.js / 1024), requetes: r.avantPret.requetes }));
await browser.close();
