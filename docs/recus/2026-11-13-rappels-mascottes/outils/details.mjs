// usage: node details.mjs <url> <dossier> : la rangée du nouveau rappel, fermée puis détails ouverts, clair et sombre
import { launch, open } from "./lib/setup.mjs"; import fs from "fs";
const S = new URL(".", import.meta.url).pathname; const [URL_, OUT] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const b = await launch();
for (const mode of ["light", "dark"]) { const p = await open(b, { mode, base: S + (process.env.BASE ?? "base.json") }); await p.go(URL_, "#/taches"); await p.settle(2000); await p.freeze(); await p.mouse.move(5, 5);
  const form = p.locator("form.quick-reminder-form"); const box = await form.boundingBox();
  await p.screenshot({ path: `${OUT}/${mode}-rangee.png`, clip: { x: box.x - 16, y: box.y - 16, width: box.width + 32, height: box.height + 32 } });
  await form.getByRole("button", { name: "Détails" }).click(); await p.waitForTimeout(400); const b2 = await form.boundingBox();
  await p.screenshot({ path: `${OUT}/${mode}-rangee-details.png`, clip: { x: b2.x - 16, y: b2.y - 16, width: b2.width + 32, height: b2.height + 32 } }); await p.context().close(); }
await b.close(); console.log("ok");
