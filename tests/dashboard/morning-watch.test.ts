import { describe, expect, it } from "vitest";
import { buildMorningWatch } from "../../src/modules/dashboard/model/morning-watch";

const now = new Date(2026, 10, 12, 10, 0);
const at = (day: number, hour: number) => new Date(2026, 10, day, hour, 0).toISOString();
const base = {
  now,
  careTasks: [
    { statut: "a_faire", heure_prevue: at(12, 8) },
    { statut: "en_cours", heure_prevue: at(12, 14) },
    { statut: "fait", heure_prevue: at(12, 7) },
  ],
  appointments: [
    { startTime: at(11, 9), endTime: at(11, 10), status: "scheduled" },
    { startTime: at(12, 15), endTime: at(12, 16), status: "confirmed" },
    { startTime: at(12, 8), endTime: at(12, 9), status: "no_show" },
    { startTime: at(10, 8), endTime: at(10, 9), status: "completed" },
  ],
  reminders: [
    { id: "a", patient_id: "p1", statut: "en_cours", echeance: "2026-11-01" },
    { id: "b", patient_id: "p1", statut: "en_cours", echeance: "2026-11-15" },
    { id: "c", patient_id: "dead", statut: "en_cours", echeance: "2026-11-01" },
    { id: "d", patient_id: "p1", statut: "fait", echeance: "2026-11-01" },
  ],
  patients: [{ id: "p1", status: "actif" }, { id: "dead", status: "decede" }],
  invoices: [
    { documentStatus: "issued", issuedAt: "2026-11-01", createdAt: "2026-11-01", grossAmount: 500000, creditAmount: 0, balanceAmount: 200000, settlementStatus: "overdue" },
    { documentStatus: "issued", issuedAt: "2026-11-10", createdAt: "2026-11-10", grossAmount: 100000, creditAmount: 0, balanceAmount: 100000, settlementStatus: "unpaid" },
    { documentStatus: "issued", issuedAt: "2026-11-10", createdAt: "2026-11-10", grossAmount: 100000, creditAmount: 0, balanceAmount: 0, settlementStatus: "paid" },
  ],
  stays: [{ status: "critical" }, { status: "admitted" }, { status: "discharged" }],
} as unknown as Omit<Parameters<typeof buildMorningWatch>[0], "status">;

const counts = (status: "late" | "open", extra = {}) =>
  Object.fromEntries(buildMorningWatch({ ...base, ...extra, status }).map((item) => [item.id, item.count]));

describe("« À traiter » : un compte par anomalie, branché sur les vraies règles", () => {
  it("en retard : soins passés, rendez-vous jamais clos, rappels échus, factures en retard, séjours critiques", () => {
    expect(counts("late")).toEqual({ care: 1, appointments: 1, reminders: 1, invoices: 1, stays: 1 });
  });
  it("tout l'ouvert : le filtre de statut change les chiffres affichés", () => {
    expect(counts("open")).toEqual({ care: 2, appointments: 2, reminders: 2, invoices: 2, stays: 2 });
  });
  it("une source illisible ne compte pas zéro", () => {
    expect(counts("late", { careUnavailable: true, remindersUnavailable: true })).toMatchObject({ care: null, reminders: null });
  });
  it("sans hospitalisation au cabinet, pas de carte Hospitalisés", () => {
    expect(Object.keys(counts("late", { hospitalization: false }))).toEqual(["care", "appointments", "reminders", "invoices"]);
  });
  it("chaque carte mène à la page où l'action se fait", () => {
    expect(buildMorningWatch({ ...base, status: "late" }).map((item) => item.view)).toEqual(["soins", "agenda", "taches", "finances", "soins"]);
  });
  it("la ligne des rendez-vous compte les absences du jour", () => {
    expect(buildMorningWatch({ ...base, status: "late" })[1].line).toBe("1 absence aujourd’hui");
  });
});
