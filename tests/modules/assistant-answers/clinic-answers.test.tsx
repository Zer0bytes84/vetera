import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { answerQuestion } from "@/modules/assistant-answers/answer";
import {
  AnswerView,
  ProposalDock,
  type Turn,
} from "@/modules/assistant-answers/clinic-answers";
import { pendingProposal } from "@/modules/assistant-answers/pending-proposal";
import { clinic, NOW } from "./fixtures";

const TWO_OF_FIVE = /2 sur 5/;
const TABLE_TAG = /<table/;
const MODEL_NAME = /gemma|whisper|mediapipe|llama|modèle|gpt/i;

const turn = (question: string): Turn => {
  const answer = answerQuestion(question, clinic(), { now: NOW });
  return { id: "t", question, at: NOW.toISOString(), durationMs: 3, answer };
};
const view = (
  question: string,
  card?: Parameters<typeof AnswerView>[0]["card"]
) =>
  renderToStaticMarkup(
    <AnswerView
      card={card}
      onAsk={() => {}}
      onCancel={() => {}}
      onConfirm={() => {}}
      turn={turn(question)}
    />
  );

describe("l'écran de l'onglet Données", () => {
  it("une réponse montre, dans l'ordre : les étapes, la phrase, le tableau, ce qui a été lu", () => {
    const html = view("Recettes et dépenses des 30 derniers jours");
    const order = [
      "Question comprise",
      "Lecture : journal de caisse",
      "Encaissé",
      "Lignes du journal de caisse",
      "Ce que j’ai lu",
    ].map((part) => html.indexOf(part));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("chaque réponse a sa provenance affichée : table, lignes retenues sur lues, filtre", () => {
    const html = view("Recettes des 30 derniers jours");
    expect(html).toContain("Journal de caisse");
    expect(html).toMatch(TWO_OF_FIVE);
    expect(html).toContain("Encaissements réglés");
  });

  it("les absences proposent une carte à valider, et rien n'est enregistré sans elle", () => {
    const html = view("Absences des 30 derniers jours");
    expect(html).toContain("Valider et créer la tâche");
    expect(html).toContain(
      "Rien n’est enregistré tant que vous n’avez pas validé"
    );
  });

  it("une carte écartée ne s'affiche plus ; une carte validée dit ce qui a été fait", () => {
    expect(
      view("Absences des 30 derniers jours", { status: "dismissed" })
    ).not.toContain("Valider et créer");
    expect(
      view("Absences des 30 derniers jours", {
        status: "done",
        reference: "1 tâche ajoutée aux Rappels",
        doneAt: "10:00",
      })
    ).toContain("1 tâche ajoutée aux Rappels");
  });

  it("un refus de dose est une phrase, sans tableau, sans sources, sans carte", () => {
    const html = view("quelle dose de rimadyl pour Rex");
    expect(html).toContain("aucune dose");
    expect(html).not.toContain("Ce que j’ai lu");
    expect(html).not.toContain("Valider et créer");
    expect(html).not.toMatch(TABLE_TAG);
  });

  it("aucun nom de modèle n'apparaît dans l'écran", () => {
    for (const question of [
      "Recettes",
      "Absences",
      "Tâches",
      "Combien de patients ?",
      "dose de Rex",
    ]) {
      expect(view(question)).not.toMatch(MODEL_NAME);
    }
  });

  it("la carte entière reste dans la réponse, marquée pour que le panneau sache si elle est en vue", () => {
    const html = view("Absences des 30 derniers jours");
    expect(html).toContain('data-proposal-card="t"');
    expect(html.indexOf("Ce que j’ai lu")).toBeLessThan(
      html.indexOf('data-proposal-card="t"')
    );
    expect(html).toContain("Ne rien créer");
  });
});

describe("la version courte de la carte, au pied du panneau", () => {
  const withId = (question: string, id: string): Turn => ({
    ...turn(question),
    id,
  });

  it("suit la dernière carte en attente, et lâche une carte validée ou écartée", () => {
    const first = withId("Absences des 30 derniers jours", "a");
    const second = withId("Absences des 30 derniers jours", "b");
    const answerOnly = withId("Recettes des 30 derniers jours", "c");
    expect(pendingProposal([], {})).toBeNull();
    expect(pendingProposal([answerOnly], {})).toBeNull();
    expect(pendingProposal([first, second, answerOnly], {})?.turnId).toBe("b");
    expect(
      pendingProposal([first, second], { b: { status: "dismissed" } })?.turnId
    ).toBe("a");
    expect(
      pendingProposal([first, second], {
        a: { status: "done" },
        b: { status: "done" },
      })
    ).toBeNull();
    expect(
      pendingProposal([first], { a: { status: "confirming" } })?.card?.status
    ).toBe("confirming");
  });

  it("montre le titre de la carte, « Voir la carte » et le même bouton de validation, sans rien de plus", () => {
    const waiting = pendingProposal(
      [withId("Absences des 30 derniers jours", "a")],
      {}
    )!;
    const html = renderToStaticMarkup(
      <ProposalDock
        onConfirm={() => {}}
        onShow={() => {}}
        proposal={waiting.proposal}
      />
    );
    expect(html).toContain(waiting.proposal.title);
    expect(html).toContain("Voir la carte");
    expect(html).toContain("Valider et créer la tâche");
    expect(html).toContain("Rien n’est enregistré sans votre validation");
    expect(html).toContain("data-proposal-dock");
    expect(html).not.toContain("Ne rien créer");
  });

  it("pendant l'enregistrement, le bouton attend ; après un échec, la version courte dit l'erreur de la carte", () => {
    const { proposal } = pendingProposal(
      [withId("Absences des 30 derniers jours", "a")],
      {}
    )!;
    const saving = renderToStaticMarkup(
      <ProposalDock
        card={{ status: "confirming" }}
        onConfirm={() => {}}
        onShow={() => {}}
        proposal={proposal}
      />
    );
    expect(saving).toContain("Enregistrement…");
    expect(saving).toContain('aria-busy="true"');
    const failed = renderToStaticMarkup(
      <ProposalDock
        card={{ status: "review", error: "L’enregistrement a échoué." }}
        onConfirm={() => {}}
        onShow={() => {}}
        proposal={proposal}
      />
    );
    expect(failed).toContain("L’enregistrement a échoué.");
  });
});
