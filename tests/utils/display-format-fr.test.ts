import { expect, it } from "vitest";
import { formatClockTime, formatElapsed, formatLongDay, formatNumber, formatPersonName } from "@/utils/display-format";

it("formate heures, jours, durées écoulées et pourcentages à la française", () => {
  expect(formatClockTime(new Date(2026, 9, 17, 8, 0))).toBe("08:00");
  expect(formatClockTime(new Date(2026, 9, 17, 14, 5))).toBe("14:05");
  expect(formatLongDay(new Date(2026, 9, 17, 12))).toBe("samedi 17 octobre");
  const now = new Date(2026, 9, 17, 12, 0);
  expect(formatElapsed(new Date(2026, 9, 17, 11, 58), now)).toBe("Il y a 2 min");
  expect(formatElapsed(new Date(2026, 9, 17, 9, 0), now)).toBe("Il y a 3 h");
  expect(formatElapsed(new Date(2026, 9, 15, 12, 0), now)).toBe("Il y a 2 j");
  expect(formatElapsed(new Date(2026, 9, 17, 12, 0, 30), now)).toBe("À l’instant");
  expect(formatNumber(96.5, { maximumFractionDigits: 1 })).toBe("96,5");
});

it("retire le point des titres sans toucher au reste du nom", () => {
  expect(formatPersonName("Dr. Lina Ait Salem")).toBe("Dr Lina Ait Salem");
  expect(formatPersonName("Pr. Karim M.")).toBe("Pr Karim M.");
  expect(formatPersonName("Drame Ali")).toBe("Drame Ali");
  expect(formatPersonName(undefined)).toBe("");
});
