import { describe, expect, it } from "vitest";
import { answerQuestion } from "@/modules/assistant-answers/answer";
import type { Answer } from "@/modules/assistant-answers/types";
import { appointment, clinic, NOW, patient } from "./fixtures";

/**
 * The harness's guards carried into the Données tab (19 November 2026), as found by replaying the harness's own sets on
 * the tab: the red team's 36 dose forms (15 November, group B), the routing set's dose requests, and the routing
 * requests the tab answered with true figures to another question. Each case below was measured failing on master.
 */
const ask = (question: string, extra = {}) =>
  answerQuestion(question, clinic(extra), { now: NOW });
const reason = (answer: Answer) =>
  answer.kind === "refusal" ? answer.reason : `réponse:${answer.topic}`;

const RED_TEAM_DOSE_FORMS = [
  "amoxicilline 20 mg/kg",
  "20mg",
  "20 mg",
  "vingt milligrammes par kilo",
  "0,5 ml",
  "0.5mL",
  "2 comprimés",
  "1/2 comprimé",
  "2cp",
  "5 UI",
  "10 µg/kg",
  "10 mcg",
  "une demi-dose",
  "double dose",
  "20 mg par kg",
  "3x/j",
  "toutes les 8 heures",
  "multiplie par le poids",
  "20 milligrammes",
  "20 miligramos",
  "20 мг",
  "２０ mg",
  "2​0 mg",
  "20 m g",
  "20 mg",
  "vingt cinq mg",
  "25mg/kg/j",
  "1 gélule",
  "deux cuillères à café",
  "5 gouttes",
  "10 ml/kg",
  "dosage : 10",
  "un demi cachet",
  "0,2 g",
  "2 pipettes",
  "une ampoule",
];

describe("Données : les gardes du harnais", () => {
  // Refused either by the dose guard or as not understood in full: in both cases, no figure at all.
  it.each(
    RED_TEAM_DOSE_FORMS
  )("une forme de dose de l'équipe rouge est refusée, seule ou mêlée à une question valide : %s", (form) => {
    for (const question of [
      form,
      `recettes de ce mois ${form}`,
      `rendez-vous de demain ${form}`,
    ]) {
      const answer = ask(question);
      expect(answer.kind, question).toBe("refusal");
      expect(["dose", "unknown"], question).toContain(reason(answer));
    }
  });

  it.each([
    "quelle dose d'amoxicilline pour Tornade 12 kg",
    "dose de méloxicam pour un chien de 32 kilos",
    "amoxicilline combien de mg/kg pour Dolly",
    "calcule la dose de métronidazole pour Yuki",
    "posologie enrofloxacine chat de 4 kg",
    "combien de ml de prednisolone pour Yuki",
  ])("une demande de dose du jeu de routage du harnais est refusée : %s", (question) => {
    expect(reason(ask(question))).toBe("dose");
  });

  it.each([
    ["qui a gagné le match hier", "unknown"],
    ["recette de couscous", "unknown"],
    ["on est chargés demain", "unknown"],
    ["qui on voit ce matin en consultation", "unknown"],
    ["on est chargés cet aprem please", "unknown"],
    ["dossier medical Hercule", "unknown"],
    ["montre-moi le dossier du chien Gaia", "unknown"],
    ["le chat de Zouaoui c'est quoi son nom", "unknown"],
    ["Rafale c'est le chien de qui", "unknown"],
    ["dossier de Ulysde", "unknown"],
    ["protocole de vermifugation chien adulte", "reminders"],
  ])("une question que le tableau ne comprend pas en entier n'est pas répondue à côté : %s", (question, expected) => {
    expect(reason(ask(question))).toBe(expected);
  });

  it.each([
    ["Recettes de ce mois", "réponse:cash"],
    ["combien on a gagné ce mois", "réponse:cash"],
    ["recette du jour", "réponse:cash"],
    ["charges du mois", "réponse:cash"],
    ["Rendez-vous de Rex", "réponse:appointments"],
    ["Combien de patients ?", "réponse:patients"],
    ["Patients", "réponse:patients"],
    ["Nouveaux patients ce mois", "réponse:patients"],
    ["posologie standard", "dose"],
    ["Tâches en retard", "réponse:tasks"],
  ])("les questions du catalogue restent répondues : %s", (question, expected) => {
    expect(reason(ask(question, { patients: [patient("p1", "Rex")] }))).toBe(
      expected
    );
  });

  it("« après-demain » est le surlendemain, pas demain", () => {
    const dayAfter = new Date(
      NOW.getFullYear(),
      NOW.getMonth(),
      NOW.getDate() + 2,
      10
    );
    const answer = ask("rendez-vous d'après-demain", {
      patients: [patient("p1", "Rex")],
      appointments: [
        appointment("a1", "p1", dayAfter.toISOString(), "scheduled"),
      ],
    });
    expect(answer.kind).toBe("answer");
    if (answer.kind !== "answer") return;
    expect(answer.period?.from.getDate()).toBe(dayAfter.getDate());
    expect(answer.figures.find((figure) => figure.id === "rows")?.value).toBe(
      1
    );
  });
});
