// usage: node clics-rappels.mjs <url> : les gestes de l'état vide des Rappels
import { launch, open } from "./lib/setup.mjs";
const S = new URL(".", import.meta.url).pathname; const [URL_] = process.argv.slice(2);
const b = await launch(); const p = await open(b, { base: S + (process.env.BASE ?? "base.json") }); await p.go(URL_, "#/taches"); await p.settle(2000);
const q = p.locator(".reminders-quiet");
await q.getByRole("button", { name: "Nouveau rappel" }).click(); console.log("Nouveau rappel → focus :", await p.evaluate(() => document.activeElement?.id));
await q.getByRole("button", { name: "Rappel médical" }).click(); await p.waitForTimeout(700); console.log("Rappel médical → dialogue :", await p.getByRole("dialog").count()); await p.keyboard.press("Escape"); await p.waitForTimeout(400);
const link = q.getByRole("button", { name: /Voir les rappels/ }); const name = await link.innerText(); await link.click(); await p.waitForTimeout(500);
console.log(`${name.trim()} → onglet :`, await p.getByRole("tab", { selected: true }).innerText());
console.log(p.errors.join("\n")); await b.close();
