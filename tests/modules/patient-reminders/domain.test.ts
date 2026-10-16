import { expect, it } from "vitest";
import { addCalendarMonths, assertDateOnly, assertReminderTransition, isReminderOverdue } from "../../../src/modules/patient-reminders/domain";
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
 expect(isReminderOverdue("traite","2026-10-11","2026-10-12")).toBe(false);
 expect(isReminderOverdue("annule","2026-10-11","2026-10-12")).toBe(false);
});
it("exige un motif d’annulation et interdit de rouvrir les états terminaux", () => {
 expect(() => assertReminderTransition("en_cours","traite")).not.toThrow();
 expect(() => assertReminderTransition("en_cours","annule","Refus du propriétaire")).not.toThrow();
 expect(() => assertReminderTransition("en_cours","annule"," ")).toThrow();
 expect(() => assertReminderTransition("traite","en_cours")).toThrow();
 expect(() => assertReminderTransition("annule","traite")).toThrow();
});
