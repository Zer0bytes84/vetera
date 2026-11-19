// Le tableau de bord pendant son chargement : les tables arrivent après un délai fixe (patch servi à la volée, comme
// runDbRead), et on relève toutes les 50 ms ce que montre la rangée « Chiffres clés » : des zéros, un squelette, sa
// hauteur ; plus le décalage de mise en page (layout-shift) et des captures pendant et après.
// Usage : node chargement.mjs <url> <dossier> [délai ms]
import fs from "node:fs";
import { launch, open } from "./banc.mjs";
const [URL_, OUT, DELAY = "1500"] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const browser = await launch();
const result = {};
for (const mode of ["light", "dark"]) {
  const page = await open(browser, { mode, width: 1440, height: 900, scale: 2 });
  await page.route(/useSQLite-[^/]*\.js(\?.*)?$/, async (route) => {
    const r = await route.fetch(); let js = await r.text();
    js = js.replace("if (safeTableName && !isTauriRuntime() && !tableSnapshotCache.has(safeTableName))", "if (!(window.__benchDelay && !window.__benchKeep.includes(safeTableName)) && safeTableName && !isTauriRuntime() && !tableSnapshotCache.has(safeTableName))");
    js = js.replace("async function loadTableSnapshot(table, force = false) {\n\tif (!isTauriRuntime()) {\n", "async function loadTableSnapshot(table, force = false) {\n\tif (!isTauriRuntime()) {\n\t\tif (window.__benchDelay && !window.__benchKeep.includes(table)) await new Promise((resolve) => setTimeout(resolve, window.__benchDelay));\n");
    await route.fulfill({ response: r, body: js });
  });
  await page.addInitScript((delay) => {
    window.__benchDelay = delay;
    // The tables the app needs to authenticate and set itself up come at once: only the dashboard's data is late.
    window.__benchKeep = ["users", "sessions", "app_settings", "notification_state", "document_templates", "migrations"];
    window.__shift = 0;
    new PerformanceObserver((list) => { for (const e of list.getEntries()) if (!e.hadRecentInput) window.__shift += e.value; }).observe({ type: "layout-shift", buffered: true });
    window.__samples = [];
    const t0 = performance.now();
    const tick = () => {
      const band = [...document.querySelectorAll("[data-slot=band]")].find((b) => /Chiffres clés/.test(b.textContent ?? "")) ?? document.querySelector('[data-slot="loading-skeleton"]');
      const text = band?.textContent ?? "";
      window.__samples.push({ t: Math.round(performance.now() - t0), squelette: !!(band && band.querySelector('[role="status"][aria-busy="true"]')), values: band ? [...band.querySelectorAll('[data-slot="stat-value"]')].map((el) => el.textContent.replace(/\s+/g, " ").trim()) : [], hauteur: band ? Math.round(band.getBoundingClientRect().height) : 0 });
      if (performance.now() - t0 < delay + 6000) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, Number(DELAY));
  await page.goto(URL_, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => [...document.querySelectorAll("[data-slot=band]")].some((b) => /Chiffres clés/.test(b.textContent ?? "")) || document.querySelector('[data-slot="loading-skeleton"]'), null, { timeout: 15000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/pendant-${mode}.png`, clip: { x: 0, y: 0, width: 1440, height: 560 } });
  await page.waitForTimeout(Number(DELAY) + 2500);
  await page.screenshot({ path: `${OUT}/apres-${mode}.png`, clip: { x: 0, y: 0, width: 1440, height: 560 } });
  const data = await page.evaluate(() => ({ samples: window.__samples, shift: Math.round(window.__shift * 1000) / 1000 })); result.dernier = data.samples.at(-1);
  const seen = data.samples.filter((sample) => sample.hauteur > 0 || sample.squelette);
  const final = seen.at(-1)?.values ?? [];
  const span = (list) => (list.length ? `${list[0].t}–${list.at(-1).t} ms (${list.length} images)` : "jamais");
  // A false figure: a card shows a value that is not the one it ends with.
  const wrong = seen.filter((sample) => sample.values.length && sample.values.some((value, i) => final[i] !== undefined && value !== final[i]));
  result[mode] = {
    decalageCumule: data.shift,
    rangeeVisibleDes: seen[0]?.t ?? null,
    valeursFinales: final,
    valeursFaussesAffichees: span(wrong),
    exempleDeValeursFausses: wrong[0]?.values ?? null,
    squeletteAffiche: span(seen.filter((sample) => sample.squelette)),
    hauteurs: [...new Set(seen.map((sample) => sample.hauteur))],
    erreurs: page.errors,
  };
  await page.context().close();
}
fs.writeFileSync(`${OUT}/chargement.json`, JSON.stringify(result, null, 1));
console.log(JSON.stringify(result));
await browser.close();
