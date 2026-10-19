import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// The agenda module reads display preferences from storage when it loads.
vi.hoisted(() => {
  const memory = new Map<string, string>();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => void memory.set(key, value),
    removeItem: (key: string) => void memory.delete(key),
    clear: () => memory.clear(),
    key: () => null,
    length: 0,
  };
});
import {
  AppointmentTimePicker,
  nextFreeTime,
  overlappingSlot,
  parseTypedTime,
  type BusySlot,
} from "@/modules/agenda/components/agenda-shared";

describe("saisie de l'heure", () => {
  it.each([
    ["9", "09:00"],
    ["09", "09:00"],
    ["905", "09:05"],
    ["0905", "09:05"],
    ["9:05", "09:05"],
    ["9h05", "09:05"],
    ["9h", "09:00"],
    ["21h30", "21:30"],
    [" 14 30 ", "14:30"],
    ["1430", "14:30"],
  ])("lit « %s » comme %s", (typed, expected) => {
    expect(parseTypedTime(typed)).toBe(expected);
  });

  it.each(["", "25", "9h75", "abc", "2400", "12:5"])("refuse « %s »", (typed) => {
    expect(parseTypedTime(typed)).toBeNull();
  });
});

describe("créneaux occupés", () => {
  const busy: BusySlot[] = [
    { start: 9 * 60, end: 9 * 60 + 15, label: "Rex" },
    { start: 9 * 60 + 15, end: 9 * 60 + 45, label: "Nika" },
  ];

  it("repère un chevauchement, bord à bord compris comme libre", () => {
    expect(overlappingSlot(8 * 60 + 50, 15, busy)?.label).toBe("Rex");
    expect(overlappingSlot(8 * 60 + 45, 15, busy)).toBeNull();
    expect(overlappingSlot(9 * 60 + 45, 15, busy)).toBeNull();
  });

  it("propose le premier créneau libre après l'heure demandée", () => {
    expect(nextFreeTime(9 * 60 + 5, 15, busy)).toBe("09:45");
    expect(nextFreeTime(9 * 60 + 5, 15, [])).toBe("09:05");
  });
});

const markup = (busy: BusySlot[] = [], value = "09:00") =>
  renderToStaticMarkup(<AppointmentTimePicker busy={busy} durationMinutes={15} onChange={() => undefined} value={value} />);

describe("sélecteur d'horaire", () => {
  it("affiche l'heure, la fin et les minutes en 24 heures, sans AM ni PM", () => {
    const html = markup([], "14:35");
    expect(html).toContain('value="14:35"');
    expect(html).toContain("→ 14:50");
    expect(html).toContain(">20<");
    expect(html).toContain(":55");
    expect(html).not.toMatch(/\b(AM|PM)\b/);
    expect(html).toContain('aria-pressed="true"');
  });

  it("signale le chevauchement, barre les minutes prises et propose le prochain créneau libre", () => {
    const html = markup([{ start: 9 * 60, end: 9 * 60 + 30, label: "Rex" }]);
    expect(html).toContain("Chevauche Rex (09:00 – 09:30)");
    expect(html).toContain("Occupé : Rex");
    expect(html).toContain("Prochain créneau libre : 09:30");
  });

  it("annonce un créneau libre quand rien ne chevauche", () => {
    expect(markup([{ start: 10 * 60, end: 10 * 60 + 30, label: "Rex" }])).toContain("Créneau libre");
    expect(markup()).toContain("Aucun autre rendez-vous ce jour");
  });
});
