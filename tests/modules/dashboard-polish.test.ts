import { describe, expect, it } from "vitest";
import { conflictingVisits, dayPatients, percentChange, recentTrend } from "../../src/modules/dashboard/v2/polish-model";
import type { Appointment, Patient } from "../../src/types/db";
const reference = new Date(2026, 9, 11, 12);
const visit = (id: string, start: string, end: string, fields: Partial<Appointment> = {}): Appointment => ({ id, startTime: `2026-10-11T${start}:00`, endTime: `2026-10-11T${end}:00`, patientId: id, ownerId: "owner", vetId: "vet", status: "scheduled", createdAt: "2026-10-01", title: "Consultation", type: "Consultation", ...fields });
describe("Repères quotidiens du tableau de bord", () => {
  it("ne fabrique pas un pourcentage sans historique", () => { expect(percentChange(5, 0)).toBeNull(); expect(percentChange(0, 0)).toBeNull(); });
  it("calcule une hausse et une baisse sans ambiguïté", () => { expect(percentChange(15, 10)).toBe(50); expect(percentChange(0, 10)).toBe(-100); });
  it("compare deux fenêtres de sept jours sans inclure le futur", () => {
    const result = recentTrend([{ date: "2026-10-01", value: 10 }, { date: "2026-10-11", value: 15 }, { date: "2026-10-12", value: 100 }], reference);
    expect(result.change).toBe(50); expect(result.points).toHaveLength(7); expect(result.points.reduce((s, p) => s + p.value, 0)).toBe(15);
  });
  it("ne compte qu’une fois un patient avec deux visites et ignore les annulations", () => {
    const appointments = [visit("a", "09:00", "09:30"), visit("b", "11:00", "11:30", { patientId: "a" }), visit("c", "12:00", "12:30", { status: "cancelled" })];
    expect(dayPatients(appointments, [{ id: "a" }, { id: "c" }] as Patient[], reference).map(p => p.id)).toEqual(["a"]);
  });
  it("détecte une collision pour le même vétérinaire", () => { expect([...conflictingVisits([visit("a", "09:00", "10:00"), visit("b", "09:30", "10:30")])]).toEqual(["a", "b"]); });
  it("accepte deux rendez-vous consécutifs ou sur des ressources distinctes", () => {
    expect(conflictingVisits([visit("a", "09:00", "10:00"), visit("b", "10:00", "10:30"), visit("c", "09:30", "10:00", { vetId: "other" })]).size).toBe(0);
  });
  it("détecte une salle occupée même avec deux vétérinaires différents", () => { expect(conflictingVisits([visit("a", "09:00", "10:00", { room: "1" }), visit("b", "09:30", "10:30", { room: "1", vetId: "other" })]).size).toBe(2); });
  it("ignore les créneaux annulés, absents et invalides", () => { expect(conflictingVisits([visit("a", "09:00", "10:00"), visit("b", "09:30", "10:30", { status: "cancelled" }), visit("c", "09:30", "09:00"), visit("d", "09:30", "10:30", { status: "no_show" })]).size).toBe(0); });
});
