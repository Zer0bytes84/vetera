import { describe, expect, it } from "vitest";
import { admissionDateTime } from "../../../src/modules/hospitalizations/stays/admission-date";
describe("Date d’admission choisie dans le calendrier", () => {
  it("conserve le jour choisi et l’heure locale, sans l’heure précédente du calendrier", () => {
    const result = admissionDateTime(new Date(2026, 9, 14, 23, 59), "14:30");
    expect(result).toBe(new Date(2026, 9, 14, 14, 30).toISOString());
  });
  it("accepte minuit et la dernière minute de la journée", () => {
    const day = new Date(2026, 9, 13);
    expect(admissionDateTime(day, "00:00")).toBe(new Date(2026, 9, 13).toISOString());
    expect(admissionDateTime(day, "23:59")).toBe(new Date(2026, 9, 13, 23, 59).toISOString());
  });
  it("refuse les sélections absentes, invalides et les heures incomplètes", () => {
    expect(admissionDateTime(undefined, "14:30")).toBeNull();
    expect(admissionDateTime(new Date("invalid"), "14:30")).toBeNull();
    for (const time of ["", "12:30 PM", "24:00", "14:60", "14:", "9:30"]) expect(admissionDateTime(new Date(), time)).toBeNull();
  });
});
