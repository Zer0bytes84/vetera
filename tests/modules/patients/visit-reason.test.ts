import { describe, expect, it } from "vitest";
import { visitReason } from "@/modules/patients/lib/visit-reason";
import type { Appointment } from "@/types/db";

const visit = (reason: string | undefined, title: string) =>
  ({ reason, title }) as Appointment;

describe("visit reason in the Synthèse", () => {
  it("prefers the reason typed for the visit", () => {
    expect(visitReason(visit("Controle digestif", "Bella - Consultation"), "Bella")).toBe("Controle digestif");
  });

  it("hides titles generated as « Patient - Type »", () => {
    expect(visitReason(visit(undefined, "Kejounti - Consultation"), "Kejounti")).toBe("");
    expect(visitReason(visit("  ", "kejounti – Vaccin"), "Kejounti")).toBe("");
  });

  it("keeps a title written by hand", () => {
    expect(visitReason(visit(undefined, "Bilan pré-opératoire"), "Rex")).toBe("Bilan pré-opératoire");
  });
});
