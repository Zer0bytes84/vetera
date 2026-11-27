import { beforeEach, describe, expect, it, vi } from "vitest";
import { mustExist } from "@/lib/must-exist";

// Lecture par patient : un écran de dossier lit les lignes de son patient (WHERE patient_id = ?) au lieu de la table
// entière, et voit exactement les mêmes écritures que les écrans qui lisent la table entière.
const fixture = vi.hoisted(() => ({
  rows: [] as Record<string, unknown>[],
  calls: [] as { sql: string; params: unknown[] }[],
  queue: Promise.resolve() as Promise<unknown>,
  failNext: false,
  nextId: 0,
}));

vi.mock("../../src/services/browser-store", () => ({
  isTauriRuntime: () => true,
  getBrowserTable: () => [],
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
vi.mock("../../src/services/sqlite/database", () => {
  const db = {
    select: (sql: string, params: unknown[] = []) => {
      fixture.calls.push({ sql, params });
      if (sql.startsWith("PRAGMA")) {
        const columns = [
          "id",
          "patient_id",
          "status",
          "vet_id",
          "room",
          "created_at",
          "updated_at",
        ].map((name) => ({ name }));
        return Promise.resolve(columns);
      }
      let rows = fixture.rows;
      if (sql.includes("WHERE id = ?")) {
        rows = rows.filter((row) => row.id === params[0]);
      } else if (sql.includes("WHERE patient_id = ?")) {
        rows = rows.filter((row) => row.patient_id === params[0]);
      } else if (sql.includes("WHERE vet_id = ?")) {
        rows = rows.filter(
          (row) =>
            row.vet_id === params[0] ||
            (params[1] !== null && row.room === params[2])
        );
      }
      return Promise.resolve(structuredClone(rows));
    },
    execute: (sql: string, params: unknown[] = []) => {
      fixture.calls.push({ sql, params });
      if (fixture.failNext) {
        fixture.failNext = false;
        return Promise.reject(new Error("Simulated locked database"));
      }
      let rowsAffected = 0;
      if (sql.startsWith("UPDATE")) {
        const fields = sql
          .split(" SET ")[1]
          .split(" WHERE ")[0]
          .split(", ")
          .map((part) => part.split(" = ")[0]);
        fixture.rows = fixture.rows.map((row) => {
          if (row.id !== params.at(-1)) {
            return row;
          }
          rowsAffected++;
          return {
            ...row,
            ...Object.fromEntries(
              fields.map((field, index) => [field, params[index]])
            ),
          };
        });
      } else if (sql.startsWith("INSERT")) {
        const fields = mustExist(
          // biome-ignore lint/performance/useTopLevelRegex: fabrique de vi.mock, remontée au-dessus du module
          sql.match(/\(([^)]+)\)/),
          "INSERT columns"
        )[1].split(", ");
        fixture.rows.push(
          Object.fromEntries(
            fields.map((field, index) => [field, params[index]])
          )
        );
        rowsAffected = 1;
      }
      return Promise.resolve({ rowsAffected, lastInsertId: 0 });
    },
  };
  const enqueue = (operation: (database: typeof db) => unknown) => {
    const job = fixture.queue.then(() => operation(db));
    fixture.queue = job.catch(() => undefined);
    return job;
  };
  return {
    getDatabase: async () => db,
    runDbOperation: enqueue,
    runDbRead: enqueue,
    runDbTransaction: enqueue,
    generateId: () => `new-${++fixture.nextId}`,
    toSQLiteTimestamp: (date: Date) => date.toISOString(),
  };
});

interface Row {
  id: string;
  patientId: string;
  status: string;
}

async function setup() {
  const React = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const sqlite = await import("../../src/hooks/useSQLite");
  // Server rendering runs the real hooks without effects: each step below uses the public API.
  const read = (patientId?: string) => {
    let result: ReturnType<typeof sqlite.useSQLite<Row>> | undefined;
    function Probe() {
      result = sqlite.useSQLite<Row>(
        "appointments",
        patientId ? { patientId } : undefined
      );
      return null;
    }
    renderToStaticMarkup(React.createElement(Probe));
    return mustExist(result, "hook result");
  };
  await read().refresh();
  await read("rex").refresh();
  return { ...sqlite, read };
}

const ids = (rows: { id: string }[]) => rows.map((row) => row.id).sort();

beforeEach(() => {
  vi.resetModules();
  fixture.rows = [
    {
      id: "a1",
      patient_id: "rex",
      status: "scheduled",
      vet_id: "vet",
      room: "r1",
    },
    {
      id: "a2",
      patient_id: "rex",
      status: "completed",
      vet_id: "vet",
      room: null,
    },
    {
      id: "b1",
      patient_id: "mocha",
      status: "scheduled",
      vet_id: "vet",
      room: "r1",
    },
  ];
  fixture.calls = [];
  fixture.queue = Promise.resolve();
  fixture.failNext = false;
  fixture.nextId = 0;
  vi.stubGlobal("window", new EventTarget());
});

describe("patient-scoped reads", () => {
  it("reads only the patient's rows, with a targeted query", async () => {
    const { read } = await setup();
    expect(ids(read("rex").data)).toEqual(["a1", "a2"]);
    const scoped = fixture.calls.filter(
      (call) => call.sql === "SELECT * FROM appointments WHERE patient_id = ?"
    );
    expect(scoped).toHaveLength(1);
    expect(scoped[0].params).toEqual(["rex"]);
  });

  it("keeps whole-table reads for tables without a patient column", async () => {
    const { cacheTarget } = await import(
      "../../src/services/sqlite/patient-scope"
    );
    expect(cacheTarget("owners", "rex")).toEqual({
      key: "owners",
      table: "owners",
    });
    expect(cacheTarget("appointments", "rex").patientId).toBe("rex");
  });

  it("shows a write made through the whole table in the patient's read, before and after it commits", async () => {
    const { read } = await setup();
    const pending = read().update("a1", { status: "in_progress" });
    expect(read("rex").data.find((row) => row.id === "a1")?.status).toBe(
      "in_progress"
    );
    expect(await pending).toBe(true);
    expect(read("rex").data.find((row) => row.id === "a1")?.status).toBe(
      "in_progress"
    );
    expect(ids(read("rex").data)).toEqual(["a1", "a2"]);
  });

  it("shows a write made through the patient's read in the whole table", async () => {
    const { read } = await setup();
    expect(await read("rex").update("a2", { status: "cancelled" })).toBe(true);
    expect(read().data.find((row) => row.id === "a2")?.status).toBe(
      "cancelled"
    );
    expect(read().data).toHaveLength(3);
  });

  it("adds a new row only to the read of its own patient", async () => {
    const { read } = await setup();
    await read().add({ patientId: "mocha", status: "scheduled" } as Omit<
      Row,
      "id"
    >);
    expect(ids(read("rex").data)).toEqual(["a1", "a2"]);
    const created = await read("rex").add({
      patientId: "rex",
      status: "scheduled",
    } as Omit<Row, "id">);
    expect(created?.id).toBe("new-2");
    expect(ids(read("rex").data)).toEqual(["a1", "a2", "new-2"]);
    expect(read().data).toHaveLength(5);
  });

  it("drops a row from the patient's read when it moves to another patient", async () => {
    const { read } = await setup();
    expect(await read().update("a1", { patientId: "mocha" })).toBe(true);
    expect(ids(read("rex").data)).toEqual(["a2"]);
  });

  it("rolls back a failed write in every read of the table", async () => {
    const { read } = await setup();
    fixture.failNext = true;
    expect(await read("rex").update("a1", { status: "in_progress" })).toBe(
      false
    );
    expect(read("rex").data.find((row) => row.id === "a1")?.status).toBe(
      "scheduled"
    );
    expect(read().data.find((row) => row.id === "a1")?.status).toBe(
      "scheduled"
    );
  });

  it("invalidates the patient's read on an external change to the table", async () => {
    const { read, emitSQLiteDataChanged } = await setup();
    fixture.rows[0].status = "completed";
    emitSQLiteDataChanged("appointments");
    await read("rex").refresh();
    expect(read("rex").data.find((row) => row.id === "a1")?.status).toBe(
      "completed"
    );
  });
});

describe("appointment conflicts from a patient-scoped read", () => {
  it("still sees another patient's appointment for the same vet or room", async () => {
    const { appointmentConflictCandidates } = await import(
      "../../src/data/repositories"
    );
    const { findAppointmentConflicts } = await import(
      "../../src/domain/clinical/scheduling"
    );
    fixture.rows = [
      {
        id: "b1",
        patient_id: "mocha",
        status: "scheduled",
        vet_id: "vet",
        room: "r1",
        start_time: "2026-11-27T10:00:00.000Z",
        end_time: "2026-11-27T10:30:00.000Z",
      },
      {
        id: "c1",
        patient_id: "nala",
        status: "scheduled",
        vet_id: "other",
        room: "r2",
        start_time: "2026-11-27T10:00:00.000Z",
        end_time: "2026-11-27T10:30:00.000Z",
      },
    ];
    const candidates = await appointmentConflictCandidates("vet", "r1", []);
    expect(ids(candidates)).toEqual(["b1"]);
    const conflicts = findAppointmentConflicts(
      {
        id: "new",
        vetId: "vet",
        room: "r1",
        startTime: "2026-11-27T10:15:00.000Z",
        endTime: "2026-11-27T10:45:00.000Z",
      },
      candidates
    );
    expect(conflicts.map((conflict) => conflict.kind).sort()).toEqual([
      "room",
      "veterinarian",
    ]);
  });
});
