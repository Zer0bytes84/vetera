import { describe, expect, it } from "vitest";
import { seriesChange, type FocusPoint } from "../../src/modules/dashboard/components/focus-trend-chart";
import { buildKindsDonut, buildRevenueChart, changeText, compactMoney, count, money } from "../../src/modules/dashboard/model/revenue-chart";
import { buildVisitKinds } from "../../src/modules/dashboard/model/dashboard-widgets";
import { formatNumber } from "../../src/utils/display-format";

const point = (label: string, receipts: number, visits: number, previousReceipts?: number, previousVisits?: number): FocusPoint => ({
  label,
  long: `long ${label}`,
  receipts,
  visits,
  previousReceipts,
  previousVisits,
});

describe("chiffres du graphique : ceux que le graphique a toujours affichés", () => {
  const points = [point("1 oct.", 100, 1, 50, 2), point("2 oct.", 300, 3, 50, 2), point("3 oct.", 0, 0, 0, 0)];
  const model = buildRevenueChart(points);

  it("totalise recettes et consultations, et celles de la période précédente", () => {
    expect(model.totals).toEqual({ receipts: 400, visits: 4, previousReceipts: 100, previousVisits: 4 });
  });
  it("calcule les variations avec la même fonction qu'avant (seriesChange)", () => {
    expect(model.changes.receipts).toBe(seriesChange(400, 100, true));
    expect(model.changes.receipts).toBe(300);
    expect(model.changes.visits).toBe(0);
  });
  it("écrit la variation comme avant : « +203,4 % contre 8 800 DA la période précédente »", () => {
    expect(changeText(203.4, money(8800))).toBe(`+203,4 % contre ${formatNumber(8800)} DA la période précédente`);
    expect(changeText(-12.5, "3")).toBe("-12,5 % contre 3 la période précédente");
    expect(changeText(0, "4")).toBe("0 % contre 4 la période précédente");
    expect(changeText(null, "x")).toBe("Pas de période précédente comparable");
  });
  it("sans période précédente comparable (base nulle), le dit au lieu d'un pourcentage", () => {
    const m = buildRevenueChart([point("a", 10, 1, 0, 0)]);
    expect(m.changes.receipts).toBeNull();
    expect(m.series[0].detail).toBe("Pas de période précédente comparable");
  });
  it("sans aucune donnée de comparaison, aucune variation ni note", () => {
    const m = buildRevenueChart([point("a", 10, 1)]);
    expect(m.changes).toEqual({ receipts: null, visits: null });
    expect(m.note(0)).toBeUndefined();
  });
  it("la note de survol est celle d'avant : « Période précédente : 0 DA · 0 »", () => {
    expect(model.note(2)).toBe(`Période précédente : ${money(0)} · 0`);
    expect(model.note(0)).toBe(`Période précédente : ${money(50)} · 2`);
    expect(model.note(99)).toBeUndefined();
  });
  it("recettes sur l'échelle de droite en bleu, consultations sur celle de gauche en sarcelle avec un repère par jour", () => {
    const [receipts, visits] = model.series;
    expect([receipts.axis, receipts.color]).toEqual(["right", "var(--chart-blue)"]);
    expect([visits.axis, visits.color, visits.markers]).toEqual(["left", "var(--chart-teal)", true]);
    expect(visits.detail).toBe("4 · 0 % contre 4 la période précédente");
  });
  it("garde une valeur par point, dans l'ordre, avec le titre long pour la bulle", () => {
    expect(model.receipts).toEqual([100, 300, 0]);
    expect(model.visits).toEqual([1, 3, 0]);
    expect(model.titles).toEqual(["long 1 oct.", "long 2 oct.", "long 3 oct."]);
  });
  it("tient sans aucun point", () => {
    const m = buildRevenueChart([]);
    expect(m.totals).toEqual({ receipts: 0, visits: 0, previousReceipts: 0, previousVisits: 0 });
    expect(m.series[0].values).toEqual([]);
  });
  it("formate à la française : 1 consultation, 2 consultations, 15 000 → 15 k", () => {
    expect(count(1)).toMatch(/^1 consultation$/);
    expect(count(2)).toMatch(/consultations$/);
    expect(count(0)).toMatch(/^0 consultation$/);
    expect(compactMoney(15000)).toBe(`${formatNumber(15, { maximumFractionDigits: 1 })} k`);
    expect(compactMoney(950)).toBe(formatNumber(950));
  });
});

describe("répartition des consultations par type d'acte", () => {
  const kinds = buildVisitKinds([{ type: "Consultation" }, { type: "Consultation" }, { type: "Vaccin" }, { type: "Urgence" }, { type: "Radiologie" }, {}]);
  const donut = buildKindsDonut(kinds);

  it("une part par type, avec son nombre de consultations, dont le total est celui des consultations", () => {
    expect(donut.reduce((n, s) => n + s.values[0], 0)).toBe(6);
    expect(donut.find((s) => s.id === "consultation")?.values).toEqual([3]);
  });
  it("chaque type connu garde sa couleur d'agenda, un type inconnu une couleur de secours", () => {
    expect(donut.find((s) => s.id === "vaccin")?.color).toBe("var(--tone-blue)");
    expect(donut.find((s) => s.id === "urgence")?.color).toBe("var(--tone-amber)");
    expect(donut.find((s) => s.id === "radiologie")?.color).toMatch(/^var\(--tone-/);
  });
  it("le détail donne le nombre et la part, comme la carte Consultations", () => {
    for (const row of kinds) expect(donut.find((s) => s.id === row.key)?.detail).toBe(`${formatNumber(row.count)} · ${row.share} %`);
    expect(kinds.reduce((n, row) => n + row.share, 0)).toBe(100);
  });
  it("sans consultation, aucune part", () => {
    expect(buildKindsDonut([])).toEqual([]);
  });
});
