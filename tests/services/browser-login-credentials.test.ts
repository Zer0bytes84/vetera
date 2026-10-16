import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
const mock = vi.hoisted(() => ({ user: { id: "qa-user", email: "qa@example.test", displayName: "QA", role: "admin", status: "active" } as Record<string, unknown>, inserts: vi.fn(), storage: vi.fn() }));
vi.mock("@/services/browser-store", () => ({
  isTauriRuntime: () => false,
  findBrowserRow: (_table: string, predicate: (row: unknown) => boolean) => predicate(mock.user) ? mock.user : null,
  insertBrowserRow: mock.inserts, getBrowserTable: () => [mock.user], clearBrowserRows: vi.fn(), updateBrowserRow: vi.fn(),
}));
vi.mock("@/services/sqlite/database", () => ({ generateId: () => "qa-random-id", runDbRead: vi.fn(), runDbOperation: vi.fn() }));
import { hashPassword, login, verifyPassword } from "@/services/sqlite/auth";
import { getBrowserPasswordHash } from "@/services/browserCredentials";
beforeEach(() => {
  delete mock.user.passwordHash; delete mock.user.password_hash; mock.inserts.mockReset(); mock.storage.mockReset();
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: mock.storage });
});
describe("browser login credentials", () => {
  it.each([undefined, null, 123, {}, ""])("refuse un hash absent ou invalide sans exception (%s)", async hash => {
    expect(await verifyPassword("password", hash)).toBe(false);
  });
  it("refuse un profil sans mot de passe sans créer de session ni remplacer ses données", async () => {
    const before = { ...mock.user };
    await expect(login({ email: "qa@example.test", password: "password" })).rejects.toThrow("ne possède pas de mot de passe");
    expect(mock.inserts).not.toHaveBeenCalled(); expect(mock.storage).not.toHaveBeenCalled(); expect(mock.user).toEqual(before);
  });
  it.each(["passwordHash", "password_hash"])("connecte avec un hash existant au format %s", async field => {
    mock.user[field] = createHash("sha256").update("correct-password").digest("hex");
    await expect(login({ email: "qa@example.test", password: "wrong-password" })).rejects.toThrow("incorrect");
    expect(mock.inserts).not.toHaveBeenCalled();
    await expect(login({ email: "qa@example.test", password: "correct-password" })).resolves.toMatchObject({ id: "qa-user", role: "admin" });
    expect(mock.inserts).toHaveBeenCalledWith("sessions", expect.objectContaining({ userId: "qa-user" }));
  });
  it("privilégie le mot de passe navigateur lorsque les deux champs existent", () => {
    expect(getBrowserPasswordHash({ passwordHash: "current", password_hash: "older" })).toBe("current");
  });
});

it.each(["", "abc", "mot de passe vétérinaire 🐕", "a".repeat(55), "a".repeat(56), "a".repeat(64), "a".repeat(100)])("vérifie les anciens SHA-256 avec les vecteurs de référence (%s)", async password => {
  const hash = createHash("sha256").update(password).digest("hex");
  expect(await verifyPassword(password, hash)).toBe(true);
  expect(await verifyPassword(password + "incorrect", hash)).toBe(false);
});
it("vérifie toujours les mots de passe bcrypt actuels", async () => {
  mock.user.passwordHash = await hashPassword("current-password");
  await expect(login({ email: "qa@example.test", password: "wrong-password" })).rejects.toThrow("incorrect");
  expect(mock.inserts).not.toHaveBeenCalled();
  await expect(login({ email: "qa@example.test", password: "current-password" })).resolves.toMatchObject({ id: "qa-user" });
});
