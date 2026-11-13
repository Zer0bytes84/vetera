import { launch, open } from "./lib/setup.mjs"; import fs from "fs";
const S = new URL(".", import.meta.url).pathname; const [URL_, OUT] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const b = await launch(); const p = await open(b, { base: S + "base.json" }); await p.go(URL_, "#/taches"); await p.settle(2000); await p.freeze();
await p.getByRole("tab", { name: "Rappels du jour" }).click(); await p.waitForTimeout(800); await p.screenshot({ path: `${OUT}/rappels-du-jour.png` });
await p.getByRole("button", { name: "Gérer les types" }).click(); await p.waitForTimeout(800); await p.screenshot({ path: `${OUT}/types.png` });
console.log(await p.evaluate(() => [...document.querySelectorAll("main svg")].filter((s) => s.getBoundingClientRect().width > 28).map((s) => `${Math.round(s.getBoundingClientRect().width)} ${s.closest("[aria-label]")?.getAttribute("aria-label") ?? ""}`).slice(0, 5).join(" | ") || "aucune icône surdimensionnée"));
console.log(p.errors.join("\n")); await b.close();
