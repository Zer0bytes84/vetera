// usage: node mascottes.mjs <url> <dossier>
import { launch, open } from "./lib/setup.mjs"; import fs from "fs"; const S = new URL(".", import.meta.url).pathname; const [URL_, OUT] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const b = await launch();
for (const mode of ["light", "dark"]) { const p = await open(b, { mode, dsf: 2, width: 1000, height: 1010, base: S + "base.json" }); await p.go(URL_, "#/dashboard");
  await p.evaluate(async () => { const m = await import("/docs/recus/2026-11-12-fable-fraicheur/round2/mascottes/planche.tsx"); m.monter(); }); await p.waitForTimeout(1200); await p.freeze(); await p.waitForTimeout(300);
  await p.screenshot({ path: `${OUT}/planche-${mode}.png` }); console.log(mode, p.errors.slice(0, 3)); await p.context().close(); }
await b.close();
