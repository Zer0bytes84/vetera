import { describe, expect, it } from "vitest";
import { bookingHours, buildFreeSlots } from "../../src/modules/dashboard/model/free-slots";

// Lundi 9 novembre 2026, 10:10.
const now = new Date(2026, 10, 9, 10, 10);
const at = (day: number, h: number, m = 0) => new Date(2026, 10, day, h, m).toISOString();
const visit = (day: number, h: number, m: number, minutes: number, vetId = "v1", status = "scheduled") => ({
  startTime: at(day, h, m),
  endTime: at(day, h, m + minutes),
  status: status as "scheduled",
  vetId,
});
const window = { from: 9, to: 12, basis: "bookings" as const };

describe("créneaux libres de l'agenda rapide", () => {
  it("une demi-heure déjà terminée ou occupée n'est pas libre, les autres le sont", () => {
    const r = buildFreeSlots({ appointments: [visit(9, 10, 30, 30)], vets: [{ id: "v1" }], now, days: 1, perDay: 20, window });
    // 9:00 et 9:30 sont passées, 10:00 finit à 10:30 (pas encore passé), 10:30 est occupée.
    expect(r.slots.map((s) => s.start)).toEqual(["10:00", "11:00", "11:30"]);
    expect(r.slots[0]).toMatchObject({ day: "2026-11-09", end: "10:30", id: "2026-11-09T10:00" });
  });
  it("un rendez-vous annulé ou manqué libère sa place", () => {
    const r = buildFreeSlots({
      appointments: [visit(10, 9, 0, 30, "v1", "cancelled"), visit(10, 9, 30, 30, "v1", "no_show")],
      vets: [{ id: "v1" }], now, days: 2, perDay: 20, window,
    });
    expect(r.slots.filter((s) => s.day === "2026-11-10").map((s) => s.start)).toEqual(["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"]);
  });
  it("un rendez-vous de 45 minutes occupe deux demi-heures", () => {
    const r = buildFreeSlots({ appointments: [visit(10, 9, 0, 45)], vets: [{ id: "v1" }], now, days: 2, perDay: 20, window });
    expect(r.slots.filter((s) => s.day === "2026-11-10").map((s) => s.start)).toEqual(["10:00", "10:30", "11:00", "11:30"]);
  });
  it("avec deux vétérinaires, une demi-heure est libre si l'un des deux l'est, et porte celui-là", () => {
    const r = buildFreeSlots({ appointments: [visit(10, 9, 0, 30, "v1"), visit(10, 9, 0, 30, "v2"), visit(10, 9, 30, 30, "v1")], vets: [{ id: "v1" }, { id: "v2" }], now, days: 2, perDay: 20, window });
    const day = r.slots.filter((s) => s.day === "2026-11-10");
    expect(day.find((s) => s.start === "09:00")).toBeUndefined();
    expect(day.find((s) => s.start === "09:30")?.vetId).toBe("v2");
    expect(day.find((s) => s.start === "10:00")?.vetId).toBe("v1");
  });
  it("garde les premiers créneaux de chaque jour et compte tous les libres", () => {
    const r = buildFreeSlots({ appointments: [], vets: [{ id: "v1" }], now, days: 3, perDay: 2, window });
    expect(r.days).toEqual(["2026-11-09", "2026-11-10", "2026-11-11"]);
    expect(r.slots.filter((s) => s.day === "2026-11-10").map((s) => s.start)).toEqual(["09:00", "09:30"]);
    expect(r.free["2026-11-10"]).toBe(6);
    expect(r.free["2026-11-09"]).toBe(4); // 10:00 finit à 10:30, pas encore passé
  });
  it("sans vétérinaire déclaré, l'agenda entier fait foi", () => {
    const r = buildFreeSlots({ appointments: [visit(10, 9, 0, 30, "x")], vets: [], now, days: 2, perDay: 20, window });
    expect(r.slots.find((s) => s.day === "2026-11-10" && s.start === "09:00")).toBeUndefined();
    expect(r.slots.find((s) => s.day === "2026-11-10" && s.start === "09:30")?.vetId).toBeUndefined();
  });
  it("un jour complet n'a aucun créneau, mais garde sa colonne", () => {
    const r = buildFreeSlots({ appointments: [visit(10, 9, 0, 180)], vets: [{ id: "v1" }], now, days: 2, perDay: 6, window });
    expect(r.slots.some((s) => s.day === "2026-11-10")).toBe(false);
    expect(r.days).toContain("2026-11-10");
    expect(r.free["2026-11-10"]).toBe(0);
  });
});

describe("heures de la clinique", () => {
  it("moins de dix rendez-vous : les heures par défaut, 8 h à 18 h", () => {
    expect(bookingHours([visit(2, 9, 0, 30)], now)).toEqual({ from: 8, to: 18, basis: "default" });
  });
  it("avec l'historique : de l'heure où 95 % commencent à celle où 95 % finissent, dans la grille de l'agenda", () => {
    const history = Array.from({ length: 40 }, (_, i) => visit(2 + (i % 5), 9 + (i % 8), 0, 30));
    const w = bookingHours(history, now);
    expect(w.basis).toBe("bookings");
    expect(w.from).toBe(9);
    expect(w.to).toBe(17); // le dernier commence à 16 h 00 et finit à 16 h 30, arrondi à 17 h
  });
  it("un rendez-vous manqué ou annulé n'élargit pas les heures", () => {
    const history = [...Array.from({ length: 12 }, () => visit(3, 9, 0, 30)), visit(3, 7, 0, 30, "v1", "cancelled")];
    expect(bookingHours(history, now).from).toBe(9);
  });
});
