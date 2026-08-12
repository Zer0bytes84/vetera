import { describe, expect, it } from "vitest";

import {
  extractToolCall,
  isMutatingTool,
  parseToolArguments,
} from "@/services/aiToolProtocol";

describe("ai tool protocol", () => {
  it("parses quoted values containing commas and parentheses", () => {
    expect(
      parseToolArguments(
        'patient_id="pet-1", content="Contrôle (à refaire), puis appeler le propriétaire"'
      )
    ).toEqual({
      patient_id: "pet-1",
      content: "Contrôle (à refaire), puis appeler le propriétaire",
    });
  });

  it("accepts JSON arguments emitted by a local model", () => {
    expect(
      parseToolArguments('{"patient_id":"pet-1","minutes_before":1440}')
    ).toEqual({ patient_id: "pet-1", minutes_before: "1440" });
  });

  it("does not throw on malformed arguments", () => {
    expect(parseToolArguments("patient_id=pet-1, broken=")).toEqual({
      patient_id: "pet-1",
    });
  });

  it("extracts one balanced tool call without truncating nested text", () => {
    const call = extractToolCall(
      '[TOOL: save_patient_note(patient_id="pet-1", content="Plan (surveiller), puis revoir")]'
    );

    expect(call).toEqual({
      name: "save_patient_note",
      args: {
        patient_id: "pet-1",
        content: "Plan (surveiller), puis revoir",
      },
      raw: '[TOOL: save_patient_note(patient_id="pet-1", content="Plan (surveiller), puis revoir")]',
    });
  });

  it("identifies writes that require veterinarian confirmation", () => {
    expect(isMutatingTool("save_patient_note")).toBe(true);
    expect(isMutatingTool("create_reminder")).toBe(true);
    expect(isMutatingTool("get_patient_record")).toBe(false);
  });
});
