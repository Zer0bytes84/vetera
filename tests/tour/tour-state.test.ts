import { describe, expect, it } from "vitest";
import {
  advanceTour,
  closeInvitation,
  FRESH_TOUR_STATE,
  invitationVisible,
  parseTourState,
  quitTour,
  serializeTourState,
  showInvitation,
  startTour,
  TOUR_STEP_IDS,
  UNREADABLE_TOUR_STATE,
  type TourState,
} from "../../src/modules/tour/tour-state";

const NOW = new Date("2026-11-12T10:00:00.000Z");
const running = (over: Partial<TourState> = {}): TourState => ({ ...startTour(FRESH_TOUR_STATE, NOW), ...over });

describe("tour guidé : l'état", () => {
  it("quatre étapes, dans l'ordre du circuit, sans soins ni hospitalisation", () => {
    expect([...TOUR_STEP_IDS]).toEqual(["patient", "appointment", "consultation", "invoice"]);
  });

  it("une installation sans historique n'a rien vu, rien commencé", () => {
    expect(parseTourState(null)).toEqual({ invitation: "unseen", status: "idle", step: 0, startedAt: null, patientId: null, appointmentId: null });
  });

  it("l'invitation se montre une fois, se ferme pour de bon, et démarrer la ferme aussi", () => {
    const shown = showInvitation(FRESH_TOUR_STATE);
    expect(shown.invitation).toBe("shown");
    expect(showInvitation(shown)).toBe(shown);
    expect(closeInvitation(shown).invitation).toBe("closed");
    expect(showInvitation(closeInvitation(shown)).invitation).toBe("closed");
    expect(startTour(shown, NOW).invitation).toBe("closed");
  });

  it("démarrer remet à zéro : étape 1, heure de départ, aucun repère hérité", () => {
    const old = running({ step: 3, patientId: "p1", appointmentId: "a1" });
    const again = startTour(old, new Date("2026-12-01T08:00:00.000Z"));
    expect(again).toEqual({ invitation: "closed", status: "running", step: 0, startedAt: "2026-12-01T08:00:00.000Z", patientId: null, appointmentId: null });
  });

  it("avance étape par étape, retient les repères, et se termine après la quatrième", () => {
    let state = running();
    state = advanceTour(state, { patientId: "p1" });
    expect(state).toMatchObject({ step: 1, patientId: "p1", status: "running" });
    state = advanceTour(state, { appointmentId: "a1" });
    expect(state).toMatchObject({ step: 2, patientId: "p1", appointmentId: "a1" });
    state = advanceTour(state);
    state = advanceTour(state);
    expect(state.status).toBe("done");
    expect(state.step).toBe(TOUR_STEP_IDS.length - 1);
    expect(advanceTour(state)).toBe(state);
  });

  it("quitter ne touche à rien d'autre ; quitter ou avancer hors tour ne fait rien", () => {
    const state = running({ step: 2, patientId: "p1" });
    expect(quitTour(state)).toEqual({ ...state, status: "quit" });
    expect(advanceTour(quitTour(state))).toEqual({ ...state, status: "quit" });
    expect(quitTour(FRESH_TOUR_STATE)).toBe(FRESH_TOUR_STATE);
    expect(advanceTour(FRESH_TOUR_STATE)).toBe(FRESH_TOUR_STATE);
  });

  it("s'enregistre et se relit à l'identique", () => {
    const state = running({ step: 1, patientId: "p1" });
    expect(parseTourState(serializeTourState(state))).toEqual(state);
  });
});

describe("tour guidé : qui voit l'invitation", () => {
  const ok = { writable: true, shownThisSession: false };
  it("première fois : oui ; fermée, commencée, terminée ou quittée : jamais", () => {
    expect(invitationVisible(FRESH_TOUR_STATE, ok)).toBe(true);
    expect(invitationVisible(closeInvitation(FRESH_TOUR_STATE), { ...ok, shownThisSession: true })).toBe(false);
    for (const status of ["running", "done", "quit"] as const) {
      expect(invitationVisible({ ...FRESH_TOUR_STATE, status }, ok)).toBe(false);
      expect(invitationVisible({ ...FRESH_TOUR_STATE, invitation: "shown", status }, { ...ok, shownThisSession: true })).toBe(false);
    }
  });
  it("montrée au lancement précédent : ne revient pas ; encore dans la même session : reste jusqu'à fermeture", () => {
    const shown = showInvitation(FRESH_TOUR_STATE);
    expect(invitationVisible(shown, { writable: true, shownThisSession: false })).toBe(false);
    expect(invitationVisible(shown, { writable: true, shownThisSession: true })).toBe(true);
  });
  it("sans stockage inscriptible, pas d'invitation (elle reviendrait à chaque lancement)", () => {
    expect(invitationVisible(FRESH_TOUR_STATE, { writable: false, shownThisSession: false })).toBe(false);
  });
});

describe("équipe rouge : un enregistrement hostile ne casse rien et ne relance personne", () => {
  it.each([
    ["JSON invalide", "{oops"],
    ["chaîne vide", ""],
    ["null", "null"],
    ["tableau", "[]"],
    ["nombre", "42"],
    ["chaîne JSON", '"running"'],
  ])("%s : illisible, donc fermée", (_name, raw) => {
    expect(parseTourState(raw)).toEqual(UNREADABLE_TOUR_STATE);
    expect(invitationVisible(parseTourState(raw), { writable: true, shownThisSession: true })).toBe(false);
  });

  it("valeurs inconnues ou hors limites : retombent sur le défaut champ par champ", () => {
    const state = parseTourState(JSON.stringify({ invitation: "maybe", status: "exploded", step: 99, startedAt: "demain", patientId: { x: 1 }, appointmentId: 7 }));
    expect(state).toEqual({ invitation: "closed", status: "idle", step: 3, startedAt: null, patientId: null, appointmentId: null });
    expect(parseTourState(JSON.stringify({ status: "idle", step: -5 })).step).toBe(0);
    expect(parseTourState(JSON.stringify({ status: "idle", step: 1.5 })).step).toBe(0);
    expect(parseTourState(JSON.stringify({ status: "idle", step: "2" })).step).toBe(0);
  });

  it("un statut inconnu rend l'enregistrement douteux : l'invitation ne revient pas, même « jamais montrée »", () => {
    const state = parseTourState(JSON.stringify({ status: "exploded", invitation: "unseen", step: 0 }));
    expect(state.invitation).toBe("closed");
    expect(invitationVisible(state, { writable: true, shownThisSession: true })).toBe(false);
  });

  it("un tour « en cours » sans heure de départ valable est tenu pour quitté, pas laissé bloqué", () => {
    expect(parseTourState(JSON.stringify({ status: "running", step: 1, startedAt: "n'importe quoi" })).status).toBe("quit");
    expect(parseTourState(JSON.stringify({ status: "running", step: 1 })).status).toBe("quit");
  });

  it("un tour terminé ou quitté ne rouvre pas l'invitation, même si l'enregistrement dit « unseen »", () => {
    for (const status of ["done", "quit"]) {
      const state = parseTourState(JSON.stringify({ invitation: "unseen", status, step: 3, startedAt: NOW.toISOString() }));
      expect(state.invitation).toBe("closed");
      expect(invitationVisible(state, { writable: true, shownThisSession: true })).toBe(false);
    }
  });

  it("__proto__ et clés inattendues sont ignorés", () => {
    const state = parseTourState('{"__proto__":{"status":"running"},"status":"idle","extra":1}');
    expect(state.status).toBe("idle");
    expect(Object.keys(state).sort()).toEqual(["appointmentId", "invitation", "patientId", "startedAt", "status", "step"]);
  });

  it("des identifiants démesurés sont écartés", () => {
    expect(parseTourState(JSON.stringify({ status: "idle", patientId: "x".repeat(500) })).patientId).toBeNull();
  });
});
