import { useSyncExternalStore } from "react";
import {
  getMascotPreferences,
  getServerMascotPreferences,
  subscribeToMascotPreferences,
} from "@/lib/mascot-preferences";

export function useMascotPreferences() {
  return useSyncExternalStore(
    subscribeToMascotPreferences,
    getMascotPreferences,
    getServerMascotPreferences,
  );
}
