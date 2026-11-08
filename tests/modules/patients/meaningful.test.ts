import { describe, expect, it } from "vitest";
import { meaningful } from "@/modules/patients/lib/meaningful";
import { visitReason } from "@/modules/patients/lib/visit-reason";

describe("champs de texte du dossier : jamais « Na » devant un vétérinaire", () => {
  it("vide les valeurs de remplissage, quelle que soit leur écriture", () => {
    for (const filler of ["Na", "na", "NA", "N/A", "n.a.", "N.A", "nd", "N/D", "néant", "Néant.", "-", "—", "…", "null", "  na  ", "Aucun", "?"]) {
      expect(meaningful(filler), filler).toBe("");
    }
    expect(meaningful(undefined)).toBe("");
    expect(meaningful(null)).toBe("");
    expect(meaningful("   ")).toBe("");
  });
  it("garde le vrai contenu, y compris quand il commence comme un remplissage", () => {
    expect(meaningful("  Otite chronique ")).toBe("Otite chronique");
    expect(meaningful("Nausées après repas")).toBe("Nausées après repas");
    expect(meaningful("Na+ 142 mmol/L")).toBe("Na+ 142 mmol/L");
    expect(meaningful("Contrôle à 15 jours")).toBe("Contrôle à 15 jours");
  });
  it("le motif d'une visite ne montre pas « Na » : titre généré ou rien", () => {
    const apt = (reason: string, title = "") => ({ reason, title }) as never;
    expect(visitReason(apt("Na"), "Rex")).toBe("");
    expect(visitReason(apt("N/A", "Rex - Consultation"), "Rex")).toBe("");
    expect(visitReason(apt("Boiterie"), "Rex")).toBe("Boiterie");
    expect(visitReason(apt("", "Suivi"), "Rex")).toBe("Suivi");
  });
});
