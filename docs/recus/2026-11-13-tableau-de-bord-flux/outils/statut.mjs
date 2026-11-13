// usage: node statut.mjs <url> <dossier> : bande « À traiter » en retard puis tout l'ouvert, clair et sombre ; vérifie que les comptes changent et qu'un clic navigue
import { launch, open } from "./lib/setup.mjs"; import fs from "fs";
const S = new URL(".", import.meta.url).pathname; const [URL_, OUT] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const b = await launch();
for (const mode of ["light", "dark"]) {
  const p = await open(b, { mode, base: S + (process.env.BASE ?? "base.json") }); await p.go(URL_, "#/dashboard"); await p.settle(2000); await p.freeze(); await p.mouse.move(700, 5);
  const band = p.locator(".morningWatch");
  const read = () => band.locator("button[aria-label]").evaluateAll((l) => l.map((e) => e.getAttribute("aria-label").split(".")[0]));
  const a = await read(); await band.screenshot({ path: `${OUT}/${mode}-bande-retard.png` });
  await p.getByRole("button", { name: "Tout l’ouvert" }).click(); await p.waitForTimeout(500);
  const o = await read(); await band.screenshot({ path: `${OUT}/${mode}-bande-ouvert.png` });
  console.log(mode, "retard", a.join(" / "), "| ouvert", o.join(" / "));
  if (mode === "light") { await band.getByRole("button", { name: /Factures/ }).click(); await p.waitForTimeout(1500); console.log("clic Factures →", await p.evaluate(() => location.hash)); }
  console.log(p.errors.join("\n")); await p.context().close();
}
await b.close();
