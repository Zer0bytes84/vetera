import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("@/services/browser-store", () => ({ isTauriRuntime: () => false }));
beforeEach(() => {
  vi.resetModules();
  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) });
  vi.stubEnv("VITE_LICENSE_SERVER_URL", "https://activation.example.test");
  vi.stubEnv("VITE_LICENSE_PUBLIC_KEY", "test-public-key");
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it("conserve l’identité du poste même sans randomUUID", async () => {
  vi.stubGlobal("crypto", { getRandomValues: webcrypto.getRandomValues.bind(webcrypto) });
  const { getDeviceId } = await import("@/services/licenseActivationService");
  const first = await getDeviceId();
  expect(first).toMatch(/^[0-9a-f-]{36}$/);
  expect(await getDeviceId()).toBe(first);
  expect(localStorage.getItem("baitari-license-installation-v2")).toBe(first);
});
it("explique la restriction HTTP avant toute demande d’activation ou de renouvellement", async () => {
  vi.stubGlobal("crypto", { getRandomValues: webcrypto.getRandomValues.bind(webcrypto) });
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  const { activateLicense, renewLicenseActivation } = await import("@/services/licenseActivationService");
  await expect(activateLicense("qa@example.test", "test-key")).rejects.toMatchObject({ code: "SECURE_CONTEXT_REQUIRED" });
  await expect(renewLicenseActivation("test-token", "qa@example.test")).rejects.toMatchObject({ code: "SECURE_CONTEXT_REQUIRED" });
  expect(fetch).not.toHaveBeenCalled();
});
