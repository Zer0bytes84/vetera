import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { isTauriRuntime } from "@/services/browser-store";
import { roomsService } from "./service";
import { roomLabel, type Room } from "./store";

export const ROOMS_CHANGED = "baitari:rooms-changed";

interface RoomsSnapshot {
  error: string | null;
  loaded: boolean;
  rooms: Room[];
}

// One shared list for the agenda, the dashboard and the settings.
let snapshot: RoomsSnapshot = { error: null, loaded: false, rooms: [] };
let request = 0;
let pending: Promise<void> | null = null;
const listeners = new Set<() => void>();

function publish(next: RoomsSnapshot) {
  snapshot = next;
  for (const listener of listeners) listener();
}

export function refreshRooms(): Promise<void> {
  if (!isTauriRuntime()) {
    if (!snapshot.loaded) publish({ error: null, loaded: true, rooms: [] });
    return Promise.resolve();
  }
  const current = ++request;
  pending = roomsService.list().then(
    (rooms) => {
      if (current === request) publish({ error: null, loaded: true, rooms });
    },
    () => {
      if (current === request) {
        publish({ ...snapshot, error: "Les salles n'ont pas pu être chargées.", loaded: true });
      }
    }
  );
  return pending;
}

export function announceRoomsChanged() {
  window.dispatchEvent(new Event(ROOMS_CHANGED));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1 && !snapshot.loaded && !pending) void refreshRooms();
  return () => {
    listeners.delete(listener);
  };
}

if (typeof window !== "undefined") {
  window.addEventListener(ROOMS_CHANGED, () => void refreshRooms());
}

export function useRooms() {
  const state = useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
  useEffect(() => {
    if (!state.loaded && !pending) void refreshRooms();
  }, [state.loaded]);
  const active = useMemo(() => state.rooms.filter((room) => !room.archivedAt), [state.rooms]);
  return { ...state, active };
}

/**
 * Name to show for an appointment's room. A clinic with a single room gets
 * null: repeating the same room on every appointment says nothing.
 */
export function useRoomLabel() {
  const { rooms } = useRooms();
  return useCallback(
    (roomId: string | null | undefined) => (rooms.length > 1 ? roomLabel(roomId, rooms) : null),
    [rooms]
  );
}
