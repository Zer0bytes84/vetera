// usage: node data-answer.mjs <url> <dossier-captures> : l'onglet Données de l'assistant, dans la page, clair et sombre
import { launch, open } from "./lib/setup.mjs";
import fs from "fs";
const S = new URL(".", import.meta.url).pathname; const [URL_, OUT] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true }); const b = await launch(); const out = {};
const openTab = async (p) => {
  await p.getByRole("button", { name: /Assistant IA/ }).first().click(); await p.waitForTimeout(1200);
  await p.getByRole("radio", { name: /Données/ }).first().click(); await p.waitForTimeout(800);
};
const ask = async (p, q) => { const box = p.getByRole("textbox", { name: /question sur les données/i }); await box.fill(q); await box.press("Enter"); await p.waitForTimeout(900); };
const panelText = (p) => p.evaluate(() => (document.querySelector("[data-clinic-answers]")?.innerText ?? "").replace(/\s+/g, " "));
for (const mode of ["light", "dark"]) {
  const p = await open(b, { mode, base: S + "base-absence.json", height: 1300 });
  const dehors = []; p.on("request", (r) => { const u = r.url(); if (!/^(http:\/\/(127\.0\.0\.1|localhost)|data:|blob:)/.test(u)) dehors.push(u.slice(0, 80)); });
  await p.go(URL_, "#/dashboard"); await p.waitForTimeout(1500);
  if (mode === "light") out.tableau_de_bord = await p.evaluate(() => { const t = document.body.innerText.replace(/\s+/g, " "); const m = /Trésorerie[^]{0,120}/.exec(t); return m ? m[0] : null; });
  await openTab(p);
  await p.waitForTimeout(2200); await p.screenshot({ path: `${OUT}/${mode}-1-accueil.png` });
  await ask(p, "Recettes des 30 derniers jours");
  if (mode === "light") out.recettes_30j = (await panelText(p)).slice(0, 700);
  await p.waitForTimeout(2200); await p.screenshot({ path: `${OUT}/${mode}-2-recettes.png` });
  if (mode === "light") {
    await ask(p, "Rendez-vous des 30 derniers jours"); out.rendez_vous_30j = (await panelText(p)).match(/\d+ rendez-vous du[^.]*\./)?.[0] ?? null;
    out.tableau_rdv = await p.evaluate(() => { const t = document.body.innerText.replace(/\s+/g, " "); const m = /Rendez-vous \d+ [^%]{0,60}/.exec(t); return m ? m[0] : null; });
    await ask(p, "Tâches en retard"); out.taches_retard = (await panelText(p)).match(/(\d+ tâches? ouvertes?[^.]*\.|Aucune tâche[^.]*\.)/g)?.at(-1) ?? null;
    await ask(p, "Nouveaux patients ce mois"); out.nouveaux_patients = (await panelText(p)).match(/(\d+ dossiers? créés?[^.]*\.|Aucun dossier créé[^.]*\.)/g)?.at(-1) ?? null;
  }
  await ask(p, "quelle dose de rimadyl pour Rex ?");
  if (mode === "light") out.dose = (await panelText(p)).slice(-380);
  await ask(p, "Absences des 30 derniers jours");
  await p.waitForTimeout(2200); await p.screenshot({ path: `${OUT}/${mode}-3-absences-carte.png` });
  if (mode === "light") {
    out.carte_avant = await p.getByRole("button", { name: /Valider et créer/ }).count();
    await p.getByRole("button", { name: /Valider et créer/ }).first().click(); await p.waitForTimeout(1500);
    out.carte_apres = (await panelText(p)).match(/Enregistré[^]{0,160}|1 tâche ajoutée[^]{0,80}|existaient déjà[^]{0,60}/)?.[0] ?? "(pas de confirmation lue)";
    await p.waitForTimeout(2200); await p.screenshot({ path: `${OUT}/${mode}-4-carte-validee.png` });
  }
  out.requetes_externes = (out.requetes_externes ?? []).concat(dehors);
  out.erreurs = (out.erreurs ?? []).concat(p.errors.filter((e) => !/status of 50[04]/.test(e)));
  await p.context().close();
}
console.log(JSON.stringify(out, null, 1)); await b.close();
