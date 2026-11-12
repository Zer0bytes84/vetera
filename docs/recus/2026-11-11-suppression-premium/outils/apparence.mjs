import { launch, FIXED } from "./lib/setup.mjs";
import fs from "fs";
const [URL, STATE, OUT] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const b = await launch();
for (const mode of ["light", "dark"]) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1750 }, reducedMotion: "reduce", locale: "fr-FR", timezoneId: "Europe/Paris", storageState: STATE });
  const page = await ctx.newPage(); await page.clock.setFixedTime(FIXED);
  await page.addInitScript(([m]) => { localStorage.setItem("theme-config", JSON.stringify({ skin: "clean" })); localStorage.setItem("theme", m); localStorage.setItem("baitari:last-seen-version", "5.0.9"); Math.random = () => 0.42; }, [mode]);
  await page.goto(URL + "#/parametres", { waitUntil: "domcontentloaded" }); await page.reload({ waitUntil: "domcontentloaded" }); await page.waitForTimeout(5000);
  await page.getByText("Apparence", { exact: true }).first().click(); await page.waitForTimeout(2000);
  await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important}" }); await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${mode}-parametres-apparence-complet.png` });
  await ctx.close();
}
await b.close();
