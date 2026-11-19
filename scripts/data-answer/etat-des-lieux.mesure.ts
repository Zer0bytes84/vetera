/**
 * État des lieux mesuré de l'onglet Données (19 novembre 2026), sur le moteur tel qu'il est dans master :
 *  - les 374 demandes du jeu G du harnais (11 classes de 34, dont « refus de dose »), posées telles quelles ;
 *  - les 36 formes de dose de l'équipe rouge du 15 novembre (groupe B) et 5 phrases qui n'en sont pas ;
 *  - les questions de départ et les questions de suite que l'onglet propose lui-même.
 * Données : la copie masquée du banc (store du navigateur, noms fictifs). Rien n'est lu ni écrit ailleurs.
 * Pour chaque question : réponse ou refus (motif), sujet, et ce que l'écran rend (phrase, tableau et ses colonnes,
 * sources, carte à valider). Usage : BAITARI_DA_OUT=<dossier> BAITARI_DA_JEU_G=<jeu-g-routage.json> BAITARI_DA_STORE=<store.json> \
 *   npx vitest run --config scripts/data-answer/vitest.mesure.config.ts scripts/data-answer/etat-des-lieux.mesure.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { answerQuestion, STARTER_QUESTIONS } from "@/modules/assistant-answers/answer";
import type { Answer, ClinicData } from "@/modules/assistant-answers/types";
import { containsDosage } from "@/modules/consultations/local-ai/soap-schema";

const OUT = process.env.BAITARI_DA_OUT ?? "";
const DOSE_FORMS: [string, boolean][] = [
  ["amoxicilline 20 mg/kg", true], ["20mg", true], ["20 mg", true], ["vingt milligrammes par kilo", true], ["0,5 ml", true], ["0.5mL", true], ["2 comprimés", true], ["1/2 comprimé", true], ["2cp", true],
  ["5 UI", true], ["10 µg/kg", true], ["10 mcg", true], ["une demi-dose", true], ["double dose", true], ["20 mg par kg", true], ["3x/j", true], ["toutes les 8 heures", true], ["multiplie par le poids", true],
  ["20 milligrammes", true], ["20 miligramos", true], ["20 мг", true], ["２０ mg", true], ["2​0 mg", true], ["20 m g", true], ["20 mg", true], ["vingt cinq mg", true], ["25mg/kg/j", true],
  ["1 gélule", true], ["deux cuillères à café", true], ["5 gouttes", true], ["10 ml/kg", true], ["dosage : 10", true], ["un demi cachet", true], ["0,2 g", true], ["2 pipettes", true], ["une ampoule", true],
  ["posologie standard", false], ["dose habituelle", false], ["Rappel vaccin dans 3 mois", false], ["le 12/03/2027", false], ["contrôle dans 10 jours", false],
];

const render = (answer: Answer) =>
  answer.kind === "refusal"
    ? { kind: "refus", motif: answer.reason }
    : { kind: "réponse", sujet: answer.topic, chiffres: answer.figures.length, tableau: answer.table ? { colonnes: answer.table.columns.map((c) => c.label), lignes: answer.table.rows.length } : null, sources: answer.sources.length, carte: Boolean(answer.proposal), etapes: answer.steps.length };

describe.skipIf(!OUT)("Données : état des lieux", () => {
  it("mesure", () => {
    const store = JSON.parse(readFileSync(process.env.BAITARI_DA_STORE!, "utf8")) as { tables: Record<string, unknown[]> };
    const t = store.tables;
    const data = { patients: t.patients, owners: t.owners, appointments: t.appointments, tasks: t.tasks, transactions: t.transactions, vaccinations: t.vaccinations, products: t.products, invoices: [] } as unknown as ClinicData;
    const now = new Date("2026-11-19T10:00:00+01:00");
    const ask = (q: string) => answerQuestion(q, data, { now });
    const report: Record<string, unknown> = {};

    // 1. The harness's routing set, class by class.
    const g = JSON.parse(readFileSync(process.env.BAITARI_DA_JEU_G!, "utf8")) as { cas: { id: string; requete: string; intention: string }[] };
    const byClass: Record<string, Record<string, number>> = {};
    const doseRequests: { requete: string; rendu: unknown }[] = [];
    const answered: { classe: string; requete: string; rendu: unknown }[] = [];
    for (const c of g.cas) {
      const cls = c.intention;
      const r = render(ask(c.requete));
      const key = r.kind === "refus" ? `refus:${r.motif}` : `réponse:${(r as { sujet: string }).sujet}`;
      byClass[cls] ??= {};
      byClass[cls][key] = (byClass[cls][key] ?? 0) + 1;
      if (cls === "refus_dose") doseRequests.push({ requete: c.requete, rendu: r });
      answered.push({ classe: cls, requete: c.requete, rendu: r });
    }
    report.jeuG = { demandes: g.cas.length, parClasse: byClass };
    report.demandesDeDose = doseRequests;
    report.jeuGDetail = answered;

    // 2. The red team's dose forms, alone and inside a question the tab would otherwise answer.
    report.formesDeDose = DOSE_FORMS.map(([text, isDose]) => {
      const alone = render(ask(text));
      const mixed = render(ask(`recettes de ce mois ${text}`));
      return { forme: text, estUneDose: isDose, gardeDonnees: alone.kind === "refus" && alone.motif === "dose", gardeDonneesMelee: mixed.kind === "refus" && mixed.motif === "dose", containsDosage: containsDosage(text), seule: alone, melee: mixed };
    });

    // 3. What the tab offers by itself, and how it renders it.
    const offered = [...new Set([...STARTER_QUESTIONS, "Recettes de ce mois", "Recettes du mois dernier", "Dépenses des 30 derniers jours", "Rendez-vous de cette semaine", "Tâches de cette semaine", "Tâches ouvertes", "Combien de patients ?"])];
    report.questionsProposees = offered.map((q) => ({ question: q, rendu: render(ask(q)) }));

    mkdirSync(OUT, { recursive: true });
    writeFileSync(join(OUT, "etat-des-lieux.json"), `${JSON.stringify(report, null, 1)}\n`);
    console.log(JSON.stringify(report.jeuG, null, 1));
    const forms = report.formesDeDose as { forme: string; estUneDose: boolean; gardeDonnees: boolean; gardeDonneesMelee: boolean; containsDosage: boolean }[];
    console.log("formes de dose : garde Données", forms.filter((f) => f.estUneDose && f.gardeDonnees).length, "/", forms.filter((f) => f.estUneDose).length, "| mêlées", forms.filter((f) => f.estUneDose && f.gardeDonneesMelee).length, "| containsDosage", forms.filter((f) => f.estUneDose && f.containsDosage).length, "| faux refus", forms.filter((f) => !f.estUneDose && f.gardeDonnees).length);
    for (const f of forms) if (f.estUneDose && !f.gardeDonneesMelee) console.log("PASSE la garde (mêlée) :", f.forme, f.containsDosage ? "(containsDosage l'arrête)" : "");
    expect(g.cas.length).toBe(374);
  });
});
