import { describe, expect, it } from "vitest";
import { monotonePath, splitUnit } from "@/modules/dashboard/components/chart-path";

/** Extrait toutes les ordonnées (points et points de contrôle) d'un tracé. */
function ys(d: string): number[] {
  return [...d.matchAll(/-?\d+(?:\.\d+)?,(-?\d+(?:\.\d+)?)/g)].map((m) => Number(m[1]));
}

describe("courbe lissée monotone", () => {
  it("gère 0, 1 et 2 points", () => {
    expect(monotonePath([])).toBe("");
    expect(monotonePath([[0, 10]])).toBe("M0.0,10.0");
    expect(monotonePath([[0, 10], [10, 20]])).toBe("M0.0,10.0 L10.0,20.0");
  });

  it("passe par chaque point de données", () => {
    const points = [[0, 100], [10, 40], [20, 100], [30, 100], [40, 10]] as const;
    const d = monotonePath(points);
    for (const [x, y] of points) expect(d).toContain(`${x.toFixed(1)},${y.toFixed(1)}`);
  });

  it("ne dépasse jamais la ligne de base ni le pic (pas de rebond)", () => {
    // y = 200 est la ligne de base (valeur 0), y = 20 le pic.
    const d = monotonePath([[0, 200], [10, 200], [20, 20], [30, 200], [40, 200], [50, 120]]);
    for (const y of ys(d)) {
      expect(y).toBeLessThanOrEqual(200);
      expect(y).toBeGreaterThanOrEqual(20);
    }
  });
});

describe("séparation valeur / unité", () => {
  it("isole DA et %, espaces insécables compris", () => {
    expect(splitUnit("13 900 DA")).toEqual(["13 900", "DA"]);
    expect(splitUnit("96,5 %")).toEqual(["96,5", "%"]);
    expect(splitUnit("4")).toEqual(["4", ""]);
  });
});
