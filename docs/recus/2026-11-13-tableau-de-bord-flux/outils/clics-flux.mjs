// usage: node clics-flux.mjs <url> : les deux gestes du panneau ouvrent ce qu'ils doivent
import { launch, open } from "./lib/setup.mjs";
const S = new URL(".", import.meta.url).pathname; const [URL_] = process.argv.slice(2);
const b = await launch(); const p = await open(b, { base: S + "base.json" }); await p.go(URL_, "#/flux"); await p.settle(2000);
const quiet = p.locator(".flow-quiet");
await quiet.getByRole("button", { name: "Arrivée sans RDV" }).click(); await p.waitForTimeout(600);
console.log("Arrivée sans RDV → dialogue :", await p.getByRole("dialog").count() > 0 ? await p.getByRole("dialog").first().locator("h2, [data-slot=dialog-title]").first().innerText() : "aucun");
await p.keyboard.press("Escape"); await p.waitForTimeout(400);
await quiet.getByRole("button", { name: "Nouveau rendez-vous" }).click(); await p.settle(2500);
console.log("Nouveau rendez-vous →", await p.evaluate(() => location.hash), "· dialogue :", await p.getByRole("dialog").count());
await p.go(URL_, "#/flux"); await p.settle(1500); await p.locator(".flow-quiet").getByRole("button", { name: /Ouvrir l’agenda/ }).click(); await p.settle(1500);
console.log("Ouvrir l’agenda →", await p.evaluate(() => location.hash)); console.log(p.errors.join("\n")); await b.close();
