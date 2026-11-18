// Parcours de la relance du rendez-vous : menu de l'Agenda et rappel qui remonte 1 heure avant dans les Rappels.
// Horloge pilotee (Playwright page.clock) : on la pose a 13 h 29 le 18 novembre 2026, Rex a rendez-vous a 14 h 30.
// Usage : node relance.mjs <dossier de sortie>
import fs from "node:fs";
import { launch, open } from "./banc.mjs";

const OUT = process.argv[2] ?? "sortie-relance";
fs.mkdirSync(OUT, { recursive: true });
const decode = (link) => { const u = new URL(link); return { lien: link, schema: u.protocol, numero: u.searchParams.get("phone"), texte: u.searchParams.get("text") }; };
const result = { declenchement: [], rappels: {}, agenda: {}, erreurs: {} };
const at = (hhmmss) => new Date(`2026-11-18T${hhmmss}+01:00`);
const clockText = (page) => page.evaluate(() => new Date().toLocaleTimeString("fr-FR"));

async function relanceState(page) {
  const group = page.locator("section[data-bucket=relance]");
  if (!(await group.count())) return { groupe: false };
  const rows = [];
  for (const row of await group.locator("article").all()) {
    rows.push({ id: await row.getAttribute("data-appointment-id"), titre: (await row.locator("h3").innerText()).trim(), bouton: await row.getByRole("button", { name: /Relance WhatsApp/ }).count() });
  }
  return { groupe: true, titre: (await group.locator("h2").innerText()).replace(/\s+/g, " "), lignes: rows };
}

async function note(page, label) {
  const entry = { moment: label, horloge: await clockText(page), ...(await relanceState(page)) };
  result.declenchement.push(entry);
  console.log(JSON.stringify(entry));
  return entry;
}

for (const mode of ["light", "dark"]) {
  const browser = await launch();
  const page = await open(browser, { mode, store: "store-rdv.json", clock: { install: at("13:28:30") } });
  await page.go("#/taches");
  await page.clock.pauseAt(at("13:29:00"));
  if (mode === "light") {
    await note(page, "ouverture de la page, 13:29:00");
    await page.clock.runFor(59_000);
    await page.waitForTimeout(300);
    await note(page, "13:29:59, sans recharger");
    await page.clock.runFor(1_500);
    await page.waitForTimeout(300);
    await note(page, "13:30:00 passé, sans recharger");
  } else {
    await page.clock.runFor(60_500);
    await page.waitForTimeout(300);
  }
  // Le clic sur la relance de Rex.
  const rex = page.locator("section[data-bucket=relance] article[data-appointment-id=zz-a1]");
  await page.mouse.move(5, 5);
  await page.locator("section[data-bucket=relance]").screenshot({ path: `${OUT}/rappels-relance-1330-${mode}.png` });
  if (mode === "light") {
    const button = rex.getByRole("button", { name: /Relance WhatsApp/ });
    result.rappels.libelle = await button.getAttribute("aria-label");
    result.rappels.texteBouton = (await button.innerText()).trim();
    const before = await page.evaluate(() => window.__opened.length);
    await button.click();
    await page.waitForTimeout(300);
    const opened = await page.evaluate(() => window.__opened);
    result.rappels.ouvert = opened.length - before === 1 ? decode(opened.at(-1)) : `ouvertures : ${opened.length - before}`;
    // Zoé (15 h, confirmé) remonte à 14 h, Rex s'en va à 14 h 30.
    await page.clock.runFor(29 * 60_000 + 59_000);
    await page.waitForTimeout(300);
    await note(page, "13:59:59");
    await page.clock.runFor(1_500);
    await page.waitForTimeout(300);
    await note(page, "14:00:00 passé");
    await page.clock.runFor(30 * 60_000 - 2_000);
    await page.waitForTimeout(300);
    await note(page, "14:29:59");
    await page.clock.runFor(1_500);
    await page.waitForTimeout(300);
    await note(page, "14:30:00 passé");
    // Les autres vues et filtres ne changent pas : la relance n'est que dans « Aujourd'hui », source « Tous ».
    for (const [kind, name] of [["button", "Manuels"], ["button", "Médicaux"], ["button", "Tous"]]) {
      await page.getByRole(kind, { name, exact: true }).first().click();
      await page.waitForTimeout(400);
      result.rappels[`filtre ${name}`] = await page.locator("section[data-bucket=relance]").count();
    }
    await page.getByRole("tab", { name: /^À venir/ }).click();
    await page.waitForTimeout(400);
    result.rappels["vue À venir"] = await page.locator("section[data-bucket=relance]").count();
  }

  // Agenda : le menu d'actions du rendez-vous, horloge à 13 h 30 le 18.
  await page.clock.resume();
  await page.go("#/agenda");
  await page.waitForTimeout(1500);
  for (const [id, animal] of [["zz-a1", "Rex"], ["zz-a2", "Zoé l’Écureuil"], ["zz-a3", "Minou"], ["zz-a4", "Médor"], ["zz-a5", "Pistache"]]) {
    const row = page.locator(`[data-row-id=${id}]`);
    const entry = { visible: await row.count() };
    if (entry.visible) {
      await row.getByRole("button", { name: `Actions pour ${animal}` }).click();
      await page.waitForTimeout(400);
      const menu = page.getByRole("menu");
      entry.menu = (await menu.getByRole("menuitem").allInnerTexts()).map((t) => t.trim());
      if (id === "zz-a1") {
        // Le nom du veterinaire vient de la vraie base : masque dans le texte affiche avant la capture.
        await page.evaluate(() => { for (const el of document.querySelectorAll(".agenda-appt-meta > span")) if (el.textContent.trim().startsWith("Dr ")) for (const node of el.childNodes) if (node.nodeType === 3 && node.textContent.trim()) node.textContent = "Vétérinaire masqué"; });
        await page.mouse.move(5, 5);
        const box = await row.boundingBox();
        const menuBox = await menu.boundingBox();
        const x = Math.max(0, Math.min(box.x, menuBox.x) - 16);
        const y = Math.max(0, box.y - 16);
        await page.screenshot({ path: `${OUT}/agenda-menu-relance-${mode}.png`, clip: { x, y, width: Math.max(box.x + box.width, menuBox.x + menuBox.width) - x + 16, height: Math.max(box.y + box.height, menuBox.y + menuBox.height) - y + 16 } });
      }
      const item = menu.getByRole("menuitem", { name: "Relance WhatsApp" });
      if (mode === "light" && (await item.count())) {
        const before = await page.evaluate(() => window.__opened.length);
        await item.click();
        await page.waitForTimeout(300);
        const opened = await page.evaluate(() => window.__opened);
        entry.ouvert = opened.length - before === 1 ? decode(opened.at(-1)) : `ouvertures : ${opened.length - before}`;
      } else {
        await page.keyboard.press("Escape");
        await page.waitForTimeout(200);
      }
    }
    if (mode === "light") result.agenda[animal] = entry;
  }
  result.erreurs[mode] = page.errors;
  await browser.close();
}
fs.writeFileSync(`${OUT}/relance.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
