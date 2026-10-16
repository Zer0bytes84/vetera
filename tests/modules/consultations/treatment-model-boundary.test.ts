import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LocalPatientContext } from "@/modules/consultations/local-ai/patient-context";

const fixture = vi.hoisted(() => ({
  requests: [] as Record<string, unknown>[],
  creates: 0,
  closes: 0,
  unsafe: false,
}));
vi.mock("@/modules/consultations/local-ai/models", () => ({
  getLocalModelUrls: () => ({
    modelUrl: "local:model",
    runtimeRoot: "local:runtime",
  }),
}));
vi.mock("@/modules/consultations/local-ai/inference-client", () => ({
  abortError: () => new DOMException("Annulé", "AbortError"),
  LocalInferenceSession: {
    create: async () => {
      fixture.creates++;
      return {
        close: () => {
          fixture.closes++;
        },
        request: async (message: Record<string, unknown>) => {
          fixture.requests.push(message);
          return {
            type: "generated",
            text: fixture.unsafe
              ? JSON.stringify({
                  subjective: "Toux.",
                  objective: "",
                  assessment: "",
                  plan: "Donner 5 mg/kg.",
                })
              : String(message.responseTemplate),
          };
        },
      };
    },
  },
}));
import { useLocalConsultationAi } from "@/modules/consultations/hooks/use-local-consultation-ai";
const context = {
  patient: {},
  consultation: {},
  dernieresConsultations: [],
} as unknown as LocalPatientContext;
const models = { root: "local", whisperReady: true, generatorReady: true };
function setup() {
  const observe = vi.fn<(ai: ReturnType<typeof useLocalConsultationAi>) => void>();
  function Probe() {
    const ai = useLocalConsultationAi();
    observe(ai);
    return null;
  }
  renderToStaticMarkup(React.createElement(Probe));
  return observe.mock.calls[0][0];
}
beforeEach(() => {
  fixture.requests = [];
  fixture.creates = 0;
  fixture.closes = 0;
  fixture.unsafe = false;
});
describe("frontière du modèle local pour les traitements", () => {
  const treatment =
    "Le patient a besoin d’un traitement antibiotique pendant 7 jours.";
  it("exclut la phrase du prompt et du gabarit puis la fusionne exactement après validation", async () => {
    const ai = setup();
    const draft = await ai.generate(models, `Toux. ${treatment}`, context);
    expect(draft).toEqual({
      subjective: "Toux.",
      objective: "",
      assessment: "",
      plan: treatment,
    });
    expect(fixture.requests).toHaveLength(1);
    expect(String(fixture.requests[0].prompt)).not.toContain(treatment);
    expect(String(fixture.requests[0].responseTemplate)).not.toContain(
      treatment
    );
    expect(fixture.closes).toBe(1);
  });
  it("préserve une dose humaine sans la montrer au modèle ni en calculer une", async () => {
    const dose = "Le patient a besoin de 2.5 mg pendant trois jours.";
    const draft = await setup().generate(models, `Toux. ${dose}`, context);
    expect(draft!.plan).toBe(dose);
    expect(JSON.stringify(fixture.requests)).not.toContain("2.5 mg");
  });
  it("ne charge aucun modèle quand la dictée ne contient qu’un traitement protégé", async () => {
    expect(
      await setup().generate(
        { ...models, generatorReady: false },
        treatment,
        context
      )
    ).toMatchObject({ plan: treatment });
    expect(fixture.creates).toBe(0);
    expect(fixture.requests).toHaveLength(0);
  });
  it("rejette la posologie inventée sans fusion ni seconde tentative", async () => {
    fixture.unsafe = true;
    expect(
      await setup().generate(models, `Toux. ${treatment}`, context)
    ).toBeNull();
    expect(fixture.requests).toHaveLength(1);
    expect(fixture.closes).toBe(1);
  });
  it("conserve les rubriques choisies et protège le traitement avant l’appel guidé", async () => {
    const selected = { subjective: "Le propriétaire parle d’un vaccin.", objective: "Évaluation : température 39 °C.", assessment: "Examen évoquant une infection.", plan: "On va mettre sous Metacam pendant sept jours." };
    const draft = await setup().generate(models, Object.values(selected).join("\n"), context, selected);
    expect(draft).toEqual(selected);
    expect(JSON.stringify(fixture.requests)).not.toContain("Metacam");
    expect(JSON.parse(String(fixture.requests[0].responseTemplate))).toEqual({ ...selected, plan: "" });
  });

});
