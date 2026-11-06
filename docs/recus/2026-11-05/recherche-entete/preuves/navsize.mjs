import { chromium } from "/Users/zohir/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs";
const OUT = process.argv[2];
const ctx = await chromium.launchPersistentContext(new URL("./profile", import.meta.url).pathname, { headless: true, executablePath: "/Users/zohir/Library/Caches/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-mac-arm64/chrome-headless-shell", viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: "fr-FR" });
const p = ctx.pages()[0] ?? await ctx.newPage();
const res = {};
for (const tone of ["{}", null]) {
  await p.goto("http://localhost:5173/");
  const uid = await p.evaluate((t) => { localStorage.setItem("theme", "light"); const c = JSON.parse(localStorage.getItem("theme-config") || "{}"); c.skin = "clean"; delete c.cleanFont; localStorage.setItem("theme-config", JSON.stringify(c)); const db = JSON.parse(localStorage.getItem("vetera.browser-db.v1")); const u = db.tables.users.find((x) => x.email === "capture@exemple.test")?.id; localStorage.setItem("baitari-sidebar-tone", t ?? JSON.stringify({ [u]: "light" })); return u; }, tone);
  await p.goto("http://localhost:5173/#/patients"); await p.reload(); await p.waitForSelector("[data-sidebar]"); await p.waitForTimeout(1800); await p.mouse.move(1430, 890);
  const tag = tone === "{}" ? "sombre-defaut" : "claire";
  for (const size of [13, 14, 16]) {
    await p.evaluate((s) => { let st = document.getElementById("navsize"); if (!st) { st = document.createElement("style"); st.id = "navsize"; document.head.append(st); } const R = ":root:root:root[data-skin][data-skin][data-skin][data-skin]"; st.textContent = `${R} .app-sidebar [data-slot="sidebar-menu-button"], ${R} .app-sidebar [data-slot="sidebar-menu-button"] > span, ${R} .app-sidebar .sidebar-settings-button, ${R} .app-sidebar .sidebar-settings-button span { font-size: ${s}px !important; }`; }, size);
    await p.waitForTimeout(300);
    res[`${tag}-${size}`] = await p.evaluate(() => [...document.querySelectorAll('.app-sidebar [data-slot="sidebar-menu-button"]')].map((b) => { const s = b.querySelector("span"); return Math.round(b.getBoundingClientRect().height) + ":" + (s ? Math.round(s.getBoundingClientRect().height) : 0); }).join(" "));
    await p.screenshot({ path: `${OUT}/nav-${tag}-${size}px.png`, clip: { x: 0, y: 70, width: 248, height: 800 } });
  }
  await p.evaluate(() => document.getElementById("navsize")?.remove());
}
await p.evaluate(() => localStorage.setItem("baitari-sidebar-tone", "{}"));
console.log(JSON.stringify(res));
await ctx.close();
