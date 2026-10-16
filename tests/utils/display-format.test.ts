import { describe, expect, it } from "vitest";
import {
  formatDinars,
  formatDisplayText,
  formatNumber,
  formatPhone,
} from "@/utils/display-format";
import { formatDZD, toCentimes } from "@/utils/currency";

describe("formatage partagé pour l’affichage", () => {
  it("groupe les montants avec des espaces insécables et la virgule française", () => {
    expect(formatNumber(19100)).toBe("19\u00a0100");
    expect(formatNumber(1287423.5, { minimumFractionDigits: 2 })).toBe(
      "1\u00a0287\u00a0423,50"
    );
    expect(formatDinars(19100.5)).toBe("19\u00a0100,5\u00a0DA");
    expect(formatDinars(0)).toBe("0\u00a0DA");
  });

  it("préserve les centimes et les règles d’arrondi existantes", () => {
    expect(formatDZD(1910050)).toBe(formatDinars(19100.5));
    expect(toCentimes(19100.5)).toBe(1910050);
    expect(formatDinars(19100.5, 0)).toBe("19\u00a0101\u00a0DA");
  });

  it.each([
    ["4354839332", "43 54 83 93 32"],
    ["0550100107", "05 50 10 01 07"],
    [" +213 (550) 100-107 ", "+213 5 50 10 01 07"],
    ["+33612345678", "+33 6 12 34 56 78"],
    ["+15145551234", "+1 51 45 55 12 34"],
    ["+212612345678", "+212 6 12 34 56 78"],
    ["+79123456789", "+7 91 23 45 67 89"],
  ])("rend le téléphone %s lisible sans changer ses chiffres", (raw, display) => {
    const formatted = formatPhone(raw);
    expect(formatted.replace(/\u00a0/g, " ")).toBe(display);
    expect(formatted.replace(/\D/g, "")).toBe(raw.replace(/\D/g, ""));
  });

  it.each([
    "+213",
    "+99912345678",
    "0550 poste 12",
    "( )",
  ])("conserve une valeur incomplète ou libre : %s", (raw) => {
    expect(formatPhone(raw)).toBe(raw);
  });

  it("gère les contacts absents", () => {
    expect(formatPhone(null)).toBe("");
    expect(formatPhone(undefined)).toBe("");
  });

  it("corrige uniquement les anciennes fautes ciblées à l’affichage", () => {
    expect(formatDisplayText("Brief equipe - aujourd’hui")).toBe(
      "Brief équipe - aujourd’hui"
    );
    expect(formatDisplayText("Vaccin trivalent felin")).toBe(
      "Vaccin trivalent félin"
    );
    expect(formatDisplayText("Appeler le proprietaire de Simba")).toBe(
      "Appeler le propriétaire de Simba"
    );
    expect(formatDisplayText("Compte-rendu clinique de Luna")).toBe(
      "Compte-rendu clinique de Luna"
    );
  });
});
