/** The twelve line mascots, in the order they are offered. */
export const MASCOT_CHOICE_KEYS = [
  "chien",
  "chat",
  "lapin",
  "fennec",
  "vache",
  "cheval",
  "mouton",
  "chevre",
  "hamster",
  "perroquet",
  "herisson",
  "tortue",
] as const;

/** Names saved by earlier versions, read back as one of the twelve. */
const LEGACY_ANIMALS = ["dog", "cat", "rabbit", "fox", "panda", "bear"] as const;

export type MascotAnimal = (typeof MASCOT_CHOICE_KEYS)[number] | (typeof LEGACY_ANIMALS)[number];

export interface MascotPreferences {
  mode: "mascot" | "logo";
  animal: MascotAnimal;
  animated: boolean;
}

export const MASCOT_STORAGE_KEY = "baitari:mascot:v1";
const CHANGE_EVENT = "baitari-mascot-changed";
/** By default, the dog, alive: the clinic's companion until another is chosen. */
export const DEFAULT_MASCOT_PREFERENCES: MascotPreferences = {
  mode: "mascot",
  animal: "chien",
  animated: true,
};

export const VALID_ANIMALS: readonly MascotAnimal[] = [...MASCOT_CHOICE_KEYS, ...LEGACY_ANIMALS];
export const MASCOT_ANIMALS = VALID_ANIMALS;

const LEGACY_ANIMAL_MAP: Record<string, MascotAnimal> = {
  dog: "chien",
  cat: "chat",
  rabbit: "lapin",
  fox: "fennec",
  bear: "chien",
  panda: "chat",
};

export function parseMascotPreferences(raw: string | null): MascotPreferences {
  if (!raw) return DEFAULT_MASCOT_PREFERENCES;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value))
      return DEFAULT_MASCOT_PREFERENCES;
    const config = value as Record<string, unknown>;

    const rawAnimal = typeof config.animal === "string" ? config.animal : "";
    const mappedAnimal = LEGACY_ANIMAL_MAP[rawAnimal];
    const animal = mappedAnimal || (VALID_ANIMALS.includes(rawAnimal as MascotAnimal)
      ? (rawAnimal as MascotAnimal)
      : DEFAULT_MASCOT_PREFERENCES.animal);

    return {
      mode: config.mode === "logo" ? "logo" : "mascot",
      animal,
      animated: typeof config.animated === "boolean" ? config.animated : true,
    };
  } catch {
    return DEFAULT_MASCOT_PREFERENCES;
  }
}

let cachedRaw: string | null | undefined;
let cachedPreferences = DEFAULT_MASCOT_PREFERENCES;

export function getMascotPreferences(): MascotPreferences {
  if (typeof window === "undefined") return DEFAULT_MASCOT_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(MASCOT_STORAGE_KEY);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedPreferences = parseMascotPreferences(raw);
    }
  } catch {
  }
  return cachedPreferences;
}

export function getServerMascotPreferences() {
  return DEFAULT_MASCOT_PREFERENCES;
}

export function saveMascotPreferences(preferences: MascotPreferences): boolean {
  const normalized = parseMascotPreferences(JSON.stringify(preferences));
  try {
    window.localStorage.setItem(MASCOT_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    return false;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
  return true;
}

export function subscribeToMascotPreferences(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === MASCOT_STORAGE_KEY || event.key === null) onChange();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}
