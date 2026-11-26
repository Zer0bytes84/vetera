import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  KpiConsultationsCadence,
  KpiIncomeSplineWave,
  KpiReceivablesGauge,
  KpiSpeciesDistribution,
} from "../../../src/modules/dashboard/v2/kpi-visuals";

describe("KPI visual components", () => {
  describe("KpiConsultationsCadence", () => {
    it("renders 7-day cadence bars with proper aria-label and caption", () => {
      const html = renderToStaticMarkup(
        <KpiConsultationsCadence
          change={25}
          completed={2}
          labels={["Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam.", "Dim."]}
          total={3}
          values={[1, 2, 0, 4, 3, 5, 2]}
        />
      );

      expect(html).toContain("Cadence des consultations");
      expect(html).toContain("2/3 honorées");
      expect(html).toContain("+25 %");
      expect(html).toContain("kpi-bar-slot");
    });
  });

  describe("KpiIncomeSplineWave", () => {
    it("renders spline curve wave with positive change badge", () => {
      const html = renderToStaticMarkup(
        <KpiIncomeSplineWave
          change={18}
          labels={[
            "1 oct.",
            "2 oct.",
            "3 oct.",
            "4 oct.",
            "5 oct.",
            "6 oct.",
            "7 oct.",
          ]}
          values={[10_000, 15_000, 20_000, 18_000, 25_000, 30_000, 37_500]}
        />
      );

      expect(html).toContain("Courbe des encaissements");
      expect(html).toContain("Flux 7 derniers jours");
      expect(html).toContain("+18 %");
      expect(html).toContain("kpi-spline-svg");
    });
  });

  describe("KpiSpeciesDistribution", () => {
    it("renders segmented species breakdown with animal chips", () => {
      const html = renderToStaticMarkup(
        <KpiSpeciesDistribution
          speciesEntries={[
            ["Chien", 8],
            ["Chat", 1],
            ["Lapin", 1],
          ]}
          totalPatients={10}
        />
      );

      expect(html).toContain("Répartition des espèces");
      expect(html).toContain("chiens");
      expect(html).toContain("(80 %)");
      expect(html).toContain("kpi-species-track");
    });

    it("handles empty patient list gracefully", () => {
      const html = renderToStaticMarkup(
        <KpiSpeciesDistribution speciesEntries={[]} totalPatients={0} />
      );
      expect(html).toContain("Aucun patient enregistré");
    });
  });

  describe("KpiReceivablesGauge", () => {
    it("renders full recovery gauge when waiting amount is 0", () => {
      const html = renderToStaticMarkup(
        <KpiReceivablesGauge
          periodPaid={3_750_000}
          waitingAmount={0}
          waitingCount={0}
        />
      );

      expect(html).toContain("100 % à jour");
      expect(html).toContain("Aucun impayé en attente");
      expect(html).toContain("kpi-gauge-ring-wrap");
    });

    it("renders warning status when waiting amount is greater than 0", () => {
      const html = renderToStaticMarkup(
        <KpiReceivablesGauge
          periodPaid={3_500_000}
          waitingAmount={1_500_000}
          waitingCount={2}
        />
      );

      expect(html).toContain("2 soldes à suivre");
      expect(html).toContain("à recouvrer");
      expect(html).toContain("kpi-gauge-ring-wrap");
    });
  });
});
