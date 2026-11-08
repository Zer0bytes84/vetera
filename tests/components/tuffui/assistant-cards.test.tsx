import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ConfirmationCard } from "@/components/ui/confirmation-card";
import { ToolApprovalQueue, type ApprovalRequest } from "@/components/ui/tool-approval-queue";
import { AgentQuestion } from "@/components/ui/agent-question";

const request = (id: string, status?: ApprovalRequest["status"]): ApprovalRequest => ({
  id, title: `Rubrique ${id}`, status, before: "ma dictée", after: "formulation de l’assistant",
});

describe("cartes de validation : rien ne s'enregistre sans le vétérinaire", () => {
  it("la carte de confirmation bloque la validation tant qu'il reste une proposition à examiner", () => {
    const html = renderToStaticMarkup(
      <ConfirmationCard blocked="2 reformulations à examiner avant d’enregistrer." confirmLabel="Valider la note"
        data={{ title: "Enregistrer la note", items: [{ id: "s", label: "S", filled: true }] }} onConfirm={() => undefined} />,
    );
    expect(html).toContain("2 reformulations à examiner");
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>[^<]*(<[^>]*>)*[^<]*Valider la note/);
  });

  it("sans blocage et avec une rubrique renseignée, la validation est possible ; sans rubrique, non", () => {
    const ok = renderToStaticMarkup(<ConfirmationCard confirmLabel="Valider" data={{ title: "t", items: [{ id: "s", label: "S", filled: true }] }} />);
    expect(ok).not.toMatch(/<button[^>]*disabled=""[^>]*>[^<]*Valider/);
    const empty = renderToStaticMarkup(<ConfirmationCard confirmLabel="Valider" data={{ title: "t", items: [{ id: "s", label: "S" }] }} />);
    expect(empty).toMatch(/<button[^>]*disabled=""[^>]*>[^<]*Valider/);
  });

  it("la carte n'affiche ni montant ni total", () => {
    const html = renderToStaticMarkup(<ConfirmationCard data={{ title: "t", items: [{ id: "s", label: "S", filled: true }] }} />);
    expect(html).not.toMatch(/Total|Subtotal|\$|€/);
  });

  it("la file liste ce qui reste à examiner, sans mode, sans portée durable ni nom technique", () => {
    const html = renderToStaticMarkup(<ToolApprovalQueue data={[request("a"), request("b", "approved")]} />);
    expect(html).toContain("à examiner");
    expect(html).toContain("Rubrique a");
    expect(html).toContain("Examinées · 1");
    expect(html).not.toMatch(/Always|Toujours|session|risque/i);
  });

  it("une file entièrement examinée le dit", () => {
    const html = renderToStaticMarkup(<ToolApprovalQueue data={[request("a", "denied")]} />);
    expect(html).toContain("Tout est examiné");
    expect(html).toContain("votre dictée conservée");
  });

  it("la question propose ses options en français, au nom de « l'assistant »", () => {
    const html = renderToStaticMarkup(
      <AgentQuestion agent="assistant" data={{ question: "Que faire ?", options: [{ id: "a", label: "Relire ma dictée" }, { id: "b", label: "Corriger" }] }} />,
    );
    expect(html).toContain("Question de l’assistant");
    expect(html).toContain("Relire ma dictée");
    expect(html).toContain('role="radiogroup"');
    expect(html).not.toMatch(/asks|Suggested|Something else/);
  });
});
