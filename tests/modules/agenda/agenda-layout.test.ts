import { describe, expect, it } from "vitest";
import { clock, fitHourPx, layoutDayEvents, MIN_BLOCK_MINUTES, slotAt, visibleHours } from "../../../src/modules/agenda/model/agenda-layout";

const day = new Date(2026, 10, 7);
const at = (h: number, m = 0, offset = 0) => new Date(2026, 10, 7 + offset, h, m).toISOString();
const ev = (id: string, start: string, end?: string | null) => ({ id, startTime: start, endTime: end });

describe("placement des rendez-vous d'une journée", () => {
  it("place un rendez-vous seul sur toute la largeur", () => {
    const [a] = layoutDayEvents([ev("a", at(9, 30), at(10, 15))], day);
    expect([a.start, a.end, a.column, a.columns]).toEqual([570, 615, 0, 1]);
  });
  it("met côte à côte deux rendez-vous qui se chevauchent et rend la largeur après", () => {
    const placed = layoutDayEvents([ev("a", at(9), at(10)), ev("b", at(9, 30), at(10, 30)), ev("c", at(11), at(12))], day);
    const byId = Object.fromEntries(placed.map((p) => [p.item.id, p]));
    expect([byId.a.column, byId.a.columns]).toEqual([0, 2]);
    expect([byId.b.column, byId.b.columns]).toEqual([1, 2]);
    expect([byId.c.column, byId.c.columns]).toEqual([0, 1]);
  });
  it("réutilise une colonne libérée dans un même groupe de chevauchements", () => {
    // a 9-12 ; b 9-10 ; c 10-11 : c passe sous b, dans la colonne 1, et le groupe garde 2 colonnes.
    const placed = layoutDayEvents([ev("a", at(9), at(12)), ev("b", at(9), at(10)), ev("c", at(10), at(11))], day);
    const byId = Object.fromEntries(placed.map((p) => [p.item.id, p]));
    expect([byId.b.column, byId.c.column]).toEqual([1, 1]);
    expect(placed.every((p) => p.columns === 2)).toBe(true);
  });
  it("traite vingt rendez-vous simultanés sans en perdre ni les superposer", () => {
    const many = Array.from({ length: 20 }, (_, i) => ev(`r${i}`, at(9), at(10)));
    const placed = layoutDayEvents(many, day);
    expect(placed).toHaveLength(20);
    expect(new Set(placed.map((p) => p.column)).size).toBe(20);
    expect(placed.every((p) => p.columns === 20)).toBe(true);
  });
  it("des rendez-vous bout à bout ne se chevauchent pas", () => {
    const placed = layoutDayEvents([ev("a", at(9), at(10)), ev("b", at(10), at(11))], day);
    expect(placed.map((p) => p.columns)).toEqual([1, 1]);
  });
  it("donne un bloc minimal à une durée nulle, absente ou inversée", () => {
    for (const end of [at(9), null, undefined, at(8)]) {
      const [p] = layoutDayEvents([ev("a", at(9), end)], day);
      expect(p.end - p.start).toBe(MIN_BLOCK_MINUTES);
    }
  });
  it("groupe selon la place réellement occupée : un bloc court dessiné sur son voisin se place à côté", () => {
    // 14:00 pendant 5 min et 14:25 : bout à bout avec 20 min de bloc minimal, mais recouverts à l'écran avec 28 min.
    const near = [ev("dora", at(14), at(14, 5)), ev("autre", at(14, 25), at(15))];
    expect(layoutDayEvents(near, day).map((p) => p.columns)).toEqual([1, 1]);
    const placed = layoutDayEvents(near, day, 28);
    expect(placed.map((p) => p.columns)).toEqual([2, 2]);
    expect(placed.map((p) => p.column).sort()).toEqual([0, 1]);
    expect(placed.find((p) => p.item.id === "dora")!.end - 840).toBe(28);
  });
  it("coupe à minuit un rendez-vous qui le dépasse et reprend à minuit celui de la veille", () => {
    const [late] = layoutDayEvents([ev("late", at(23), at(1, 0, 1))], day);
    expect(late.end).toBe(1440);
    const [early] = layoutDayEvents([ev("early", at(22, 0, -1), at(1))], day);
    expect([early.start, early.end]).toEqual([0, 60]);
  });
  it("ignore un début illisible ou un rendez-vous d'un autre jour", () => {
    expect(layoutDayEvents([ev("x", "pas une date", at(10))], day)).toEqual([]);
    expect(layoutDayEvents([ev("y", at(9, 0, 1), at(10, 0, 1))], day)).toEqual([]);
    expect(layoutDayEvents([], day)).toEqual([]);
  });
  it("garde les journées de 23 et 25 heures au changement d'heure à l'intérieur de 0–1440", () => {
    for (const d of [new Date(2026, 2, 29), new Date(2026, 9, 25)]) {
      const placed = layoutDayEvents([ev("a", new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12).toISOString(), new Date(d.getFullYear(), d.getMonth(), d.getDate(), 13).toISOString())], d);
      expect(placed[0].start).toBe(720);
      expect(placed[0].end).toBe(780);
    }
  });
});

describe("heures affichées et créneau cliqué", () => {
  it("affiche la journée de travail par défaut et s'étire pour ne rien cacher", () => {
    expect(visibleHours([])).toEqual({ from: 7, to: 20 });
    expect(visibleHours([{ start: 5 * 60 + 30, end: 6 * 60 }, { start: 21 * 60, end: 22 * 60 + 10 }])).toEqual({ from: 5, to: 23 });
    expect(visibleHours([{ start: 23 * 60, end: 1440 }])).toEqual({ from: 7, to: 24 });
  });
  it("écrit les minutes en heures, 24:00 compris", () => {
    expect([clock(0), clock(570), clock(1440), clock(2000), clock(-5)]).toEqual(["00:00", "09:30", "24:00", "24:00", "00:00"]);
  });
  it("arrondit le clic au créneau en dessous et le garde sur la grille", () => {
    expect(slotAt(0, 56, 7, 20)).toBe(420);
    expect(slotAt(56 + 40, 56, 7, 20)).toBe(8 * 60 + 30);
    expect(slotAt(-50, 56, 7, 20)).toBe(420);
    expect(slotAt(99999, 56, 7, 20)).toBe(20 * 60 - 30);
  });
});

describe("tous les rendez-vous tiennent dans la grille", () => {
  it("couvre de 6 h à 20 h quand les rendez-vous vont de 6 h à 20 h", () => {
    const placed = layoutDayEvents([ev("tot", at(6), at(6, 30)), ev("tard", at(19, 30), at(20))], day);
    expect(visibleHours(placed)).toEqual({ from: 6, to: 20 });
  });
  it("garde chaque rendez-vous, même le plus tôt ou le plus tard, entre les heures affichées", () => {
    const items = [ev("a", at(4, 15), at(4, 20)), ev("b", at(23, 50), at(23, 55)), ev("c", at(12), at(13))];
    const placed = layoutDayEvents(items, day);
    const { from, to } = visibleHours(placed);
    for (const p of placed) {
      expect(p.start).toBeGreaterThanOrEqual(from * 60);
      expect(p.end).toBeLessThanOrEqual(to * 60);
    }
  });
  it("ajuste la hauteur de l'heure à la place disponible, entre un plancher et un plafond", () => {
    expect(fitHourPx(700, 14, 40, 64)).toBe(50);
    expect(fitHourPx(700, 6, 40, 64)).toBe(64);
    expect(fitHourPx(700, 24, 40, 64)).toBe(40);
    expect(fitHourPx(700, 0, 40, 64)).toBe(64);
  });
});

import { layoutTimeGrid, ROW_PX } from "../../../src/modules/agenda/model/agenda-layout";

describe("axe du temps élastique : l'heure s'étend pour tout montrer", () => {
  const opts = { fromHour: 7, toHour: 20, hourPx: 52 };
  const crowd = (n: number, startMin = 0, spacing = 5, dur = 5) =>
    Array.from({ length: n }, (_, i) => ev(`r${i}`, at(13, startMin + i * spacing), at(13, startMin + i * spacing + dur)));
  const grid = (items: ReturnType<typeof ev>[][]) => layoutTimeGrid(items.map((d) => layoutDayEvents(d, day, 28)), opts);

  it("garde l'heure à sa hauteur de base quand rien ne la surcharge", () => {
    const g = grid([[ev("a", at(9), at(10)), ev("b", at(13), at(14))]]);
    expect(g.heights.every((h) => h === 52)).toBe(true);
    expect(g.total).toBe(13 * 52);
  });
  it("étend l'heure de 13 h à 14 h pour dix rendez-vous : tous entiers, sans recouvrement", () => {
    const g = grid([crowd(10)]);
    const blocks = g.days[0];
    expect(blocks).toHaveLength(10);
    expect(blocks.every((b) => b.stacked && b.columns === 1 && b.height >= 24)).toBe(true);
    const tops = blocks.map((b) => b.top).sort((a, b) => a - b);
    for (let i = 1; i < tops.length; i += 1) expect(tops[i] - tops[i - 1]).toBeGreaterThanOrEqual(ROW_PX);
    // Chaque bloc reste dans la grille.
    expect(Math.max(...blocks.map((b) => b.top + b.height))).toBeLessThanOrEqual(g.total);
    // L'heure grandit, les autres non.
    expect(g.heights[13 - 7]).toBeGreaterThan(52);
    expect(g.heights[9 - 7]).toBe(52);
  });
  it("tient pour six, huit ou dix rendez-vous simultanés, sans rien perdre", () => {
    for (const n of [6, 8, 10, 25]) {
      const same = Array.from({ length: n }, (_, i) => ev(`s${i}`, at(13), at(14)));
      const g = grid([same]);
      expect(g.days[0]).toHaveLength(n);
      const tops = g.days[0].map((b) => b.top).sort((a, b) => a - b);
      expect(new Set(tops).size).toBe(n);
      expect(g.yAt(14 * 60) - g.yAt(13 * 60)).toBeGreaterThanOrEqual(n * ROW_PX - 1);
    }
  });
  it("garde le côte à côte pour deux rendez-vous qui se chevauchent", () => {
    const g = grid([[ev("a", at(9), at(10)), ev("b", at(9, 30), at(10, 30))]]);
    expect(g.days[0].every((b) => !b.stacked && b.columns === 2)).toBe(true);
  });
  it("partage l'heure agrandie entre tous les jours de la semaine", () => {
    const g = grid([crowd(10), [ev("seul", at(13, 30), at(14))]]);
    const lone = g.days[1][0];
    expect(g.heights[13 - 7]).toBeGreaterThan(52);
    // Le rendez-vous isolé suit le temps : 13:30 est au milieu de l'heure agrandie.
    expect(lone.top).toBeCloseTo(g.yAt(13 * 60 + 30), 5);
    expect(lone.top - g.offsets[13 - 7]).toBeCloseTo(g.heights[13 - 7] / 2, 5);
  });
  it("étend aussi une heure creuse après une heure chargée sans décaler les rendez-vous suivants", () => {
    const g = grid([[...crowd(10), ev("apres", at(15), at(16))]]);
    const after = g.days[0].find((b) => b.item.id === "apres")!;
    expect(after.top).toBeCloseTo(g.yAt(15 * 60), 5);
    expect(after.top).toBeGreaterThan(g.yAt(14 * 60) - 1);
  });
  it("empile deux salves de rendez-vous dans la même heure", () => {
    const g = grid([[...crowd(8, 0, 2, 2), ...Array.from({ length: 8 }, (_, i) => ev(`t${i}`, at(13, 30 + i * 2), at(13, 30 + i * 2 + 2)))]]);
    const tops = g.days[0].map((b) => b.top).sort((a, b) => a - b);
    expect(new Set(tops).size).toBe(16);
    for (let i = 1; i < tops.length; i += 1) expect(tops[i] - tops[i - 1]).toBeGreaterThanOrEqual(ROW_PX);
  });
  it("retrouve la minute sous un clic, grille élastique comprise", () => {
    const g = grid([crowd(10)]);
    const mid = g.offsets[13 - 7] + g.heights[13 - 7] / 2;
    expect(Math.round(g.minuteAt(mid))).toBe(13 * 60 + 30);
    expect(g.minuteAt(-20)).toBe(7 * 60);
  });
  it("dessine un rendez-vous de 5 minutes sur une ligne, sans lui prêter la fin du bloc minimal", () => {
    // Heure 14 agrandie par une salve de dix : le bloc court ne grandit pas avec elle.
    const g = grid([[...crowd(10), ev("court", at(14, 30), at(14, 35))]]);
    const short = g.days[0].find((b) => b.item.id === "court")!;
    expect(short.end - short.start).toBe(5);
    expect(short.height).toBeGreaterThanOrEqual(22);
    expect(short.height).toBeLessThan(40);
  });
  it("donne une durée par défaut à un rendez-vous sans fin lisible", () => {
    const g = grid([[ev("sans", at(9), null)]]);
    expect(g.days[0][0].end - g.days[0][0].start).toBe(20);
  });
});
