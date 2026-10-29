// End-to-end clinic case, run in the packaged measuring app on a copy of the
// clinic database: new patient and owner, appointment in Agenda, « Ouvrir »
// into Flux, dictation through the real microphone (the shell plays each
// rubric: "play:<clip>" → "played:<clip>"), SOAP note generated, reviewed and
// validated, invoice issued and its PDF exported. Each step is photographed
// ("ready:<name>" → "done:<name>") and measured in the database; probes look
// for breaches (statuses, missing note, billing an empty visit, search, leaks).
// A failed step stops the run and is written as "failed: <step>: <reason>".
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { ensureSession, setTextarea, sleep, waitFor } from "./capture-dictee";

const OTHER_PATIENT = "mnma3iqx51fr51th3ta"; // Rifka, an existing patient of the copy.
const buttons = () => [...document.querySelectorAll<HTMLButtonElement>("button")];
// Visible, enabled controls only: hidden menus carry the same labels.
const byText = (text: string, root: ParentNode = document) =>
  [...root.querySelectorAll<HTMLElement>("button, [role='menuitem'], [role='tab']")].find(
    (element) =>
      element.textContent?.replace(/\s+/g, " ").trim().includes(text) &&
      !(element as HTMLButtonElement).disabled &&
      element.getClientRects().length > 0,
  );
/** Clicks until the expected state appears: the first click can land before React is ready. */
const clickUntil = async (target: () => HTMLElement | null | undefined, done: () => unknown, tries = 4) => {
  for (let i = 0; i < tries; i++) {
    target()?.click();
    for (let j = 0; j < 12; j++) {
      if (done()) return true;
      await sleep(250);
    }
  }
  return Boolean(done());
};
const byLabel = (label: string) => document.querySelector<HTMLElement>(`[aria-label="${label}"]`);
const byPlaceholder = <T extends HTMLElement>(text: string) => document.querySelector<T>(`[placeholder="${text}"]`);
const alertText = () => document.querySelector('[role="alert"]')?.textContent ?? null;
const setValue = (element: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  const proto = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
};
const bodyHas = (text: string) => document.body.innerText.includes(text);

export async function captureWorkflow(signal: string) {
  const home = signal.replace(/\/signal$/, "");
  const results: Record<string, unknown>[] = [];
  const breaches: Record<string, unknown>[] = [];
  const save = () =>
    writeTextFile(`${signal}.results.json`, JSON.stringify({ results, breaches }, null, 2));
  const waitShell = async (expected: string, timeout = 300_000) => {
    const started = Date.now();
    while ((await readTextFile(signal).catch(() => "")).trim() !== expected) {
      if (Date.now() - started > timeout) throw new Error(`Le shell n’a pas répondu : ${expected}`);
      await sleep(100);
    }
  };
  const shot = async (name: string, measures: Record<string, unknown> = {}) => {
    await sleep(800);
    results.push({ name, ...measures });
    await save();
    await writeTextFile(signal, `ready:${name}`);
    await waitShell(`done:${name}`, 120_000);
  };
  const breach = async (id: string, found: boolean, detail: Record<string, unknown>) => {
    breaches.push({ id, found, ...detail });
    await save();
  };
  let step = "0-session";
  const fail = async (reason: string) => {
    await shot(`echec-${step}`, { reason });
    throw new Error(`${step}: ${reason}`);
  };
  const expect = async <T>(probe: () => T | null | undefined | false, reason: string, timeout = 60_000) => {
    try {
      return await waitFor(probe, timeout);
    } catch {
      return fail(reason);
    }
  };

  const { runDbRead } = await import("@/services/sqlite/database");
  const one = async <T>(sql: string, args: unknown[] = []) => (await runDbRead((db) => db.select<T[]>(sql, args)))[0];
  const all = <T>(sql: string, args: unknown[] = []) => runDbRead((db) => db.select<T[]>(sql, args));

  await ensureSession();
  localStorage.setItem("baitari:ai-models-onboarding-completed", "true");
  localStorage.setItem("baitari:ai-models-onboarding-dismissed", "true");
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  await getCurrentWindow().setFocus();
  const before = {
    patients: (await one<{ n: number }>("SELECT COUNT(*) AS n FROM patients")).n,
    appointments: (await one<{ n: number }>("SELECT COUNT(*) AS n FROM appointments")).n,
    invoices: await one<{ n: number; max: string }>("SELECT COUNT(*) AS n, MAX(number) AS max FROM invoices WHERE number LIKE 'INV-%'"),
    sequence: await one<{ next_value: number }>("SELECT next_value FROM billing_sequences WHERE kind='invoice' AND sequence_year=2026"),
  };

  // 1. New patient and owner, through the Patients form.
  step = "1-patient";
  location.hash = "#/patients";
  await expect(() => byText("Nouveau patient"), "bouton « Nouveau patient » introuvable");
  await sleep(1500);
  if (!(await clickUntil(() => byText("Nouveau patient"), () => byPlaceholder("Nom de l’animal")))) await fail("formulaire patient non ouvert après 4 clics");
  setValue(byPlaceholder<HTMLInputElement>("Nom de famille")!, "Testeur");
  setValue(byPlaceholder<HTMLInputElement>("Prénom")!, "Camille");
  setValue(byPlaceholder<HTMLInputElement>("Numéro de mobile")!, "0555123456");
  setValue(byPlaceholder<HTMLInputElement>("Nom de l’animal")!, "Max");
  setValue(byPlaceholder<HTMLInputElement>("Chien, chat…")!, "Chien");
  setValue(byPlaceholder<HTMLInputElement>("Européen, Malinois…")!, "Berger Allemand");
  await sleep(400);
  await shot("1a-formulaire-patient");
  byText("Créer le dossier")!.click();
  let patientRow: { id: string; owner_id: string } | undefined;
  for (let i = 0; i < 40 && !patientRow; i++) {
    patientRow = await one<{ id: string; owner_id: string }>("SELECT id, owner_id FROM patients WHERE name='Max' ORDER BY created_at DESC");
    if (!patientRow) await sleep(500);
  }
  if (!patientRow) await fail("aucun patient « Max » en base après « Créer le dossier »");
  const patientId = patientRow!.id;
  const owner = await one<{ last_name: string; first_name: string }>("SELECT last_name, first_name FROM owners WHERE id=?", [patientRow!.owner_id]);
  await sleep(1000);
  await shot("1b-patient-cree", { patientId, owner });

  // 2. Appointment in Agenda.
  step = "2-rendez-vous";
  location.hash = "#/agenda";
  await expect(() => byText("Nouveau rendez-vous"), "bouton « Nouveau rendez-vous » introuvable");
  await sleep(1500);
  if (!(await clickUntil(() => byText("Nouveau rendez-vous"), () => byPlaceholder("Nom de l’animal ou du propriétaire, téléphone, espèce…")))) await fail("formulaire de rendez-vous non ouvert après 4 clics");
  const dossier = await expect(() => byPlaceholder<HTMLInputElement>("Nom de l’animal ou du propriétaire, téléphone, espèce…"), "recherche de dossier absente du formulaire");
  setValue(dossier!, "Max");
  await sleep(800);
  const option = await expect(
    () => buttons().find((element) => element.closest("[role='dialog']") && element.textContent?.includes("Max") && element.textContent?.includes("Testeur")),
    "le nouveau patient n’est pas proposé dans la recherche de dossier",
    15_000,
  );
  option!.click();
  const reason = document.querySelector<HTMLTextAreaElement>('textarea[placeholder^="Décrivez la demande"]');
  if (reason) setValue(reason, "Se gratte l’oreille droite depuis trois jours.");
  await sleep(500);
  await shot("2a-formulaire-rdv");
  (await expect(() => byText("Ajouter au planning"), "« Ajouter au planning » indisponible"))!.click();
  let appointment: { id: string; status: string; start_time: string } | undefined;
  for (let i = 0; i < 40 && !appointment; i++) {
    appointment = await one("SELECT id, status, start_time FROM appointments WHERE patient_id=?", [patientId]);
    if (!appointment) await sleep(500);
  }
  if (!appointment) await fail("aucun rendez-vous en base pour Max après « Ajouter au planning »");
  const appointmentId = appointment!.id;
  await sleep(1200);
  byText("Liste")?.click();
  await sleep(1200);
  byLabel("Actions pour Max")?.scrollIntoView({ block: "center" });
  await shot("2b-rdv-agenda", { appointment });

  // 3. « Ouvrir » starts the consultation in Flux.
  step = "3-ouvrir";
  const trigger = await expect(() => byLabel("Actions pour Max"), "ligne de Max absente de la liste de l’Agenda");
  trigger!.click();
  const ouvrir = await expect(() => byText("Ouvrir", document.querySelector("[role='menu']") ?? document), "menu de la ligne sans « Ouvrir »", 10_000);
  ouvrir!.click();
  await expect(() => (location.hash.startsWith("#/flux") && bodyHas("Retour au tableau") ? true : null), "la consultation ne s’ouvre pas dans le Flux", 30_000);
  await sleep(1500);
  const started = await one<{ status: string }>("SELECT status FROM appointments WHERE id=?", [appointmentId]);
  if (started.status !== "in_progress") await fail(`statut ${started.status} au lieu de in_progress après « Ouvrir »`);
  const billEmpty = buttons().find((element) => element.textContent?.includes("Clôturer et facturer"));
  await breach("facture-sans-note", Boolean(billEmpty && !billEmpty.disabled), {
    probe: "« Clôturer et facturer » avant toute note",
    enabled: billEmpty ? !billEmpty.disabled : null,
  });
  await shot("3-consultation-flux", { status: started.status });

  // 4. Dictation, rubric by rubric, real microphone.
  step = "4-dictee";
  (await expect(() => byLabel("Ouvrir l’assistant de consultation"), "bouton Assistant absent de la consultation"))!.click();
  const field = () => document.querySelector<HTMLTextAreaElement>("textarea.assistant-dictation-field");
  const dicter = () => buttons().find((element) => /^(Dicter|Compléter)$/.test(element.textContent?.trim() ?? "") && !element.disabled);
  await expect(() => field() && dicter(), "bouton Dicter de l’assistant indisponible", 180_000);
  const dictated: string[] = [];
  for (let i = 1; i <= 4; i++) {
    setTextarea(field()!, "");
    await sleep(400);
    dicter()!.click();
    await expect(() => bodyHas("Écoute en cours") || alertText(), "le micro n’écoute pas", 120_000);
    if (alertText()) await fail(`dictée refusée : ${alertText()}`);
    await writeTextFile(signal, `play:rubrique-${i}`);
    await waitShell(`played:rubrique-${i}`);
    await sleep(400);
    (byText("Arrêter") ?? byText("Stop"))!.click();
    await expect(() => (field()?.value.trim() ? true : null) || alertText(), `aucun texte transcrit pour la rubrique ${i}`, 600_000);
    if (alertText()) await fail(`transcription refusée : ${alertText()}`);
    dictated.push(field()!.value);
    await save();
    if (i < 4) {
      byText("Continuer vers")!.click();
      await sleep(600);
    }
  }
  await shot("4-dictee", { dictated });

  // 5. Note generated by the assistant, reviewed, validated.
  step = "5-note";
  const clicked = performance.now();
  (await expect(() => byText("Relire la note SOAP"), "« Relire la note SOAP » indisponible"))!.click();
  await expect(() => bodyHas("Relecture & Validation SOAP") || alertText(), "aucune note ni refus après 15 min", 900_000);
  const seconds = +((performance.now() - clicked) / 1000).toFixed(1);
  if (!bodyHas("Relecture & Validation SOAP")) await fail(`génération refusée par l’assistant après ${seconds} s : ${alertText()}`);
  const verbatim = bodyHas("Note reprise mot pour mot");
  if (verbatim) await fail("l’assistant n’a pas généré de note (note reprise mot pour mot)");
  const generated = Object.fromEntries(
    ["subjective", "objective", "assessment", "plan"].map((key) => [key, document.querySelector<HTMLTextAreaElement>(`#soap-field-${key}`)?.value ?? null]),
  );
  await shot("5a-relecture", { seconds, generated });
  (await expect(() => byText("Valider et enregistrer la note"), "bouton de validation absent"))!.click();
  let soap: { subjective: string; assessment: string; plan: string; content: string } | undefined;
  for (let i = 0; i < 40 && !soap?.content.includes("reviewed"); i++) {
    soap = await one("SELECT subjective, assessment, plan, content FROM consultation_soaps WHERE appointment_id=?", [appointmentId]);
    await sleep(500);
  }
  if (!soap?.assessment) await fail("aucune note SOAP en base après la validation");
  await sleep(1000);
  await shot("5b-note-validee", { soapAssessment: soap!.assessment.slice(0, 200), reviewed: soap!.content.includes("reviewed") });

  // 6. Invoice and PDF export. The native save panel is not driven: its call is
  // recorded and answered with a path in this instance's own Desktop folder.
  step = "6-facture";
  const internals = (window as unknown as { __TAURI_INTERNALS__: { invoke: (cmd: string, args?: unknown, options?: unknown) => Promise<unknown> } }).__TAURI_INTERNALS__;
  const original = internals.invoke.bind(internals);
  const saves: Array<{ defaultPath: string; answered: string }> = [];
  internals.invoke = (cmd, args, options) => {
    if (cmd === "plugin:dialog|save") {
      const defaultPath = (args as { options: { defaultPath: string } }).options.defaultPath;
      const answered = `${home}/Desktop/${defaultPath}`;
      saves.push({ defaultPath, answered });
      return Promise.resolve(answered);
    }
    return original(cmd, args, options);
  };
  document.querySelector("[data-soap-section]")?.scrollIntoView({ block: "end" });
  (await expect(() => byText("Clôturer et facturer"), "« Clôturer et facturer » indisponible"))!.click();
  const price = await expect(() => document.querySelector<HTMLInputElement>('input[aria-label^="Prix de"]'), "dialogue de facturation non ouvert", 30_000);
  setValue(price!, "3000");
  setValue(document.querySelector<HTMLInputElement>('input[aria-label="Montant réglé aujourd’hui"]')!, "3000");
  await sleep(600);
  await shot("6a-facturation");
  (await expect(() => byText("Encaisser et imprimer"), "« Encaisser et imprimer » indisponible"))!.click();
  await expect(() => saves.length > 0, "aucun export PDF proposé après l’encaissement", 60_000);
  await sleep(2500);
  const invoice = await one<{ id: string; number: string; document_status: string; issued_at: string; balance_amount: number }>(
    "SELECT id, number, document_status, issued_at, balance_amount FROM invoices WHERE appointment_id=?", [appointmentId]);
  const after = await one<{ status: string }>("SELECT status FROM appointments WHERE id=?", [appointmentId]);
  await shot("6b-facture-emise", { invoice, appointmentStatus: after.status, saves });
  if (!invoice?.number) await fail("aucune facture émise en base");
  if (!/^Facture-INV-\d{4}-\d{6}-[0-9a-z]{7}\.pdf$/.test(saves[0].defaultPath)) await fail(`nom proposé sans empreinte : ${saves[0].defaultPath}`);

  // 7. Breach probes once the visit is billed.
  step = "7-breches";
  // 7a. Same invoice exported again: same name (its own file), never another invoice's.
  const { invoiceDocument } = await import("@/lib/invoice-document");
  const { invoicePdfFileName } = await import("@/lib/invoice-pdf");
  const { getInvoice } = await import("@/services/billingService");
  const again = invoicePdfFileName(invoiceDocument((await getInvoice(invoice.id))!, "Max").data);
  await breach("nom-instable", again !== saves[0].defaultPath, { first: saves[0].defaultPath, again });

  // 7b. Statuses: database, Flux, Agenda, record.
  location.hash = "#/flux";
  await sleep(2500);
  const fluxCard = [...document.querySelectorAll<HTMLElement>(".flow-card")].find((card) => card.textContent?.includes("Max"));
  const fluxLane = fluxCard?.closest("section, [data-lane]")?.querySelector("h2, h3, header")?.textContent?.trim() ?? null;
  await shot("7a-flux-apres", { fluxCard: Boolean(fluxCard), fluxLane });
  location.hash = "#/agenda";
  await sleep(2000);
  byText("Liste")?.click();
  await sleep(1200);
  const agendaRow = byLabel("Actions pour Max")?.closest("[class*='agenda-appt'], li, article");
  const agendaStatus = agendaRow?.textContent?.match(/Terminé|En cours|Planifié|Confirmé|À facturer|Facturé/)?.[0] ?? null;
  await shot("7b-agenda-apres", { agendaStatus });
  // « Ouvrir » again on the billed visit: targeted, not restarted.
  byLabel("Actions pour Max")?.click();
  (await waitFor(() => byText("Ouvrir", document.querySelector("[role='menu']") ?? document), 10_000).catch(() => null))?.click();
  await sleep(3000);
  const reopened = await one<{ status: string }>("SELECT status FROM appointments WHERE id=?", [appointmentId]);
  await breach("reouverture-relance", reopened.status !== after.status, { before: after.status, after: reopened.status, workspaceOpen: bodyHas("Retour au tableau") });
  await shot("7c-reouverture", { status: reopened.status });

  location.hash = `#/patient/${encodeURIComponent(patientId)}`;
  await sleep(2500);
  const overview = document.querySelector(".patient-overview")?.textContent ?? "";
  await breach("note-absente-synthese", !overview.includes("Malassezia") && !overview.includes("Otite"), { overviewExcerpt: overview.slice(0, 300) });
  await shot("7d-dossier-synthese");
  document.getElementById("record-tab-timeline")?.click();
  await sleep(1200);
  const timeline = document.querySelector(".patient-timeline-table")?.textContent ?? "";
  await breach("statut-chronologie", !/Terminé|Terminée/.test(timeline), { timelineExcerpt: timeline.slice(0, 300) });
  document.getElementById("record-tab-content")?.scrollIntoView({ block: "start" });
  await shot("7e-dossier-chronologie");

  // 7c. Search, right after creation: patient by name, note by word and by meaning.
  const { searchAllPatientsClinical } = await import("@/modules/consultations/local-ai/embedding-store");
  const sources = ["soap", "document", "protocol", "patient", "consultation", "product"] as const;
  const sections = ["subjective", "objective", "assessment", "plan", "document", "protocol", "patient", "consultation", "product"] as const;
  for (const [name, query] of [["8a-recherche-mot", "Malassezia"], ["8b-recherche-sens", "infection de l’oreille due à des levures"]] as const) {
    const found = await searchAllPatientsClinical({ sourceTypes: [...sources], sections: [...sections] }, query);
    const hit = found.find((row) => row.patientId === patientId);
    const foreign = found.filter((row) => row.patientId !== patientId && row.text.includes("Malassezia"));
    await breach(`recherche-${name}`, !hit, { query, hit: hit && { section: hit.section, match: hit.match, score: hit.score, patientName: hit.patientName }, top: found.slice(0, 3).map((row) => [row.patientName, row.section, row.match]) });
    await breach(`attribution-${name}`, Boolean(hit && hit.patientName !== "Max") || foreign.some((row) => row.text.includes("gémit")), { foreign: foreign.map((row) => row.patientName) });
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }));
    const input = await waitFor(() => document.querySelector<HTMLInputElement>("[data-command-palette-input]"), 10_000).catch(() => null);
    if (input) setValue(input, query);
    await sleep(15_000);
    await shot(name, { query });
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    document.querySelector<HTMLElement>("[data-command-palette-input]")?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await sleep(800);
  }
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }));
  const input = await waitFor(() => document.querySelector<HTMLInputElement>("[data-command-palette-input]"), 10_000).catch(() => null);
  if (input) setValue(input, "Max");
  await sleep(4000);
  await breach("patient-introuvable", !document.querySelector("[cmdk-list], [role='listbox']")?.textContent?.includes("Testeur"), { probe: "palette « Max » propose le dossier de Max (propriétaire Testeur)" });
  await shot("8c-recherche-patient");
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  document.querySelector<HTMLElement>("[data-command-palette-input]")?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await sleep(800);

  // 7d. Leak: another patient's record must show nothing of Max's visit.
  location.hash = `#/patient/${encodeURIComponent(OTHER_PATIENT)}`;
  await sleep(3000);
  const otherText = document.querySelector(".patient-record-page")?.textContent ?? "";
  for (const tab of ["timeline", "documents"]) {
    document.getElementById(`record-tab-${tab}`)?.click();
    await sleep(1000);
  }
  const otherAll = otherText + (document.querySelector(".patient-record-page")?.textContent ?? "");
  await breach("fuite-autre-dossier", /Malassezia|Testeur|gémit lorsqu/.test(otherAll), { patient: OTHER_PATIENT });
  const leakedRows = await all<{ n: number }>(
    "SELECT COUNT(*) AS n FROM consultation_soaps s JOIN appointments a ON a.id=s.appointment_id WHERE s.patient_id<>a.patient_id");
  const leakedInvoices = await all<{ n: number }>(
    "SELECT COUNT(*) AS n FROM invoices i JOIN appointments a ON a.id=i.appointment_id WHERE i.patient_id<>a.patient_id");
  await breach("incoherence-base", leakedRows[0].n + leakedInvoices[0].n > 0, { soapsOtherPatient: leakedRows[0].n, invoicesOtherPatient: leakedInvoices[0].n });
  await shot("8d-autre-dossier");

  results.push({
    name: "fin",
    before,
    after: {
      patients: (await one<{ n: number }>("SELECT COUNT(*) AS n FROM patients")).n,
      appointments: (await one<{ n: number }>("SELECT COUNT(*) AS n FROM appointments")).n,
      invoices: await one("SELECT COUNT(*) AS n, MAX(number) AS max FROM invoices WHERE number LIKE 'INV-%'"),
      sequence: await one("SELECT next_value FROM billing_sequences WHERE kind='invoice' AND sequence_year=2026"),
    },
  });
  await save();
  await writeTextFile(signal, "restored");
}
