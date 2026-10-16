import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ token: "", desktop: false, session: null as unknown, user: { id: "admin", email: "admin@test", displayName: "Admin", role: "admin", status: "active" }, read: vi.fn(), write: vi.fn() }));
vi.mock("@/services/browser-store", () => ({
  isTauriRuntime: () => mock.desktop,
  findBrowserRow: (table: string) => table === "sessions" ? mock.session : mock.user,
  getBrowserTable: () => [mock.user], insertBrowserRow: mock.write,
  setBrowserSetting: vi.fn(), getBrowserSetting: vi.fn(), updateBrowserRow: vi.fn(), removeBrowserRow: vi.fn(),
}));
vi.mock("@/services/sqlite/database", () => ({ runDbRead: mock.read, runDbOperation: mock.write, generateId: vi.fn() }));
import { getCurrentUser } from "@/services/sqlite/auth";
beforeEach(() => { mock.token = ""; mock.session = null; mock.desktop = false; mock.user.status = "active"; mock.read.mockReset().mockResolvedValue([]); mock.write.mockReset(); vi.stubGlobal("localStorage", { getItem: () => mock.token, setItem: mock.write }); });
describe("session security", () => {
  it.each([false, true])("never auto-logs in an administrator without a session, desktop=%s", async desktop => { mock.desktop = desktop; expect(await getCurrentUser()).toBeNull(); expect(mock.write).not.toHaveBeenCalled(); });
  it.each([false, true])("never creates a fallback session from an invalid token, desktop=%s", async desktop => { mock.desktop = desktop; mock.token = "expired-token"; expect(await getCurrentUser()).toBeNull(); expect(mock.write).not.toHaveBeenCalled(); });
  it("keeps an authenticated native veterinarian session without changing the role", async () => {
    mock.desktop = true; mock.token = "valid-token";
    mock.read.mockResolvedValue([{ id: "adjoint", email: "vet@test", display_name: "Vétérinaire", role: "vet_adjoint", status: "active" }]);
    expect(await getCurrentUser()).toMatchObject({ id: "adjoint", role: "vet_adjoint", displayName: "Vétérinaire" });
    expect(mock.write).not.toHaveBeenCalled();
  });
  it("refuses an inactive native account", async () => {
    mock.desktop = true; mock.token = "valid-token"; mock.read.mockResolvedValue([{ ...mock.user, status: "inactive" }]);
    expect(await getCurrentUser()).toBeNull(); expect(mock.write).not.toHaveBeenCalled();
  });
  it("keeps valid browser sessions", async () => { mock.token = "valid-token"; mock.session = { userId: "admin" }; expect((await getCurrentUser())?.id).toBe("admin"); expect(mock.write).not.toHaveBeenCalled(); });
  it("refuses inactive users even with a session", async () => { mock.token = "valid-token"; mock.session = { userId: "admin" }; mock.user.status = "inactive"; expect(await getCurrentUser()).toBeNull(); });
});
