// usage: node apparence.mjs <out.png> <skin> <mode>
import { chromium } from "/Users/zohir/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs";
const [OUT, SKIN, MODE] = process.argv.slice(2);
const ctx = await chromium.launchPersistentContext(new URL("./profile", import.meta.url).pathname, { headless: true, executablePath: "/Users/zohir/Library/Caches/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-mac-arm64/chrome-headless-shell", viewport: { width: 1440, height: 2600 }, deviceScaleFactor: 1.5, locale: "fr-FR" });
const p = ctx.pages()[0] ?? await ctx.newPage();
await p.goto("http://localhost:5173/");
await p.evaluate(([s, m]) => { localStorage.setItem("theme", m); const c = JSON.parse(localStorage.getItem("theme-config") || "{}"); c.skin = s; localStorage.setItem("theme-config", JSON.stringify(c)); }, [SKIN, MODE]);
await p.goto("http://localhost:5173/#/parametres"); await p.reload(); await p.waitForSelector("[data-sidebar]"); await p.waitForTimeout(1500);
await p.getByRole("button", { name: /^Apparence/ }).first().click(); await p.waitForTimeout(1200);
await p.mouse.move(1430, 2590);
const rows = await p.evaluate(() => [...document.querySelectorAll(".settings-content .settings-row-title, .settings-content h3")].map((e) => e.textContent.trim()));
await p.screenshot({ path: OUT });
console.log(JSON.stringify(rows));
await ctx.close();
