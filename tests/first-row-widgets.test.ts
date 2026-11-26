import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cssText } from "./helpers/code-text";

const INDICATORS_INSET_SHADOW =
  /patient-record-indicators[^{]*\{[^}]*inset 1px 0 0/;

/**
 * The first rows of widgets, on every page, follow the dashboard's finish, which is the reference: no hairline, no
 * shadow, the contrast of fills alone, a 6 px frame and concentric radii (band 22, cards 16). A shadow rule given to every
 * panel in Clean (2ff09f6, 13 November) drew a 0.5 px ring on the cards of every row but the dashboard's and Rappels',
 * which cancelled it locally; the record's and Flux's rows were built otherwise. The browser measurement lives in
 * docs/recus/2026-11-19/premieres-rangees/; these checks keep the rules in place.
 */
// The stylesheets are read without their layout: a formatter may split a selector or a value over several lines.
const clean = cssText(readFileSync("src/design-system/clean.css", "utf8"));
const record = cssText(
  readFileSync("src/modules/patients/patient-record-blocks.css", "utf8")
);
const flux = cssText(
  readFileSync("src/modules/flow-board/flow-board.css", "utf8")
);
const statGrid = readFileSync("src/components/ui/stat-grid.tsx", "utf8");

const rule = (css: string, selector: string) => {
  const start = css.indexOf(`${selector} {`);
  expect(start, selector).toBeGreaterThanOrEqual(0);
  return css.slice(start, css.indexOf("}", start));
};

describe("premières rangées de widgets : la finition du Tableau de bord partout", () => {
  it("les cartes de toute rangée StatGrid n'ont pas d'ombre en Clean, et la règle vient après l'ombre générale des panneaux", () => {
    expect(statGrid).toContain('data-slot="stat-grid"');
    const general = clean.indexOf(
      ':root[data-skin="clean"] [data-slot="panel"] {'
    );
    const cards = clean.indexOf(
      ':root[data-skin="clean"] [data-slot="stat-grid"] [data-slot="panel"] {'
    );
    expect(general).toBeGreaterThanOrEqual(0);
    expect(cards).toBeGreaterThan(general);
    expect(
      rule(
        clean,
        ':root[data-skin="clean"] [data-slot="stat-grid"] [data-slot="panel"]'
      )
    ).toContain("box-shadow: none");
  });

  it("la fiche patient : quatre cartes séparées par le cadre de la bande, sans filet", () => {
    const grid = rule(
      record,
      "html:root:root:root:root:root .patient-record-page .patient-record-indicators"
    );
    expect(grid).toContain("gap: var(--card-frame) !important");
    expect(grid).toContain("box-shadow: none !important");
    expect(grid).toContain("background: transparent !important");
    const card = rule(
      record,
      "html:root:root:root:root:root .patient-record-page .patient-record-indicators :is(.patient-context-card, .medical-kpi)"
    );
    expect(card).toContain("border-radius: var(--radius-panel) !important");
    expect(card).toContain("background: var(--card-inset) !important");
    expect(card).toContain("box-shadow: none !important");
    expect(record).not.toMatch(INDICATORS_INSET_SHADOW);
  });

  it("Flux, journée sans visite : une bande grise à cadre de 6 px, des cartes sans filet", () => {
    const band = rule(
      flux,
      ':root[data-skin="clean"] .flow-board-page .flow-quiet'
    );
    expect(band).toContain("gap: var(--card-frame)");
    expect(band).toContain("background: var(--card-band)");
    expect(band).toContain("padding: var(--card-frame)");
    expect(band).toContain(
      "border-radius: calc(var(--radius-panel) + var(--card-frame))"
    );
    const cell = rule(
      flux,
      ':root[data-skin="clean"] .flow-board-page .flow-quiet-cell'
    );
    expect(cell).toContain("background: var(--card-inset)");
    expect(cell).toContain("box-shadow: none");
    expect(cell).not.toContain("--shadow-hairline");
  });
});
