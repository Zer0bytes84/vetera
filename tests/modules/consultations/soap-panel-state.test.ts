import { describe, expect, it } from "vitest";
import { isSoapAutosaveDue, isSoapUnsaved } from "../../../src/modules/consultations/soap-panel-state";

/** Les deux formules d'origine, recopiées telles qu'elles étaient dans le composant avant la correction du lint. */
type P = Parameters<typeof isSoapUnsaved>[2];
const keys = ["subjective", "objective", "assessment", "plan"] as const;
const hasNote = (p: P) => keys.some((k) => String((p as unknown as Record<string, string>)[k]).trim());
const same = (a: P | null, b: P) => a !== null && JSON.stringify(a) === JSON.stringify(b);
const oldDirty = (initialised: boolean, lastSaved: P | null, payload: P) => initialised && !same(lastSaved, payload) && (hasNote(payload) || !!lastSaved);
const oldDue = (initialised: boolean, assistantOpen: boolean, saveStatus: string, lastSaved: P | null, payload: P) =>
  !(!initialised || assistantOpen || saveStatus === "saving" || saveStatus === "error" || (!hasNote(payload) && !lastSaved) || same(lastSaved, payload));

const base = { subjective: "", objective: "", assessment: "", plan: "", transcript: "", aiDraft: null, aiConfidence: null, content: "{}", templateVersion: "1.0" } as unknown as P;
const withText = (text: string) => ({ ...base, subjective: text }) as P;
const payloads: P[] = [base, withText("toux"), withText("toux depuis 3 jours"), withText("   ")];
const saveds: (P | null)[] = [null, base, withText("toux")];
const statuses = ["idle", "pending", "saving", "saved", "error"] as const;

describe("note SOAP : l'indicateur « modifié » et la sauvegarde automatique, avant et après", () => {
  it("l'indicateur « modifié » est identique à l'ancienne formule sur toutes les combinaisons", () => {
    let n = 0;
    for (const initialised of [false, true]) for (const saved of saveds) for (const payload of payloads) {
      expect(isSoapUnsaved(initialised, saved, payload)).toBe(oldDirty(initialised, saved, payload));
      n++;
    }
    expect(n).toBe(2 * saveds.length * payloads.length);
  });

  it("la sauvegarde automatique est due exactement quand l'ancien effet y arrivait", () => {
    for (const initialised of [false, true]) for (const assistantOpen of [false, true]) for (const saveStatus of statuses)
      for (const saved of saveds) for (const payload of payloads)
        expect(isSoapAutosaveDue({ initialised, assistantOpen, saveStatus, saved, payload })).toBe(oldDue(initialised, assistantOpen, saveStatus, saved, payload));
  });

  it("cas cliniques de référence", () => {
    // Note vide jamais enregistrée : rien à sauvegarder, pas « modifiée ».
    expect(isSoapUnsaved(true, null, base)).toBe(false);
    expect(isSoapAutosaveDue({ initialised: true, assistantOpen: false, saveStatus: "idle", saved: null, payload: base })).toBe(false);
    // Première saisie : modifiée, sauvegarde due.
    expect(isSoapUnsaved(true, null, withText("toux"))).toBe(true);
    expect(isSoapAutosaveDue({ initialised: true, assistantOpen: false, saveStatus: "idle", saved: null, payload: withText("toux") })).toBe(true);
    // Enregistrée puis inchangée : propre. Pendant l'assistant ou un enregistrement : jamais due.
    expect(isSoapUnsaved(true, withText("toux"), withText("toux"))).toBe(false);
    expect(isSoapAutosaveDue({ initialised: true, assistantOpen: true, saveStatus: "idle", saved: null, payload: withText("toux") })).toBe(false);
    expect(isSoapAutosaveDue({ initialised: true, assistantOpen: false, saveStatus: "saving", saved: null, payload: withText("toux") })).toBe(false);
  });
});
