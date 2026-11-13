// usage: node invariants.mjs <url> <dossier> : les invariants de la fusion, au clic, en clair et en sombre
import { launch, open } from "./lib/setup.mjs"; import fs from "fs";
const S = new URL(".", import.meta.url).pathname; const [URL_, OUT] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const b = await launch(); const log = (...a) => console.log(...a);
const sidebar = (p) => p.evaluate(() => { const nav = document.querySelector(".app-sidebar, [data-slot=sidebar]");
  return [...nav.querySelectorAll("[data-sidebar=group], [data-slot=sidebar-group]")].map((g) => { const label = g.querySelector("[data-sidebar=group-label], [data-slot=sidebar-group-label]");
    const items = [...g.querySelectorAll("[data-sidebar=menu-button], [data-slot=sidebar-menu-button]")].map((e) => e.textContent.trim()).filter(Boolean);
    return `${label ? `« ${label.textContent.trim()} » (${label.tagName.toLowerCase()}${label.closest("a,button") ? ", cliquable" : ", non cliquable"})` : "(sans titre)"} : ${items.join(" | ")}`; }).join("\n    "); });
const palette = async (p) => { await p.keyboard.press("Control+k"); await p.waitForTimeout(600); await p.keyboard.type("hospitalisation"); await p.waitForTimeout(700);
  const found = await p.getByRole("option", { name: /Nouvelle hospitalisation/ }).count(); await p.keyboard.press("Escape"); await p.waitForTimeout(300); return found; };
const soinsTabs = async (p) => { await p.locator(".app-sidebar, [data-slot=sidebar]").first().getByText("Soins", { exact: true }).first().click(); await p.settle(2000);
  return p.evaluate(() => [...document.querySelectorAll("main [role=tab]")].map((t) => t.textContent.trim()).join(" | ") || "aucun onglet"); };
const toggle = async (p) => { await p.go(URL_, "#/parametres"); await p.settle(2000); await p.getByRole("tab", { name: /Mon cabinet/ }).or(p.getByRole("button", { name: /^Mon cabinet/ })).first().click(); await p.settle(1200);
  const sw = p.getByRole("switch", { name: /hospitalisation/i }); await sw.click(); await p.waitForTimeout(900); return sw.getAttribute("aria-checked"); };
for (const mode of ["light", "dark"]) {
  const p = await open(b, { mode, base: S + "base.json" }); await p.go(URL_, "#/dashboard"); await p.settle(2500);
  if (mode === "light") {
    log("1. Barre latérale (hospitalisation proposée) :\n    " + await sidebar(p));
    log("   Soins, onglets :", await soinsTabs(p), "· palette « Nouvelle hospitalisation » :", await palette(p));
  }
  await p.screenshot({ path: `${OUT}/${mode}-barre-laterale-hospitalisation-proposee.png`, clip: { x: 0, y: 0, width: 248, height: 520 } });
  log(`   ${mode} · décocher → aria-checked =`, await toggle(p)); await p.go(URL_, "#/dashboard"); await p.settle(2000);
  await p.screenshot({ path: `${OUT}/${mode}-barre-laterale-hospitalisation-decochee.png`, clip: { x: 0, y: 0, width: 248, height: 520 } });
  if (mode === "light") {
    log("   Barre latérale (décochée) :\n    " + await sidebar(p));
    log("   Soins, onglets :", await soinsTabs(p), "· palette « Nouvelle hospitalisation » :", await palette(p));
    await p.reload({ waitUntil: "domcontentloaded" }); await p.settle(2500); log("   Après rechargement :\n    " + await sidebar(p));
  }
  log(`   ${mode} · recocher → aria-checked =`, await toggle(p)); await p.go(URL_, "#/dashboard"); await p.settle(2000);
  if (mode === "light") { log("   Barre latérale (recochée) :\n    " + await sidebar(p)); log("   Soins, onglets :", await soinsTabs(p), "· palette :", await palette(p)); }
  if (mode === "light") {
    const skin = await p.evaluate(() => ({ skin: document.documentElement.dataset.skin, visual: document.documentElement.dataset.visualStyle ?? "absent", font: getComputedStyle(document.body).fontFamily.split(",")[0], premiumCss: [...document.styleSheets].some((s) => { try { return [...s.cssRules].some((r) => r.cssText.includes('data-visual-style="premium"') || r.cssText.includes('data-skin="premium"')); } catch { return false; } }) }));
    log("2. Thème :", JSON.stringify(skin));
    await p.go(URL_, "#/parametres"); await p.settle(2000); await p.getByRole("tab", { name: /Apparence/ }).or(p.getByRole("button", { name: /^Apparence/ })).first().click(); await p.settle(1200);
    log("   Apparence, mentions de Premium :", await p.locator("main").getByText(/premium/i).count());
    const tour = p.getByRole("button", { name: /tour/i }); log("3. Paramètres, boutons du tour :", (await tour.allInnerTexts()).join(" | ") || "aucun");
    const sel = await p.locator(".mascot-choices [aria-pressed=true]").first().getAttribute("aria-label");
    const names = await p.locator(".mascot-settings .mascot-choice span:not(.mascot-choice-check)").allInnerTexts();
    log("4. Mascotte cochée :", sel, "· choix :", names.filter(Boolean).join(", "));
  }
  log(p.errors.length ? p.errors.join("\n") : `   ${mode} : aucune erreur de page`); await p.context().close();
}
await b.close();
