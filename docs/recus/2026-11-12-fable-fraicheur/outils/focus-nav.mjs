// usage: node focus-nav.mjs <url> <sortie.png> [mode]  -> focus clavier sur l'entree active puis sur la suivante
import { launch, open } from "./lib/setup.mjs"; const S = new URL(".", import.meta.url).pathname; const [URL_, OUT, MODE = "light"] = process.argv.slice(2);
const b = await launch(); const p = await open(b, { mode: MODE, dsf: 2, base: S + "base.json" }); await p.go(URL_, "#/patients"); await p.freeze(); await p.mouse.click(1, 1);
for (let i = 0; i < 30; i++) { await p.keyboard.press("Tab"); if (await p.evaluate(() => document.activeElement?.textContent?.trim() === "Patients" && !!document.activeElement.closest("[data-slot='sidebar'],.app-sidebar"))) break; }
await p.screenshot({ path: OUT.replace(".png", "-actif.png"), clip: { x: 0, y: 110, width: 248, height: 110 } }); await p.keyboard.press("Tab");
await p.screenshot({ path: OUT.replace(".png", "-voisin.png"), clip: { x: 0, y: 110, width: 248, height: 110 } });
console.log(await p.evaluate(() => { const el = [...document.querySelectorAll("[data-slot='button']")].find((e) => e.textContent.includes("Nouveau patient")); const c = getComputedStyle(el); return [c.transitionProperty, c.transitionDuration, c.transitionTimingFunction]; })); await b.close();
