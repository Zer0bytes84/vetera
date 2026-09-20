import { useSyncExternalStore } from "react";

export const floralBackgrounds = {
  lilas: "Lilas",
  sauge: "Sauge",
  chiens: "Compagnons",
  lapins: "Prairie",
  oiseaux: "Petits patients",
  chats: "Félins",
  chiots: "Jeunes recrues",
  nac: "N.A.C.",
} as const;

export interface FloralBackgroundMeta {
  emoji: string;
  iconBg: string;
  id: FloralBackground;
  label: string;
  subtitle: string;
}

export const floralBackgroundList: FloralBackgroundMeta[] = [
  { id: "lilas", label: "Lilas", emoji: "🌸", subtitle: "Chat tigré & campanules", iconBg: "#dcd2ea" },
  { id: "chiens", label: "Compagnons", emoji: "🐕", subtitle: "Golden & chaton", iconBg: "#dfd7b7" },
  { id: "lapins", label: "Prairie", emoji: "🐇", subtitle: "Duo lapins & marguerites", iconBg: "#f2dbcb" },
  { id: "oiseaux", label: "Petits patients", emoji: "🦜", subtitle: "Calopsitte & cochon d'Inde", iconBg: "#dbe8dc" },
  { id: "chats", label: "Félins", emoji: "🐈", subtitle: "Chat roux & chaton endormi", iconBg: "#fedcc8" },
  { id: "chiots", label: "Jeunes recrues", emoji: "🐶", subtitle: "Cavalier & Teckel", iconBg: "#e9ddca" },
  { id: "nac", label: "N.A.C.", emoji: "🦔", subtitle: "Furet & Hérisson", iconBg: "#e1e5d7" },
  { id: "sauge", label: "Sauge", emoji: "🌿", subtitle: "Herbier médicinal", iconBg: "#d3dfd5" },
];

export type FloralBackground = keyof typeof floralBackgrounds;
const key = "baitari-floral-background";
const eventName = "baitari-floral-background-change";

function read(): FloralBackground {
  try {
    const value = localStorage.getItem(key);
    return value && value in floralBackgrounds
      ? (value as FloralBackground)
      : "lilas";
  } catch {
    return "lilas";
  }
}

export function randomizeFloralBackground() {
  const choices = (Object.keys(floralBackgrounds) as FloralBackground[]).filter(
    (value) => value !== read()
  );
  const next = choices[Math.floor(Math.random() * choices.length)];
  try {
    localStorage.setItem(key, next);
  } catch {
    return;
  }
  window.dispatchEvent(new Event(eventName));
}

function subscribe(callback: () => void) {
  window.addEventListener(eventName, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(eventName, callback);
    window.removeEventListener("storage", callback);
  };
}

export function useFloralBackground() {
  const background = useSyncExternalStore(
    subscribe,
    read,
    () => "lilas" as const
  );
  const change = (value: FloralBackground) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      return;
    }
    window.dispatchEvent(new Event(eventName));
  };
  return [background, change] as const;
}
