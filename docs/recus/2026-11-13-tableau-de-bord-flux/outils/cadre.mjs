import { launch, open } from "./lib/setup.mjs";
const S = new URL(".", import.meta.url).pathname; const [URL_] = process.argv.slice(2);
const b = await launch(); const p = await open(b, { base: S + "base.json" }); await p.go(URL_, "#/dashboard"); await p.settle(2000);
console.log(await p.evaluate(() => [...document.querySelectorAll(".premium-analytics-dashboard [data-slot=band]")].map((band) => { const c = getComputedStyle(band); const panel = band.querySelector("[data-slot=panel]"); const pc = panel ? getComputedStyle(panel) : null;
  return `${(band.querySelector("h2,h3")?.textContent ?? "?").slice(0, 22).padEnd(22)} bande r=${c.borderTopLeftRadius} pad=${c.paddingTop} bord=${c.borderTopWidth} ombre=${c.boxShadow === "none" ? "aucune" : c.boxShadow.slice(0, 30)} | panneau r=${pc?.borderTopLeftRadius} bord=${pc?.borderTopWidth} ombre=${pc?.boxShadow === "none" ? "aucune" : pc?.boxShadow.slice(0, 40)}`; }).join("\n")));
await b.close();
