import { describe, expect, it, vi } from "vitest";
import { advanceTour, closeInvitation, FRESH_TOUR_STATE, showInvitation, startTour, TOUR_STORAGE_KEY } from "../../src/modules/tour/tour-state";
import { createTourStore } from "../../src/modules/tour/tour-store";

function memory(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return { data, getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), removeItem: (k: string) => void data.delete(k) };
}
const NOW = new Date("2026-11-12T10:00:00.000Z");

describe("tour guidé : le magasin par poste", () => {
  it("une installation neuve : rien d'écrit tant que rien ne change", () => {
    const storage = memory();
    const store = createTourStore(storage);
    expect(store.get()).toEqual(FRESH_TOUR_STATE);
    expect(storage.data.has(TOUR_STORAGE_KEY)).toBe(false);
    expect(store.isWritable()).toBe(true);
  });

  it("l'invitation montrée est retenue pour le lancement suivant, qui ne la montre plus", () => {
    const storage = memory();
    const first = createTourStore(storage);
    first.markInvitationShown();
    first.update(showInvitation);
    const second = createTourStore(storage);
    expect(second.get().invitation).toBe("shown");
    expect(second.invitationShownThisSession()).toBe(false);
  });

  it("fermer, démarrer, quitter se retrouvent au lancement suivant", () => {
    const storage = memory();
    const store = createTourStore(storage);
    store.update((s) => closeInvitation(showInvitation(s)));
    expect(createTourStore(storage).get().invitation).toBe("closed");
    store.update((s) => startTour(s, NOW));
    store.update((s) => advanceTour(s, { patientId: "p1" }));
    expect(createTourStore(storage).get()).toMatchObject({ status: "running", step: 1, patientId: "p1" });
  });

  it("une transition sans effet n'écrit rien et ne prévient personne", () => {
    const storage = memory();
    const store = createTourStore(storage);
    const listener = vi.fn();
    store.subscribe(listener);
    store.update((s) => s);
    expect(listener).not.toHaveBeenCalled();
    expect(storage.data.size).toBe(0);
  });

  it("une autre fenêtre change le tour : reload() le suit", () => {
    const storage = memory();
    const store = createTourStore(storage);
    storage.setItem(TOUR_STORAGE_KEY, JSON.stringify({ ...startTour(FRESH_TOUR_STATE, NOW), step: 2 }));
    store.reload();
    expect(store.get()).toMatchObject({ status: "running", step: 2 });
  });

  it("la carte de fin ne se garde jamais", () => {
    const storage = memory();
    const store = createTourStore(storage);
    store.markFinished(true);
    expect(store.justFinished()).toBe(true);
    expect(createTourStore(storage).justFinished()).toBe(false);
  });

  describe("équipe rouge : le stockage se dérobe", () => {
    it("lecture impossible : fermée, non inscriptible, aucune exception", () => {
      const boom = () => { throw new Error("denied"); };
      const store = createTourStore({ getItem: boom, setItem: boom, removeItem: boom });
      expect(store.get().invitation).toBe("closed");
      expect(store.isWritable()).toBe(false);
      expect(() => store.update((s) => startTour(s, NOW))).not.toThrow();
      expect(store.get().status).toBe("running");
    });
    it("écriture impossible (quota) : pas d'invitation, mais le tour lancé à la main marche en mémoire", () => {
      const storage = memory();
      storage.setItem = () => { throw new Error("quota"); };
      const store = createTourStore(storage);
      expect(store.isWritable()).toBe(false);
      store.update((s) => startTour(s, NOW));
      expect(store.get().status).toBe("running");
    });
    it("pas de stockage du tout : fermée", () => {
      expect(createTourStore(null).get().invitation).toBe("closed");
    });
    it("un enregistrement corrompu n'est pas réécrit à la lecture, seulement à la première vraie transition", () => {
      const storage = memory({ [TOUR_STORAGE_KEY]: "{oops" });
      const store = createTourStore(storage);
      expect(storage.getItem(TOUR_STORAGE_KEY)).toBe("{oops");
      store.update((s) => startTour(s, NOW));
      expect(JSON.parse(storage.getItem(TOUR_STORAGE_KEY)!).status).toBe("running");
    });
  });
});
