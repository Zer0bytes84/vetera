// usage: node survol.mjs <url> <dossier> : une carte de chiffre clé au repos puis survolée, clair et sombre
import { launch, open } from "./lib/setup.mjs"; import fs from "fs";
const S = new URL(".", import.meta.url).pathname; const [URL_, OUT] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const b = await launch();
for (const mode of ["light", "dark"]) { const p = await open(b, { mode, base: S + "base.json" }); await p.go(URL_, "#/dashboard"); await p.settle(2000);
  const card = p.locator("button[aria-label='Voir la trésorerie']"); const box = await card.boundingBox(); const clip = { x: box.x - 12, y: box.y - 12, width: box.width * 2 + 30, height: box.height + 24 };
  await p.mouse.move(5, 5); await p.waitForTimeout(400); await p.screenshot({ path: `${OUT}/${mode}-repos.png`, clip });
  await card.hover(); await p.waitForTimeout(400); await p.screenshot({ path: `${OUT}/${mode}-survol.png`, clip });
  const bg = await card.locator("[data-slot=panel]").evaluate((e) => getComputedStyle(e).backgroundColor); console.log(mode, "fond survolé", bg); await p.context().close(); }
await b.close();
