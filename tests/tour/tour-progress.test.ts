import { describe, expect, it } from "vitest";
import { reviewedSoapContent } from "../../src/modules/consultations/local-ai/soap-review";
import { evaluateStep, storedInstantMs, type TourSnapshot } from "../../src/modules/tour/tour-progress";
import { advanceTour, FRESH_TOUR_STATE, startTour, type TourState } from "../../src/modules/tour/tour-state";

const START = new Date("2026-11-12T10:00:00.000Z");
const BEFORE = "2026-11-12T09:00:00.000Z";
const AFTER = "2026-11-12T10:05:00.000Z";
const empty: TourSnapshot = { patients: [], appointments: [], soaps: [], invoices: [], invoicesKnown: true };
const at = (step: number, over: Partial<TourState> = {}): TourState => ({ ...startTour(FRESH_TOUR_STATE, START), step, ...over });
const note = { subjective: "Boite", objective: "T 38,5", assessment: "Entorse", plan: "Repos" };
const reviewed = (reviewedAtIso: string, over: Record<string, unknown> = {}) => {
  const content = JSON.parse(reviewedSoapContent(note, "{}", "u1"));
  content.soapReview.reviewedAt = reviewedAtIso;
  return { ...note, aiDraft: null, appointmentId: "a1", patientId: "p1", content: JSON.stringify(content), ...over };
};

describe("tour guidé : les horodatages stockés", () => {
  it("SQLite sans fuseau est de l'UTC, quel que soit le fuseau de la machine", () => {
    expect(storedInstantMs("2026-11-12 14:03:11")).toBe(Date.UTC(2026, 10, 12, 14, 3, 11));
    expect(storedInstantMs("2026-11-12 14:03:11.250")).toBe(Date.UTC(2026, 10, 12, 14, 3, 11, 250));
  });
  it("une ISO avec fuseau est lue telle quelle", () => {
    expect(storedInstantMs("2026-11-12T14:03:11.000Z")).toBe(Date.UTC(2026, 10, 12, 14, 3, 11));
    expect(storedInstantMs("2026-11-12T15:03:11+01:00")).toBe(Date.UTC(2026, 10, 12, 14, 3, 11));
  });
  it.each([undefined, null, 5, "", "hier", {}])("%s : pas un instant", (value) => {
    expect(storedInstantMs(value)).toBeNull();
  });
});

describe("tour guidé : l'étape est-elle réellement faite ?", () => {
  it("rien tant qu'aucun tour ne tourne", () => {
    expect(evaluateStep(FRESH_TOUR_STATE, { ...empty, patients: [{ id: "p", ownerId: "o", createdAt: AFTER }] }).done).toBe(false);
    expect(evaluateStep({ ...at(0), status: "quit" }, { ...empty, patients: [{ id: "p", ownerId: "o", createdAt: AFTER }] }).done).toBe(false);
  });

  describe("étape 1 : le dossier patient", () => {
    it("un patient créé après le départ", () => {
      const out = evaluateStep(at(0), { ...empty, patients: [{ id: "p1", ownerId: "o1", createdAt: AFTER }] });
      expect(out).toEqual({ done: true, patientId: "p1" });
    });
    it("un patient d'avant le départ ne compte pas (installation existante)", () => {
      expect(evaluateStep(at(0), { ...empty, patients: [{ id: "old", ownerId: "o", createdAt: BEFORE }] }).done).toBe(false);
    });
    it("un dossier archivé ne compte pas", () => {
      expect(evaluateStep(at(0), { ...empty, patients: [{ id: "p", ownerId: "o", createdAt: AFTER, archivedAt: AFTER }] }).done).toBe(false);
    });
    it("l'horodatage SQLite sans fuseau est bien placé après le départ", () => {
      expect(evaluateStep(at(0), { ...empty, patients: [{ id: "p", ownerId: "o", createdAt: "2026-11-12 10:05:00" }] }).done).toBe(true);
      expect(evaluateStep(at(0), { ...empty, patients: [{ id: "p", ownerId: "o", createdAt: "2026-11-12 09:55:00" }] }).done).toBe(false);
    });
    it("un horodatage illisible ne compte jamais", () => {
      expect(evaluateStep(at(0), { ...empty, patients: [{ id: "p", ownerId: "o", createdAt: "bientôt" }] }).done).toBe(false);
    });
    it("retient le premier créé", () => {
      const out = evaluateStep(at(0), { ...empty, patients: [{ id: "late", ownerId: "o", createdAt: "2026-11-12T11:00:00Z" }, { id: "first", ownerId: "o", createdAt: AFTER }] });
      expect(out.patientId).toBe("first");
    });
  });

  describe("étape 2 : le rendez-vous", () => {
    const patients = [{ id: "p1", ownerId: "o1", createdAt: AFTER }];
    it("un rendez-vous créé après le départ pour le patient du tour", () => {
      const out = evaluateStep(at(1, { patientId: "p1" }), { ...empty, patients, appointments: [{ id: "a1", patientId: "p1", createdAt: AFTER, status: "scheduled" }] });
      expect(out).toMatchObject({ done: true, appointmentId: "a1" });
    });
    it("celui d'un autre patient ne compte pas quand le patient du tour existe", () => {
      expect(evaluateStep(at(1, { patientId: "p1" }), { ...empty, patients, appointments: [{ id: "a9", patientId: "autre", createdAt: AFTER, status: "scheduled" }] }).done).toBe(false);
    });
    it("un rendez-vous annulé ou d'avant le départ ne compte pas", () => {
      const rows = [{ id: "a1", patientId: "p1", createdAt: AFTER, status: "cancelled" }, { id: "a2", patientId: "p1", createdAt: BEFORE, status: "scheduled" }];
      expect(evaluateStep(at(1, { patientId: "p1" }), { ...empty, patients, appointments: rows }).done).toBe(false);
    });
    it("patient du tour supprimé en route : on ne bloque pas, n'importe quel rendez-vous neuf compte", () => {
      const out = evaluateStep(at(1, { patientId: "disparu" }), { ...empty, appointments: [{ id: "a1", patientId: "p7", createdAt: AFTER, status: "scheduled" }] });
      expect(out).toMatchObject({ done: true, appointmentId: "a1", patientId: "p7" });
    });
    it("étape 1 passée : aucun patient connu, le rendez-vous neuf d'un patient quelconque compte", () => {
      expect(evaluateStep(at(1), { ...empty, appointments: [{ id: "a1", patientId: "p7", createdAt: AFTER, status: "scheduled" }] }).done).toBe(true);
    });
  });

  describe("étape 3 : la consultation validée", () => {
    const patients = [{ id: "p1", ownerId: "o1", createdAt: AFTER }];
    it("une note validée après le départ pour le patient du tour", () => {
      const out = evaluateStep(at(2, { patientId: "p1" }), { ...empty, patients, soaps: [reviewed(AFTER)] });
      expect(out).toMatchObject({ done: true, appointmentId: "a1" });
    });
    it("une note écrite mais pas validée ne compte pas", () => {
      expect(evaluateStep(at(2, { patientId: "p1" }), { ...empty, patients, soaps: [{ ...note, aiDraft: null, appointmentId: "a1", patientId: "p1", content: "{}" }] }).done).toBe(false);
    });
    it("un brouillon généré (aiDraft) ne compte pas, même marqué validé", () => {
      expect(evaluateStep(at(2, { patientId: "p1" }), { ...empty, patients, soaps: [reviewed(AFTER, { aiDraft: "{}" })] }).done).toBe(false);
    });
    it("une note validée avant le départ ne compte pas", () => {
      expect(evaluateStep(at(2, { patientId: "p1" }), { ...empty, patients, soaps: [reviewed(BEFORE)] }).done).toBe(false);
    });
    it("une note modifiée après sa validation n'est plus validée", () => {
      expect(evaluateStep(at(2, { patientId: "p1" }), { ...empty, patients, soaps: [reviewed(AFTER, { plan: "Autre plan" })] }).done).toBe(false);
    });
    it("la note d'un autre patient ne compte pas", () => {
      expect(evaluateStep(at(2, { patientId: "p1" }), { ...empty, patients, soaps: [reviewed(AFTER, { patientId: "autre" })] }).done).toBe(false);
    });
    it("une date de validation absente ou fausse ne compte pas", () => {
      const content = JSON.stringify({ soapReview: { reviewedAt: "plus tard", sourceKey: "x" } });
      expect(evaluateStep(at(2, { patientId: "p1" }), { ...empty, patients, soaps: [{ ...reviewed(AFTER), content }] }).done).toBe(false);
    });
  });

  describe("étape 4 : la facture payée", () => {
    const patients = [{ id: "p1", ownerId: "o1", createdAt: AFTER }];
    const invoice = (over = {}) => ({ id: "i1", patientId: "p1", ownerId: "o1", createdAt: AFTER, completedPaymentAmount: 5000, ...over });
    it("une facture émise après le départ, avec un paiement enregistré", () => {
      expect(evaluateStep(at(3, { patientId: "p1" }), { ...empty, patients, invoices: [invoice()] }).done).toBe(true);
    });
    it("à l'ordre du propriétaire seulement : compte aussi", () => {
      expect(evaluateStep(at(3, { patientId: "p1" }), { ...empty, patients, invoices: [invoice({ patientId: null })] }).done).toBe(true);
    });
    it("émise mais pas payée : pas faite, et le tour le sait (geste à moitié fait)", () => {
      expect(evaluateStep(at(3, { patientId: "p1" }), { ...empty, patients, invoices: [invoice({ completedPaymentAmount: 0 })] })).toEqual({ done: false, partial: true });
      expect(evaluateStep(at(3, { patientId: "p1" }), { ...empty, patients, invoices: [invoice({ createdAt: BEFORE, completedPaymentAmount: 0 })] }).partial).toBeUndefined();
    });
    it("sans paiement, d'avant le départ, ou d'un autre client : ne compte pas", () => {
      expect(evaluateStep(at(3, { patientId: "p1" }), { ...empty, patients, invoices: [invoice({ completedPaymentAmount: 0 })] }).done).toBe(false);
      expect(evaluateStep(at(3, { patientId: "p1" }), { ...empty, patients, invoices: [invoice({ createdAt: BEFORE })] }).done).toBe(false);
      expect(evaluateStep(at(3, { patientId: "p1" }), { ...empty, patients, invoices: [invoice({ patientId: "x", ownerId: "o9" })] }).done).toBe(false);
    });
    it("sans facturation connue (navigateur, erreur de lecture), jamais faite d'office", () => {
      expect(evaluateStep(at(3, { patientId: "p1" }), { ...empty, patients, invoices: [invoice()], invoicesKnown: false }).done).toBe(false);
    });
  });

  it("l'ordre est tenu : on n'évalue que l'étape en cours, mais des actions déjà faites s'enchaînent", () => {
    const snapshot: TourSnapshot = {
      ...empty,
      patients: [{ id: "p1", ownerId: "o1", createdAt: AFTER }],
      appointments: [{ id: "a1", patientId: "p1", createdAt: AFTER, status: "scheduled" }],
    };
    let state = at(0);
    const seen: number[] = [];
    for (let guard = 0; guard < 6; guard++) {
      const out = evaluateStep(state, snapshot);
      if (!out.done) break;
      seen.push(state.step);
      state = advanceTour(state, out);
    }
    expect(seen).toEqual([0, 1]);
    expect(state).toMatchObject({ step: 2, status: "running", patientId: "p1", appointmentId: "a1" });
  });

  it("la note d'un rendez-vous fait avant le tour n'avance pas l'étape 3 d'un tour qui vient de commencer", () => {
    const early = { ...empty, soaps: [reviewed(BEFORE)] };
    expect(evaluateStep(at(2), early).done).toBe(false);
  });
});
