// usage: node etats.mjs <url> <dossier> [mode]  -> etats survole / presse / focus des controles principaux, a 2x
import { launch, open } from "./lib/setup.mjs"; import { ECRANS } from "./lib/parcours.mjs"; import fs from "fs";
const S = new URL(".", import.meta.url).pathname; const [URL_, OUT, MODE = "light"] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const b = await launch(); const p = await open(b, { mode: MODE, dsf: 2, base: S + "base.json" }); await p.go(URL_, "#/dashboard"); await ECRANS.find(([n]) => n === "factures")[1](p); await p.freeze();
const shot = (n, clip) => p.screenshot({ path: `${OUT}/${MODE}-${n}.png`, clip });
const row = p.locator("tbody tr").nth(1); const rb = await row.boundingBox();
await p.mouse.move(rb.x + 200, rb.y + rb.height / 2); await p.waitForTimeout(250); await shot("ligne-survol", { x: 272, y: rb.y - 70, width: 1136, height: 200 });
const btn = p.locator("[data-slot='button']", { hasText: "Nouvelle facture" }).first(); const bb = await btn.boundingBox(); const clipB = { x: bb.x - 120, y: bb.y - 14, width: bb.width + 140, height: bb.height + 28 };
await p.mouse.move(5, 5); await p.waitForTimeout(200); await shot("bouton-repos", clipB);
await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.waitForTimeout(250); await shot("bouton-survol", clipB);
await p.mouse.down(); await p.waitForTimeout(250); await shot("bouton-presse", clipB); await p.mouse.move(5, 5); await p.mouse.up();
await p.keyboard.press("Escape"); await btn.focus(); await p.keyboard.press("Shift+Tab"); await p.keyboard.press("Tab"); await p.waitForTimeout(200); await shot("bouton-focus", clipB);
const tab = p.getByRole("tab", { name: /Journal/ }).first(); const tb = await tab.boundingBox(); const clipT = { x: tb.x - 110, y: tb.y - 10, width: 230, height: tb.height + 20 };
await p.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2); await p.waitForTimeout(250); await shot("onglet-survol", clipT); await tab.focus(); await p.keyboard.press("ArrowLeft"); await p.waitForTimeout(250); await shot("onglet-focus", clipT);
const nav = p.locator(".app-sidebar, [data-slot='sidebar']").first().getByText("Agenda", { exact: true }).first(); const nb = await nav.boundingBox(); await p.mouse.move(nb.x + 20, nb.y + 8); await p.waitForTimeout(250); await shot("nav-survol", { x: 0, y: 110, width: 248, height: 200 });
const inp = p.getByPlaceholder("Numéro ou propriétaire").first(); const ib = await inp.boundingBox(); await inp.focus(); await p.keyboard.press("Shift+Tab"); await p.keyboard.press("Tab"); await p.waitForTimeout(200); await shot("champ-focus", { x: ib.x - 40, y: ib.y - 12, width: 420, height: ib.height + 24 });
console.log(p.errors.join("\n") || "ok"); await b.close();
