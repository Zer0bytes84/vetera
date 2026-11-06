import { chromium } from "/Users/zohir/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs";
const ctx = await chromium.launchPersistentContext(new URL("./profile", import.meta.url).pathname, { headless: true, executablePath: "/Users/zohir/Library/Caches/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-mac-arm64/chrome-headless-shell", viewport: { width: 1440, height: 900 } });
const p = ctx.pages()[0] ?? await ctx.newPage();
const fonts = [], external = [];
p.on("request", (r) => { const u = new URL(r.url()); if (r.resourceType() === "font") fonts.push(u.host + u.pathname.split("/").pop()); if (!["localhost:5173"].includes(u.host) && u.protocol.startsWith("http")) external.push(r.url()); });
for (const set of ["inter", "geist", "plex", "signature"]) {
  await p.goto("http://localhost:5173/");
  await p.evaluate((s) => { const c = JSON.parse(localStorage.getItem("theme-config")); c.cleanFont = s; localStorage.setItem("theme-config", JSON.stringify(c)); }, set);
  await p.goto("http://localhost:5173/#/stock"); await p.reload(); await p.waitForTimeout(2500);
}
await p.evaluate(() => { const c = JSON.parse(localStorage.getItem("theme-config")); c.cleanFont = "inter"; localStorage.setItem("theme-config", JSON.stringify(c)); });
console.log(JSON.stringify({ fonts: [...new Set(fonts)], external }, null, 1));
await ctx.close();
