import { MASCOT_CHOICE_KEYS, type MascotAnimal } from "@/lib/mascot-preferences";
import { LINE_ANIMALS, type LineAnimalKey } from "./line-mascots";

export interface MascotAssetItem {
  label: string;
  kind: "vector";
}

/** Names saved by earlier versions, drawn as one of the twelve. */
const LEGACY_DRAWING: Record<string, LineAnimalKey> = {
  dog: "chien",
  cat: "chat",
  rabbit: "lapin",
  fox: "fennec",
  bear: "chien",
  panda: "chat",
};

/** The drawing of any saved animal, earlier names included. */
export const lineAnimalOf = (animal: MascotAnimal): LineAnimalKey =>
  LEGACY_DRAWING[animal] ?? (animal as LineAnimalKey);

export const MASCOT_ASSETS = Object.fromEntries(
  [...MASCOT_CHOICE_KEYS, ...Object.keys(LEGACY_DRAWING)].map((animal) => [
    animal,
    { label: LINE_ANIMALS[lineAnimalOf(animal as MascotAnimal)].label, kind: "vector" },
  ]),
) as Record<MascotAnimal, MascotAssetItem>;

/** The twelve offered in the settings, in their order. */
export const MASCOT_CHOICES: readonly MascotAnimal[] = MASCOT_CHOICE_KEYS;

export const LEGACY_VECTOR_MASCOTS: readonly MascotAnimal[] = ["dog", "cat", "rabbit", "fox", "panda", "bear"];

export const MASCOT_ANIMALS: readonly MascotAnimal[] = [...MASCOT_CHOICES, ...LEGACY_VECTOR_MASCOTS];
