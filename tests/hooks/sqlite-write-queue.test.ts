import { beforeEach, describe, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({
  rows: [
    { id: "visit-1", patient_id: "patient-1", status: "arrived", name: "Milo" },
  ] as Record<string, unknown>[],
  calls: [] as string[],
  queue: Promise.resolve() as Promise<unknown>,
  failNext: false,
  gate: undefined as Promise<void> | undefined,
  nextId: 0,
}));

vi.mock("../../src/services/browser-store", () => ({
  isTauriRuntime: () => true,
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
vi.mock("../../src/services/sqlite/database", () => {
  const db = {
    select: async (sql: string, params: unknown[] = []) => {
      fixture.calls.push(sql);
      if (sql.startsWith("PRAGMA"))
        return [
          "id",
          "patient_id",
          "status",
          "name",
          "created_at",
          "updated_at",
        ].map((name) => ({ name }));
      const rows = sql.includes("WHERE id = ?")
        ? fixture.rows.filter((row) => row.id === params[0])
        : fixture.rows;
      return structuredClone(rows);
    },
    execute: async (sql: string, params: unknown[] = []) => {
      fixture.calls.push(sql);
      await fixture.gate;
      if (fixture.failNext) {
        fixture.failNext = false;
        throw new Error("Simulated locked database");
      }
      let rowsAffected = 0;
      if (sql.startsWith("UPDATE")) {
        const fields = sql
          .split(" SET ")[1]
          .split(" WHERE ")[0]
          .split(", ")
          .map((part) => part.split(" = ")[0]);
        fixture.rows = fixture.rows.map((row) => {
          if (row.id !== params.at(-1)) return row;
          rowsAffected++;
          return {
            ...row,
            ...Object.fromEntries(
              fields.map((field, index) => [field, params[index]])
            ),
          };
        });
      } else if (sql.startsWith("INSERT")) {
        const fields = sql.match(/\(([^)]+)\)/)![1].split(", ");
        fixture.rows.push(
          Object.fromEntries(
            fields.map((field, index) => [field, params[index]])
          )
        );
        rowsAffected = 1;
      } else if (sql.startsWith("DELETE")) {
        const oldLength = fixture.rows.length;
        fixture.rows = fixture.rows.filter((row) => row.id !== params[0]);
        rowsAffected = oldLength - fixture.rows.length;
      }
      return { rowsAffected, lastInsertId: 0 };
    },
  };
  const enqueue = (operation: (db: typeof db) => unknown) => {
    const job = fixture.queue.then(() => operation(db));
    fixture.queue = job.catch(() => undefined);
    return job;
  };
  return {
    getDatabase: async () => db,
    runDbOperation: enqueue,
    runDbRead: enqueue,
    generateId: () => `new-${++fixture.nextId}`,
    toSQLiteTimestamp: (date: Date) => date.toISOString(),
  };
});

type Row = { id: string; patientId: string; status: string; name: string };

async function setup(warm = true) {
  const React = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const sqlite = await import("../../src/hooks/useSQLite");
  if (warm) await sqlite.prefetchSQLiteTables(["appointments"]);
  // Server rendering invokes the real React hooks without a browser DOM.
  // Effects are intentionally absent: each operation below uses the public API.
  const read = () => {
    let result: ReturnType<typeof sqlite.useSQLite<Row>>;
    function Probe() {
      result = sqlite.useSQLite<Row>("appointments");
      return null;
    }
    renderToStaticMarkup(React.createElement(Probe));
    return result!;
  };
  return { ...sqlite, read };
}

beforeEach(() => {
  vi.resetModules();
  fixture.rows = [
    { id: "visit-1", patient_id: "patient-1", status: "arrived", name: "Milo" },
  ];
  fixture.calls = [];
  fixture.queue = Promise.resolve();
  fixture.failNext = false;
  fixture.gate = undefined;
  fixture.nextId = 0;
  vi.stubGlobal("window", new EventTarget());
});

describe("SQLite hook with a serialized read/write queue", () => {
  it("invalidates warm data after an external change even when no consumer is mounted", async () => {
    const { read, prefetchSQLiteTables } = await setup();
    fixture.rows[0].status = "completed";
    window.dispatchEvent(
      new CustomEvent("sqlite-data-changed", {
        detail: { tableName: "appointments" },
      })
    );
    await prefetchSQLiteTables(["appointments"]);
    expect(read().data[0].status).toBe("completed");
  });
  it("starts cold only once and returns warm data synchronously on navigation", async () => {
    const { read, prefetchSQLiteTables } = await setup(false);
    expect(read().loading).toBe(true);
    await prefetchSQLiteTables(["appointments"]);
    expect(read().loading).toBe(false);
    expect(read().data[0].patientId).toBe("patient-1");
  });

  it("starts a consultation without nesting a queued PRAGMA or stranding later reads", async () => {
    const { read } = await setup();
    const updated = await read().update("visit-1", { status: "in_progress" });
    expect(updated).toBe(true);
    expect(read().data[0].status).toBe("in_progress");
    await read().refresh();
    expect(read().data[0].status).toBe("in_progress");
  }, 1500);

  it("publishes a pending change immediately and patches one row after success", async () => {
    const { read } = await setup();
    let release!: () => void;
    fixture.gate = new Promise((resolve) => {
      release = resolve;
    });
    const before = fixture.calls.filter(
      (sql) => sql === "SELECT * FROM appointments"
    ).length;
    const pending = read().update("visit-1", { status: "in_progress" });
    expect(read().data[0].status).toBe("in_progress");
    release();
    expect(await pending).toBe(true);
    expect(
      fixture.calls.filter((sql) => sql === "SELECT * FROM appointments")
    ).toHaveLength(before);
    expect(fixture.rows[0].status).toBe("in_progress");
  });

  it("rolls back a failed write, keeps the queue usable, and allows retry", async () => {
    const { read, getSQLiteWriteStatus } = await setup();
    fixture.failNext = true;
    expect(await read().update("visit-1", { status: "in_progress" })).toBe(
      false
    );
    expect(read().data[0].status).toBe("arrived");
    expect(getSQLiteWriteStatus().pending).toBe(0);
    expect(await read().update("visit-1", { status: "in_progress" })).toBe(
      true
    );
    expect(read().data[0].status).toBe("in_progress");
  });

  it("does not discard a later optimistic edit when an earlier write fails", async () => {
    const { read } = await setup();
    fixture.failNext = true;
    const first = read().update("visit-1", { name: "Mila" });
    const second = read().update("visit-1", { status: "in_progress" });
    expect(await first).toBe(false);
    expect(read().data[0].status).toBe("in_progress");
    expect(await second).toBe(true);
    expect(read().data[0]).toMatchObject({
      name: "Milo",
      status: "in_progress",
    });
  });

  it("adds and removes optimistically, preserving authoritative data on remount", async () => {
    const { read } = await setup();
    const pending = read().add({
      patientId: "patient-2",
      status: "scheduled",
      name: "Nika",
    });
    expect(read().data).toHaveLength(2);
    const created = await pending;
    expect(created?.id).toBe("new-1");
    const removal = read().remove("visit-1");
    expect(read().data.map((row) => row.id)).toEqual(["new-1"]);
    expect(await removal).toBe(true);
    expect(read().loading).toBe(false);
    expect(read().data[0].name).toBe("Nika");
  });

  it("restores a removed row after failure and does not cache a later failed edit as confirmed", async () => {
    const { read, prefetchSQLiteTables } = await setup();
    fixture.failNext = true;
    expect(await read().remove("visit-1")).toBe(false);
    expect(read().data).toHaveLength(1);
    const first = read().update("visit-1", { name: "Mila" });
    let release!: () => void;
    fixture.gate = new Promise((resolve) => {
      release = resolve;
    });
    const second = read().update("visit-1", { status: "in_progress" });
    release();
    expect(await first).toBe(true);
    fixture.failNext = true;
    // Revalidating another consumer must not turn an unconfirmed layer into base data.
    await prefetchSQLiteTables(["appointments"]);
    expect(await second).toBe(false);
    expect(read().data[0]).toMatchObject({ name: "Mila", status: "arrived" });
  });
});
