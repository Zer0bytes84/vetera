// Mesure de la premiere rangee de widgets de chaque page : la bande et ses cartes. Bordures, ombres, rayons, fonds,
// marges entre le bord de la bande et les cartes, ecarts entre cartes. Le Tableau de bord fait foi.
// Usage : node rangees.mjs <url> <sortie.json> [captures=dossier]
import { chromium } from "/media/psf/Home/.dev-browser/node_modules/playwright-core/index.mjs";
import fs from "node:fs";
const [URL_, OUT, SHOTS] = process.argv.slice(2);
const STORE = fs.readFileSync("/home/parallels/work/whatsapp-banc/store.json", "utf8");
const PAGES = ["Tableau de bord", "Patients", "Agenda", "Flux", "Rappels", "Soins", "Hospitalisation", "Documents", "Produits", "Finances", "Équipe"];
const browser = await chromium.launch({ executablePath: "/home/parallels/.cache/ms-playwright/chromium-1254/chrome-linux-arm64/chrome", args: ["--no-sandbox"] });
const result = {};
for (const mode of ["light", "dark"]) {
  result[mode] = {};
  for (const label of PAGES) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR", deviceScaleFactor: 2 });
    await ctx.addInitScript(([db, m]) => { if (!localStorage.getItem("vetera.browser-db.v1")) localStorage.setItem("vetera.browser-db.v1", db); localStorage.setItem("auth_token", "banc"); localStorage.setItem("theme", m); localStorage.setItem("theme-config", JSON.stringify({ skin: "clean" })); localStorage.setItem("baitari:last-seen-version", "9.9.9"); localStorage.setItem("baitari-guided-tour-v1", JSON.stringify({ dismissed: true })); }, [STORE, mode]);
    const page = await ctx.newPage();
    await page.goto(URL_, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    const ok = page.getByRole("button", { name: "Compris" }); if (await ok.count()) await ok.click();
    if (label !== "Tableau de bord") await page.getByRole("button", { name: label, exact: true }).or(page.getByRole("link", { name: label, exact: true })).first().click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(2500);
    for (let i = 0; i < 20 && (await page.getByText("Chargement du module").count()); i++) await page.waitForTimeout(500);
    await page.mouse.move(2, 2);
    const m = await page.evaluate(() => {
      const band = document.querySelector("main [data-slot=band], [data-slot=band]");
      if (!band) return null;
      const st = (el) => { const c = getComputedStyle(el); return { border: `${c.borderTopWidth} ${c.borderTopStyle} ${c.borderTopColor}`, outline: `${c.outlineWidth} ${c.outlineStyle}`, shadow: c.boxShadow, radius: c.borderTopLeftRadius, bg: c.backgroundColor, padding: `${c.paddingTop} ${c.paddingRight} ${c.paddingBottom} ${c.paddingLeft}` }; };
      const panels = [...band.querySelectorAll("[data-slot=panel]")].filter((p) => p.closest("[data-slot=band]") === band);
      const b = band.getBoundingClientRect();
      const rects = panels.map((p) => p.getBoundingClientRect());
      const round = (x) => Math.round(x * 10) / 10;
      return {
        titre: band.querySelector("h2, h3")?.textContent?.trim(),
        bande: st(band),
        cartes: panels.length,
        carte: panels[0] ? st(panels[0]) : null,
        cartesDifferentes: panels.map(st).filter((s, i, a) => JSON.stringify(s) !== JSON.stringify(a[0])).length,
        marges: rects.length ? { gauche: round(rects[0].left - b.left), droite: round(b.right - rects.at(-1).right), bas: round(b.bottom - Math.max(...rects.map((r) => r.bottom))) } : null,
        ecarts: rects.slice(1).map((r, i) => round(r.left - rects[i].right)),
        ascendants: (() => { const out = []; let e = band.parentElement; for (let k = 0; k < 3 && e; k++, e = e.parentElement) { const c = getComputedStyle(e); if (c.boxShadow !== "none" || c.borderTopWidth !== "0px") out.push(`${e.tagName.toLowerCase()}.${[...e.classList].slice(0, 3).join(".")} bordure ${c.borderTopWidth} ombre ${c.boxShadow.slice(0, 40)}`); } return out; })(),
      };
    });
    result[mode][label] = m;
    if (SHOTS && m) { fs.mkdirSync(SHOTS, { recursive: true }); await page.locator("[data-slot=band]").first().screenshot({ path: `${SHOTS}/${label.replace(/\s+/g, "-")}-${mode}.png` }); }
    await ctx.close();
  }
}
fs.writeFileSync(OUT, JSON.stringify(result, null, 1));
for (const mode of ["light"]) for (const [p, m] of Object.entries(result[mode])) console.log(p.padEnd(16), m ? `cartes ${m.cartes} | bande r ${m.bande.radius} pad ${m.bande.padding} bord ${m.bande.border.split(" ")[0]} ombre ${m.bande.shadow === "none" ? "non" : "OUI"} | carte r ${m.carte?.radius} bord ${m.carte?.border.split(" ")[0]} ${m.carte?.border.split(" ").slice(2).join(" ")} ombre ${m.carte?.shadow === "none" ? "non" : "OUI"} | marges ${JSON.stringify(m.marges)} ecarts ${m.ecarts.join("/")}${m.ascendants.length ? " | ASC " + m.ascendants.join(" ; ") : ""}` : "pas de bande");
await browser.close();
