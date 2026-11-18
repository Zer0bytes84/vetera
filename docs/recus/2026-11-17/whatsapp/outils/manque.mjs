// Parcours du rendez-vous manque : depasse sans etre marque arrive, ou marque absent, il remonte dans les Rappels
// avec « Relance WhatsApp ». Horloge pilotee : 14 h 29 le 18 novembre 2026, Rex a rendez-vous a 14 h 30.
// Usage : node manque.mjs <dossier de sortie>
import fs from "node:fs";
import { launch, open } from "./banc.mjs";

const OUT = process.argv[2] ?? "sortie-manque";
fs.mkdirSync(OUT, { recursive: true });
const decode = (link) => { const u = new URL(link); return { lien: link, numero: u.searchParams.get("phone"), texte: u.searchParams.get("text") }; };
const at = (hhmmss) => new Date(`2026-11-18T${hhmmss}+01:00`);
const result = { etapes: [], clics: {}, erreurs: {} };

async function groups(page) {
  const out = {};
  for (const [bucket, name] of [["relance", "dans l’heure"], ["relance-manquee", "manqués"]]) {
    const group = page.locator(`section[data-bucket=${bucket}]`);
    out[name] = (await group.count())
      ? await group.locator("article").evaluateAll((rows) => rows.map((row) => ({ id: row.dataset.appointmentId, titre: row.querySelector("h3").textContent.trim(), badge: row.querySelector("[data-slot=badge], .badge, span[class*=border]")?.textContent.trim(), bouton: Boolean([...row.querySelectorAll("button")].find((b) => b.textContent.includes("Relance WhatsApp"))) })))
      : [];
  }
  return out;
}
async function note(page, moment) {
  const entry = { moment, horloge: await page.evaluate(() => new Date().toLocaleString("fr-FR")), ...(await groups(page)) };
  result.etapes.push(entry);
  console.log(JSON.stringify(entry));
}
async function click(page, locator) {
  const before = await page.evaluate(() => window.__opened.length);
  await locator.click();
  await page.waitForTimeout(300);
  const opened = await page.evaluate(() => window.__opened);
  return opened.length - before === 1 ? decode(opened.at(-1)) : `ouvertures : ${opened.length - before}`;
}

for (const mode of ["light", "dark"]) {
  const browser = await launch();
  const page = await open(browser, { mode, store: "store-rdv.json", clock: { install: at("14:29:20") } });
  await page.go("#/taches");
  await page.clock.pauseAt(at("14:29:50"));
  if (mode === "light") await note(page, "14:29:50");
  await page.clock.runFor(9_000);
  await page.waitForTimeout(300);
  if (mode === "light") await note(page, "14:29:59, sans recharger");
  await page.clock.runFor(1_500);
  await page.waitForTimeout(300);
  if (mode === "light") {
    await note(page, "14:30:00 passé, sans recharger");
    const manques = page.locator("section[data-bucket=relance-manquee]");
    result.clics["Rex, non arrivé"] = await click(page, manques.locator("article[data-appointment-id=zz-a1]").getByRole("button", { name: /Relance WhatsApp/ }));
    result.clics["Médor, absent la veille"] = await click(page, manques.locator("article[data-appointment-id=zz-a6]").getByRole("button", { name: /Relance WhatsApp/ }));
  }
  await page.mouse.move(5, 5);
  await page.locator("section[data-bucket=relance-manquee]").screenshot({ path: `${OUT}/rappels-manques-1430-${mode}.png` });

  if (mode === "light") {
    // Marquer Zoé absente depuis le menu de l'Agenda (sur la copie du banc), puis revenir aux Rappels.
    await page.clock.resume();
    await page.go("#/agenda");
    await page.waitForTimeout(1500);
    const rex = page.locator("[data-row-id=zz-a1]");
    await rex.getByRole("button", { name: "Actions pour Rex" }).click();
    await page.waitForTimeout(400);
    result.clics["Agenda, Rex après l'heure"] = await click(page, page.getByRole("menu").getByRole("menuitem", { name: "Relance WhatsApp" }));
    const zoe = page.locator("[data-row-id=zz-a2]");
    await zoe.getByRole("button", { name: "Actions pour Zoé l’Écureuil" }).click();
    await page.waitForTimeout(400);
    await page.getByRole("menu").getByRole("menuitem", { name: "Marquer absent" }).click();
    await page.waitForTimeout(1500);
    await zoe.getByRole("button", { name: "Actions pour Zoé l’Écureuil" }).click();
    await page.waitForTimeout(400);
    result.menuZoeAbsente = (await page.getByRole("menu").getByRole("menuitem").allInnerTexts()).map((t) => t.trim());
    result.clics["Agenda, Zoé absente"] = await click(page, page.getByRole("menu").getByRole("menuitem", { name: "Relance WhatsApp" }));
    await page.go("#/taches");
    await note(page, "après « Marquer absent » sur Zoé (15 h)");
  }
  result.erreurs[mode] = page.errors;
  await browser.close();
}
fs.writeFileSync(`${OUT}/manque.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result.clics, null, 2), result.menuZoeAbsente, result.erreurs);
