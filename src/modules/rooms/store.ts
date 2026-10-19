export interface Room {
  archivedAt: string | null;
  /** Appointments booked in this room, past and future. */
  appointmentCount: number;
  id: string;
  name: string;
  sortOrder: number;
}

export interface RoomDatabase {
  select<T>(sql: string, values?: unknown[]): Promise<T>;
  execute(sql: string, values?: unknown[]): Promise<{ rowsAffected: number }>;
}

export interface RoomPersistence {
  read<T>(operation: (db: RoomDatabase) => Promise<T>): Promise<T>;
  transaction<T>(operation: (db: RoomDatabase) => Promise<T>): Promise<T>;
}

export const ROOM_NAME_MAX_LENGTH = 40;

interface RoomRow {
  appointment_count: number;
  archived_at: string | null;
  id: string;
  name: string;
  sort_order: number;
}

const toRoom = (row: RoomRow): Room => ({
  appointmentCount: Number(row.appointment_count) || 0,
  archivedAt: row.archived_at,
  id: row.id,
  name: row.name,
  sortOrder: Number(row.sort_order) || 0,
});

export function cleanRoomName(name: string): string {
  const clean = name.replace(/\s+/g, " ").trim();
  if (!clean) throw new Error("Donnez un nom à la salle.");
  if (clean.length > ROOM_NAME_MAX_LENGTH) {
    throw new Error(`Le nom d'une salle tient en ${ROOM_NAME_MAX_LENGTH} caractères.`);
  }
  return clean;
}

/** Readable name for an appointment's room, even an archived or unknown one. */
export function roomLabel(roomId: string | null | undefined, rooms: readonly Room[]): string | null {
  if (!roomId) return null;
  return rooms.find((room) => room.id === roomId)?.name ?? roomId;
}

export function createRoomStore(persistence: RoomPersistence, id: () => string, clock = () => new Date()) {
  async function assertNameFree(db: RoomDatabase, name: string, exceptId?: string) {
    const taken = await db.select<Array<{ id: string }>>(
      "SELECT id FROM rooms WHERE archived_at IS NULL AND lower(trim(name)) = lower(?) AND id <> ?",
      [name, exceptId ?? ""]
    );
    if (taken.length > 0) throw new Error("Une salle active porte déjà ce nom.");
  }

  async function find(db: RoomDatabase, roomId: string) {
    const rows = await db.select<RoomRow[]>(
      `SELECT r.id, r.name, r.sort_order, r.archived_at,
        (SELECT COUNT(*) FROM appointments a WHERE a.room = r.id) AS appointment_count
       FROM rooms r WHERE r.id = ?`,
      [roomId]
    );
    if (!rows[0]) throw new Error("Cette salle n'existe plus.");
    return toRoom(rows[0]);
  }

  return {
    /** Active rooms first, in the clinic's order; archived ones after. */
    list(): Promise<Room[]> {
      return persistence.read(async (db) =>
        (
          await db.select<RoomRow[]>(
            `SELECT r.id, r.name, r.sort_order, r.archived_at,
              (SELECT COUNT(*) FROM appointments a WHERE a.room = r.id) AS appointment_count
             FROM rooms r
             ORDER BY r.archived_at IS NOT NULL, r.sort_order, r.created_at, r.id`
          )
        ).map(toRoom)
      );
    },

    /** Room used when a booking does not choose one. */
    defaultRoomId(): Promise<string | null> {
      return persistence.read(async (db) => {
        const rows = await db.select<Array<{ id: string }>>(
          "SELECT id FROM rooms WHERE archived_at IS NULL ORDER BY sort_order, created_at, id LIMIT 1"
        );
        return rows[0]?.id ?? null;
      });
    },

    async create(name: string): Promise<Room> {
      const clean = cleanRoomName(name);
      return persistence.transaction(async (db) => {
        await assertNameFree(db, clean);
        const [{ next }] = await db.select<Array<{ next: number }>>(
          "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM rooms"
        );
        const roomId = id();
        const now = clock().toISOString();
        await db.execute(
          "INSERT INTO rooms(id, name, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
          [roomId, clean, Number(next) || 0, now, now]
        );
        return find(db, roomId);
      });
    },

    async rename(roomId: string, name: string): Promise<Room> {
      const clean = cleanRoomName(name);
      return persistence.transaction(async (db) => {
        await find(db, roomId);
        await assertNameFree(db, clean, roomId);
        await db.execute("UPDATE rooms SET name = ?, updated_at = ? WHERE id = ?", [
          clean,
          clock().toISOString(),
          roomId,
        ]);
        return find(db, roomId);
      });
    },

    archive(roomId: string): Promise<Room> {
      return persistence.transaction(async (db) => {
        const room = await find(db, roomId);
        if (room.archivedAt) return room;
        await db.execute("UPDATE rooms SET archived_at = ?, updated_at = ? WHERE id = ?", [
          clock().toISOString(),
          clock().toISOString(),
          roomId,
        ]);
        return find(db, roomId);
      });
    },

    restore(roomId: string): Promise<Room> {
      return persistence.transaction(async (db) => {
        const room = await find(db, roomId);
        if (!room.archivedAt) return room;
        await assertNameFree(db, room.name, roomId);
        await db.execute("UPDATE rooms SET archived_at = NULL, updated_at = ? WHERE id = ?", [
          clock().toISOString(),
          roomId,
        ]);
        return find(db, roomId);
      });
    },

    /**
     * Deletes a room nobody booked; a room with appointments is archived
     * instead so their history keeps its name. Returns what happened.
     */
    remove(roomId: string): Promise<"deleted" | "archived"> {
      return persistence.transaction(async (db) => {
        const room = await find(db, roomId);
        if (room.appointmentCount > 0) {
          if (!room.archivedAt) {
            await db.execute("UPDATE rooms SET archived_at = ?, updated_at = ? WHERE id = ?", [
              clock().toISOString(),
              clock().toISOString(),
              roomId,
            ]);
          }
          return "archived";
        }
        await db.execute("DELETE FROM rooms WHERE id = ?", [roomId]);
        return "deleted";
      });
    },

    /** Saves the order shown in the settings; ids not listed keep theirs. */
    reorder(roomIds: readonly string[]): Promise<void> {
      return persistence.transaction(async (db) => {
        const now = clock().toISOString();
        for (const [index, roomId] of roomIds.entries()) {
          await db.execute("UPDATE rooms SET sort_order = ?, updated_at = ? WHERE id = ?", [index, now, roomId]);
        }
      });
    },
  };
}

export type RoomStore = ReturnType<typeof createRoomStore>;
