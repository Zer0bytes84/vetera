import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_MASCOT_PREFERENCES,
  MASCOT_ANIMALS,
  getMascotPreferences,
  saveMascotPreferences,
} from "@/lib/mascot-preferences";
import {
  LEGACY_VECTOR_MASCOTS,
  MASCOT_ASSETS,
  MASCOT_CHOICES,
  lineAnimalOf,
} from "@/components/mascot/mascot-assets";
import { LINE_ANIMALS } from "@/components/mascot/line-mascots";

describe("mascot preferences & assets", () => {
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
    const mockStorage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    };
    vi.stubGlobal("window", {
      localStorage: mockStorage,
      dispatchEvent: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    vi.stubGlobal("localStorage", mockStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("accueille avec le chien par défaut, vivant", () => {
    const prefs = getMascotPreferences();
    expect(prefs).toEqual({ mode: "mascot", animal: "chien", animated: true });
    expect(DEFAULT_MASCOT_PREFERENCES.animal).toBe("chien");
  });

  it("propose quinze compagnons au trait, chacun dessiné", () => {
    expect(MASCOT_CHOICES).toHaveLength(15);
    expect(new Set(MASCOT_CHOICES).size).toBe(15);
    for (const animal of MASCOT_CHOICES) {
      expect(MASCOT_ANIMALS).toContain(animal);
      expect(LINE_ANIMALS[lineAnimalOf(animal)].label).toBe(MASCOT_ASSETS[animal].label);
    }
  });

  it("ajoute la chouette, l'âne et le furet après les douze, sans rien remplacer", () => {
    expect(MASCOT_CHOICES.slice(-3)).toEqual(["chouette", "ane", "furet"]);
    expect(MASCOT_CHOICES.slice(0, 3)).toEqual(["chien", "chat", "lapin"]);
    expect(["Chouette", "Âne", "Furet"]).toEqual(MASCOT_CHOICES.slice(-3).map((animal) => MASCOT_ASSETS[animal].label));
    expect(DEFAULT_MASCOT_PREFERENCES.animal).toBe("chien");
  });

  it("relit les noms des versions précédentes comme l'un des compagnons", () => {
    expect(LEGACY_VECTOR_MASCOTS).toEqual(["dog", "cat", "rabbit", "fox", "panda", "bear"]);
    for (const animal of LEGACY_VECTOR_MASCOTS) {
      expect(MASCOT_ANIMALS).toContain(animal);
      expect(MASCOT_CHOICES).toContain(lineAnimalOf(animal));
    }
    store["baitari:mascot:v1"] = JSON.stringify({ mode: "mascot", animal: "dog", animated: true });
    expect(getMascotPreferences().animal).toBe("chien");
  });

  it("persiste le choix de la mascotte dans localStorage", () => {
    saveMascotPreferences({
      mode: "mascot",
      animal: "chat",
      animated: true,
    });

    const stored = getMascotPreferences();
    expect(stored.mode).toBe("mascot");
    expect(stored.animal).toBe("chat");
    expect(stored.animated).toBe(true);
  });

  it("permet de revenir au mode logo classique", () => {
    saveMascotPreferences({
      mode: "mascot",
      animal: "chien",
      animated: false,
    });

    saveMascotPreferences({
      mode: "logo",
    });

    const stored = getMascotPreferences();
    expect(stored.mode).toBe("logo");
  });
});
