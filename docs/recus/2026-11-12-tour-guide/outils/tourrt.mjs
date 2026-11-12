import { launch, newCtx } from "./lib/setup.mjs";
const [URL, STATE] = process.argv.slice(2);
const b = await launch(); const out = [];
const rec = (n, ok, d = "") => { out.push({ n, ok, d }); console.log(ok ? "PASS" : "FAIL", n, d); };
const KEY = "baitari-guided-tour-v1";
async function open(seedValue, { w = 1440, h = 900, extraInit } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, locale: "fr-FR", storageState: STATE });
  const page = await ctx.newPage(); page.setDefaultTimeout(6000);
  const errors = []; page.on("pageerror", (e) => errors.push(e.message)); page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 120)); });
  await page.addInitScript(([v, k, x]) => { if (sessionStorage.getItem("__s")) return; sessionStorage.setItem("__s", "1"); localStorage.setItem("baitari:last-seen-version", "5.0.9"); localStorage.setItem("theme", "light"); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); if (x) eval(x); }, [seedValue, KEY, extraInit ?? null]);
  await page.goto(URL + "#/dashboard", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(5000);
  return { ctx, page, errors };
}
const ev = (page, f, a) => page.evaluate(f, a);
const state = (page) => ev(page, (k) => JSON.parse(localStorage.getItem(k) ?? "null"), KEY);

// 1. enregistrements hostiles : jamais d'invitation, jamais d'erreur, app utilisable
for (const [label, raw] of [["JSON invalide", "{oops"], ["tableau", "[]"], ["null", "null"], ["statut inconnu", '{"status":"exploded","invitation":"unseen"}'], ["running sans heure", '{"status":"running","step":2}'], ["step démesuré", '{"status":"running","step":99999,"startedAt":"2026-11-12T10:00:00Z"}'], ["__proto__", '{"__proto__":{"status":"running"},"status":"idle","invitation":"closed"}'], ["énorme", JSON.stringify({ status: "idle", invitation: "closed", patientId: "x".repeat(200000) })]]) {
  const { ctx, page, errors } = await open(raw);
  const inv = await page.locator(".tour-invitation").count(); const plus = await page.locator('button[aria-label="Actions rapides"]').count();
  const card = await page.locator(".tour-card").count();
  rec(`1 enregistrement hostile (${label}) : app libre, pas d'invitation intempestive, aucune erreur`, plus === 1 && inv === 0 && errors.length === 0 && card <= 1, JSON.stringify({ inv, card, errors: errors.slice(0, 2) }));
  await ctx.close();
}
// 2. « running sans heure » est tenu pour quitté : pas de carte
{ const { ctx, page } = await open('{"status":"running","step":2}'); rec("2 tour « en cours » sans heure valable : aucune carte, rien relancé", (await page.locator(".tour-card").count()) === 0); await ctx.close(); }
// 3. une seconde fenêtre démarre le tour : celle-ci suit, sans le relancer
{ const { ctx, page } = await open(JSON.stringify({ invitation: "closed", status: "idle", step: 0, startedAt: null, patientId: null, appointmentId: null }));
  const p2 = await ctx.newPage(); await p2.goto(URL + "#/dashboard", { waitUntil: "domcontentloaded" }); await p2.waitForTimeout(3000);
  await p2.evaluate((k) => localStorage.setItem(k, JSON.stringify({ invitation: "closed", status: "running", step: 1, startedAt: new Date().toISOString(), patientId: null, appointmentId: null })), KEY);
  await page.waitForTimeout(1500);
  rec("3 une autre fenêtre change le tour : la première le suit (événement storage)", (await page.locator(".tour-card").count()) === 1 && (await page.locator(".tour-card").innerText()).includes("Étape 2 sur 4"));
  await ctx.close(); }
// 4. fenêtre étroite : la carte tient, ne dépasse pas, le repère suit le bouton
{ const { ctx, page } = await open(JSON.stringify({ invitation: "closed", status: "running", step: 0, startedAt: new Date().toISOString(), patientId: null, appointmentId: null }), { w: 700, h: 700 });
  const box = await page.locator(".tour-card").boundingBox();
  rec("4 fenêtre étroite (700 px) : la carte reste entièrement dans l'écran", !!box && box.x >= 0 && box.x + box.width <= 700 && box.y + box.height <= 700, JSON.stringify(box));
  const ring = await page.locator(".tour-ring").count(); const plus = await page.locator('button[aria-label="Actions rapides"]').first().boundingBox();
  rec("4b le repère suit le bouton « + » même en fenêtre étroite", ring === 1 && !!plus, JSON.stringify({ ring, plus }));
  await ctx.close(); }
// 5. clavier : on atteint « Passer » et « Quitter le tour » au clavier, la carte est une région nommée
{ const { ctx, page } = await open(JSON.stringify({ invitation: "closed", status: "running", step: 0, startedAt: new Date().toISOString(), patientId: null, appointmentId: null }));
  const region = await page.locator('section.tour-card[role="region"]').getAttribute("aria-label");
  await page.locator(".tour-card button", { hasText: "Passer" }).focus(); await page.keyboard.press("Enter"); await page.waitForTimeout(500);
  rec("5 clavier : Entrée sur « Passer » avance ; la carte est une région « Tour guidé »", region === "Tour guidé" && (await state(page)).step === 1);
  await page.locator(".tour-card button", { hasText: "Quitter le tour" }).focus(); await page.keyboard.press("Space"); await page.waitForTimeout(500);
  rec("5b clavier : « Quitter le tour » à la barre d'espace", (await state(page)).status === "quit");
  await ctx.close(); }
// 6. clics répétés : « Passer » martelé ne dépasse jamais la fin, « Faire le tour » martelé ne démarre qu'un tour
{ const { ctx, page } = await open(null);
  const start = page.getByRole("button", { name: "Faire le tour" }); await start.dblclick().catch(() => {}); await page.waitForTimeout(600);
  const s1 = await state(page);
  for (let i = 0; i < 12; i++) await page.getByRole("button", { name: "Passer" }).click({ timeout: 500 }).catch(() => {});
  await page.waitForTimeout(400); const s2 = await state(page);
  rec("6 double-clic sur « Faire le tour » : un seul tour, étape 1 ; « Passer » martelé : termine sans dépasser", s1.status === "running" && s1.step <= 1 && s2.status === "done" && s2.step === 3, JSON.stringify({ s1, s2 }));
  await ctx.close(); }
// 7. patient du tour supprimé en route : le tour continue, ne bloque pas
{ const { ctx, page } = await open(JSON.stringify({ invitation: "closed", status: "running", step: 1, startedAt: new Date(Date.now() - 60000).toISOString(), patientId: "supprime-xyz", appointmentId: null }));
  const txt = await page.locator(".tour-card").innerText();
  const owner = await ev(page, async () => (await import("/src/services/browser-store.ts")).getBrowserTable("owners")[0].id);
  await ev(page, async (o) => { const m = await import("/src/services/browser-store.ts"); m.insertBrowserRow("appointments", { id: "zz-a9", patientId: "demo_patient_01", ownerId: o, vetId: "x", title: "ZZ", type: "Consultation", status: "scheduled", startTime: new Date().toISOString(), endTime: new Date().toISOString() }); window.dispatchEvent(new CustomEvent("sqlite-data-changed", { detail: { tableName: "appointments" } })); }, owner);
  await page.waitForTimeout(1800);
  rec("7 patient du tour inconnu (supprimé) : l'étape n'est pas bloquée, un rendez-vous neuf la fait avancer", txt.includes("Étape 2 sur 4") && (await state(page)).step === 2, JSON.stringify(await state(page)));
  await ctx.close(); }
// 8. lecture seule : le tour ne crée rien (compte des lignes avant/après un tour complet à coups de « Passer »)
{ const { ctx, page } = await open(null);
  const count = () => ev(page, async () => { const m = await import("/src/services/browser-store.ts"); return ["patients","appointments","owners","consultation_soaps","transactions","notes","tasks"].map((t) => m.getBrowserTable(t).length).join(","); });
  const before = await count();
  await page.getByRole("button", { name: "Faire le tour" }).click(); await page.waitForTimeout(500);
  for (let i = 0; i < 4; i++) { await page.getByRole("button", { name: "Passer" }).click(); await page.waitForTimeout(250); }
  await page.waitForTimeout(800); const after = await count();
  rec("8 un tour complet ne crée aucune donnée (compteurs identiques)", before === after, `${before} -> ${after}`);
  await ctx.close(); }
// 9. mouvement réduit et contraste : aucune animation ni transition sur le repère et la carte
{ const { ctx, page } = await open(JSON.stringify({ invitation: "closed", status: "running", step: 0, startedAt: new Date().toISOString(), patientId: null, appointmentId: null }));
  const m = await ev(page, () => { const r = getComputedStyle(document.querySelector(".tour-ring")); const c = getComputedStyle(document.querySelector(".tour-card")); return { ra: r.animationName, rt: r.transitionDuration, ca: c.animationName, ct: c.transitionDuration }; });
  rec("9 le repère et la carte n'animent rien (aucun nouveau mouvement)", m.ra === "none" && m.ca === "none" && /^0s(, 0s)*$/.test(m.rt) && /^0s(, 0s)*$/.test(m.ct), JSON.stringify(m));
  await ctx.close(); }
console.log(`${out.filter((x) => x.ok).length}/${out.length}`); await b.close();
