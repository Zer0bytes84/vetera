// usage: node redteam.mjs <url> <state.json>   (browser-level attacks on the Clean-only build)
import { launch, newCtx, FIXED } from "./lib/setup.mjs";
const [URL, STATE] = process.argv.slice(2);
const b = await launch();
const results = [];
const record = (name, ok, detail = "") => { results.push({ name, ok, detail }); console.log(ok ? "PASS" : "FAIL", name, detail); };

async function session(prefs, { path = "#/dashboard", settle = 5000 } = {}) {
  const ctx = await newCtx(b, STATE);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console.error: " + m.text().slice(0, 200)); });
  await page.clock.setFixedTime(FIXED);
  await page.addInitScript((p) => {
    if (sessionStorage.getItem("__rt_seeded")) return; // seed once per tab, so later reloads show what the app itself wrote
    sessionStorage.setItem("__rt_seeded", "1");
    localStorage.setItem("baitari:last-seen-version", "5.0.9");
    for (const k of ["theme-config", "theme", "baitari-sidebar-tone", "baitari-clean-only-v1", "baitari-premium-default-v1", "baitari-clean-default-v1", "baitari-clean-default-v2"]) localStorage.removeItem(k);
    for (const [k, v] of Object.entries(p)) if (v !== null) localStorage.setItem(k, v);
  }, prefs);
  await page.goto(URL + path, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(settle);
  return { ctx, page, errors };
}
const snapshot = (page) => page.evaluate(() => {
  const r = document.documentElement;
  const rules = [];
  for (const sheet of document.styleSheets) { try { for (const rule of sheet.cssRules) rules.push(rule.cssText); } catch {} }
  return {
    dataset: { ...r.dataset }, cls: r.className,
    themeConfig: localStorage.getItem("theme-config"), theme: localStorage.getItem("theme"),
    sidebarTone: localStorage.getItem("baitari-sidebar-tone"),
    markers: ["baitari-clean-only-v1", "baitari-premium-default-v1", "baitari-clean-default-v1", "baitari-clean-default-v2"].map((k) => k + "=" + localStorage.getItem(k)),
    font: getComputedStyle(r).getPropertyValue("--app-font-sans").trim(),
    bodyFont: getComputedStyle(document.body).fontFamily,
    visualStyleAttr: r.hasAttribute("data-visual-style"),
    visualStyleRules: rules.filter((t) => t.includes("data-visual-style")).length,
    premiumSkinRules: rules.filter((t) => /data-skin="premium"/.test(t)).length,
    sidebarToneAttr: r.dataset.sidebarTone ?? null,
  };
});

// 1. The tester: skin premium + Geist + dark sidebar, legacy markers all set.
{
  const { ctx, page, errors } = await session({
    "theme-config": JSON.stringify({ skin: "premium", cleanFont: "geist" }), theme: "light",
    "baitari-sidebar-tone": JSON.stringify({ "x": "dark" }),
    "baitari-premium-default-v1": "true", "baitari-clean-default-v1": "true", "baitari-clean-default-v2": "true",
  });
  const s = await snapshot(page);
  record("1 skin premium + Geist + barre sombre -> Clean + Geist + barre sombre", s.dataset.skin === "clean" && s.dataset.cleanFont === "geist" && !("visualStyle" in s.dataset) && s.themeConfig === '{"cleanFont":"geist"}' && s.sidebarTone === JSON.stringify({ x: "dark" }) && /Geist/.test(s.font), JSON.stringify({ ds: s.dataset, tc: s.themeConfig, tone: s.sidebarTone, font: s.font.slice(0, 40), markers: s.markers }));
  record("1b aucune erreur console au démarrage migré", errors.length === 0, errors.join(" | "));
  record("1c le CSS chargé ne contient plus aucune règle data-visual-style ni data-skin=premium", s.visualStyleRules === 0 && s.premiumSkinRules === 0 && !s.visualStyleAttr, `rules=${s.visualStyleRules}/${s.premiumSkinRules}`);
  await ctx.close();
}
// 2. Hand-typed "premium" after the migration ran, then a reload.
{
  const { ctx, page, errors } = await session({ "theme-config": JSON.stringify({ cleanFont: "plex" }), theme: "light" });
  await page.evaluate(() => localStorage.setItem("theme-config", '{"skin":"premium","cleanFont":"plex"}'));
  await page.reload({ waitUntil: "domcontentloaded" }); await page.waitForTimeout(4500);
  const s = await snapshot(page);
  record("2 « premium » retapé à la main puis rechargement -> Clean, police Plex gardée", s.dataset.skin === "clean" && s.dataset.cleanFont === "plex" && s.themeConfig === '{"cleanFont":"plex"}' && errors.length === 0, JSON.stringify({ ds: s.dataset, tc: s.themeConfig, errors }));
  await ctx.close();
}
// 3. Corrupt / unknown values.
for (const [label, raw] of [["JSON invalide", "{oops"], ["tableau", '["premium"]'], ["police héritée du prototype", '{"cleanFont":"constructor"}'], ["skin inconnu", '{"skin":"neon","cleanFont":"comic"}']]) {
  const { ctx, page, errors } = await session({ "theme-config": raw, theme: "dark" }, { settle: 4500 });
  const s = await snapshot(page);
  const body = await page.evaluate(() => document.body.innerText.length);
  record(`3 préférence corrompue (${label}) -> Clean + Inter, app affichée, sans erreur`, s.dataset.skin === "clean" && s.dataset.cleanFont === "inter" && body > 200 && errors.length === 0, JSON.stringify({ ds: s.dataset.cleanFont, stored: s.themeConfig, body, errors }));
  await ctx.close();
}
// 4. Repeated light/dark toggling through the real button.
{
  const { ctx, page, errors } = await session({ theme: "light" });
  const before = await snapshot(page);
  const toggle = page.locator('button[aria-label*="mode"], button[aria-label*="thème"], button[aria-label*="Thème"], button[aria-label*="sombre"], button[aria-label*="clair"]').first();
  const label = await toggle.getAttribute("aria-label").catch(() => null);
  let flips = 0, consistent = true, last = before.cls;
  for (let i = 0; i < 24; i++) {
    await toggle.click({ timeout: 4000 }); await page.waitForTimeout(250);
    const s = await snapshot(page);
    if (s.cls === last) consistent = false; last = s.cls; flips++;
    if (s.dataset.skin !== "clean" || "visualStyle" in s.dataset || s.dataset.cleanFont !== "inter" || s.themeConfig && s.themeConfig !== "{}" && !s.themeConfig.includes("cleanFont")) consistent = false;
  }
  const s = await snapshot(page);
  record(`4 bascule clair/sombre répétée (${flips} fois, bouton « ${label} »)`, flips === 24 && consistent && errors.length === 0, JSON.stringify({ cls: s.cls, theme: s.theme, ds: s.dataset, errors }));
  await ctx.close();
}
// 5. First launch with no preference at all.
{
  const { ctx, page, errors } = await session({}, { settle: 4500 });
  const s = await snapshot(page);
  record("5 premier lancement sans aucune préférence -> Clean clair, Inter, rien d'écrit hors marqueur", s.dataset.skin === "clean" && s.dataset.cleanFont === "inter" && s.cls.includes("light") && s.themeConfig === null && s.markers[0] === "baitari-clean-only-v1=true" && errors.length === 0, JSON.stringify({ cls: s.cls, ds: s.dataset, tc: s.themeConfig, markers: s.markers, errors }));
  await ctx.close();
}
// 6. Appearance page: no theme row, font choice persists and applies.
{
  const { ctx, page, errors } = await session({ theme: "light" }, { path: "#/parametres" });
  await page.getByText("Apparence", { exact: true }).first().click(); await page.waitForTimeout(1500);
  const text = await page.evaluate(() => document.body.innerText);
  record("6 Paramètres > Apparence : plus de choix Clean/Premium, Mode/Police/barre/tableau de bord présents", !/Premium/.test(text) && !/Clean (clair|sombre)/.test(text) && ["Mode", "Police", "Barre latérale", "Disposition du tableau de bord", "Réduire la barre latérale"].every((t) => text.includes(t)), "");
  await page.getByText("Geist", { exact: true }).first().click(); await page.waitForTimeout(800);
  let s = await snapshot(page);
  const geistOk = s.themeConfig === '{"cleanFont":"geist"}' && s.dataset.cleanFont === "geist";
  await page.getByText("Inter", { exact: true }).first().click(); await page.waitForTimeout(800);
  s = await snapshot(page);
  record("6b choisir Geist puis Inter : enregistré et appliqué, sans erreur", geistOk && s.dataset.cleanFont === "inter" && errors.length === 0, JSON.stringify({ tc: s.themeConfig, errors }));
  await ctx.close();
}
await b.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} attaques repoussées`);
process.exit(failed.length ? 1 : 0);
