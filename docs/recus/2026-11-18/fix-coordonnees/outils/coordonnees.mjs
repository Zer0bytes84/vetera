// Parcours du correctif : modifier les coordonnees du proprietaire depuis la fiche patient, recharger, les retrouver
// dans la fiche, l'Agenda, les Rappels et la liste des patients. Copie de la base (banc WhatsApp), cas ZZ-TEST.
// Usage : node coordonnees.mjs <dossier de sortie> [avant]
import fs from "node:fs";
import { launch, open } from "./banc.mjs";

const OUT = process.argv[2] ?? "sortie";
const BEFORE = process.argv[3] === "avant";
fs.mkdirSync(OUT, { recursive: true });
const CLOCK = new Date("2026-11-18T13:40:00+01:00");
const result = { erreurs: {} };

async function openRex(page) {
  await page.go("#/patients");
  await page.getByText("Rex", { exact: true }).first().click();
  await page.waitForTimeout(2500);
}
const ownerBlock = (page) => page.locator("section.medical-owner").first();
const ownerText = async (page) => (await ownerBlock(page).innerText()).replace(/\s+/g, " ").trim();

async function inView(page, locator) {
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();
  return Boolean(box) && box.y < viewport.height && box.y + Math.min(box.height, 120) > 0;
}

// Symptome 2 : « Modifier les informations » sous les notes generales.
async function profileEditorCheck(page) {
  const button = page.getByRole("button", { name: "Modifier les informations" });
  await button.scrollIntoViewIfNeeded();
  await button.click();
  await page.waitForTimeout(900);
  const editor = page.getByText("Modifier le dossier", { exact: true }).first();
  const out = {
    editeurOuvert: await editor.count(),
    editeurVisibleApresClic: await inView(page, editor),
    focusDansEditeur: await page.evaluate(() => Boolean(document.activeElement?.closest("[data-patient-profile-editor]"))),
  };
  await page.getByRole("button", { name: "Annuler" }).first().click();
  await page.waitForTimeout(300);
  return out;
}

for (const mode of BEFORE ? ["light"] : ["light", "dark"]) {
  const browser = await launch();
  const page = await open(browser, { mode, store: "store-rdv.json", clock: CLOCK });
  await openRex(page);
  const entry = { avant: await ownerText(page), boutonCoordonnees: await ownerBlock(page).getByRole("button", { name: "Modifier les coordonnées" }).count() };
  entry.modifierLesInformations = await profileEditorCheck(page);
  if (BEFORE) {
    result[mode] = entry;
    result.erreurs[mode] = page.errors;
    await browser.close();
    break;
  }
  await page.mouse.move(5, 5);
  await ownerBlock(page).scrollIntoViewIfNeeded();
  await ownerBlock(page).screenshot({ path: `${OUT}/fiche-bloc-proprietaire-${mode}.png` });

  // Ouvrir l'editeur, essayer un numero refuse, puis corriger nom et numero.
  await ownerBlock(page).getByRole("button", { name: "Modifier les coordonnées" }).click();
  await page.waitForTimeout(600);
  const dialog = page.getByRole("dialog");
  entry.champs = await dialog.locator("label").allInnerTexts();
  entry.focusInitial = await page.evaluate(() => document.activeElement?.id);
  await dialog.getByLabel("Téléphone", { exact: true }).fill("0555 12");
  await dialog.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForTimeout(400);
  entry.refus = { message: (await dialog.locator("[data-owner-edit-error]").innerText()).trim(), dialogueOuvert: await dialog.count() };
  await dialog.getByLabel("Nom", { exact: true }).fill("Martinez");
  entry.refusEffaceALaSaisie = (await dialog.locator("[data-owner-edit-error]").innerText()).trim() === "";
  await dialog.getByLabel("Téléphone", { exact: true }).fill("0661 22 33 44");
  await dialog.getByLabel("Email").fill("lea@example.invalid");
  await dialog.getByLabel("Contact secondaire").fill("ZZ-TEST Nadia");
  await dialog.getByLabel("Téléphone secondaire").fill("0770 98 76 54");
  await page.mouse.move(5, 5);
  await dialog.screenshot({ path: `${OUT}/dialogue-coordonnees-${mode}.png` });
  await dialog.getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForTimeout(800);
  entry.apresEnregistrement = { dialogueFerme: (await page.getByRole("dialog").count()) === 0, bloc: await ownerText(page) };

  // Recharger la page : la copie du navigateur doit avoir garde la correction.
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  await openRex(page);
  entry.apresRechargement = await ownerText(page);
  entry.stocke = await page.evaluate(() => JSON.parse(localStorage.getItem("vetera.browser-db.v1")).tables.owners.find((o) => o.id === "zz-o3"));

  // Vider l'email et le contact secondaire : ils doivent disparaitre vraiment.
  await ownerBlock(page).getByRole("button", { name: "Modifier les coordonnées" }).click();
  await page.waitForTimeout(600);
  await page.getByRole("dialog").getByLabel("Email").fill("");
  await page.getByRole("dialog").getByLabel("Contact secondaire").fill("");
  await page.getByRole("dialog").getByLabel("Téléphone secondaire").fill("");
  await page.getByRole("dialog").getByRole("button", { name: "Enregistrer" }).click();
  await page.waitForTimeout(800);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  entry.apresEffacement = await page.evaluate(() => {
    const o = JSON.parse(localStorage.getItem("vetera.browser-db.v1")).tables.owners.find((x) => x.id === "zz-o3");
    return { email: o.email, secondaryContactName: o.secondaryContactName, secondaryContactPhone: o.secondaryContactPhone, lastName: o.lastName, phone: o.phone };
  });

  // Partout ailleurs.
  await page.go("#/agenda");
  await page.waitForTimeout(1500);
  entry.agenda = (await page.locator("[data-row-id=zz-a1] .agenda-appt-meta").innerText()).replace(/\s+/g, " ");
  await page.go("#/taches");
  await page.waitForTimeout(1500);
  const reminder = page.locator("[data-medical-reminder-id=zz-r3]");
  entry.rappels = (await reminder.count()) ? (await reminder.innerText()).replace(/\s+/g, " ") : "rappel absent de la vue";
  await page.go("#/patients");
  await page.waitForTimeout(1500);
  entry.listePatients = (await page.locator("body").innerText()).split("\n").filter((line) => line.includes("Martinez")).slice(0, 3);
  result[mode] = entry;
  result.erreurs[mode] = page.errors;
  await browser.close();
}
fs.writeFileSync(`${OUT}/coordonnees.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
