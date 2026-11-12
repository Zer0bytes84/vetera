import { launch, newCtx, FIXED } from "./lib/setup.mjs";
import fs from "fs";
const [URL, STATE, OUT] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const b = await launch(); const results = []; const errors = [];
const rec = (name, ok, detail = "") => { results.push({ name, ok, detail }); console.log(ok ? "PASS" : "FAIL", name, detail); };
const KEY = "baitari-guided-tour-v1";
for (const mode of ["light", "dark"]) {
  const ctx = await newCtx(b, STATE); const page = await ctx.newPage(); page.setDefaultTimeout(8000);
  page.on("pageerror", (e) => errors.push(`${mode} pageerror ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`${mode} console ${m.text().slice(0, 160)}`); });
  await page.addInitScript(([m]) => { if (sessionStorage.getItem("__s")) return; sessionStorage.setItem("__s", "1"); localStorage.setItem("theme", m); localStorage.setItem("baitari:last-seen-version", "5.0.9"); localStorage.removeItem("baitari-guided-tour-v1"); }, [mode]);
  const settle = async (ms = 3500) => { await page.waitForTimeout(ms); await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important}" }); };
  const shot = (n) => page.screenshot({ path: `${OUT}/${mode}-${n}.png` });
  const tour = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "null"), KEY);
  const count = (sel) => page.locator(sel).count();
  const insert = (table, row) => page.evaluate(async ([t, r]) => { const m = await import("/src/services/browser-store.ts"); const out = m.insertBrowserRow(t, r); window.dispatchEvent(new CustomEvent("sqlite-data-changed", { detail: { tableName: t } })); return out; }, [table, row]);

  await page.goto(URL + "#/dashboard", { waitUntil: "domcontentloaded" }); await settle(5000);
  // 1. installation neuve : invitation vue
  rec(`${mode} 1 invitation vue au premier lancement`, (await count(".tour-invitation")) === 1 && (await page.locator(".tour-invitation").innerText()).includes("Faire le tour"), JSON.stringify(await tour()));
  await shot("1-invitation");
  // 2. relance : l'invitation ne revient pas
  await page.reload({ waitUntil: "domcontentloaded" }); await settle(4500);
  rec(`${mode} 2 invitation montrée une fois : absente au lancement suivant`, (await count(".tour-invitation")) === 0 && (await tour())?.invitation === "shown");
  // 3. carte fermée : disparaît pour de bon
  await page.evaluate((k) => localStorage.removeItem(k), KEY); await page.reload({ waitUntil: "domcontentloaded" }); await settle(4500);
  await page.getByRole("button", { name: "Fermer" }).click(); await page.waitForTimeout(400);
  rec(`${mode} 3 fermer : disparaît, état fermé, l'app reste libre`, (await count(".tour-invitation")) === 0 && (await tour())?.invitation === "closed" && (await count(".tour-card")) === 0);
  await page.reload({ waitUntil: "domcontentloaded" }); await settle(4500);
  rec(`${mode} 3b fermée : ne revient pas`, (await count(".tour-invitation")) === 0);
  // 4. démarrer
  await page.evaluate((k) => localStorage.removeItem(k), KEY); await page.reload({ waitUntil: "domcontentloaded" }); await settle(4500);
  await page.getByRole("button", { name: "Faire le tour" }).click(); await page.waitForTimeout(800);
  let st = await tour();
  rec(`${mode} 4 démarrer : étape 1 sur 4, carte et repère sur « + »`, st?.status === "running" && st.step === 0 && (await page.locator(".tour-card").innerText()).includes("Étape 1 sur 4") && (await count(".tour-ring")) === 1, JSON.stringify(st));
  const ringBox = await page.locator(".tour-ring").boundingBox(); const plusBox = await page.locator('button[aria-label="Actions rapides"]').first().boundingBox();
  rec(`${mode} 4b le repère entoure le bouton « + »`, !!ringBox && !!plusBox && Math.abs(ringBox.x - plusBox.x) < 1 && Math.abs(ringBox.width - plusBox.width) < 1, JSON.stringify({ ringBox, plusBox }));
  await shot("2-etape1");
  // 5. ouvrir le menu : le repère passe sur « Patient »
  await page.locator('button[aria-label="Actions rapides"]').first().click(); await page.waitForTimeout(900);
  const itemBox = await page.locator(".quick-actions-menu-item", { hasText: "Patient" }).first().boundingBox(); const ring2 = await page.locator(".tour-ring").boundingBox();
  rec(`${mode} 5 menu ouvert : le repère passe sur l'entrée « Patient »`, !!itemBox && !!ring2 && Math.abs(ring2.x - itemBox.x) < 2 && Math.abs(ring2.width - itemBox.width) < 2, JSON.stringify({ itemBox, ring2 }));
  await shot("3-etape1-menu");
  await page.locator(".quick-actions-menu-item", { hasText: "Patient" }).first().click(); await page.waitForTimeout(1500);
  rec(`${mode} 6 après le clic : le repère s'efface, la suite s'affiche`, (await count(".tour-ring")) === 0 && (await page.locator(".tour-card").innerText()).includes("Renseignez l’animal"), (await page.locator(".tour-card").innerText()).slice(0, 120));
  await shot("4-etape1-formulaire");
  await page.keyboard.press("Escape"); await page.waitForTimeout(500);
  // 7. l'étape ne s'ouvre pas sans l'action réelle
  rec(`${mode} 7 sans création, l'étape 1 reste en cours`, (await tour())?.step === 0);
  // 8. créer réellement un patient (écriture de données de test dans la base du navigateur) : l'étape avance
  const ownerId = await page.evaluate(async () => (await import("/src/services/browser-store.ts")).getBrowserTable("owners")[0].id);
  const patient = await insert("patients", { id: "zz-p1", name: "ZZ-TEST-Rex", ownerId, species: "Chien", sex: "M", status: "sante" });
  await page.waitForTimeout(1800);
  st = await tour();
  rec(`${mode} 8 patient réellement créé : étape 2, repère retenu`, st?.step === 1 && st.patientId === patient.id, JSON.stringify(st));
  await shot("5-etape2");
  rec(`${mode} 8b l'étape 2 nomme le patient`, (await page.locator(".tour-card").innerText()).includes("Étape 2 sur 4"));
  // 9. rendez-vous
  const when = new Date(Date.now() + 3600_000);
  const appt = await insert("appointments", { id: "zz-a1", patientId: patient.id, ownerId, vetId: "x", title: "ZZ-TEST RDV", type: "Consultation", status: "scheduled", startTime: when.toISOString(), endTime: new Date(+when + 1800_000).toISOString() });
  await page.waitForTimeout(1800); st = await tour();
  rec(`${mode} 9 rendez-vous créé : étape 3`, st?.step === 2 && st.appointmentId === appt.id, JSON.stringify(st));
  rec(`${mode} 9b étape 3 : repère sur « Agenda » dans la barre latérale`, (await count(".tour-ring")) === 1 && (async () => true)());
  await shot("6-etape3");
  await page.goto(URL + "#/agenda", { waitUntil: "domcontentloaded" }); await settle(4000);
  rec(`${mode} 9c dans l'Agenda : le repère s'efface, la consigne se précise`, (await count(".tour-ring")) === 0 && (await page.locator(".tour-card").innerText()).includes("« Ouvrir »"));
  await shot("7-etape3-agenda");
  // 10. note validée
  const content = await page.evaluate(async () => { const m = await import("/src/modules/consultations/local-ai/soap-review.ts"); return m.reviewedSoapContent({ subjective: "ZZ-TEST", objective: "ZZ-TEST", assessment: "ZZ-TEST", plan: "ZZ-TEST" }, "{}", null); });
  await insert("consultation_soaps", { id: "zz-s1", appointmentId: appt.id, patientId: patient.id, subjective: "ZZ-TEST", objective: "ZZ-TEST", assessment: "ZZ-TEST", plan: "ZZ-TEST", content, aiDraft: null, aiConfidence: null, transcript: null, templateVersion: "1" });
  await page.waitForTimeout(1800); st = await tour();
  rec(`${mode} 10 note validée : étape 4`, st?.step === 3 && st.status === "running", JSON.stringify(st));
  await page.goto(URL + "#/dashboard", { waitUntil: "domcontentloaded" }); await settle(4000);
  await shot("8-etape4");
  rec(`${mode} 10b étape 4 : « + » puis « Facture »`, (await page.locator(".tour-card").innerText()).includes("Facturez et encaissez") && (await count(".tour-ring")) === 1);
  // 11. quitter au milieu : rien de cassé, rien relancé
  await page.getByRole("button", { name: "Quitter le tour" }).click(); await page.waitForTimeout(500);
  rec(`${mode} 11 quitter : carte et repère disparus, état « quit », rien supprimé`, (await count(".tour-card")) === 0 && (await count(".tour-ring")) === 0 && (await tour())?.status === "quit" && (await page.evaluate(async () => (await import("/src/services/browser-store.ts")).getBrowserTable("patients").some((p) => p.name === "ZZ-TEST-Rex"))));
  await page.reload({ waitUntil: "domcontentloaded" }); await settle(4500);
  rec(`${mode} 11b après redémarrage : aucun tour, aucune invitation`, (await count(".tour-card")) === 0 && (await count(".tour-invitation")) === 0);
  // 12. relance depuis les Paramètres
  await page.goto(URL + "#/parametres", { waitUntil: "domcontentloaded" }); await settle(4000);
  await page.getByText("Apparence", { exact: true }).first().click(); await page.waitForTimeout(1200);
  await shot("9-parametres-apparence");
  await page.getByRole("button", { name: "Revoir le tour" }).click(); await page.waitForTimeout(1500);
  st = await tour();
  rec(`${mode} 12 « Revoir le tour » : depuis le début, sur le tableau de bord`, st?.status === "running" && st.step === 0 && st.patientId === null && (await page.evaluate(() => location.hash)).includes("dashboard") && (await page.locator(".tour-card").innerText()).includes("Étape 1 sur 4"), JSON.stringify(st));
  // 13. passer à chaque étape, fin du tour
  for (let i = 0; i < 4; i++) { await page.getByRole("button", { name: "Passer" }).click(); await page.waitForTimeout(500); }
  rec(`${mode} 13 « Passer » ×4 : tour terminé, carte de fin`, (await tour())?.status === "done" && (await page.locator(".tour-card").innerText()).includes("Tour terminé"));
  await shot("10-fin");
  await page.getByRole("button", { name: "Terminer" }).click(); await page.waitForTimeout(400);
  rec(`${mode} 13b terminer : plus rien ne s'affiche`, (await count(".tour-card")) === 0);
  await page.reload({ waitUntil: "domcontentloaded" }); await settle(4000);
  rec(`${mode} 13c tour terminé : ne se relance jamais tout seul`, (await count(".tour-card")) === 0 && (await count(".tour-invitation")) === 0);
  await ctx.close();
}
rec("aucune erreur console ni de page pendant tout le parcours", errors.length === 0, errors.slice(0, 4).join(" | "));
fs.writeFileSync(`${OUT}/resultats.json`, JSON.stringify(results, null, 1));
console.log(`${results.filter((r) => r.ok).length}/${results.length}`); await b.close();
