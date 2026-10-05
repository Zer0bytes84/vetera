import { describe, expect, it } from "vitest";
import { TableSnapshotCache } from "../../src/services/sqlite/table-snapshot-cache";
type Row = { id: string; name: string; status?: string };

describe("shared SQLite snapshots", () => {
  it("distinguishes a cold table from a cached empty result", () => {
    const cache = new TableSnapshotCache<Row>();
    expect(cache.has("patients")).toBe(false);
    cache.replace("patients", []);
    expect(cache.has("patients")).toBe(true);
    expect(cache.getRows("patients")).toEqual([]);
  });
  it("publishes optimistic data to every subscriber and removes only the failed layer", () => {
    const cache = new TableSnapshotCache<Row>();
    cache.replace("patients", [{ id: "p1", name: "Milo", status: "sante" }]);
    const first = cache.begin("patients", "p1", (rows) =>
      rows.map((row) => ({ ...row, name: "Mila" }))
    );
    const second = cache.begin("patients", "p1", (rows) =>
      rows.map((row) => ({ ...row, status: "traitement" }))
    );
    cache.rollback("patients", first);
    expect(cache.getRows("patients")).toEqual([
      { id: "p1", name: "Milo", status: "traitement" },
    ]);
    cache.commit("patients", second);
    expect(cache.getRows("patients")?.[0].status).toBe("traitement");
  });
  it("keeps a later pending patch over the authoritative row from an earlier write", () => {
    const cache = new TableSnapshotCache<Row>();
    cache.replace("patients", [{ id: "p1", name: "Milo" }]);
    const a = cache.begin("patients", "p1", (rows) =>
      rows.map((row) => ({ ...row, name: "Mila" }))
    );
    const b = cache.begin("patients", "p1", (rows) =>
      rows.map((row) => ({ ...row, name: "Mali" }))
    );
    cache.commit("patients", a, { id: "p1", name: "Mila" });
    expect(cache.getRows("patients")?.[0].name).toBe("Mali");
    cache.rollback("patients", b);
    expect(cache.getRows("patients")?.[0].name).toBe("Mila");
  });
  it("refuses an old read after a mutation or invalidation", () => {
    const cache = new TableSnapshotCache<Row>();
    cache.replace("patients", [{ id: "p1", name: "Milo" }]);
    const generation = cache.generation("patients");
    const token = cache.begin("patients", "p1", (rows) =>
      rows.map((row) => ({ ...row, name: "Mila" }))
    );
    expect(
      cache.replace("patients", [{ id: "p1", name: "Old" }], generation)
    ).toBe(false);
    cache.commit("patients", token);
    expect(cache.getRows("patients")?.[0].name).toBe("Mila");
  });
  it("notifies all mounted consumers and stops notifying after unmount", () => {
    const cache = new TableSnapshotCache<Row>();
    let notices = 0;
    const unsubscribe = cache.subscribe("patients", () => notices++);
    cache.replace("patients", []);
    unsubscribe();
    cache.replace("patients", [{ id: "p1", name: "Milo" }]);
    expect(notices).toBe(1);
  });
});
