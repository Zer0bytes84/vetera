// Chaque page qui ouvre sur une bande StatGrid, ouverte en premier écran avec des lectures lentes (délai fixe, comme le
// pont SQLite de l'app de bureau). Toutes les 16 ms environ (requestAnimationFrame), on relève ce que montre la bande :
// squelette ou cartes, valeurs affichées, hauteur ; plus le décalage de mise en page cumulé, et deux captures.
// Usage : node banc/lecture.mjs <url> <dossier> [délai ms] [pages séparées par des virgules]
import fs from "node:fs";
import { launch, context, page } from "./banc.mjs";
const [URL_, OUT, DELAI = "1500", ONLY] = process.argv.slice(2);
const PAGES = [
  ["tableau-de-bord", "dashboard", "À traiter"],
  ["chiffres-cles", "dashboard", "Chiffres clés"],
  ["patients", "patients", null],
  ["agenda", "agenda", null],
  ["rappels", "taches", null],
  ["soins", "soins", null],
  ["hospitalisation", "clinique", "Séjours"],
  ["produits", "stock", null],
  ["finances", "finances", null],
  ["equipe", "equipe", null],
].filter(([n]) => !ONLY || ONLY.split(",").includes(n));
fs.mkdirSync(OUT, { recursive: true });
const browser = await launch();
const result = {};
for (const mode of ["light", "dark"]) {
  const ctx = await context(browser, { mode });
  // Une première ouverture sans délai : l'application pose ses données de démonstration dans le store du navigateur.
  const seed = await page(ctx); await seed.goto(URL_); await seed.waitForTimeout(6000); await seed.close();
  for (const [name, view, title] of PAGES) {
    const p = await page(ctx);
    await p.addInitScript(([delai, title]) => {
      window.__bancDelai = delai;
      // Ce qui sert à se connecter arrive d'office : seules les données des pages sont en retard.
      window.__bancGarde = ["sessions", "app_settings", "notification_state", "document_templates", "migrations"];
      if (location.hash === "#/clinique") sessionStorage.setItem("vetera:pending-clinic-tab", "hospitalisation");
      window.__shift = 0;
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__shift += e.value; }).observe({ type: "layout-shift", buffered: true });
      window.__samples = [];
      const t0 = performance.now();
      const find = () => [...document.querySelectorAll('[data-slot="stat-grid"]')].find((g) => !title || (g.parentElement?.textContent ?? "").includes(title));
      const tick = () => {
        const grid = find(); const shell = grid?.parentElement;
        const vis = grid && !grid.classList.contains("invisible");
        window.__samples.push({
          t: Math.round(performance.now() - t0),
          present: !!grid,
          squelette: !!(grid && grid.getAttribute("aria-busy") === "true"),
          squeletteVisible: !!(grid && grid.getAttribute("aria-busy") === "true" && vis),
          valeurs: grid ? [...grid.querySelectorAll('[data-slot="stat-value"]')].map((e) => (e.querySelector(".sr-only")?.textContent ?? e.textContent).replace(/\s+/g, " ").trim()) : [],
          lignes: grid ? [...grid.querySelectorAll("p.h-4")].map((e) => e.textContent.trim()) : [],
          sousTitre: shell ? (shell.querySelector("p")?.textContent ?? "").trim().slice(0, 80) : "",
          hauteurBande: shell ? Math.round(shell.getBoundingClientRect().height) : 0,
          hauteurGrille: grid ? Math.round(grid.getBoundingClientRect().height) : 0,
        });
        if (performance.now() - t0 < delai * 6 + 4000) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, [Number(DELAI), title]);
    await p.goto(`${URL_}#/${view}`);
    await p.waitForTimeout(Math.max(500, Number(DELAI) - 500));
    const band = async (file) => {
      const h = await p.evaluateHandle((title) => [...document.querySelectorAll('[data-slot="stat-grid"]')].find((g) => !title || (g.parentElement?.textContent ?? "").includes(title))?.parentElement ?? null, title);
      const el = h.asElement();
      if (!el) return;
      try { await el.screenshot({ path: `${OUT}/${name}-${file}-${mode}.png`, animations: "allow" }); } catch (e) { p.errors.push(`capture ${file}: ${String(e).slice(0, 80)}`); }
    };
    await band("pendant");
    await p.waitForTimeout(Number(DELAI) * 6 + 3000);
    await band("apres");
    const data = await p.evaluate(() => ({ samples: window.__samples, shift: Math.round(window.__shift * 1000) / 1000 }));
    const seen = data.samples.filter((s) => s.present);
    const final = seen.at(-1)?.valeurs ?? [];
    const span = (l) => (l.length ? `${l[0].t}–${l.at(-1).t} ms (${l.length} images)` : "jamais");
    const wrong = seen.filter((s) => s.valeurs.length && s.valeurs.some((v, i) => final[i] !== undefined && v !== final[i]));
    const loaded = seen.filter((s) => !s.squelette);
    result[`${name} (${mode})`] = {
      bandeVisibleDes: seen[0]?.t ?? null,
      squeletteMonte: span(seen.filter((s) => s.squelette)),
      squeletteVisible: span(seen.filter((s) => s.squeletteVisible)),
      valeursFaussesAffichees: span(wrong),
      exempleDeValeursFausses: wrong[0]?.valeurs ?? null,
      sousTitrePendant: seen[0]?.sousTitre ?? null,
      valeursFinales: final,
      hauteursBande: [...new Set(seen.map((s) => s.hauteurBande))],
      hauteurBandePendant: [...new Set(seen.filter((s) => s.squelette).map((s) => s.hauteurBande))],
      hauteurBandeApres: [...new Set(loaded.map((s) => s.hauteurBande))],
      decalageCumule: data.shift,
      erreurs: p.errors,
    };
    console.log(name, mode, JSON.stringify(result[`${name} (${mode})`]).slice(0, 600));
    await p.close();
  }
  await ctx.close();
}
fs.writeFileSync(`${OUT}/lecture.json`, JSON.stringify(result, null, 1));
await browser.close();
