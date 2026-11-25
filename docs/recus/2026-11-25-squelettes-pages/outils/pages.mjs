// Chaque écran de lecture (liste, tableau, fiche), ouvert en premier écran avec des lectures lentes (délai fixe, comme
// le pont SQLite de l'app de bureau). À chaque image, on relève ce que montre la zone de contenu : squelette, roue,
// phrases d'état vide (« Aucun… »), hauteur du contenu, décalage de mise en page cumulé ; plus deux captures.
// Usage : node banc/pages.mjs <url> <dossier> [délai ms] [pages séparées par des virgules] [light|dark|both]
import fs from "node:fs";
import { launch, context, page } from "./banc.mjs";
const [URL_, OUT, DELAI = "1500", ONLY, MODES = "light", AMORCE = "0"] = process.argv.slice(2);
// AMORCE=1 : chaque page est d'abord ouverte une fois sans délai (une séance précédente), puis mesurée.
export const PAGES = [
  ["patients", "patients"],
  ["fiche-patient", "patient/demo_patient_05"],
  ["agenda", "agenda"],
  ["flux", "flux"],
  ["soins", "soins"],
  ["hospitalisation", "clinique", "hospitalisation"],
  ["produits", "stock"],
  ["finances", "finances"],
  ["analyse", "finances_analytics"],
  ["equipe", "equipe"],
  ["documents", "notes"],
  ["rappels", "taches"],
  ["parametres", "parametres"],
].filter(([n]) => !ONLY || ONLY === "all" || ONLY.split(",").includes(n));
fs.mkdirSync(OUT, { recursive: true });
const browser = await launch();
const result = {};
const modes = MODES === "both" ? ["light", "dark"] : [MODES];
for (const mode of modes) {
  const ctx = await context(browser, { mode });
  const seed = await page(ctx); await seed.goto(URL_); await seed.waitForTimeout(6000); await seed.close();
  for (const [name, view, tab] of PAGES) {
    if (AMORCE === "1") {
      const w = await page(ctx);
      // Une lecture presque immédiate (1 ms), par le même chemin que l'app de bureau.
      await w.addInitScript((t) => { window.__bancDelai = 1; window.__bancGarde = ["sessions", "app_settings", "notification_state", "document_templates", "migrations"]; if (t) sessionStorage.setItem("vetera:pending-clinic-tab", t); }, tab ?? null);
      await w.goto(`${URL_}#/${view}`); await w.waitForTimeout(7000); await w.close();
    }
    const p = await page(ctx);
    await p.addInitScript(([delai, tab]) => {
      window.__bancDelai = delai;
      window.__bancGarde = ["sessions", "app_settings", "notification_state", "document_templates", "migrations"];
      if (tab) sessionStorage.setItem("vetera:pending-clinic-tab", tab);
      window.__shift = 0; window.__shifts = [];
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) { window.__shift += e.value; window.__shifts.push({ t: Math.round(e.startTime), v: Math.round(e.value * 1000) / 1000, n: e.sources?.map((s) => (s.node?.className?.toString?.() ?? s.node?.nodeName ?? "?").slice(0, 60)) }); } }).observe({ type: "layout-shift", buffered: true });
      window.__samples = [];
      const t0 = performance.now();
      const vide = /(Aucun[e]?\s[^\n]{0,50}|Chargement[^\n]{0,40}|Lecture[^\n]{0,40}|rien à [^\n]{0,30}|0 résultat[^\n]{0,20}|Liste vide[^\n]{0,20})/gi;
      const tick = () => {
        const main = document.querySelector("main") ?? document.body;
        const text = main.innerText ?? "";
        const spin = [...main.querySelectorAll('.animate-spin, [data-slot="spinner"]')].filter((e) => e.getBoundingClientRect().width).length;
        const busy = [...main.querySelectorAll('[aria-busy="true"]')].filter((e) => !e.closest('[data-slot="stat-grid"]') && !e.classList.contains("invisible")).length;
        // La zone qui défile : le plus haut contenu parmi les grands conteneurs à défilement vertical (sinon main).
        const scroller = [...document.querySelectorAll("*")].filter((e) => e.clientHeight > 600 && /(auto|scroll)/.test(getComputedStyle(e).overflowY)).sort((a, b) => b.scrollHeight - a.scrollHeight)[0] ?? main;
        window.__samples.push({
          t: Math.round(performance.now() - t0),
          roue: spin,
          reflet: [...main.querySelectorAll(".loading-skeleton-shape, [data-slot=skeleton]")].filter((e) => e.getBoundingClientRect().width && e.checkVisibility({ visibilityProperty: true, opacityProperty: true })).length,
          squelette: busy,
          etats: [...new Set(text.match(vide) ?? [])].map((s) => s.trim()).slice(0, 6),
          hauteur: Math.round(scroller.scrollHeight),
          regions: Object.fromEntries([...document.querySelectorAll("[data-skeleton-region]")].map((e) => [e.dataset.skeletonRegion, Math.round(e.getBoundingClientRect().height * 10) / 10])),
          bandes: [...main.querySelectorAll('[data-slot="band"], [data-slot="stat-grid"]')].filter((e) => !e.parentElement.closest('[data-slot="band"]')).map((e) => Math.round(e.getBoundingClientRect().height)),
          signature: text.length,
        });
        if (performance.now() - t0 < delai * 6 + 4000) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, [Number(DELAI), tab ?? null]);
    await p.goto(`${URL_}#/${view}`);
    await p.waitForTimeout(Math.max(400, Number(DELAI) - 400));
    try { await p.screenshot({ path: `${OUT}/${name}-pendant-${mode}.jpg`, quality: 80, animations: "allow" }); } catch (e) { p.errors.push(String(e).slice(0, 80)); }
    await p.waitForTimeout(Number(DELAI) * 6 + 3000);
    try { await p.screenshot({ path: `${OUT}/${name}-apres-${mode}.jpg`, quality: 80, animations: "allow" }); } catch (e) { p.errors.push(String(e).slice(0, 80)); }
    const data = await p.evaluate(() => ({ samples: window.__samples, shift: Math.round(window.__shift * 1000) / 1000, shifts: window.__shifts }));
    const s = data.samples;
    const last = s.at(-1);
    const settled = [...s].reverse().find((x, i, a) => i + 1 < a.length && a[i + 1].signature !== x.signature)?.t ?? 0;
    const span = (l) => (l.length ? `${l[0].t}–${l.at(-1).t} ms (${l.length} images)` : "jamais");
    const etatsPendant = [...new Set(s.filter((x) => x.t < settled).flatMap((x) => x.etats))].filter((e) => !last.etats.includes(e));
    result[`${name} (${mode})`] = {
      contenuStableA: settled,
      roue: span(s.filter((x) => x.roue)),
      squelette: span(s.filter((x) => x.squelette)),
      refletVisible: span(s.filter((x) => x.reflet)),
      etatsFauxPendant: etatsPendant,
      etatsFinaux: last.etats,
      hauteurs: [...new Set(s.map((x) => x.hauteur))],
      bandesPendant: [...new Set(s.filter((x) => x.squelette).map((x) => x.bandes.join(",")))],
      bandesApres: last.bandes.join(","),
      regionsPendant: Object.fromEntries(Object.keys(Object.assign({}, ...s.map((x) => x.regions))).map((k) => [k, [...new Set(s.filter((x) => x.squelette && k in x.regions).map((x) => x.regions[k]))]])),
      regionsApres: last.regions,
      hauteurPendantSquelette: [...new Set(s.filter((x) => x.squelette).map((x) => x.hauteur))],
      hauteurPendant: s.find((x) => x.t > 200)?.hauteur ?? null,
      hauteurApres: last.hauteur,
      decalageCumule: data.shift,
      decalages: data.shifts.slice(0, 8),
      erreurs: p.errors.slice(0, 4),
    };
    console.log(name, mode, JSON.stringify(result[`${name} (${mode})`]).slice(0, 700));
    await p.close();
  }
  await ctx.close();
}
fs.writeFileSync(`${OUT}/pages.json`, JSON.stringify(result, null, 1));
await browser.close();
