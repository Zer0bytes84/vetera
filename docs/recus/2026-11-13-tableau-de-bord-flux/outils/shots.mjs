// usage: node shots.mjs <url> <dossier> [modes] [ecrans]   FIXED=... pour changer de jour
import { launch, open } from "./lib/setup.mjs"; import fs from "fs";
const S = new URL(".", import.meta.url).pathname; const [URL_, OUT, MODES = "light,dark", ONLY = "dashboard,flux"] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true }); const b = await launch(); const errs = [];
const closeTour = async (p) => { const x = p.getByRole("button", { name: /Plus tard|Fermer|Ignorer/ }).first(); if (await x.count()) { await x.click().catch(() => {}); await p.waitForTimeout(400); } };
for (const mode of MODES.split(",")) {
  const p = await open(b, { mode, base: S + (process.env.BASE ?? "base.json"), height: 900 });
  for (const name of ONLY.split(",")) {
    try { await p.go(URL_, "#/" + name); await p.settle(2500); await p.mouse.move(700, 5); await p.freeze(); await p.waitForTimeout(400);
      await p.screenshot({ path: `${OUT}/${mode}-${name}.png` });
      const h = await p.evaluate(() => Math.max(...[...document.querySelectorAll("*")].filter((e) => e.scrollHeight > e.clientHeight + 20 && /(auto|scroll)/.test(getComputedStyle(e).overflowY)).map((e) => e.scrollHeight - e.clientHeight), 0));
      if (h > 0) { await p.setViewportSize({ width: 1440, height: 900 + h }); await p.waitForTimeout(600); await p.screenshot({ path: `${OUT}/${mode}-${name}-page.png` }); await p.setViewportSize({ width: 1440, height: 900 }); } } catch (e) { errs.push(`${mode} ${name}: ${e.message.split("\n")[0]}`); } }
  errs.push(...p.errors.map((e) => `${mode} ${e}`)); await p.context().close();
}
console.log(errs.join("\n") || "aucune erreur"); await b.close();
