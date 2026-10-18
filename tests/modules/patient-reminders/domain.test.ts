import { expect, it } from "vitest";
import { addCalendarMonths, assertDateOnly, assertReminderTransition, isReminderOverdue, localToday, medicalReminderTypeForAct, reminderTypesForSelect } from "../../../src/modules/patient-reminders/domain";
it("calcule les mois calendaires avec plafonnement et années bissextiles", () => {
 expect(addCalendarMonths("2026-01-31",1)).toBe("2026-02-28");
 expect(addCalendarMonths("2024-01-31",1)).toBe("2024-02-29");
 expect(addCalendarMonths("2024-02-29",12)).toBe("2025-02-28");
 expect(addCalendarMonths("2026-11-30",3)).toBe("2027-02-28");
});
it("refuse dates inexistantes et intervalles invalides", () => {
 expect(() => assertDateOnly("2026-02-30")).toThrow();
 for (const months of [0,-1,1.5,121]) expect(() => addCalendarMonths("2026-01-01",months)).toThrow();
});
it("calcule le retard uniquement pour les rappels en cours, après le jour d’échéance", () => {
 expect(isReminderOverdue("en_cours","2026-10-12","2026-10-12")).toBe(false);
 expect(isReminderOverdue("en_cours","2026-10-11","2026-10-12")).toBe(true);
 expect(isReminderOverdue("termine","2026-10-11","2026-10-12")).toBe(false);
 expect(isReminderOverdue("annule","2026-10-11","2026-10-12")).toBe(false);
});
it("exige un motif d’annulation et interdit de rouvrir les états terminaux", () => {
 expect(() => assertReminderTransition("en_cours","termine")).not.toThrow();
 expect(() => assertReminderTransition("en_cours","annule","Refus du propriétaire")).not.toThrow();
 expect(() => assertReminderTransition("en_cours","annule"," ")).toThrow();
 expect(() => assertReminderTransition("termine","en_cours")).toThrow();
 expect(() => assertReminderTransition("annule","termine")).toThrow();
});
it("reclasse une échéance au passage de minuit local", () => {
 expect(localToday(new Date(2026,9,12,23,59))).toBe("2026-10-12");
 expect(localToday(new Date(2026,9,13,0,1))).toBe("2026-10-13");
 expect(isReminderOverdue("en_cours","2026-10-12",localToday(new Date(2026,9,13,0,1)))).toBe(true);
});
it("reconnaît les actes préventifs explicites et ignore un contrôle ordinaire", () => {
 expect(medicalReminderTypeForAct("Vaccination annuelle")).toBe("vaccin");
 expect(medicalReminderTypeForAct("Administration du vermifuge")).toBe("vermifuge");
 expect(medicalReminderTypeForAct("Contrôle annuel")).toBe("controle_annuel");
 expect(medicalReminderTypeForAct("Soin dentaire : détartrage")).toBe("soin_dentaire");
 expect(medicalReminderTypeForAct("Contrôle de la température")).toBeNull();
 expect(medicalReminderTypeForAct("Chirurgie")).toBeNull();
});

it("propose Vaccin et Vermifuge une seule fois en privilégiant les types médicaux actuels", () => {
 const types = [
  { id: "vaccination", name: "Vaccin", active: 1 },
  { id: "vaccin", name: "Vaccin", active: 1 },
  { id: "vermifuge", name: "Vermifuge", active: 1 },
  { id: "antiparasitaire", name: "Vermifuge", active: 1 },
 ];
 expect(reminderTypesForSelect(types).map(type => type.id)).toEqual(["vaccin", "vermifuge"]);
 expect(types).toHaveLength(4);
});

it("regroupe aussi les anciens identifiants lorsque leurs libellés historiques diffèrent", () => {
 expect(reminderTypesForSelect([
  { id: "vaccination", name: "Vaccination", active: 1 },
  { id: "vaccin", name: "Vaccin", active: 1 },
  { id: "antiparasitaire", name: "Antiparasitaire", active: 1 },
  { id: "vermifuge", name: "Vermifuge", active: 1 },
 ]).map(type => type.name)).toEqual(["Vaccin", "Vermifuge"]);
});

it("conserve le type historique déjà sélectionné, même désactivé, sans changer l’identifiant du rappel", () => {
 const types = [
  { id: "vaccin", name: "Vaccin", active: 1 },
  { id: "vaccination", name: "Vaccin", active: 0 },
  { id: "inactif", name: "Ancien type", active: 0 },
 ];
 expect(reminderTypesForSelect(types, "vaccination")).toEqual([types[1]]);
 expect(reminderTypesForSelect(types)).toEqual([types[0]]);
});

it("préserve les types personnalisés distincts et un ancien type actif sans équivalent actuel", () => {
 const types = [
  { id: "vaccination", name: "Vaccin", active: 1 },
  { id: "vaccin", name: "Vaccin", active: 0 },
  { id: "custom", name: "Contrôle cardiaque", active: 1 },
  { id: "duplicate", name: "  CONTRÔLE   CARDIAQUE ", active: 1 },
  { id: "dentaire", name: "Contrôle dentaire", active: 1 },
 ];
 expect(reminderTypesForSelect(types).map(type => type.id)).toEqual(["vaccination", "custom", "dentaire"]);
});
