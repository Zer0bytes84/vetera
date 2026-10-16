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
  NEW_3D_MASCOTS,
} from "@/components/mascot/mascot-assets";

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

  it("utilise le logo classique par défaut", () => {
    const prefs = getMascotPreferences();
    expect(prefs.mode).toBe("logo");
    expect(DEFAULT_MASCOT_PREFERENCES.mode).toBe("logo");
  });

  it("supporte tous les 5 compagnons illustrés (chat, chien, vache, fennec, lapin)", () => {
    expect(NEW_3D_MASCOTS).toEqual(["chat", "chien", "vache", "fennec", "lapin"]);
    for (const animal of NEW_3D_MASCOTS) {
      expect(MASCOT_ANIMALS).toContain(animal);
      expect(MASCOT_ASSETS[animal].kind).toBe("vector");
    }
  });

  it("conserve les 6 mascottes illustrées d'origine pour la rétrocompatibilité", () => {
    expect(LEGACY_VECTOR_MASCOTS).toEqual(["dog", "cat", "rabbit", "fox", "panda", "bear"]);
    for (const animal of LEGACY_VECTOR_MASCOTS) {
      expect(MASCOT_ANIMALS).toContain(animal);
      expect(MASCOT_ASSETS[animal].kind).toBe("vector");
    }
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
