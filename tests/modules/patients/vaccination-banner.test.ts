import { describe, expect, it } from "vitest";

import { lateLabel, vaccinationBannerEntries } from "@/modules/patients/lib/vaccination-banner";
import type { Vaccination } from "@/types/db";

const NOW = new Date("2026-10-18T10:00:00");
const vaccine = (id: string, name: string, administeredAt: string, nextDueAt?: string, patientId = "p1"): Vaccination => ({
  id, patientId, vaccineName: name, administeredAt, nextDueAt, createdAt: "", updatedAt: "",
});

describe("bandeau « Rappel vaccinal »", () => {
  it("affiche le rappel en retard même quand un autre est à venir (cas constaté)", () => {
    const entries = vaccinationBannerEntries("p1", [
      vaccine("t", "Typhus, coryza (RCP)", "2025-09-03", "2026-10-03"),
      vaccine("r", "Rage", "2025-11-12", "2026-11-07"),
      vaccine("f", "Leucose", "2026-07-20", "2027-07-20"),
    ], NOW);
    expect(entries).toEqual([
      { name: "Typhus, coryza (RCP)", nextDueAt: "2026-10-03", status: "overdue", daysLate: 15 },
      { name: "Rage", nextDueAt: "2026-11-07", status: "due_soon" },
    ]);
  });

  it("liste tous les retards, les plus anciens d'abord", () => {
    const entries = vaccinationBannerEntries("p1", [
      vaccine("a", "Typhus", "2025-01-01", "2026-10-10"),
      vaccine("b", "Rage", "2025-01-01", "2026-09-01"),
    ], NOW);
    expect(entries.map((entry) => [entry.name, entry.daysLate])).toEqual([["Rage", 47], ["Typhus", 8]]);
  });

  it("ne signale pas une injection déjà renouvelée ni un autre patient", () => {
    const entries = vaccinationBannerEntries("p1", [
      vaccine("old", "Rage", "2024-11-12", "2025-11-12"),
      vaccine("new", "Rage", "2025-11-12", "2026-11-07"),
      vaccine("other", "Typhus", "2025-01-01", "2026-01-01", "p2"),
    ], NOW);
    expect(entries).toEqual([{ name: "Rage", nextDueAt: "2026-11-07", status: "due_soon" }]);
  });

  it("reste vide sans rappel proche, et le jour de l'échéance n'est pas un retard", () => {
    expect(vaccinationBannerEntries("p1", [vaccine("a", "Rage", "2026-03-01", "2027-03-01"), vaccine("b", "Leucose", "2026-01-01")], NOW)).toEqual([]);
    expect(vaccinationBannerEntries("p1", [vaccine("a", "Rage", "2025-10-18", "2026-10-18")], NOW)[0].status).toBe("due_soon");
  });

  it("formule le retard", () => {
    expect(lateLabel(1)).toBe("en retard d’1 jour");
    expect(lateLabel(15)).toBe("en retard de 15 jours");
  });
});
