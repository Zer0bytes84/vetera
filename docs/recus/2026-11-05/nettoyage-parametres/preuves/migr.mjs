import { chromium } from "/Users/zohir/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs";
const ctx = await chromium.launchPersistentContext(new URL("./profile", import.meta.url).pathname, { headless: true, executablePath: "/Users/zohir/Library/Caches/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-mac-arm64/chrome-headless-shell", viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, locale: "fr-FR" });
const p = ctx.pages()[0] ?? await ctx.newPage();
const errors = []; p.on("pageerror", (e) => errors.push(e.message)); p.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 160)); });
await p.goto("http://localhost:5173/");
const before = await p.evaluate(() => {
  localStorage.setItem("theme", "dark");
  localStorage.setItem("theme-config", JSON.stringify({ visualStyle: "classic", skin: "clean", cleanFont: "plex", chromeStyle: "classic", accent: "rose", radius: "xl", density: "compact", font: "geist", headerPattern: "tide", sidebarStyle: "floating" }));
  localStorage.setItem("layout_variant_v8", "inset"); localStorage.setItem("sidebar_glass_contrast_v1", "15");
  localStorage.setItem("baitari-sidebar-tone", JSON.stringify({ any: "light" }));
  return Object.keys(localStorage).length;
});
await p.reload(); await p.waitForSelector("[data-sidebar]"); await p.waitForTimeout(2000);
const after = await p.evaluate(() => ({ dataset: { ...document.documentElement.dataset }, dark: document.documentElement.classList.contains("dark"), config: localStorage.getItem("theme-config"), removed: ["layout_variant_v8", "sidebar_glass_contrast_v1", "baitari-sidebar-tone"].map((k) => [k, localStorage.getItem(k)]), patients: JSON.parse(localStorage.getItem("vetera.browser-db.v1")).tables.patients.length, body: getComputedStyle(document.body).fontFamily.split(",")[0] }));
await p.screenshot({ path: "param/migration-tester-clean-sombre-plex.png" });
// restore defaults for later runs
await p.evaluate(() => { localStorage.setItem("theme", "light"); localStorage.setItem("theme-config", JSON.stringify({ skin: "clean" })); });
console.log(JSON.stringify({ before, after, errors }, null, 1));
await ctx.close();
