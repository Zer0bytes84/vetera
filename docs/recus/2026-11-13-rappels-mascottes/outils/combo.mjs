// usage: node combo.mjs <url> <dossier> : la liste des types de rappel ouverte, et la taille de ses coches
import { launch, open } from "./lib/setup.mjs"; import fs from "fs";
const S = new URL(".", import.meta.url).pathname; const [URL_, OUT] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const b = await launch(); const p = await open(b, { base: S + "base.json" }); await p.go(URL_, "#/taches"); await p.settle(2000);
await p.locator("#quick-reminder-type").click(); await p.waitForTimeout(500); await p.getByRole("option").first().click(); await p.waitForTimeout(300);
await p.locator("#quick-reminder-type").click(); await p.waitForTimeout(500);
console.log(await p.evaluate(() => [...document.querySelectorAll("[data-slot=combobox-item] svg, [role=option] svg")].slice(0, 3).map((s) => { const r = s.getBoundingClientRect(); return `${Math.round(r.width)}x${Math.round(r.height)}`; }).join(" ")));
await p.screenshot({ path: `${OUT}/liste-types.png`, clip: { x: 760, y: 300, width: 520, height: 420 } }); await b.close();
