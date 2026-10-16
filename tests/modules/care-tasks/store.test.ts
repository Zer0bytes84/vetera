import { DatabaseSync } from "node:sqlite";
import { afterEach, expect, it, vi } from "vitest";
import { SQLITE_MIGRATIONS } from "@/services/sqlite/migrations";
import { runSqliteMigrations } from "@/services/sqlite/migration-runner";
import {
  createCareStore,
  type CareDatabase,
} from "../../../src/modules/care-tasks/store";
import {
  registerCareCompletionHook,
  subscribeCareTaskCompleted,
} from "../../../src/modules/care-tasks/hooks";
const databases: DatabaseSync[] = [];
afterEach(() => {
  for (const db of databases) db.close();
  databases.length = 0;
});
async function setup() {
  const db = new DatabaseSync(":memory:");
  databases.push(db);
  const adapter: CareDatabase = {
    async select<T>(sql: string, args: unknown[] = []) {
      return db
        .prepare(sql.replace(/\$\d+/g, "?"))
        .all(...(args as (string | number | null)[])) as T;
    },
    async execute(sql: string, args: unknown[] = []) {
      if (!args.length) {
        db.exec(sql);
        return { rowsAffected: 0 };
      }
      const result = db
        .prepare(sql.replace(/\$\d+/g, "?"))
        .run(...(args as (string | number | null)[]));
      return { rowsAffected: Number(result.changes) };
    },
  };
  await runSqliteMigrations(adapter, SQLITE_MIGRATIONS);
  db.exec(`PRAGMA foreign_keys=ON;
    INSERT INTO owners(id,first_name,last_name,phone) VALUES ('owner','Test','Stock','');
    INSERT INTO patients(id,owner_id,name,species) VALUES ('patient','owner','Patient de test','Chien');
    INSERT INTO products(id,name,category,unit,quantity,sale_price_amount,purchase_price_amount,created_at) VALUES ('care-product','Produit de test','Médicaments','ml',10,500,0,'2026-01-01 00:00:00');
  `);
  let count = 0;
  const store = createCareStore(
    {
      read: (fn) => fn(adapter),
      transaction: async (fn) => {
        db.exec("BEGIN IMMEDIATE");
        try {
          const result = await fn(adapter);
          db.exec("COMMIT");
          return result;
        } catch (e) {
          db.exec("ROLLBACK");
          throw e;
        }
      },
    },
    () => `id-${++count}`,
    () => new Date("2026-10-12T12:00:00Z")
  );
  return { db, store };
}
const draft = {
  patientId: "patient",
  label: "Contrôle de température",
  type: "controle" as const,
  scheduledAt: "2026-10-12T11:00:00Z",
  productId: "care-product",
};
it("crée, valide et relit dans SQLite avec historique et événement après commit", async () => {
  const { db, store } = await setup();
  const hook = vi.fn(() => {
    expect(db.prepare("SELECT statut FROM care_tasks").get()).toMatchObject({
      statut: "fait",
    });
  });
  const event = vi.fn();
  const removeHook = registerCareCompletionHook(hook);
  const removeEvent = subscribeCareTaskCompleted(event);
  try {
    const task = await store.create(draft, "vet");
    const done = await store.transition(task.id, "fait", "vet");
    expect(
      (await store.list(new Date("2026-10-12"), new Date("2026-10-13")))[0]
    ).toEqual(done);
    expect(await store.history(task.id)).toHaveLength(2);
    expect(done.execute_par).toBe("vet");
    expect(done.completed_at).toBe("2026-10-12T12:00:00.000Z");
    expect(hook).toHaveBeenCalledExactlyOnceWith(done);
    expect(event).toHaveBeenCalledExactlyOnceWith({
      taskId: task.id,
      patientId: "patient",
      act: draft.label,
      scheduledAt: "2026-10-12T11:00:00.000Z",
      completedAt: done.completed_at,
      executorId: "vet",
      productId: "care-product",
    });
    await expect(store.transition(task.id, "fait", "vet")).rejects.toThrow();
    expect(hook).toHaveBeenCalledTimes(1);
  } finally {
    removeHook();
    removeEvent();
  }
});
it("annulation avec motif obligatoire sans événement de fin", async () => {
  const { store } = await setup();
  const task = await store.create(draft, "vet");
  await expect(
    store.transition(task.id, "annule", "vet", " ")
  ).rejects.toThrow();
  expect(await store.history(task.id)).toHaveLength(1);
  expect(
    (await store.transition(task.id, "annule", "vet", "Prescription modifiée"))
      .motif_annulation
  ).toBe("Prescription modifiée");
});
it("échec d’historique annule la modification de statut", async () => {
  const { store, db } = await setup();
  const task = await store.create(draft, "vet");
  db.exec(
    "CREATE TRIGGER refuse_history BEFORE INSERT ON care_task_history BEGIN SELECT RAISE(ABORT, 'test failure'); END;"
  );
  await expect(store.transition(task.id, "fait", "vet")).rejects.toThrow();
  expect(db.prepare("SELECT statut FROM care_tasks").get()).toMatchObject({
    statut: "a_faire",
  });
  expect(db.prepare("SELECT quantity FROM products").get()?.quantity).toBe(10);
  expect(db.prepare("SELECT * FROM stock_movements").all()).toHaveLength(0);
});
it("refuse patient inexistant et supprime tâches et historique avec patient", async () => {
  const { store, db } = await setup();
  await expect(
    store.create({ ...draft, patientId: "absent" }, "vet")
  ).rejects.toThrow();
  await store.create(draft, "vet");
  db.exec("DELETE FROM patients");
  expect(db.prepare("SELECT * FROM care_tasks").all()).toHaveLength(0);
  expect(db.prepare("SELECT * FROM care_task_history").all()).toHaveLength(0);
});
it("un hook défaillant ne transforme pas un soin enregistré en échec", async () => {
  const { store, db } = await setup();
  const task = await store.create(draft, "vet");
  const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
  const remove = registerCareCompletionHook(() => {
    throw new Error("B4 indisponible");
  });
  const event = vi.fn();
  const unsubscribe = subscribeCareTaskCompleted(event);
  try {
    await expect(
      store.transition(task.id, "fait", "vet")
    ).resolves.toMatchObject({ statut: "fait" });
    expect(db.prepare("SELECT statut FROM care_tasks").get()).toMatchObject({
      statut: "fait",
    });
    expect(event).toHaveBeenCalledTimes(1);
  } finally {
    remove();
    unsubscribe();
    log.mockRestore();
  }
});

it("un soin de demain est relu par identifiant et dans la période Agenda sans duplication", async () => {
  const { db, store } = await setup();
  const task = await store.create(
    { ...draft, scheduledAt: "2026-10-13T16:30:00Z" },
    "vet"
  );
  expect(
    await store.list(new Date("2026-10-12"), new Date("2026-10-13"))
  ).toEqual([]);
  const tomorrow = await store.list(
    new Date("2026-10-13"),
    new Date("2026-10-14")
  );
  const week = await store.list(new Date("2026-10-12"), new Date("2026-10-19"));
  expect(tomorrow).toMatchObject([task]);
  expect(week).toEqual(tomorrow);
  expect(await store.get(task.id)).toMatchObject(task);
  expect(await store.get("absent")).toBeNull();
  expect(
    db.prepare("SELECT COUNT(*) AS count FROM care_tasks").get()
  ).toMatchObject({ count: 1 });
});
