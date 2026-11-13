// usage: node mascottes.mjs <url> <dossier> [animaux] : le sélecteur (Paramètres › Apparence, puis la fenêtre de la barre latérale),
// et le tableau de bord avec chaque mascotte, en clair et en sombre ; mesure qu'elles clignent et suivent le pointeur.
import { launch, open } from "./lib/setup.mjs"; import fs from "fs";
const S = new URL(".", import.meta.url).pathname; const [URL_, OUT, ANIMAUX = ""] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const b = await launch();
for (const mode of ["light", "dark"]) {
  const p = await open(b, { mode, base: S + "base.json", motion: "no-preference" }); await p.go(URL_, "#/parametres"); await p.settle(2000);
  await p.getByRole("tab", { name: /Apparence/ }).or(p.getByRole("button", { name: /^Apparence/ })).first().click(); await p.settle(1500);
  const section = p.locator(".mascot-settings"); await section.scrollIntoViewIfNeeded(); await p.mouse.move(5, 5); await p.waitForTimeout(500);
  await section.screenshot({ path: `${OUT}/${mode}-selecteur-parametres.png` });
  await p.locator(".app-sidebar, [data-slot=sidebar]").first().locator("button").first().click().catch(() => {}); await p.waitForTimeout(700);
  const pop = p.locator(".mascot-choices[data-compact=true]").first();
  if (await pop.count()) await pop.screenshot({ path: `${OUT}/${mode}-selecteur-barre-laterale.png` }); else console.log(mode, "fenêtre de la barre latérale introuvable");
  await p.keyboard.press("Escape"); await p.context().close();
  for (const animal of ANIMAUX.split(",").filter(Boolean)) {
    const q = await open(b, { mode, base: S + "base.json", motion: "no-preference" });
    await q.addInitScript((a) => localStorage.setItem("baitari:mascot:v1", JSON.stringify({ mode: "mascot", animal: a, animated: true })), animal);
    await q.go(URL_, "#/dashboard"); await q.settle(2500); await q.mouse.move(700, 5); await q.waitForTimeout(600);
    await q.screenshot({ path: `${OUT}/${mode}-tableau-de-bord-${animal}.png` });
    if (mode === "light") {
      const root = q.locator(".lm-root").first();
      const gaze = async (x, y) => { await q.mouse.move(x, y); await q.waitForTimeout(400); return root.locator(".lm-pupils").first().evaluate((e) => getComputedStyle(e).transform); };
      const g1 = await gaze(1400, 880), g2 = await gaze(5, 5);
      let blinked = false; for (let i = 0; i < 80 && !blinked; i++) { blinked = await root.evaluate((e) => e.hasAttribute("data-blink")); if (!blinked) await q.waitForTimeout(100); }
      console.log(`${animal} : dessin=${await root.getAttribute("data-animal")} · regard bas-droite ${g1} · haut-gauche ${g2} · clignement vu en 8 s : ${blinked ? "oui" : "non"}`);
    }
    await q.context().close();
  }
}
await b.close();
