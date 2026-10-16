import { describe, expect, it, vi } from "vitest";
import {
  SOAP_QUESTIONNAIRE_STEPS,
  SoapQuestionnaireStep,
} from "@/modules/consultations/local-ai/soap-questionnaire-config";
import {
  ASSISTANT_TOGGLE_EVENT,
  openAssistant,
  closeAssistant,
  toggleAssistant,
} from "@/modules/consultations/assistant-events";

describe("SOAP Questionnaire Config", () => {
  it("contient exactement 4 étapes ordonnées S - O - A - P", () => {
    expect(SOAP_QUESTIONNAIRE_STEPS).toHaveLength(4);
    expect(SOAP_QUESTIONNAIRE_STEPS.map((s) => s.letter)).toEqual(["S", "O", "A", "P"]);
    expect(SOAP_QUESTIONNAIRE_STEPS.map((s) => s.key)).toEqual([
      "subjective",
      "objective",
      "assessment",
      "plan",
    ]);
  });

  it("définit des questions et options cohérentes pour chaque étape", () => {
    SOAP_QUESTIONNAIRE_STEPS.forEach((step: SoapQuestionnaireStep) => {
      expect(step.question.length).toBeGreaterThan(10);
      expect(step.subtitle.length).toBeGreaterThan(10);
      expect(step.options.length).toBe(8);

      const shortcuts = step.options.map((o) => o.shortcut);
      expect(new Set(shortcuts).size).toBe(step.options.length);

      step.options.forEach((opt) => {
        expect(opt.id).toBeTruthy();
        expect(opt.label).toBeTruthy();
        expect(opt.textToInsert.length).toBeGreaterThan(5);
      });
    });
  });

  it("couvre les termes vétérinaires majeurs (vaccination, gastro, AINS, IRC)", () => {
    const subjective = SOAP_QUESTIONNAIRE_STEPS.find((s) => s.letter === "S")!;
    expect(subjective.options.some((o) => o.label.includes("Vaccination"))).toBe(true);

    const objective = SOAP_QUESTIONNAIRE_STEPS.find((s) => s.letter === "O")!;
    expect(objective.options.some((o) => o.label.includes("BEG"))).toBe(true);

    const assessment = SOAP_QUESTIONNAIRE_STEPS.find((s) => s.letter === "A")!;
    expect(assessment.options.some((o) => o.textToInsert.includes("IRC"))).toBe(true);

    const plan = SOAP_QUESTIONNAIRE_STEPS.find((s) => s.letter === "P")!;
    expect(plan.options.some((o) => o.label.includes("AINS"))).toBe(true);
  });
});

describe("Assistant Global Events", () => {
  it("ne lève pas d'erreur si window est indéfini", () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error test node env
    delete globalThis.window;

    expect(() => openAssistant()).not.toThrow();
    expect(() => closeAssistant()).not.toThrow();
    expect(() => toggleAssistant()).not.toThrow();

    globalThis.window = originalWindow;
  });

  it("émet l'événement CustomEvent baitari:assistant-toggle pour open, close et toggle", () => {
    const dispatchMock = vi.fn();
    const originalWindow = globalThis.window;

    globalThis.window = {
      dispatchEvent: dispatchMock,
    } as unknown as Window & typeof globalThis;

    class MockCustomEvent {
      type: string;
      detail: unknown;
      constructor(type: string, options?: { detail: unknown }) {
        this.type = type;
        this.detail = options?.detail;
      }
    }
    const originalCustomEvent = globalThis.CustomEvent;
    // @ts-expect-error mock
    globalThis.CustomEvent = MockCustomEvent;

    openAssistant({ patientId: "pat-123" });
    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: ASSISTANT_TOGGLE_EVENT,
        detail: { open: true, patientId: "pat-123" },
      })
    );

    closeAssistant();
    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: ASSISTANT_TOGGLE_EVENT,
        detail: { open: false },
      })
    );

    toggleAssistant({ appointmentId: "apt-456" });
    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: ASSISTANT_TOGGLE_EVENT,
        detail: { appointmentId: "apt-456" },
      })
    );

    globalThis.window = originalWindow;
    globalThis.CustomEvent = originalCustomEvent;
  });
});
