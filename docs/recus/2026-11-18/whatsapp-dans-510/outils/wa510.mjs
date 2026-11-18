// Banc de la 5.1.0 fusionnee : WhatsApp (menu de l'Agenda, deux groupes des Rappels, ligne de la fiche, reglage +213)
// et coordonnees (pilule de la bande, crayon du tableau) jusqu'a l'enregistrement. Clair et sombre.
// WhatsApp n'est pas installe dans le banc : window.open rend null, le resultat attendu au clic est le toast d'echec.
// Usage : node wa510.mjs <dossier de sortie>
import fs from "node:fs";
import { launch, open } from "../../fix-coordonnees/outils/banc.mjs";

const OUT = process.argv[2] ?? "sortie-510";
fs.mkdirSync(OUT, { recursive: true });
const CLOCK = new Date("2026-11-18T13:40:00+01:00");
const result = { erreurs: {} };
const text = async (locator) => (await locator.innerText()).replace(/\s+/g, " ").trim();
const decode = (link) => { const u = new URL(link); return { schema: u.protocol, numero: u.searchParams.get("phone"), texte: u.searchParams.get("text") }; };

async function settle(page, whatsNew) {
  for (let i = 0; i < 30 && (await page.getByText("Chargement du module").count()); i++) await page.waitForTimeout(500);
  await page.waitForTimeout(1200);
  const ok = page.getByRole("button", { name: "Compris" });
  if (await ok.count()) {
    if (whatsNew) {
      whatsNew.titre = await text(page.getByRole("dialog").getByRole("heading").first());
      whatsNew.points = (await page.getByRole("dialog").locator("h3, [class*=title]").allInnerTexts()).map((t) => t.trim()).filter(Boolean);
      await page.mouse.move(5, 5);
      await page.getByRole("dialog").screenshot({ path: `${OUT}/quoi-de-neuf-${whatsNew.mode}.png` });
    }
    await ok.click();
    await page.waitForTimeout(400);
  }
}
// Un clic WhatsApp : le lien confie au systeme et le toast qui suit.
async function whatsappClick(page, locator) {
  const before = await page.evaluate(() => window.__opened.length);
  await locator.click();
  await page.waitForTimeout(700);
  const opened = await page.evaluate(() => window.__opened);
  const toast = page.locator("[data-sonner-toast]").filter({ hasText: "WhatsApp" }).last();
  return {
    lien: opened.length - before === 1 ? decode(opened.at(-1)) : `ouvertures : ${opened.length - before}`,
    toast: (await toast.count()) ? await text(toast) : null,
  };
}
const relanceGroups = (page) => page.evaluate(() => Object.fromEntries(["relance", "relance-manquee"].map((bucket) => {
  const group = document.querySelector(`section[data-bucket=${bucket}]`);
  return [bucket, group ? { titre: group.querySelector("h2").textContent.replace(/\s+/g, " ").trim(), lignes: [...group.querySelectorAll("article")].map((row) => ({ id: row.dataset.appointmentId, titre: row.querySelector("h3").textContent.trim(), bouton: [...row.querySelectorAll("button")].some((b) => b.textContent.includes("Relance WhatsApp")) })) } : null];
})));

for (const mode of ["light", "dark"]) {
  const browser = await launch();
  const page = await open(browser, { mode, store: "store-rdv.json", clock: CLOCK });
  const entry = { quoiDeNeuf: { mode } };

  // Agenda : le menu du rendez-vous de Rex.
  await page.go("#/agenda");
  await settle(page, entry.quoiDeNeuf);
  await page.locator("[data-row-id=zz-a1]").getByRole("button", { name: "Actions pour Rex" }).click();
  await page.waitForTimeout(400);
  entry.agendaMenu = (await page.getByRole("menu").getByRole("menuitem").allInnerTexts()).map((t) => t.trim());
  await page.evaluate(() => { for (const el of document.querySelectorAll(".agenda-appt-meta > span")) if (el.textContent.trim().startsWith("Dr ")) for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) n.textContent = "Vétérinaire masqué"; });
  await page.mouse.move(5, 5);
  const row = await page.locator("[data-row-id=zz-a1]").boundingBox();
  const menu = await page.getByRole("menu").boundingBox();
  await page.screenshot({ path: `${OUT}/agenda-menu-${mode}.png`, clip: { x: row.x - 8, y: row.y - 8, width: row.width + 16, height: Math.max(row.height, menu.y + menu.height - row.y) + 16 } });
  entry.agendaClic = await whatsappClick(page, page.getByRole("menu").getByRole("menuitem", { name: "Relance WhatsApp" }));

  // Rappels : les deux groupes, et un clic sur la relance de Rex.
  await page.go("#/taches");
  await settle(page);
  entry.rappels = await relanceGroups(page);
  await page.mouse.move(5, 5);
  for (const bucket of ["relance", "relance-manquee"]) {
    const group = page.locator(`section[data-bucket=${bucket}]`);
    if (await group.count()) await group.screenshot({ path: `${OUT}/rappels-${bucket}-${mode}.png` });
  }
  entry.rappelsClic = await whatsappClick(page, page.locator("section[data-bucket=relance] article[data-appointment-id=zz-a1]").getByRole("button", { name: /Relance WhatsApp/ }));

  // Reglage : Parametres > Mon cabinet.
  await page.go("#/parametres");
  await settle(page);
  await page.getByRole("button", { name: /Mon cabinet/ }).or(page.getByRole("tab", { name: /Mon cabinet/ })).or(page.getByRole("link", { name: /Mon cabinet/ })).first().click();
  await page.waitForTimeout(1500);
  const setting = page.locator(".settings-row").filter({ hasText: "Indicatif pour WhatsApp" });
  entry.reglage = { lignes: await setting.count(), texte: (await setting.count()) ? await text(setting.first()) : null };

  // Fiche de Rex : la ligne WhatsApp du bloc, la pilule de la bande, l'enregistrement.
  await page.go("#/patients");
  await settle(page);
  await page.getByText("Rex", { exact: true }).first().click();
  await page.waitForTimeout(1500);
  await settle(page);
  const block = page.locator("section.medical-owner").first();
  const band = page.locator(".patient-record-actions").first();
  entry.fiche = {
    bande: (await band.locator("button").allInnerTexts()).map((t) => t.trim()),
    boutonsDuBloc: (await block.locator("button").allInnerTexts()).map((t) => t.trim()),
  };
  await page.mouse.move(5, 5);
  const shell = await page.locator(".patient-record-summary").first().boundingBox();
  const bandBox = await band.boundingBox();
  await page.screenshot({ path: `${OUT}/fiche-bande-${mode}.png`, clip: { x: shell.x, y: shell.y, width: shell.width, height: bandBox.y + bandBox.height + 14 - shell.y } });
  await block.scrollIntoViewIfNeeded();
  await block.screenshot({ path: `${OUT}/fiche-bloc-${mode}.png` });
  entry.ficheWhatsApp = await whatsappClick(page, block.getByRole("button", { name: /WhatsApp/ }));
  await band.getByRole("button", { name: "Modifier les coordonnées" }).click();
  await page.waitForTimeout(600);
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nom", { exact: true }).fill(mode === "light" ? "Martinez" : "Martin");
  await dialog.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForTimeout(900);
  entry.ficheApres = { dialogueFerme: (await page.getByRole("dialog").count()) === 0, bloc: await text(block) };

  // Tableau : le crayon, le numero corrige, la ligne mise a jour sans quitter la liste.
  await page.go("#/patients");
  await settle(page);
  const line = page.locator("[data-row-id=zz-p3]");
  const hash = await page.evaluate(() => location.hash);
  await line.locator("[data-owner-edit=zz-o3]").click();
  await page.waitForTimeout(600);
  dialog = page.getByRole("dialog");
  const phone = mode === "light" ? "0770 98 76 54" : "0555 12 34 56";
  await dialog.getByLabel("Téléphone", { exact: true }).fill(phone);
  await page.mouse.move(5, 5);
  await dialog.screenshot({ path: `${OUT}/tableau-dialogue-${mode}.png` });
  await dialog.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForTimeout(900);
  entry.tableau = { dialogueFerme: (await page.getByRole("dialog").count()) === 0, surLaListe: (await page.evaluate(() => location.hash)) === hash, ligne: await text(line) };
  await page.mouse.move(5, 5);
  await line.screenshot({ path: `${OUT}/tableau-ligne-${mode}.png` });

  // Le numero corrige est celui du lien WhatsApp de l'Agenda.
  await page.go("#/agenda");
  await settle(page);
  await page.locator("[data-row-id=zz-a1]").getByRole("button", { name: "Actions pour Rex" }).click();
  await page.waitForTimeout(400);
  entry.agendaApresCorrection = await whatsappClick(page, page.getByRole("menu").getByRole("menuitem", { name: "Relance WhatsApp" }));

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  entry.stockeApresRechargement = await page.evaluate(() => { const o = JSON.parse(localStorage.getItem("vetera.browser-db.v1")).tables.owners.find((x) => x.id === "zz-o3"); return { lastName: o.lastName, phone: o.phone }; });
  result[mode] = entry;
  result.erreurs[mode] = page.errors;
  await browser.close();
}
fs.writeFileSync(`${OUT}/wa510.json`, JSON.stringify(result, null, 2).replaceAll("Dr Karim Abdou", "Vétérinaire masqué"));
console.log(fs.readFileSync(`${OUT}/wa510.json`, "utf8"));
