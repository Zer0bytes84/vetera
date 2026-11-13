// usage: node pression.mjs <url>  -> echelle du bouton 0, 40, 80, 200 ms apres l'appui, puis apres le relachement
import { launch, open } from "./lib/setup.mjs"; const S = new URL(".", import.meta.url).pathname; const [URL_] = process.argv.slice(2);
for (const motion of ["no-preference", "reduce"]) { const b = await launch(); const p = await open(b, { base: S + "base.json", motion }); await p.clock.resume?.(); await p.go(URL_, "#/patients");
  const btn = p.locator("[data-slot='button']", { hasText: "Nouveau patient" }).first(); const box = await btn.boundingBox(); await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const w = () => btn.evaluate((el) => +(el.getBoundingClientRect().width / el.offsetWidth).toFixed(4));
  const out = []; await p.mouse.down(); for (const t of [0, 40, 40, 120]) { await p.waitForTimeout(t); out.push(await w()); } await p.keyboard.press("Escape"); await p.mouse.move(5, 5); await p.mouse.up(); for (const t of [0, 40, 40, 120]) { await p.waitForTimeout(t); out.push(await w()); }
  console.log(motion, "appui", out.slice(0, 4).join(" "), "| relache", out.slice(4).join(" "), "|", await btn.evaluate((el) => getComputedStyle(el).transitionProperty)); await b.close(); }
