import { useSyncExternalStore } from "react";

export const floralBackgrounds = {
  lilas: "Lilas",
  sauge: "Sauge",
  chiens: "Compagnons",
  lapins: "Prairie",
  oiseaux: "Petits patients",
} as const;
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
