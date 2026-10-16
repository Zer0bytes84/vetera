import type { MascotAnimal } from "@/lib/mascot-preferences";

export interface MascotAssetItem {
  label: string;
  kind: "vector";
}

export const MASCOT_ASSETS: Record<MascotAnimal, MascotAssetItem> = {
  chat: { label: "Chat", kind: "vector" },
  chien: { label: "Chien", kind: "vector" },
  vache: { label: "Vache", kind: "vector" },
  fennec: { label: "Fennec", kind: "vector" },
  lapin: { label: "Lapin", kind: "vector" },
  dog: { label: "Chien", kind: "vector" },
  cat: { label: "Chat", kind: "vector" },
  rabbit: { label: "Lapin", kind: "vector" },
  fox: { label: "Fennec", kind: "vector" },
  panda: { label: "Panda", kind: "vector" },
  bear: { label: "Ours", kind: "vector" },
};

export const NEW_3D_MASCOTS: readonly MascotAnimal[] = [
  "chat",
  "chien",
  "vache",
  "fennec",
  "lapin",
];

export const COMPANION_MASCOTS = NEW_3D_MASCOTS;

export const LEGACY_VECTOR_MASCOTS: readonly MascotAnimal[] = [
  "dog",
  "cat",
  "rabbit",
  "fox",
  "panda",
  "bear",
];

export const ALL_MASCOT_ANIMALS: readonly MascotAnimal[] = [
  ...NEW_3D_MASCOTS,
  ...LEGACY_VECTOR_MASCOTS,
];

export const MASCOT_ANIMALS = ALL_MASCOT_ANIMALS;
