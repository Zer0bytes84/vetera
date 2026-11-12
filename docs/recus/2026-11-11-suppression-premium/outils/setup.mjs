import { chromium } from "/media/psf/Home/.dev-browser/node_modules/playwright-core/index.mjs";
import fs from "fs";
export const EXE = "/home/parallels/.cache/ms-playwright/chromium-1254/chrome-linux-arm64/chrome";
export async function launch() {
  return chromium.launch({ executablePath: EXE, args: ["--no-sandbox", "--disable-gpu", "--font-render-hinting=none"] });
}
export const FIXED = new Date("2026-11-12T10:00:00");
export async function newCtx(browser, stateFile) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: "reduce", locale: "fr-FR", timezoneId: "Europe/Paris", storageState: stateFile && fs.existsSync(stateFile) ? stateFile : undefined });
  return ctx;
}
export async function activate(page, URL, stateFile, ctx) {
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(7000);
  await page.evaluate(async () => {
    const a = await import("/src/services/sqlite/auth.ts");
    const s = await import("/src/services/appSettingsService.ts");
    await a.createInitialAdmin({ displayName: "Dr Test", email: "t@t.fr", password: "Test1234!aa" });
    await s.markSetupComplete();
    await a.login({ email: "t@t.fr", password: "Test1234!aa" });
  });
  await ctx.storageState({ path: stateFile });
}
