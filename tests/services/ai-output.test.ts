import { describe, expect, it } from "vitest";

import {
  getAssistantErrorMessage,
  sanitizeAssistantOutput,
} from "@/services/aiOutput";

describe("sanitizeAssistantOutput", () => {
  it("removes closed private reasoning blocks", () => {
    expect(
      sanitizeAssistantOutput(
        "<think>private reasoning</think>\n\n**Synthèse**\n\nLe patient est stable."
      )
    ).toBe("**Synthèse**\n\nLe patient est stable.");
  });

  it("drops an unclosed private reasoning block", () => {
    expect(sanitizeAssistantOutput("<think>private reasoning")).toBe("");
  });

  it("removes tool protocol and raw tool references", () => {
    expect(
      sanitizeAssistantOutput(
        '[TOOL_RESULT: {"items":[{"id":"1"}]}]\n\n[search_patients(query="Boby")]'
      )
    ).toBe("");
  });

  it("keeps readable final content", () => {
    expect(
      sanitizeAssistantOutput("**Résumé**\n\n- Chien stable\n- Contrôle dans 7 jours")
    ).toContain("Résumé");
  });

  it("drops an unwrapped chain of thought", () => {
    expect(
      sanitizeAssistantOutput(
        "Let's start with the user's request. I need to check the patient history. Wait, maybe there is a conflict."
      )
    ).toBe("");
  });

  it("keeps an explicit final section after internal prose", () => {
    expect(
      sanitizeAssistantOutput(
        "Let's start with the user's request. I should inspect the record.\n\nFinal answer: **Synthèse**\n\nLe patient est stable."
      )
    ).toBe("**Synthèse**\n\nLe patient est stable.");
  });

  it("removes unwrapped tool names and special tokens", () => {
    expect(
      sanitizeAssistantOutput(
        '<|assistant|> search_patients(query="Boby")\n\nLe patient est stable.'
      )
    ).toBe("Le patient est stable.");
  });
});

describe("getAssistantErrorMessage", () => {
  it("explains when WebGPU is unavailable", () => {
    expect(getAssistantErrorMessage(new Error("WebGPU is not available"))).toContain(
      "WebGPU"
    );
  });

  it("explains a model download failure", () => {
    expect(getAssistantErrorMessage(new Error("Failed to fetch model"))).toContain(
      "connexion Internet"
    );
  });

  it("recommends the light model when memory is insufficient", () => {
    expect(getAssistantErrorMessage(new Error("Out of memory"))).toContain("Vénus");
  });
});
