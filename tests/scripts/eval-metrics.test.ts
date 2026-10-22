import { describe, expect, it } from "vitest";
import {
  citationScores,
  retrievalScores,
  scoreSoapDraft,
} from "../../scripts/eval-local-ai/metrics";
import { containsDosage } from "@/modules/consultations/local-ai/soap-schema";

const scaffold = {
  subjective: "Boiterie depuis trois jours. Pas de vomissement.",
  objective: "Douleur au grasset droit.",
  assessment: "Suspicion de rupture du ligament croisé crânial.",
  plan: "",
};

describe("bench scoring of a SOAP draft", () => {
  it("counts the altered words that make the fidelity check fail", () => {
    const score = scoreSoapDraft(
      "Boiterie depuis trois jours. Pas de vomissement. Douleur au grasset droit. Suspicion de rupture du ligament croisé crânial.",
      scaffold,
      { ...scaffold, assessment: "Suspicion de rupture du ligament croânial." },
      null,
      containsDosage
    );
    expect(score.fidelity).toBe(3 / 4);
    expect(score.alteredWords).toEqual(["croanial"]);
    expect(score.sectionAgreement).toBeNull();
  });
  it("compares sections with the note kept by the veterinarian", () => {
    const score = scoreSoapDraft(
      "Boiterie. Douleur au grasset droit.",
      { subjective: "Boiterie. Douleur au grasset droit.", objective: "", assessment: "", plan: "" },
      { subjective: "Boiterie. Douleur au grasset droit.", objective: "", assessment: "", plan: "" },
      { subjective: "Boiterie.", objective: "Douleur au grasset droit.", assessment: "", plan: "" },
      containsDosage
    );
    expect(score.fidelity).toBe(1);
    expect(score.sectionAgreement).toBe(0.5);
  });
  it("flags a dosage that the dictation never contained", () => {
    const score = scoreSoapDraft(
      "Douleur au grasset droit.",
      { ...scaffold, assessment: "", subjective: "" },
      { ...scaffold, subjective: "", assessment: "", plan: "Méloxicam 0,1 mg/kg une fois par jour." },
      null,
      containsDosage
    );
    expect(score.inventedDosages).toHaveLength(1);
  });
});

describe("bench retrieval and citation scores", () => {
  it("scores rank, recall and order", () => {
    expect(retrievalScores(["a", "b", "c"], ["b"])).toEqual({
      recallAt5: 1,
      mrrAt10: 0.5,
      ndcgAt10: 1 / Math.log2(3),
    });
    expect(retrievalScores(["x"], ["b"]).recallAt5).toBe(0);
  });
  it("rewards an empty answer only when nothing is relevant", () => {
    expect(retrievalScores([], []).recallAt5).toBe(1);
    expect(retrievalScores(["a"], []).recallAt5).toBe(0);
    expect(citationScores([], [], true).relevant).toBe(1);
    expect(citationScores([2], [2, 3], false).relevant).toBe(1);
    expect(citationScores([1], [2], false).relevant).toBe(0);
  });
});
