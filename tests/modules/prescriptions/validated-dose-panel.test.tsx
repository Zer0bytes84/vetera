import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ValidatedDosePanel } from "@/modules/prescriptions/components/validated-dose-panel";

/** The prescription line's reference dose: the dose and the reference's warning word for word, or why there is none. */
describe("panneau de la dose de référence validée", () => {
  it("la dose pour le poids, son calcul, la voie, la fréquence, la durée, la mise en garde mot pour mot, la validation, la source", () => {
    const html = renderToStaticMarkup(
      <ValidatedDosePanel
        medicationId="acide-tolfenamique"
        species="chat"
        weightKg={4}
      />
    );
    expect(html).toContain("Dose de référence validée");
    expect(html).toContain("16 mg");
    expect(html).toContain("4 mg/kg × 4 kg");
    expect(html).toContain("SC/PO");
    expect(html).toContain(
      "1x/jour (PO) ; injection SC renouvelable 48 h après"
    );
    expect(html).toContain("3 jours (PO)");
    expect(html).toContain(
      "Ne pas utiliser la voie intramusculaire chez le chat."
    );
    expect(html).toContain("Relue par Aïssa");
    expect(html).toContain("Sources : RCP TOLFEDINE 40 MG/ML");
    expect(html).toContain("RCP TOLFEDINE 6 MG COMPRIMES CHATS-PETITS CHIENS");
  });

  it("hors de la tranche de poids : pas de dose, la raison et le texte de la référence", () => {
    const html = renderToStaticMarkup(
      <ValidatedDosePanel
        medicationId="nitenpyrame"
        species="chien"
        weightKg={25}
      />
    );
    expect(html).toContain("Pas de dose de référence pour ce cas");
    expect(html).toContain("« par animal de 1 à 11 kg »");
    // No computed dose; the reference may still quote its tablet (« 1 comprimé de 11,4 mg … ») in its own warning.
    expect(html).not.toContain("validated-dose-value");
    expect(html).toContain("1 comprimé de 11,4 mg par animal de 1 à 11 kg");
    expect(html).toContain("Texte de la référence : « 11.4 mg »");
  });

  it("une dose que la référence n'écrit pas en nombre est citée, jamais calculée", () => {
    const html = renderToStaticMarkup(
      <ValidatedDosePanel
        medicationId="atipamezole"
        species="chien"
        weightKg={10}
      />
    );
    expect(html).toContain("5 fois la dose de médétomidine");
    expect(html).toContain("Pas de dose de référence pour ce cas");
  });

  it("une molécule hors de la référence : rien de nouveau à l'écran", () => {
    expect(
      renderToStaticMarkup(
        <ValidatedDosePanel
          medicationId="meloxicam"
          species="chien"
          weightKg={10}
        />
      )
    ).toBe("");
  });
});

describe("corrections de l'équipe rouge (19 novembre)", () => {
  it("un refus n'est jamais nommé « validée » pour un lecteur d'écran, et chaque panneau porte sa molécule", () => {
    const html = renderToStaticMarkup(
      <ValidatedDosePanel
        medicationId="nitenpyrame"
        species="chat"
        weightKg={12}
      />
    );
    expect(html).toMatch(/aria-label="Pas de dose de référence : [^"]+"/);
    expect(html).not.toContain('aria-label="Dose de référence validée');
    expect(html).toContain("ne vient pas de cette référence");
  });
  it("les très petites doses gardent leurs trois décimales", () => {
    expect(
      renderToStaticMarkup(
        <ValidatedDosePanel
          medicationId="loperamide"
          species="chien"
          weightKg={0.3}
        />
      )
    ).toContain("0,028 mg");
  });
});
