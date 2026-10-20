import { describe, expect, it } from "vitest";
import { nearestInDirection, type Box } from "@/modules/flow-board/spatial-nav";

const box = (left: number, top: number, width = 280, height = 160): Box => ({
  left,
  top,
  right: left + width,
  bottom: top + height,
});

// Planned visits: one row of three cards. Columns below: Attente holds two
// cards stacked, Soins ou résultats one, the columns in between are empty.
const cards = [
  { id: "loulou", box: box(0, 0) },
  { id: "kejounti", box: box(290, 0) },
  { id: "nika", box: box(580, 0) },
  { id: "attente-1", box: box(0, 200, 230) },
  { id: "attente-2", box: box(0, 370, 230) },
  { id: "soins", box: box(480, 200, 230) },
];
const from = (id: string) => cards.find((card) => card.id === id)!.box;
const go = (id: string, direction: "up" | "down" | "left" | "right") =>
  nearestInDirection(from(id), cards.filter((card) => card.id !== id), direction)?.id ?? null;

describe("flèches du tableau", () => {
  it("parcourt la grille des prévus de gauche à droite", () => {
    expect(go("loulou", "right")).toBe("kejounti");
    expect(go("kejounti", "right")).toBe("nika");
    expect(go("nika", "left")).toBe("kejounti");
    expect(go("nika", "right")).toBeNull();
  });

  it("descend des prévus vers la carte juste en dessous, puis dans la colonne", () => {
    expect(go("loulou", "down")).toBe("attente-1");
    expect(go("attente-1", "down")).toBe("attente-2");
    expect(go("attente-2", "up")).toBe("attente-1");
    expect(go("attente-1", "up")).toBe("loulou");
  });

  it("saute les colonnes vides pour atteindre la carte voisine", () => {
    expect(go("attente-1", "right")).toBe("soins");
    expect(go("soins", "left")).toBe("attente-1");
    expect(go("soins", "up")).toBe("nika");
  });
});
