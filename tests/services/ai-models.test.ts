import { describe, expect, it } from "vitest";

import {
  AI_MODELS,
  DEFAULT_MODEL_ID,
  getModelById,
  resolveModelId,
} from "@/lib/ai-models";

describe("AI model registry", () => {
  it("keeps a valid and unique default model", () => {
    const ids = AI_MODELS.map((model) => model.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain(DEFAULT_MODEL_ID);
    expect(getModelById(DEFAULT_MODEL_ID).id).toBe(DEFAULT_MODEL_ID);
  });

  it("migrates unknown local preferences to the default model", () => {
    expect(resolveModelId("legacy-model-id")).toBe(DEFAULT_MODEL_ID);
    expect(resolveModelId(null)).toBe(DEFAULT_MODEL_ID);
    expect(resolveModelId(DEFAULT_MODEL_ID)).toBe(DEFAULT_MODEL_ID);
  });
});
