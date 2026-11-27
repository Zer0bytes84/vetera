// Démarrage du build de production dans Chromium (proxy de la webview) : FCP, DOMContentLoaded,
// temps de script, sur N chargements à froid (contexte neuf à chaque fois, cache HTTP vide).
// node demarrage-chromium.mjs <url> <n>
import { createRequire } from "node:module";
const require = createRequire("/media/psf/Home/.dev-browser/package.json");
const { chromium } = require("playwright");
const [url, nArg = "5"] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: process.env.HOME + "/.cache/ms-playwright/chromium-1255/chrome-linux-arm64/chrome" });
const runs = [];
for (let i = 0; i < Number(nArg); i++) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Performance.enable");
  await page.goto(url, { waitUntil: "load" });
  await page.waitForFunction(() => document.querySelector("#root")?.children.length > 0, null, { timeout: 30000 });
  await page.waitForTimeout(1500);
  const nav = await page.evaluate(() => {
    const n = performance.getEntriesByType("navigation")[0];
    const fcp = performance.getEntriesByName("first-contentful-paint")[0];
    const js = performance.getEntriesByType("resource").filter((r) => r.name.endsWith(".js"));
    return { dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd), fcp: Math.round(fcp?.startTime ?? -1), jsRequests: js.length, jsKB: Math.round(js.reduce((s, r) => s + r.decodedBodySize, 0) / 1000) };
  });
  const m = Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((x) => [x.name, x.value]));
  runs.push({ ...nav, scriptMs: Math.round(m.ScriptDuration * 1000), layoutMs: Math.round(m.LayoutDuration * 1000), styleMs: Math.round(m.RecalcStyleDuration * 1000), heapMB: Math.round(m.JSHeapUsedSize / 1e6), text: (await page.innerText("body")).slice(0, 60).replace(/\s+/g, " ") });
  await ctx.close();
}
await browser.close();
const med = (k) => runs.map((r) => r[k]).sort((a, b) => a - b)[Math.floor(runs.length / 2)];
console.log(JSON.stringify({ median: Object.fromEntries(["dcl", "fcp", "load", "scriptMs", "layoutMs", "styleMs", "heapMB", "jsRequests", "jsKB"].map((k) => [k, med(k)])), first: runs[0] }));
