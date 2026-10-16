import { describe, expect, it } from "vitest";
import { getSpeciesTheme } from "@/lib/species-theme";

describe("species theme", () => {
  it("attribue des thèmes vibrants distincts pour chaque espèce animale", () => {
    const dog = getSpeciesTheme("Chien");
    expect(dog.id).toBe("dog");
    expect(dog.accentHex).toBe("#d97706");
    expect(dog.avatarBg).toContain("amber");

    const cat = getSpeciesTheme("Chat européen");
    expect(cat.id).toBe("cat");
    expect(cat.accentHex).toBe("#059669");
    expect(cat.avatarBg).toContain("emerald");

    const rabbit = getSpeciesTheme("Lapin bélier");
    expect(rabbit.id).toBe("rabbit");
    expect(rabbit.accentHex).toBe("#7c3aed");
    expect(rabbit.avatarBg).toContain("violet");

    const bird = getSpeciesTheme("Oiseau canari");
    expect(bird.id).toBe("bird");
    expect(bird.accentHex).toBe("#0284c7");
    expect(bird.avatarBg).toContain("sky");

    const turtle = getSpeciesTheme("Tortue terrestre");
    expect(turtle.id).toBe("turtle");
    expect(turtle.accentHex).toBe("#65a30d");

    const horse = getSpeciesTheme("Cheval arabe");
    expect(horse.id).toBe("horse");
    expect(horse.accentHex).toBe("#ea580c");

    const fish = getSpeciesTheme("Poisson clown");
    expect(fish.id).toBe("fish");
    expect(fish.accentHex).toBe("#2563eb");
  });

  it("gère les espèces inconnues ou indéfinies avec un thème par défaut soigné", () => {
    const fallback = getSpeciesTheme(undefined);
    expect(fallback.id).toBe("other");
    expect(fallback.accentHex).toBe("#6366f1");
    expect(fallback.avatarBg).toBeTruthy();
    expect(fallback.badgeBg).toBeTruthy();
  });
});
