import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AgentComposer } from "@/components/ui/agent-composer";
import { AgentStatus } from "@/components/ui/agent-status";
import { ContextWindowMeter } from "@/components/ui/context-window-meter";
import { PromptSuggestions } from "@/components/ui/prompt-suggestions";
import { StreamingMessage } from "@/components/ui/streaming-message";
import { ToolCallBlock } from "@/components/ui/tool-call-block";

describe("composants de l'assistant : français, jetons Baitari, rien de technique", () => {
  it("le message de l'assistant se signe « Assistant IA » et peut taire copier et régénérer", () => {
    const html = renderToStaticMarkup(<StreamingMessage data={{ status: "done", content: "**S** · Motif" }} />);
    expect(html).toContain("Message de Assistant IA");
    expect(html).toContain("Copier le message");
    const quiet = renderToStaticMarkup(<StreamingMessage data={{ status: "done", content: "x" }} showActions={false} showHeader={false} />);
    expect(quiet).not.toContain("Copier le message");
  });

  it("le champ de dictée ouvre les suggestions de patients et relie la liste au champ", () => {
    const html = renderToStaticMarkup(
      <AgentComposer label="Vos observations" onValueChange={() => undefined} value="vu @Re"
        menu={{ label: "Suggestions de patients", items: [{ key: "1", label: "Rex", detail: "Chien · Bouras" }], active: 0, onActiveChange: () => undefined, onPick: () => undefined, onDismiss: () => undefined }} />,
    );
    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-label="Suggestions de patients"');
    expect(html).toContain("Chien · Bouras");
    expect(html).toContain("Vos observations");
  });

  it("l'état de l'assistant dit ce qu'il fait et propose d'arrêter", () => {
    const html = renderToStaticMarkup(<AgentStatus data={{ label: "Écoute en cours", startedAt: 0 }} onStop={() => undefined} />);
    expect(html).toContain("Écoute en cours");
    expect(html).toContain("Arrêter");
    expect(html).toContain("État de l’assistant");
  });

  it("la jauge compte des caractères, en français, avec les teintes de l'app", () => {
    const html = renderToStaticMarkup(<ContextWindowMeter data={{ limit: 6000, segments: [{ id: "d", label: "Dictée", tokens: 1500 }] }} variant="inline" />);
    expect(html).toMatch(/1\s500 sur 6\s000 caractères \(25/);
    expect(html).toContain("var(--tone-blue)");
    expect(html).not.toMatch(/#5e5ce6|#bf5af2|tokens/);
  });

  it("les suggestions sont des puces cliquables et un bouton de plus de suggestions seulement si demandé", () => {
    const html = renderToStaticMarkup(<PromptSuggestions data={[{ id: "1", title: "Otite bactérienne" }]} heading="Suggestions" onSelect={() => undefined} variant="chips" />);
    expect(html).toContain("Otite bactérienne");
    expect(html).not.toContain("Plus de suggestions");
  });

  it("le bloc d'opération dit ce qui a été fait en mots, sans nom d'outil ni JSON", () => {
    const html = renderToStaticMarkup(
      <ToolCallBlock data={{ id: "1", name: "Recherche dans les dossiers", summary: "3 passages trouvés", status: "success", durationMs: 1200, details: [{ label: "Recherche", value: "otite" }] }} defaultOpen />,
    );
    expect(html).toContain("Recherche dans les dossiers");
    expect(html).toContain("3 passages trouvés");
    expect(html).toContain("Terminé");
    expect(html).toContain("1,2 s");
    expect(html).not.toMatch(/\{|json|Arguments/i);
  });
});
