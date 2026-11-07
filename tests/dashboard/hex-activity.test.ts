import { describe, expect, it } from "vitest";
import { buildActivityHeatmap, buildHourlyActivity } from "../../src/modules/dashboard/model/dashboard-widgets";
import { buildHexActivity, HEX_VIEWS, slotDetail } from "../../src/modules/dashboard/model/hex-activity";

// Saturday 7 November 2026, 12:30 : the week began on Monday 2 November.
const now = new Date(2026, 10, 7, 12, 30);
const at = (day: number, hour: number, minute = 0, month = 10) => new Date(2026, month, day, hour, minute).toISOString();
const appt = (startTime: string | null, status = "completed") => ({ startTime, status });

const list = [
  appt(at(2, 9)), appt(at(2, 9, 40)), appt(at(2, 14)),
  appt(at(6, 8, 15)), appt(at(7, 9)), appt(at(7, 9, 30)), appt(at(7, 15), "scheduled"),
  appt(at(8, 11), "scheduled"),
  appt(at(7, 10), "cancelled"), appt(at(7, 11), "no_show"),
  appt(at(20, 10), "scheduled"), appt(at(28, 13, 0, 9)), appt(null),
];

describe("rendez-vous par heure", () => {
  const h = buildHourlyActivity(list, now);
  it("compte aujourd'hui heure par heure, sans annulations ni absences", () => {
    expect(h.today[9]).toBe(2);
    expect(h.today[15]).toBe(1);
    expect(h.today[10]).toBe(0); // annulé
    expect(h.today[11]).toBe(0); // absent
    expect(h.today.reduce((n, v) => n + v, 0)).toBe(3);
  });
  it("répartit la semaine, lundi d'abord, par jour et par heure", () => {
    expect(h.week[0][9]).toBe(2); // lundi 2, 9 h
    expect(h.week[0][14]).toBe(1);
    expect(h.week[4][8]).toBe(1); // vendredi 6
    expect(h.week[5][9]).toBe(2); // samedi 7
    expect(h.week[6][11]).toBe(1); // dimanche 8, prévu
    expect(h.week.flat().reduce((n, v) => n + v, 0)).toBe(8);
  });
  it("une heure pleine appartient à l'heure qui commence, minuit à la nuit", () => {
    const edge = buildHourlyActivity([appt(at(7, 0)), appt(at(7, 23, 59)), appt(at(8, 0)), appt(at(1, 23, 59))], now);
    expect(edge.today[0]).toBe(1);
    expect(edge.today[23]).toBe(1);
    expect(edge.week[6][0]).toBe(1); // dimanche 8, 0 h : encore dans la semaine
    expect(edge.week.flat().reduce((n, v) => n + v, 0)).toBe(3); // le 1er (dimanche d'avant) n'y est pas
  });
});

describe("hexagones : quatre vues", () => {
  it("propose Jour, Semaine, Mois, Trimestre", () => {
    expect(HEX_VIEWS.map((v) => v.label)).toEqual(["Jour", "Semaine", "Mois", "Trimestre"]);
  });
  it("chaque vue place chaque cellule sur sa propre case de la grille", () => {
    for (const { value } of HEX_VIEWS) {
      const v = buildHexActivity(value, list, now);
      const seen = new Set(v.cells.map((c) => `${c.col}:${c.row}`));
      expect(seen.size).toBe(v.cells.length);
      for (const c of v.cells) { expect(c.col).toBeGreaterThanOrEqual(0); expect(c.col).toBeLessThan(v.cols); expect(c.row).toBeGreaterThanOrEqual(0); expect(c.row).toBeLessThan(v.rows); }
    }
  });

  describe("Jour : un hexagone par heure", () => {
    const v = buildHexActivity("day", list, now);
    it("vingt-quatre hexagones, deux rangées de douze, avec le compte de chaque heure", () => {
      expect(v.cells).toHaveLength(24);
      expect([v.cols, v.rows]).toEqual([12, 2]);
      expect(v.cells.find((c) => c.id === "h9")).toMatchObject({ count: 2, label: "09", col: 9, row: 0 });
      expect(v.cells.find((c) => c.id === "h15")).toMatchObject({ count: 1, col: 3, row: 1, future: true });
      expect(v.total).toBe(3);
    });
    it("l'heure en cours est marquée, les heures suivantes sont « à venir »", () => {
      expect(v.cells.filter((c) => c.today).map((c) => c.id)).toEqual(["h12"]);
      expect(v.cells.filter((c) => c.future).map((c) => c.id)[0]).toBe("h13");
    });
    it("les repères et le pied disent ce que le calendrier disait", () => {
      expect(v.stats.find((s) => s.key === "active")!.value).toBe("2 sur 13");
      expect(v.stats.find((s) => s.key === "busiest")!.value).toBe("09 h · 2");
      expect(v.footer).toBe("1 rendez-vous déjà prévu d’ici ce soir");
    });
  });

  describe("Semaine : une grille jours et heures", () => {
    const v = buildHexActivity("week", list, now);
    it("sept jours en colonnes, les heures de la journée de travail en rangées", () => {
      expect(v.cols).toBe(7);
      expect(v.rows).toBe(12); // 8 h à 19 h
      expect(v.cells).toHaveLength(7 * 12);
      expect(v.columnCaptions.map((c) => c.text)).toEqual(["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]);
      expect(v.rowCaptions[0].text).toBe("08 h");
    });
    it("la somme des cellules est le total de la semaine du calendrier, et chaque cellule est sa case", () => {
      const week = buildActivityHeatmap(list, "week", now);
      expect(v.cells.reduce((n, c) => n + c.count, 0)).toBe(week.total);
      expect(v.total).toBe(week.total);
      expect(v.cells.find((c) => c.id === "d0h9")).toMatchObject({ count: 2, col: 0, row: 1, label: "2" });
      expect(v.cells.find((c) => c.id === "d5h9")).toMatchObject({ count: 2 });
    });
    it("les heures s'étirent pour qu'aucun rendez-vous ne reste hors de la grille", () => {
      const early = buildHexActivity("week", [appt(at(3, 5)), appt(at(4, 22))], now);
      expect(early.cells.find((c) => c.id === "d1h5")?.count).toBe(1);
      expect(early.cells.find((c) => c.id === "d2h22")?.count).toBe(1);
      expect(early.cells.reduce((n, c) => n + c.count, 0)).toBe(2);
    });
    it("garde les repères du calendrier de la semaine", () => {
      const week = buildActivityHeatmap(list, "week", now);
      expect(v.stats[0].value).toBe(`${week.activeDays} sur ${week.elapsedDays}`);
      expect(v.footer).toBe("1 rendez-vous déjà prévu d’ici le 8 nov.");
    });
  });

  describe("Mois et Trimestre : un hexagone par jour", () => {
    it("novembre : trente cellules, chacune avec son compte, aujourd'hui marqué", () => {
      const v = buildHexActivity("month", list, now);
      expect(v.cells).toHaveLength(30);
      expect(v.cells.find((c) => c.id === "2026-11-07")).toMatchObject({ count: 3, today: true, label: "7" });
      expect(v.cells.find((c) => c.id === "2026-11-20")).toMatchObject({ count: 1, future: true });
      expect(v.cells.reduce((n, c) => n + c.count, 0)).toBe(buildActivityHeatmap(list, "month", now).total);
      expect(v.columnCaptions.map((c) => c.text)).toEqual(["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]);
    });
    it("un jour tombe sur sa colonne de semaine : le 1er novembre 2026 est un dimanche", () => {
      const v = buildHexActivity("month", list, now);
      expect(v.cells.find((c) => c.id === "2026-11-01")).toMatchObject({ col: 6, row: 0 });
      expect(v.cells.find((c) => c.id === "2026-11-02")).toMatchObject({ col: 0, row: 1 });
    });
    it("trimestre : trois mois côte à côte, chacun sous son nom, un hexagone par jour", () => {
      const v = buildHexActivity("quarter", list, now);
      expect(v.cells).toHaveLength(31 + 30 + 30); // septembre, octobre, novembre
      expect(v.columnCaptions.map((c) => c.text)).toEqual(["Septembre 2026", "Octobre 2026", "Novembre 2026"]);
      expect(v.cols).toBe(23);
      expect(v.cells.reduce((n, c) => n + c.count, 0)).toBe(buildActivityHeatmap(list, "quarter", now).total);
      expect(v.cells.find((c) => c.id === "2026-10-28")?.count).toBe(1);
    });
    it("février de 28 jours et mois de 31 jours", () => {
      const feb = buildHexActivity("month", [], new Date(2026, 1, 10));
      expect(feb.cells).toHaveLength(28);
      expect(buildHexActivity("month", [], new Date(2026, 9, 10)).cells).toHaveLength(31);
    });
  });

  it("sans aucun rendez-vous : des cellules vides, aucun NaN, un pied qui l'explique", () => {
    for (const { value } of HEX_VIEWS) {
      const v = buildHexActivity(value, [], now);
      expect(v.total).toBe(0);
      expect(v.cells.every((c) => c.count === 0 && c.level === 0)).toBe(true);
      expect(JSON.stringify(v)).not.toMatch(/NaN|Infinity/);
    }
    expect(buildHexActivity("month", [], now).footer).toBe("Rien de prévu d’ici le 30 nov.");
  });
  it("la légende donne une marche par rendez-vous jusqu'à quatre, comme avant", () => {
    const v = buildHexActivity("month", list, now);
    expect(v.legend.map((l) => l.level)).toEqual([0, 1, 2, 3, 4]);
    expect(v.cells.find((c) => c.id === "2026-11-07")!.level).toBe(3);
  });
  it("le détail d'une cellule : passé, futur, vide", () => {
    expect(slotDetail(2, false)).toBe("2 rendez-vous");
    expect(slotDetail(0, false)).toBe("Aucun rendez-vous");
    expect(slotDetail(1, true)).toBe("1 rendez-vous prévu");
    expect(slotDetail(0, true)).toBe("Rien de prévu");
  });
});
