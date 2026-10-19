import { beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.fn();
const localDatabase = {
  execute: vi.fn(async () => ({ rowsAffected: 0 })),
  select: vi.fn(async () => []),
};

vi.mock("@tauri-apps/api/core", () => ({ invoke }));
vi.mock("@tauri-apps/plugin-sql", () => {
  class Database {
    path: string;
    constructor(path: string) {
      this.path = path;
    }
    static get() {
      return localDatabase;
    }
  }
  return { default: Database };
});

async function freshDatabaseModule() {
  vi.resetModules();
  return import("@/services/sqlite/database");
}

describe("poste secondaire sur le réseau local", () => {
  beforeEach(() => {
    invoke.mockReset();
    localDatabase.execute.mockClear();
    localDatabase.select.mockClear();
  });

  it("ouvre la base du poste principal sans migrer ni réparer en local", async () => {
    invoke.mockImplementation(async (command: string) => {
      if (command === "clinic_network_launch_mode") return "client";
      if (command === "clinic_network_connect") return { workstationName: "Accueil" };
      if (command === "clinic_network_select") return [{ id: "rex" }];
      if (command === "clinic_network_execute") return { rowsAffected: 1, lastInsertId: 7 };
      throw new Error(`commande inattendue ${command}`);
    });
    const { getDatabase, runDbTransaction } = await freshDatabaseModule();
    const { SQLITE_MIGRATIONS } = await import("@/services/sqlite/migrations");

    const database = await getDatabase();

    expect(invoke).toHaveBeenCalledWith("clinic_network_connect", {
      migrations: SQLITE_MIGRATIONS.map(({ version }) => version),
    });
    expect(invoke).not.toHaveBeenCalledWith("open_clinic_database");
    expect(localDatabase.execute).not.toHaveBeenCalled();

    await expect(database.select("SELECT id FROM patients WHERE id = ?", ["rex"])).resolves.toEqual([{ id: "rex" }]);
    expect(invoke).toHaveBeenLastCalledWith("clinic_network_select", {
      query: "SELECT id FROM patients WHERE id = ?",
      values: ["rex"],
    });

    // Transactions keep the plugin's shape: separate BEGIN, statements, COMMIT.
    invoke.mockClear();
    await runDbTransaction((db) => db.execute("UPDATE patients SET name = ?", ["Rex"]));
    expect(invoke.mock.calls.map(([, args]) => (args as { query: string }).query)).toEqual([
      "BEGIN IMMEDIATE TRANSACTION",
      "UPDATE patients SET name = ?",
      "COMMIT",
    ]);
  });

  it("annule la transaction distante quand le poste principal refuse une requête", async () => {
    const queries: string[] = [];
    invoke.mockImplementation(async (command: string, args?: { query?: string }) => {
      if (command === "clinic_network_launch_mode") return "client";
      if (command === "clinic_network_connect") return {};
      if (args?.query) queries.push(args.query);
      if (args?.query?.startsWith("INSERT")) throw "UNIQUE constraint failed: patients.id";
      return { rowsAffected: 0 };
    });
    const { runDbTransaction } = await freshDatabaseModule();

    await expect(
      runDbTransaction((db) => db.execute("INSERT INTO patients (id) VALUES (?)", ["rex"]))
    ).rejects.toBe("UNIQUE constraint failed: patients.id");
    expect(queries).toEqual(["BEGIN IMMEDIATE TRANSACTION", "INSERT INTO patients (id) VALUES (?)", "ROLLBACK"]);
  });

  it("reste sur la base locale quand le mode réseau est inconnu ou indisponible", async () => {
    invoke.mockImplementation(async (command: string) => {
      if (command === "clinic_network_launch_mode") throw new Error("commande absente");
      return undefined;
    });
    const { getDatabase } = await freshDatabaseModule();

    const database = await getDatabase();

    expect(invoke).toHaveBeenCalledWith("open_clinic_database");
    expect(database).toBe(localDatabase);
  });
});
