import { describe, expect, it } from "vitest";
import { buildQuietDay } from "../../src/modules/flow-board/quiet-day";

const now = new Date(2026, 10, 12, 10, 0);
const at = (day: number, hour: number) => new Date(2026, 10, day, hour, 0).toISOString();
const input = {
  now,
  patients: [{ id: "p1", name: "Lisa" }, { id: "p2", name: "Nika" }],
  vets: [{ id: "v1", name: "Dr Abdou" }, { id: "v2", name: "Dr Kherroubi" }],
  appointments: [
    { id: "a", patientId: "p1", vetId: "v1", startTime: at(12, 8), status: "cancelled", reason: "", type: "Urgence" },
    { id: "b", patientId: "p1", vetId: "v1", startTime: at(12, 9), status: "no_show", reason: "", type: "Consultation" },
    { id: "c", patientId: "p2", vetId: "v2", startTime: at(14, 9), status: "scheduled", reason: "Boiterie", type: "Consultation" },
    { id: "d", patientId: "p1", vetId: "v1", startTime: at(16, 11), status: "confirmed", reason: " ", type: "Vaccin" },
    { id: "e", patientId: "p1", vetId: "v1", startTime: at(25, 11), status: "scheduled", reason: "", type: "Contrôle" },
    { id: "f", patientId: "p1", vetId: "v1", startTime: at(13, 11), status: "cancelled", reason: "", type: "Contrôle" },
  ],
  transactions: [
    { type: "income", status: "paid", date: at(12, 9), amount: 150000 },
    { type: "income", status: "pending", date: at(12, 9), amount: 99900 },
    { type: "expense", status: "paid", date: at(12, 9), amount: 5000 },
    { type: "income", status: "paid", date: at(11, 9), amount: 7000 },
  ],
} as unknown as Parameters<typeof buildQuietDay>[0];

describe("journée sans visite : ce que le Flux montre, lu dans les dossiers", () => {
  it("le prochain rendez-vous planifié ou confirmé, jamais un annulé", () => {
    expect(buildQuietDay(input).next).toEqual({ appointmentId: "c", startTime: at(14, 9), patientName: "Nika", reason: "Boiterie", vetName: "Dr Kherroubi", today: false });
  });
  it("le résumé du jour : annulés, absences, recettes payées du jour", () => {
    expect(buildQuietDay(input)).toMatchObject({ week: 2, cancelledToday: 1, noShowToday: 1, receiptsToday: 150000 });
  });
  it("le filtre de vétérinaire du tableau vaut pour les rendez-vous, pas pour la caisse", () => {
    const quiet = buildQuietDay({ ...input, vetId: "v1" });
    expect(quiet.next?.appointmentId).toBe("d");
    expect(quiet.next?.reason).toBe("Vaccin");
    expect(quiet.receiptsToday).toBe(150000);
  });
  it("sans rendez-vous à venir, pas de prochain rendez-vous", () => {
    expect(buildQuietDay({ ...input, appointments: [] }).next).toBeNull();
  });
});
