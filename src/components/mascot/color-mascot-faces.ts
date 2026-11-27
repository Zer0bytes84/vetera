/**
 * The seven expressions of each colour companion (mascot-face.ts), 512 × 512 WebP files beside the bases. This
 * module is only reached by a dynamic import, once a lively companion is on screen: it is not part of the startup
 * bundle, and of its files only those of the chosen animal are ever fetched.
 */
import { COLOR_MASCOTS } from "./color-mascots";
import type { LineAnimalKey } from "./line-mascots";
import { FACE_VARIANTS, type MascotFaceVariant } from "./mascot-face";

const FILES = import.meta.glob<string>(
  "../../assets/mascottes-couleurs/*-*.webp",
  { eager: true, import: "default", query: "?url" }
);

export type MascotFaceUrls = Record<MascotFaceVariant, string>;

export function mascotFaceUrls(animal: LineAnimalKey): MascotFaceUrls | null {
  const urls = {} as MascotFaceUrls;
  for (const variant of FACE_VARIANTS) {
    const url =
      FILES[`../../assets/mascottes-couleurs/${animal}-${variant}.webp`];
    if (!url) {
      return null;
    }
    urls[variant] = url;
  }
  return urls;
}

function decoded(src: string) {
  const image = new Image();
  image.decoding = "async";
  image.src = src;
  if (typeof image.decode === "function") {
    return image.decode();
  }
  return new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(`Image non chargée : ${src}`));
  });
}

/** The eight images of the companion (base and seven faces), fetched and decoded before the first swap. */
export async function preloadMascotFaces(
  animal: LineAnimalKey
): Promise<MascotFaceUrls> {
  const urls = mascotFaceUrls(animal);
  if (!urls) {
    throw new Error(`Expressions introuvables pour ${animal}`);
  }
  await Promise.all(
    [COLOR_MASCOTS[animal], ...Object.values(urls)].map(decoded)
  );
  return urls;
}
