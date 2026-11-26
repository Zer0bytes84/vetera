// Captures et relevés de finition, modale par modale : node modales.mjs <port> <dossier> [filtre] [clair|sombre] [hauteur]
import fs from "node:fs";
import { launch, context, page } from "./banc.mjs";
import { finition } from "./modale.mjs";
import { MODALES } from "./modales-liste.mjs";
const [port = "5199", out = "/tmp/claude-0/captures", filtre = "", mode = "light", haut = "900"] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const b = await launch();
const res = {};
for (const m of MODALES.filter((x) => !filtre || filtre.split(",").some((f) => x.id.includes(f)))) {
  const ctx = await context(b, { mode, height: Number(haut) }); const p = await page(ctx); p.setDefaultTimeout(6000);
  const base = `http://localhost:${port}/`;
  p.go = async (hash, wait = 3500) => { await p.goto(base + "#/" + hash); await p.waitForTimeout(wait); };
  p.btn = async (name, opts = {}) => { await p.getByRole("button", { name, ...opts }).first().click(); await p.waitForTimeout(700); };
  p.item = async (name) => { await p.getByRole("menuitem", { name }).first().click(); await p.waitForTimeout(900); };
  try {
    await m.open(p);
    await p.waitForTimeout(600);
    const f = await finition(p);
    if (!f) throw new Error("aucune fenêtre ouverte");
    res[m.id] = { ...f, erreurs: p.errors.slice(0, 3) };
    await p.screenshot({ path: `${out}/${m.id}${mode === "dark" ? "-sombre" : ""}.jpg`, quality: 82, type: "jpeg" });
    console.log(`✓ ${m.id}`);
  } catch (e) {
    res[m.id] = { echec: String(e.message).split("\n")[0].slice(0, 200) };
    console.log(`✗ ${m.id} : ${res[m.id].echec}`);
  }
  await ctx.close();
}
fs.writeFileSync(`${out}/releves${mode === "dark" ? "-sombre" : ""}${filtre ? "-" + filtre.replace(/[^a-z0-9-]/gi, "_").slice(0, 40) : ""}.json`, JSON.stringify(res, null, 1));
await b.close();
