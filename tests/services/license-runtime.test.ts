import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  state: null as any,
  renew: vi.fn(),
  activate: vi.fn(),
  verify: vi.fn(),
  save: vi.fn(),
}));
vi.mock("@/services/appSettingsService", () => ({
  getLicenseInfo: async () => mock.state,
  saveLicenseState: async (state: any) => {
    mock.save(state);
    mock.state = state;
  },
}));
vi.mock("@/services/licenseActivationService", () => ({
  LICENSE_PUBLIC_KEY: "public",
  getDeviceId: async () => "device",
  renewLicenseActivation: mock.renew,
  activateLicense: mock.activate,
  LicenseActivationError: class extends Error {
    constructor(
      message: string,
      public status = 0,
      public code = ""
    ) {
      super(message);
    }
  },
}));
vi.mock("@/services/licenseLease", async (importOriginal) => ({
  ...(await importOriginal<any>()),
  verifyLicenseLease: mock.verify,
}));
import {
  acceptLicenseActivation,
  checkLicenseAccess,
} from "@/services/licenseRuntime";
import { LicenseActivationError } from "@/services/licenseActivationService";
const now = Date.parse("2026-09-22T12:00:00Z");
const lease = {
  v: 2,
  aud: "baitari-desktop",
  sub: "one",
  email: "clinic@example.test",
  deviceId: "device",
  plan: "clinic",
  issuedAt: now - 1000,
  expiresAt: null,
  leaseUntil: now + 86400000,
};
beforeEach(() => {
  vi.spyOn(Date, "now").mockReturnValue(now);
  mock.renew.mockReset();
  mock.activate.mockReset();
  mock.save.mockReset();
  mock.verify.mockReset().mockResolvedValue({ ...lease });
  mock.state = {
    key: "",
    email: lease.email,
    activationToken: "signed",
    activatedAt: "",
    lastSeen: now,
  };
});
describe("license access lifecycle", () => {
  it("requires activation when no credentials are stored", async () => {
    mock.state = null;
    expect((await checkLicenseAccess()).allowed).toBe(false);
  });
  it("keeps a valid signed lease during a network outage without extending its deadline", async () => {
    mock.renew.mockRejectedValue(new Error("offline"));
    const result = await checkLicenseAccess(true);
    expect(result.allowed).toBe(true);
    expect(result.offlineUntil).toBe(lease.leaseUntil);
    expect(mock.state.activationToken).toBe("signed");
  });
  it("never treats revoked access as an outage and preserves denial after restart/offline", async () => {
    mock.renew.mockRejectedValue(
      new LicenseActivationError("Révoquée", 403, "REVOKED")
    );
    expect((await checkLicenseAccess(true)).allowed).toBe(false);
    expect(mock.state.denied).toBe("Révoquée");
    mock.renew.mockRejectedValue(new Error("offline"));
    expect((await checkLicenseAccess()).allowed).toBe(false);
  });
  it("denies expired offline leases and clock rollback", async () => {
    mock.renew.mockRejectedValue(new Error("offline"));
    mock.verify.mockResolvedValue({ ...lease, leaseUntil: now });
    expect((await checkLicenseAccess()).allowed).toBe(false);
    mock.verify.mockResolvedValue(lease);
    mock.state.lastSeen = now + 3600000;
    expect((await checkLicenseAccess()).message).toContain("horloge");
  });
  it("requires an online migration for legacy unsigned activation", async () => {
    mock.state.key = "legacy";
    mock.verify.mockRejectedValue(new Error("unsigned"));
    mock.activate.mockRejectedValue(new Error("offline"));
    expect((await checkLicenseAccess()).allowed).toBe(false);
    expect(mock.activate).toHaveBeenCalledWith(lease.email, "legacy");
  });
  it("renews online and clears denial only after a verified response", async () => {
    mock.state.denied = "expired";
    mock.renew.mockResolvedValue({ activationToken: "new" });
    expect((await checkLicenseAccess(true)).allowed).toBe(true);
    expect(mock.state.denied).toBeUndefined();
    expect(mock.state.activationToken).toBe("new");
  });
  it("does not persist unverifiable activation and drops raw license keys on success", async () => {
    mock.verify.mockRejectedValueOnce(new Error("invalid"));
    await expect(
      acceptLicenseActivation(lease.email, "fake")
    ).rejects.toThrow();
    expect(mock.save).not.toHaveBeenCalled();
    await acceptLicenseActivation(lease.email, "good");
    expect(mock.state.key).toBe("");
  });
  it("coalesces concurrent verification requests", async () => {
    mock.renew.mockResolvedValue({ activationToken: "new" });
    await Promise.all([checkLicenseAccess(true), checkLicenseAccess(true)]);
    expect(mock.renew).toHaveBeenCalledTimes(1);
  });
});
