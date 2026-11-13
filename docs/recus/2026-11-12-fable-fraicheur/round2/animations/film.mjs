// Film d'une interaction au ralenti (x0,1) : usage: node film.mjs <url> <dossier> <ecran> <action> [mode]
// actions : assistant-ouvrir | assistant-fermer | page:<Libelle de navigation>
import { launch, open } from "./lib/setup.mjs"; import { ECRANS } from "./lib/parcours.mjs"; import fs from "fs";
const S = new URL(".", import.meta.url).pathname; const [URL_, OUT, ECRAN, ACTION, MODE = "light"] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const b = await launch(); const p = await open(b, { mode: MODE, base: S + "base.json", motion: "no-preference" }); await p.go(URL_, "#/dashboard"); await ECRANS.find(([n]) => n === ECRAN)[1](p); await p.mouse.move(700, 400);
const cdp = await p.context().newCDPSession(p); await cdp.send("Animation.enable");
const assistant = p.locator("header button[aria-label*='Assistant IA']").first();
if (ACTION === "assistant-fermer") { await assistant.click(); await p.waitForTimeout(2500); }
// sonde par image : temps, bord gauche du panneau, largeur de la page, nombre de mises en page forcees par ResizeObserver
await p.evaluate(() => { window.__f = []; window.__ro = 0; const main = document.querySelector("[data-slot='sidebar-inset']"); new ResizeObserver(() => window.__ro++).observe(main); const t0 = performance.now(); const tick = () => { const a = document.querySelector("aside[aria-label='Assistant de consultation']"); const v = document.querySelector(".app-view-enter"); window.__f.push([Math.round(performance.now() - t0), a ? Math.round(a.getBoundingClientRect().left) : null, Math.round(main.getBoundingClientRect().width), v ? +getComputedStyle(v).opacity : null, window.__ro]); if (window.__f.length < 400) requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
await cdp.send("Animation.setPlaybackRate", { playbackRate: Number(process.env.RATE ?? 0.1) });
if (ACTION.startsWith("page:")) await p.locator(".app-sidebar, [data-slot='sidebar']").first().getByText(ACTION.slice(5), { exact: true }).first().click(); else if (ACTION === "assistant-fermer") await p.getByRole("button", { name: /Fermer l.assistant/ }).first().click(); else await assistant.click();
for (const t of [0, 400, 800, 1200, 1800, 2400, 3200]) { await p.waitForTimeout(t === 0 ? 30 : 400 + (t > 1200 ? 200 : 0)); await p.screenshot({ path: `${OUT}/${MODE}-${ECRAN}-${ACTION.replace(/[^a-z]/gi, "_")}-${String(t).padStart(4, "0")}.png` }); }
const f = await p.evaluate(() => window.__f); const moves = f.filter((x, i) => i === 0 || x[1] !== f[i - 1][1] || x[2] !== f[i - 1][2] || x[3] !== f[i - 1][3]);
console.log(ACTION, ECRAN, "images:", f.length, "| largeurs de page distinctes:", new Set(f.map((x) => x[2])).size, "| rappels ResizeObserver:", f.at(-1)[4], "| echantillon [ms(x10), gauche panneau, largeur page, opacite vue]:", JSON.stringify(moves.filter((_, i) => i % Math.ceil(moves.length / 10) === 0).map((x) => x.slice(0, 4)))); await b.close();
