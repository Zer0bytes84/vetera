import { launch, open } from "./lib/setup.mjs";
const S = new URL(".", import.meta.url).pathname; const [URL_] = process.argv.slice(2);
const b = await launch(); const p = await open(b, { base: S + "base.json" }); await p.go(URL_, "#/equipe"); await p.settle(2000);
await p.getByLabel("Rechercher un membre").fill("zzz"); await p.waitForTimeout(400);
await p.getByRole("button", { name: "Effacer la recherche" }).click(); await p.waitForTimeout(400);
console.log("Effacer la recherche → champ :", JSON.stringify(await p.getByLabel("Rechercher un membre").inputValue()), "· fiches :", await p.locator("[aria-label^='Actions pour']").count()); await b.close();
