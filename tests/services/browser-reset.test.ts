import { beforeEach, expect, it, vi } from "vitest";
vi.mock("@/services/adminAccess", () => ({ requireAdministrator: async () => ({ id: "admin" }), verifyAdministratorPassword: async () => ({ id: "admin" }) }));
vi.mock("@/services/sqlite/database", () => ({ runDbOperation: vi.fn() }));
import { resetLocalData, RESET_CONFIRMATION } from "@/services/localDataReset";
import { seedDemoDataIfNeeded } from "@/services/demo-data";
import { getBrowserTable, getBrowserSetting } from "@/services/browser-store";
const key = "vetera.browser-db.v1";
let values: Map<string, string>;
beforeEach(() => {
  values = new Map(); const storage = { getItem: (name: string) => values.get(name) ?? null, setItem: (name: string, value: string) => values.set(name, value), removeItem: (name: string) => values.delete(name), get length() { return values.size; }, key: (index: number) => [...values.keys()][index] ?? null };
  vi.stubGlobal("localStorage", storage); vi.stubGlobal("window", { localStorage: storage, dispatchEvent: vi.fn() });
});
it("keeps a backup and leaves the browser empty after reloading rather than reseeding demo patients", async () => {
  const original = JSON.stringify({ tables: { users: [{ id: "admin", role: "admin" }], sessions: [{ id: "session" }], patients: [{ id: "patient" }], app_settings: [{ id: "license", key: "license_activation_token", value: "kept" }] } });
  values.set(key, original); values.set("auth_token", "old-session"); values.set("theme-config", "old-preferences");
  await resetLocalData(RESET_CONFIRMATION, "secret");
  expect(values.get(key + ".before-reset")).toBe(original);
  expect(getBrowserTable("users")).toHaveLength(0);
  expect(getBrowserSetting("license_activation_token")).toBeNull();
  await seedDemoDataIfNeeded({ id: "admin", email: "admin@test", displayName: "Admin" });
  expect(getBrowserTable("patients")).toEqual([]);
  expect(values.has("auth_token")).toBe(false); expect(values.has("theme-config")).toBe(false);
});
