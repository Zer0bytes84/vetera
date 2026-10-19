import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import { SQLITE_MIGRATIONS } from "@/services/sqlite/migrations";
import { runSqliteMigrations } from "@/services/sqlite/migration-runner";
import { createRoomStore, roomLabel, type RoomDatabase } from "@/modules/rooms/store";

const databases: DatabaseSync[] = [];
afterEach(() => {
  for (const db of databases) db.close();
  databases.length = 0;
});

function open() {
  const db = new DatabaseSync(":memory:");
  databases.push(db);
  const adapter: RoomDatabase = {
    async select<T>(sql: string, args: unknown[] = []) {
      return db.prepare(sql).all(...(args as (string | number | null)[])) as T;
    },
    async execute(sql: string, args: unknown[] = []) {
      if (!args.length) {
        db.exec(sql);
        return { rowsAffected: 0 };
      }
      return { rowsAffected: Number(db.prepare(sql).run(...(args as (string | number | null)[])).changes) };
    },
  };
  return { db, adapter };
}

const beforeRooms = SQLITE_MIGRATIONS.filter(({ version }) => version < "038");

function seedClinic(db: DatabaseSync, rooms: Array<string | null>) {
  db.exec(`INSERT INTO owners(id, first_name, last_name, phone) VALUES ('o1', 'Amina', 'Haddad', '');
    INSERT INTO users(id, email, password_hash, display_name, role) VALUES ('vet', 'vet@cabinet.dz', 'x', 'Karim B', 'admin');
    INSERT INTO patients(id, owner_id, name, species) VALUES ('p1', 'o1', 'Rex', 'Chien');`);
  const insert = db.prepare(
    `INSERT INTO appointments(id, patient_id, owner_id, vet_id, title, start_time, end_time, type, room)
     VALUES (?, 'p1', 'o1', 'vet', 'Rex', '2026-10-19 10:00', '2026-10-19 10:15', 'Consultation', ?)`
  );
  rooms.forEach((room, index) => insert.run(`a${index}`, room));
}

function store(adapter: RoomDatabase) {
  let next = 0;
  return createRoomStore(
    { read: (op) => op(adapter), transaction: (op) => op(adapter) },
    () => `room-${++next}`,
    () => new Date("2026-10-19T10:00:00Z")
  );
}

describe("migration des salles", () => {
  it("donne une seule salle à une installation neuve", async () => {
    const { adapter } = open();
    await runSqliteMigrations(adapter, SQLITE_MIGRATIONS);
    const rooms = await store(adapter).list();
    expect(rooms.map(({ id, name }) => ({ id, name }))).toEqual([{ id: "consult-1", name: "Salle de consultation" }]);
  });

  it("garde la salle de chaque rendez-vous existant, sans inventer celles qui ne servent pas", async () => {
    const { db, adapter } = open();
    await runSqliteMigrations(adapter, beforeRooms);
    seedClinic(db, ["consult-1", "consult-1", "surgery", null]);
    await runSqliteMigrations(adapter, SQLITE_MIGRATIONS);

    const rooms = await store(adapter).list();
    expect(rooms.map(({ id, name, appointmentCount }) => ({ id, name, appointmentCount }))).toEqual([
      { id: "consult-1", name: "Salle de consultation", appointmentCount: 2 },
      { id: "surgery", name: "Chirurgie", appointmentCount: 1 },
    ]);
    // Appointments are untouched.
    expect(db.prepare("SELECT room FROM appointments ORDER BY id").all().map((row) => row.room)).toEqual([
      "consult-1",
      "consult-1",
      "surgery",
      null,
    ]);
  });

  it("ajoute consult-2 seulement quand des rendez-vous l'utilisent, et nomme alors les deux", async () => {
    const { db, adapter } = open();
    await runSqliteMigrations(adapter, beforeRooms);
    seedClinic(db, ["consult-2", "Box A"]);
    await runSqliteMigrations(adapter, SQLITE_MIGRATIONS);
    const rooms = await store(adapter).list();
    expect(rooms.map(({ id, name }) => [id, name])).toEqual([
      ["consult-1", "Consultation 1"],
      ["consult-2", "Consultation 2"],
      ["Box A", "Box A"],
    ]);
  });
});

describe("gestion des salles", () => {
  async function clinic(rooms: Array<string | null> = []) {
    const { db, adapter } = open();
    await runSqliteMigrations(adapter, beforeRooms);
    if (rooms.length) seedClinic(db, rooms);
    await runSqliteMigrations(adapter, SQLITE_MIGRATIONS);
    return { db, rooms: store(adapter) };
  }

  it("archive une salle utilisée au lieu de la supprimer, et la garde lisible", async () => {
    const { db, rooms } = await clinic(["consult-1", "surgery"]);
    await expect(rooms.remove("surgery")).resolves.toBe("archived");
    const list = await rooms.list();
    expect(list.find((room) => room.id === "surgery")?.archivedAt).toBe("2026-10-19T10:00:00.000Z");
    expect(roomLabel("surgery", list)).toBe("Chirurgie");
    expect(db.prepare("SELECT room FROM appointments WHERE id = 'a1'").get()?.room).toBe("surgery");
    // Even a direct DELETE cannot orphan the appointments.
    expect(() => db.exec("DELETE FROM rooms WHERE id = 'surgery'")).toThrow(/archivez-la/);
  });

  it("supprime une salle jamais utilisée", async () => {
    const { rooms } = await clinic();
    const box = await rooms.create("  Box   urgences ");
    expect(box.name).toBe("Box urgences");
    await expect(rooms.remove(box.id)).resolves.toBe("deleted");
    expect((await rooms.list()).map((room) => room.id)).toEqual(["consult-1"]);
  });

  it("garde toujours au moins une salle active", async () => {
    const { rooms } = await clinic();
    await expect(rooms.archive("consult-1")).rejects.toThrow(/au moins une salle active/);
    await expect(rooms.remove("consult-1")).rejects.toThrow(/au moins une salle active/);
    const box = await rooms.create("Box");
    await rooms.archive("consult-1");
    expect(await rooms.defaultRoomId()).toBe(box.id);
  });

  it("refuse deux salles actives du même nom, et libère le nom d'une salle archivée", async () => {
    const { rooms } = await clinic(["surgery"]);
    await expect(rooms.create("chirurgie")).rejects.toThrow(/porte déjà ce nom/);
    await rooms.archive("surgery");
    const second = await rooms.create("Chirurgie");
    await expect(rooms.restore("surgery")).rejects.toThrow(/porte déjà ce nom/);
    await expect(rooms.rename(second.id, "Bloc opératoire")).resolves.toMatchObject({ name: "Bloc opératoire" });
    await expect(rooms.restore("surgery")).resolves.toMatchObject({ archivedAt: null });
  });

  it("refuse un nom vide ou trop long", async () => {
    const { rooms } = await clinic();
    await expect(rooms.create("   ")).rejects.toThrow(/Donnez un nom/);
    await expect(rooms.create("x".repeat(41))).rejects.toThrow(/40 caractères/);
  });

  it("enregistre l'ordre choisi", async () => {
    const { rooms } = await clinic();
    const box = await rooms.create("Box");
    await rooms.reorder([box.id, "consult-1"]);
    expect((await rooms.list()).map((room) => room.id)).toEqual([box.id, "consult-1"]);
    expect(await rooms.defaultRoomId()).toBe(box.id);
  });
});
