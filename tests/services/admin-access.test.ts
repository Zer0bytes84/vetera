import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ token: "session", session: { userId: "admin", expiresAt: "2099-01-01", token: "session" }, user: { id: "admin", email: "admin@clinic.test", role: "admin", status: "active" } as Record<string, string>, fetch: vi.fn() }));
vi.mock("@/services/browser-store", () => ({ isTauriRuntime: () => false, findBrowserRow: (table: string, predicate: (row: unknown) => boolean) => { const row = table === "sessions" ? mock.session : mock.user; return predicate(row) ? row : null; } }));
import { requireAdministrator, requireActivationOwner, isActivationOwner } from "@/services/adminAccess";
import { listActivationLicenses, createActivationLicense, verifyAdminToken, getStoredAdminToken, setStoredAdminToken } from "@/services/licenseActivationService";
beforeEach(() => {
  mock.token = "session"; mock.user.email = "admin@clinic.test"; mock.user.role = "admin"; mock.user.status = "active"; mock.session.expiresAt = "2099-01-01";
  vi.stubGlobal("localStorage", { getItem: () => mock.token, removeItem: vi.fn() });
  mock.fetch.mockReset(); vi.stubGlobal("fetch", mock.fetch);
});
describe("privileged access", () => {
  it("permits an authenticated active administrator", async () => { await expect(requireAdministrator()).resolves.toEqual({ id: "admin", email: "admin@clinic.test" }); });
  it.each(["vet_adjoint", "vet_principal", "assistant", "stagiaire"])("rejects %s before any licence request", async role => { mock.user.role = role; await expect(listActivationLicenses("server-token")).rejects.toThrow("réservé"); await expect(createActivationLicense("server-token", { email: "a@b.test", plan: "clinic", maxDevices: 1, expiresAt: null })).rejects.toThrow("réservé"); expect(mock.fetch).not.toHaveBeenCalled(); });
  it("refuses missing sessions without auto-login", async () => { mock.token = ""; await expect(requireAdministrator()).rejects.toThrow("Connectez-vous"); });
  it("refuses expired sessions and inactive administrators", async () => { mock.session.expiresAt = "2000-01-01"; await expect(requireAdministrator()).rejects.toThrow("réservé"); mock.session.expiresAt = "2099-01-01"; mock.user.status = "inactive"; await expect(requireAdministrator()).rejects.toThrow("réservé"); });
});

describe("activation owner", () => {
  it("hides access from another administrator before making any request", async () => {
    await expect(requireActivationOwner()).rejects.toThrow("propriétaire");
    await expect(listActivationLicenses("secret")).rejects.toThrow("propriétaire");
    expect(await verifyAdminToken("secret")).toBe(false);
    expect(mock.fetch).not.toHaveBeenCalled();
  });
  it("requires an active authenticated owner, independently of the displayed role", async () => {
    mock.user.email = "zohir.kh@gmail.com";
    await expect(requireActivationOwner()).resolves.toEqual({ id: "admin", email: "zohir.kh@gmail.com" });
    mock.session.expiresAt = "2000-01-01";
    await expect(requireActivationOwner()).rejects.toThrow("réservé");
    mock.session.expiresAt = "2099-01-01";
    mock.user.status = "inactive";
    await expect(requireActivationOwner()).rejects.toThrow("réservé");
  });
  it("does not confuse a similar address with the owner", () => {
    expect(isActivationOwner("ZOHIR.KH@gmail.com")).toBe(true);
    expect(isActivationOwner("zohir.kh@gmail.com.attacker.test")).toBe(false);
    expect(isActivationOwner(undefined)).toBe(false);
  });
  it("verifies the additional secret remotely and rejects a wrong token", async () => {
    mock.user.email = "zohir.kh@gmail.com";
    mock.fetch.mockResolvedValueOnce(new Response("{}", { status: 401 }));
    expect(await verifyAdminToken("wrong")).toBe(false);
    mock.fetch.mockResolvedValueOnce(new Response("{}", { status: 200 }));
    expect(await verifyAdminToken("correct")).toBe(true);
    expect(mock.fetch.mock.calls[1][1].headers["x-admin-token"]).toBe("correct");
  });
  it("does not recover the secret after the session changes", () => {
    setStoredAdminToken("temporary");
    expect(getStoredAdminToken()).toBe("temporary");
    mock.token = "another-session";
    expect(getStoredAdminToken()).toBe("");
  });
});
