import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { answerQuestion } from "@/modules/assistant-answers/answer";
import { AnswerView, type Turn } from "@/modules/assistant-answers/clinic-answers";
import { clinic, NOW } from "./fixtures";

const turn = (question: string): Turn => {
  const answer = answerQuestion(question, clinic(), { now: NOW });
  return { id: "t", question, at: NOW.toISOString(), durationMs: 3, answer };
};
const view = (question: string, card?: Parameters<typeof AnswerView>[0]["card"]) =>
  renderToStaticMarkup(<AnswerView card={card} onAsk={() => {}} onCancel={() => {}} onConfirm={() => {}} turn={turn(question)} />);

describe("l'écran de l'onglet Données", () => {
  it("une réponse montre, dans l'ordre : les étapes, la phrase, le tableau, ce qui a été lu", () => {
    const html = view("Recettes et dépenses des 30 derniers jours");
    const order = ["Question comprise", "Lecture : journal de caisse", "Encaissé", "Lignes du journal de caisse", "Ce que j’ai lu"].map((part) => html.indexOf(part));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("chaque réponse a sa provenance affichée : table, lignes retenues sur lues, filtre", () => {
    const html = view("Recettes des 30 derniers jours");
    expect(html).toContain("Journal de caisse");
    expect(html).toMatch(/2 sur 5/);
    expect(html).toContain("Encaissements réglés");
  });

  it("les absences proposent une carte à valider, et rien n'est enregistré sans elle", () => {
    const html = view("Absences des 30 derniers jours");
    expect(html).toContain("Valider et créer la tâche");
    expect(html).toContain("Rien n’est enregistré tant que vous n’avez pas validé");
  });

  it("une carte écartée ne s'affiche plus ; une carte validée dit ce qui a été fait", () => {
    expect(view("Absences des 30 derniers jours", { status: "dismissed" })).not.toContain("Valider et créer");
    expect(view("Absences des 30 derniers jours", { status: "done", reference: "1 tâche ajoutée aux Rappels", doneAt: "10:00" })).toContain("1 tâche ajoutée aux Rappels");
  });

  it("un refus de dose est une phrase, sans tableau, sans sources, sans carte", () => {
    const html = view("quelle dose de rimadyl pour Rex");
    expect(html).toContain("aucune dose");
    expect(html).not.toContain("Ce que j’ai lu");
    expect(html).not.toContain("Valider et créer");
    expect(html).not.toMatch(/<table/);
  });

  it("aucun nom de modèle n'apparaît dans l'écran", () => {
    for (const question of ["Recettes", "Absences", "Tâches", "Combien de patients ?", "dose de Rex"]) {
      expect(view(question)).not.toMatch(/gemma|whisper|mediapipe|llama|modèle|gpt/i);
    }
  });
});
