import { launch, open } from "./lib/setup.mjs";
const S = new URL(".", import.meta.url).pathname; const [URL_] = process.argv.slice(2);
const b = await launch(); const p = await open(b, { base: S + "base.json" }); await p.go(URL_, "#/parametres"); await p.settle(2000);
await p.getByRole("tab", { name: /Apparence/ }).or(p.getByRole("button", { name: /^Apparence/ })).first().click(); await p.settle(1000);
const before = await p.locator("[data-tour-ui]").count();
await p.getByRole("button", { name: "Revoir le tour" }).click(); await p.settle(2500);
const after = await p.locator("[data-tour-ui]").count();
console.log(`Revoir le tour : éléments du tour ${before} → ${after} · vue : ${await p.evaluate(() => location.hash)} · texte : ${(await p.locator("[data-tour-ui]").first().innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 90)}`);
await p.screenshot({ path: "fusion/invariants/tour-relance.png" }); console.log(p.errors.join("\n")); await b.close();
