import { describe, expect, it } from "vitest";
import {
  boardMove,
  buildFlowBoard,
  durationLabel,
  minutesSince,
  patientAlerts,
  PLANNED,
  PRIMARY_ACTION,
  walkInFor,
} from "@/modules/flow-board/model";
import type { VisitFlowBoardState } from "@/modules/visit-flow/store";
import type { Appointment, Owner, Patient, User, Vaccination } from "@/types/db";

const now = new Date("2026-10-20T10:20:00");
const at = (time: string, day = "2026-10-20") => new Date(`${day}T${time}:00`).toISOString();

const owner: Owner = { createdAt: at("08:00"), firstName: "Amina", id: "o1", lastName: "Haddad", phone: "" };
const vets: User[] = [
  { createdAt: at("08:00"), displayName: "Dr Karim", email: "k@c.dz", id: "karim", role: "admin", status: "active" } as User,
  { createdAt: at("08:00"), displayName: "Dr Sara", email: "s@c.dz", id: "sara", role: "admin", status: "active" } as User,
];
const patient = (id: string, extra: Partial<Patient> = {}): Patient => ({
  createdAt: at("08:00"),
  id,
  name: id,
  ownerId: "o1",
  sex: "M",
  species: "Chien",
  status: "sante",
  ...extra,
});
const visit = (id: string, status: Appointment["status"], start = at("10:00"), extra: Partial<Appointment> = {}): Appointment => ({
  createdAt: at("08:00"),
  endTime: start,
  id,
  ownerId: "o1",
  patientId: id,
  startTime: start,
  status,
  title: id,
  type: "Consultation",
  vetId: "karim",
  ...extra,
});
const state = (appointmentId: string, stage: VisitFlowBoardState["stage"], since: string | null, extra: Partial<VisitFlowBoardState> = {}): VisitFlowBoardState => ({
  appointmentId,
  arrivedAt: since,
  care: stage === "care",
  stage,
  stageSince: since,
  status: "arrived",
  version: 1,
  ...extra,
});

function board(appointments: Appointment[], states: VisitFlowBoardState[], extra: { patients?: Patient[]; vaccinations?: Vaccination[]; vetId?: string } = {}) {
  return buildFlowBoard({
    appointments,
    now,
    owners: [owner],
    patients: extra.patients ?? appointments.map((a) => patient(a.patientId)),
    states,
    users: vets,
    vaccinations: extra.vaccinations ?? [],
    vetId: extra.vetId,
  });
}

describe("tableau de flux", () => {
  it("met directement en Attente trois patients arrivés à 10h00, le plus ancien d'abord", () => {
    const appointments = ["Rex", "Nika", "Milo"].map((name) => visit(name, "arrived"));
    const result = board(appointments, [
      state("Rex", "waiting", at("10:02")),
      state("Nika", "waiting", at("10:00")),
      state("Milo", "waiting", at("10:01")),
    ]);
    expect(result.lanes.waiting.map((card) => card.patientName)).toEqual(["Nika", "Milo", "Rex"]);
    expect(PRIMARY_ACTION.waiting).toMatchObject({ label: "Faire entrer", to: "consultation" });
    // Arrival goes straight to the waiting room: no "mettre en attente" step.
    expect(PRIMARY_ACTION[PLANNED]).toMatchObject({ label: "Arrivé", to: "waiting" });
    expect(boardMove(PLANNED, "waiting")).toEqual({ kind: "status", status: "arrived" });
  });

  it("range chaque visite du jour dans sa colonne, les urgences en tête", () => {
    const result = board(
      [
        visit("prevu", "scheduled", at("11:00")),
        visit("attente", "waiting"),
        visit("urgence", "arrived", at("10:30"), { type: "Urgence" }),
        visit("consult", "in_progress"),
        visit("soins", "in_progress"),
        visit("facture", "completed"),
        visit("fini", "completed"),
        visit("annule", "cancelled"),
      ],
      [
        state("attente", "waiting", at("09:50")),
        state("urgence", "waiting", at("10:15")),
        state("consult", "consultation", at("10:05")),
        state("soins", "care", at("10:10")),
        state("facture", "billing", at("10:12")),
        state("fini", "done", at("10:14")),
        state("annule", null, null),
      ]
    );
    expect(Object.fromEntries(Object.entries(result.lanes).map(([lane, cards]) => [lane, cards.map((c) => c.appointmentId)]))).toEqual({
      planned: ["prevu"],
      waiting: ["urgence", "attente"],
      consultation: ["consult"],
      care: ["soins"],
      billing: ["facture"],
      done: ["fini"],
    });
  });

  it("garde hors des colonnes les visites d'autres jours, et montre celles restées ouvertes, les plus anciennes d'abord", () => {
    const result = board(
      [
        visit("hier", "in_progress", at("15:00", "2026-10-19")),
        visit("juillet", "waiting", at("09:00", "2026-07-09")),
        visit("ancien", "completed", at("15:00", "2026-07-01")),
        visit("prevu-hier", "scheduled", at("15:00", "2026-10-19")),
      ],
      [state("hier", "consultation", null), state("juillet", "waiting", null), state("ancien", "billing", null), state("prevu-hier", null, null)]
    );
    expect(Object.values(result.lanes).flat()).toEqual([]);
    expect(result.leftOpen.map((card) => [card.appointmentId, card.lane])).toEqual([
      ["juillet", "waiting"],
      ["hier", "consultation"],
    ]);
  });

  it("cherche dans le patient, le propriétaire, le motif, l'espèce et le vétérinaire, sans tenir compte des accents", () => {
    const appointments = [visit("Rex", "arrived", at("10:00"), { reason: "Boiterie antérieure" }), visit("Nika", "arrived")];
    const states = [state("Rex", "waiting", at("10:00")), state("Nika", "waiting", at("10:00"))];
    const names = (query: string) =>
      buildFlowBoard({ appointments, now, owners: [owner], patients: appointments.map((a) => patient(a.patientId)), states, users: vets, vaccinations: [], query })
        .lanes.waiting.map((card) => card.patientName);
    expect(names("anterieure")).toEqual(["Rex"]);
    expect(names("haddad nika")).toEqual(["Nika"]);
    expect(names("karim")).toEqual(["Rex", "Nika"]);
    expect(names("chat")).toEqual([]);
    expect(names("  ")).toEqual(["Rex", "Nika"]);
  });

  it("filtre par vétérinaire", () => {
    const result = board([visit("a", "arrived"), visit("b", "arrived", at("10:00"), { vetId: "sara" })], [
      state("a", "waiting", at("10:00")),
      state("b", "waiting", at("10:00")),
    ], { vetId: "sara" });
    expect(result.lanes.waiting.map((card) => [card.patientName, card.vetName])).toEqual([["b", "Dr Sara"]]);
  });
});

describe("alertes des cartes", () => {
  it("classe allergie, morsure puis vaccin en retard, et cite la source", () => {
    const alerts = patientAlerts(
      patient("Rex", { allergies: "Pénicilline", generalNotes: "Très stressé chez le véto. Mord à la manipulation des pattes." }),
      [{ administeredAt: "2025-09-01", createdAt: "2025-09-01", id: "v", nextDueAt: "2026-09-01", patientId: "Rex", updatedAt: "2025-09-01", vaccineName: "Rage" }],
      now
    );
    expect(alerts.map((alert) => alert.kind)).toEqual(["allergy", "bite", "vaccine"]);
    expect(alerts[1].detail).toBe("D'après le dossier : « Mord à la manipulation des pattes. »");
    expect(alerts[2]).toMatchObject({ label: "Vaccin en retard", detail: "Rage" });
  });

  it("n'invente rien : « aucune » n'est pas une allergie, un dossier vide n'a pas d'alerte", () => {
    expect(patientAlerts(patient("Nika", { allergies: "Aucune connue" }), [], now)).toEqual([]);
    expect(patientAlerts(patient("Milo", { allergies: "RAS", generalNotes: "Chien calme et joueur." }), [], now)).toEqual([]);
    expect(patientAlerts(patient("Kiki", { chronicConditions: "Agressif avec les autres chats" }), [], now)[0]?.kind).toBe("bite");
  });
});

describe("arrivée sans rendez-vous", () => {
  it("ne double pas un patient déjà là, fait arriver un patient attendu, sinon crée la visite", () => {
    const rdv = [
      visit("deja", "waiting"),
      visit("attendu", "scheduled", at("11:30")),
      visit("attendu-tot", "confirmed", at("09:30"), { patientId: "attendu" }),
      visit("hier", "scheduled", at("10:00", "2026-10-19"), { patientId: "nouveau" }),
    ];
    expect(walkInFor("deja", rdv, now)).toMatchObject({ kind: "already-here", appointment: { id: "deja" } });
    expect(walkInFor("attendu", rdv, now)).toMatchObject({ kind: "booked", appointment: { id: "attendu-tot" } });
    expect(walkInFor("nouveau", rdv, now)).toEqual({ kind: "new" });
  });
});

describe("déplacements", () => {
  it("n'autorise que les pas sûrs, et explique les autres", () => {
    expect(boardMove("waiting", "consultation")).toEqual({ kind: "status", status: "in_progress" });
    expect(boardMove("consultation", "care")).toEqual({ kind: "care", care: true });
    expect(boardMove("care", "consultation")).toEqual({ kind: "care", care: false });
    expect(boardMove("consultation", "billing")).toEqual({ kind: "close" });
    expect(boardMove("care", "billing")).toEqual({ kind: "close" });
    expect(boardMove("billing", "done")).toEqual({ refused: expect.stringContaining("réglée") });
    expect(boardMove("consultation", "waiting")).toEqual({ refused: expect.stringContaining("Annuler") });
    expect(boardMove("waiting", "waiting")).toBeNull();
    expect(PRIMARY_ACTION.billing).toMatchObject({ label: "Facturer" });
  });

  it("affiche des durées lisibles", () => {
    expect(minutesSince(at("10:02"), now)).toBe(18);
    expect(minutesSince(null, now)).toBeNull();
    expect([0, 18, 60, 95].map(durationLabel)).toEqual(["à l'instant", "18 min", "1 h", "1 h 35"]);
  });
});
