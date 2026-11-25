// Le comportement des fenêtres, avant et après la charte : envoi par le bouton, envoi par Entrée, Échap, croix.
import { launch, context, page } from "./banc.mjs";
const port = process.argv[2] ?? "5199";
const b = await launch(); const out = {};
const run = async (nom, fn) => {
  const ctx = await context(b); const p = await page(ctx); p.setDefaultTimeout(6000);
  try { out[nom] = await fn(p); } catch (e) { out[nom] = `échec : ${e.message.split("\n")[0]}`; }
  await ctx.close();
};
const go = async (p, h) => { await p.goto(`http://localhost:${port}/#/${h}`); await p.waitForTimeout(3500); };
const ouverte = (p) => p.evaluate(() => [...document.querySelectorAll('[role=dialog],[role=alertdialog]')].filter((d) => d.getBoundingClientRect().height > 0).length);
const lien = async (p) => { await go(p, "notes"); await p.getByRole("button", { name: /^Ajouter$/ }).click(); await p.getByRole("menuitem", { name: /Ajouter un lien/ }).click(); await p.waitForTimeout(700); };
await run("lien : clic sur « Ajouter »", async (p) => { await lien(p); await p.fill("#library-link-url", "exemple.dz/banc-clic"); await p.getByRole("dialog").getByRole("button", { name: /^Ajouter$/ }).click(); await p.waitForTimeout(900); return { fenetre: await ouverte(p), ajoute: await p.getByText("exemple.dz/banc-clic").count() > 0 }; });
await run("lien : Entrée dans le champ", async (p) => { await lien(p); await p.fill("#library-link-url", "exemple.dz/banc-entree"); await p.press("#library-link-url", "Enter"); await p.waitForTimeout(900); return { fenetre: await ouverte(p), ajoute: await p.getByText("exemple.dz/banc-entree").count() > 0 }; });
await run("lien : Échap", async (p) => { await lien(p); await p.keyboard.press("Escape"); await p.waitForTimeout(600); return { fenetre: await ouverte(p) }; });
await run("lien : croix « Fermer »", async (p) => { await lien(p); const x = p.getByRole("dialog").getByRole("button", { name: /^Fermer$/ }); const n = await x.count(); if (!n) return { croix: "absente" }; await x.first().click(); await p.waitForTimeout(600); return { fenetre: await ouverte(p) }; });
await run("coordonnées : Entrée enregistre", async (p) => { await go(p, "patients"); await p.getByRole("button", { name: /Modifier les coordonnées de Yacine/ }).click(); await p.waitForTimeout(800); const f = p.getByRole("dialog").locator("input").first(); await f.fill("Bouras-Banc"); await f.press("Enter"); await p.waitForTimeout(1200); return { fenetre: await ouverte(p), nom: await p.getByText(/Bouras-Banc/).count() > 0 }; });
await run("nouveau patient : ⌘↵ sans champs requis", async (p) => { await go(p, "patients"); await p.getByRole("button", { name: "Nouveau patient" }).first().click(); await p.waitForTimeout(900); await p.keyboard.press("Control+Enter"); await p.waitForTimeout(800); return { fenetre: await ouverte(p), alertes: await p.getByRole("dialog").getByRole("alert").count() }; });
await run("soin : « Confirmer le soin » désactivé tant que vide", async (p) => { await go(p, "clinique"); await p.getByRole("button", { name: "Planifier un soin" }).click(); await p.waitForTimeout(900); return { desactive: await p.getByRole("button", { name: /Confirmer le soin/ }).isDisabled() }; });
console.log(JSON.stringify(out, null, 1));
await b.close();
