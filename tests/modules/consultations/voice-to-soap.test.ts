import { describe, expect, it } from "vitest";

import {
  extractJsonObject,
  normalizeSoapDraft,
} from "@/modules/consultations/lib/voice-to-soap";

describe("voice-to-soap parsing", () => {
  it("extracts JSON wrapped in markdown without swallowing later text", () => {
    expect(
      extractJsonObject(
        'Voici la note : ```json\n{"subjective":"Toux avec appétit conservé","objective":"T° 38,5"}\n```'
      )
    ).toEqual({
      subjective: "Toux avec appétit conservé",
      objective: "T° 38,5",
    });
  });

  it("respects braces contained inside a JSON string", () => {
    expect(
      extractJsonObject(
        '{"subjective":"Plan {à confirmer}","plan":"Contrôle dans 7 jours"}'
      )
    ).toEqual({
      subjective: "Plan {à confirmer}",
      plan: "Contrôle dans 7 jours",
    });
  });

  it("normalizes missing sections and clamps confidence", () => {
    expect(
      normalizeSoapDraft({ subjective: "  Motif  ", confidence: 1.8 })
    ).toEqual({
      subjective: "Motif",
      objective: "",
      assessment: "",
      plan: "",
      confidence: 1,
      groundingScore: null,
    });
  });

  it("drops a section that has no evidence in the dictation", () => {
    const draft = normalizeSoapDraft(
      {
        subjective: "Le patient a une toux.",
        objective: "Ouverture du système pyométrique et lésion abdominale.",
        assessment: "",
        plan: "",
        confidence: 0.9,
      },
      "Toux depuis hier, appétit conservé."
    );
    expect(draft.subjective).toBe("Le patient a une toux.");
    expect(draft.objective).toBe("");
    expect(draft.confidence).toBe(0.9);
  });
});
