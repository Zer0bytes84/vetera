// Parcours du complement 5.0.11 : « Modifier les coordonnees » dans la bande de la fiche, et le crayon du tableau Patients.
// Copie de la base (banc WhatsApp), cas ZZ-TEST, clair et sombre. Usage : node bande-tableau.mjs <dossier de sortie>
import fs from "node:fs";
import { launch, open } from "../../fix-coordonnees/outils/banc.mjs";

const OUT = process.argv[2] ?? "sortie-bande";
fs.mkdirSync(OUT, { recursive: true });
const CLOCK = new Date("2026-11-18T13:40:00+01:00");
const result = { erreurs: {} };
const text = async (locator) => (await locator.innerText()).replace(/\s+/g, " ").trim();
const stored = (page) => page.evaluate(() => {
  const o = JSON.parse(localStorage.getItem("vetera.browser-db.v1")).tables.owners.find((x) => x.id === "zz-o3");
  return { lastName: o.lastName, phone: o.phone };
});

async function settle(page) {
  for (let i = 0; i < 30 && (await page.getByText("Chargement du module").count()); i++) await page.waitForTimeout(500);
  await page.waitForTimeout(1200);
  // La fenetre « Quoi de neuf » de la 5.0.11 s'ouvre au premier lancement : on la ferme.
  const ok = page.getByRole("button", { name: "Compris" });
  if (await ok.count()) { await ok.click(); await page.waitForTimeout(400); }
}
async function openRex(page) {
  await page.go("#/patients");
  await settle(page);
  await page.getByText("Rex", { exact: true }).first().click();
  await page.waitForTimeout(1500);
  await settle(page);
}

for (const mode of ["light", "dark"]) {
  const browser = await launch();
  const page = await open(browser, { mode, store: "store-rdv.json", clock: CLOCK });
  const entry = {};

  // 1. La fiche : la pilule en bout de bande, le bloc en lecture seule.
  await openRex(page);
  const band = page.locator(".patient-record-actions").first();
  entry.bande = await band.locator("button").allInnerTexts().then((t) => t.map((s) => s.trim()));
  entry.boutonsDuBlocProprietaire = await page.locator("section.medical-owner").first().locator("button").count();
  await page.mouse.move(5, 5);
  // La bande entiere : du bord gauche du bloc « Chiffres cles » jusqu'au bout de la pilule.
  const shellBox = await page.locator(".patient-record-summary").first().boundingBox();
  const bandBox = await band.boundingBox();
  await page.screenshot({ path: `${OUT}/fiche-bande-${mode}.png`, clip: { x: shellBox.x, y: shellBox.y, width: shellBox.width, height: bandBox.y + bandBox.height + 14 - shellBox.y } });
  await page.locator("section.medical-owner").first().screenshot({ path: `${OUT}/fiche-bloc-lecture-${mode}.png` });
  await band.getByRole("button", { name: "Modifier les coordonnées" }).click();
  await page.waitForTimeout(600);
  let dialog = page.getByRole("dialog");
  entry.ficheDialogue = { titre: await text(dialog.getByRole("heading").first()), champs: (await dialog.locator("label").allInnerTexts()).length };
  if (mode === "light") {
    await dialog.getByLabel("Nom", { exact: true }).fill("Martinez");
    await dialog.getByRole("button", { name: "Enregistrer" }).click();
    await page.waitForTimeout(800);
    entry.ficheApres = await text(page.locator("section.medical-owner").first());
  } else {
    await dialog.getByRole("button", { name: "Annuler" }).click();
    await page.waitForTimeout(300);
  }

  // 2. Le tableau : le crayon ouvre le dialogue sans ouvrir la fiche, la ligne se met a jour.
  await page.go("#/patients");
  await settle(page);
  const rowLocator = page.locator("[data-row-id=zz-p3]");
  const pencil = rowLocator.locator("[data-owner-edit=zz-o3]");
  entry.tableau = { crayons: await page.locator("[data-owner-edit]").count(), lignes: await page.locator("[data-list-row]").count(), libelle: await pencil.getAttribute("aria-label"), avant: await text(rowLocator) };
  await page.mouse.move(5, 5);
  await rowLocator.screenshot({ path: `${OUT}/tableau-ligne-${mode}.png` });
  const hashBefore = await page.evaluate(() => location.hash);
  await pencil.click();
  await page.waitForTimeout(600);
  dialog = page.getByRole("dialog");
  entry.tableau.dialogue = { ouvert: await dialog.count(), titre: await text(dialog.getByRole("heading").first()), nom: await dialog.getByLabel("Nom", { exact: true }).inputValue(), adresseInchangee: (await page.evaluate(() => location.hash)) === hashBefore };
  if (mode === "light") {
    await dialog.getByLabel("Téléphone", { exact: true }).fill("12");
    await dialog.getByRole("button", { name: "Enregistrer" }).click();
    await page.waitForTimeout(400);
    entry.tableau.refus = await text(dialog.locator("[data-owner-edit-error]"));
    await dialog.getByLabel("Téléphone", { exact: true }).fill("0770 98 76 54");
    await page.mouse.move(5, 5);
    await dialog.screenshot({ path: `${OUT}/tableau-dialogue-${mode}.png` });
    await dialog.getByRole("button", { name: "Enregistrer" }).click();
    await page.waitForTimeout(900);
    entry.tableau.apres = { dialogueFerme: (await page.getByRole("dialog").count()) === 0, toujoursSurLaListe: (await page.evaluate(() => location.hash)) === hashBefore, ligne: await text(rowLocator) };
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    await settle(page);
    entry.tableau.apresRechargement = { ligne: await text(page.locator("[data-row-id=zz-p3]")), stocke: await stored(page) };
    await page.go("#/agenda");
    await settle(page);
    entry.agenda = await text(page.locator("[data-row-id=zz-a1] .agenda-appt-meta"));
    await openRex(page);
    entry.ficheFinale = await text(page.locator("section.medical-owner").first());
  } else {
    await page.mouse.move(5, 5);
    await dialog.screenshot({ path: `${OUT}/tableau-dialogue-${mode}.png` });
    await dialog.getByRole("button", { name: "Annuler" }).click();
  }
  result[mode] = entry;
  result.erreurs[mode] = page.errors;
  await browser.close();
}
fs.writeFileSync(`${OUT}/bande-tableau.json`, JSON.stringify(result, null, 2).replaceAll("Dr Karim Abdou", "Vétérinaire masqué"));
console.log(fs.readFileSync(`${OUT}/bande-tableau.json`, "utf8"));
