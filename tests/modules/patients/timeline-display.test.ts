import { describe, expect, it } from "vitest";
import { isOverdueVisit, pieceDetail, TIMELINE_PAGE } from "@/modules/patients/components/patient-timeline";

describe("pièces de la chronologie", () => {
  it("nomme une facture importée par la date de son événement, jamais par sa clé LEGACY", () => {
    const detail = pieceDetail({ kind: "invoice", detail: "LEGACY-mqh9om2f86iaa1nrfbo" }, "2026-06-16T12:00:00.000Z");
    expect(detail).toBe("16 juin 2026");
    expect(detail).not.toContain("LEGACY");
  });

  it("garde l'état d'une facture importée annulée", () => {
    expect(pieceDetail({ kind: "invoice", detail: "LEGACY-abc · annulée" }, "2026-07-25T12:00:00.000Z")).toBe("25 juil. 2026 · annulée");
  });

  it("laisse le numéro d'une facture émise et le détail des autres pièces", () => {
    expect(pieceDetail({ kind: "invoice", detail: "INV-2026-000015" }, "2026-10-17T12:00:00.000Z")).toBe("INV-2026-000015");
    expect(pieceDetail({ kind: "prescription", detail: "LEGACY-x" }, "2026-10-17T12:00:00.000Z")).toBe("LEGACY-x");
  });
});

describe("visites planifiées dont la date est passée", () => {
  const now = new Date("2026-10-31T12:00:00.000Z").getTime();
  const visit = (status: "scheduled" | "confirmed" | "completed" | "cancelled", startTime: string) => ({
    status,
    startTime,
    endTime: startTime,
  });

  it("repère une visite planifiée ou confirmée restée sans suite", () => {
    expect(isOverdueVisit(visit("scheduled", "2026-09-14T09:00:00.000Z"), now)).toBe(true);
    expect(isOverdueVisit(visit("confirmed", "2026-09-14T09:00:00.000Z"), now)).toBe(true);
  });

  it("ne touche ni une visite à venir, ni une visite tenue ou annulée", () => {
    expect(isOverdueVisit(visit("scheduled", "2026-11-14T09:00:00.000Z"), now)).toBe(false);
    expect(isOverdueVisit(visit("completed", "2026-09-14T09:00:00.000Z"), now)).toBe(false);
    expect(isOverdueVisit(visit("cancelled", "2026-09-14T09:00:00.000Z"), now)).toBe(false);
  });
});

it("ouvre la chronologie sur trois événements", () => {
  expect(TIMELINE_PAGE).toBe(3);
});
