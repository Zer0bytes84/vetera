import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  state: null as any,
  renew: vi.fn(),
  activate: vi.fn(),
  verify: vi.fn(),
  save: vi.fn(),
}));
vi.mock("@/services/appSettingsService", () => ({
  getLicenseInfo: async () => {
    if (mock.state === "locked") throw new Error("database is locked");
    return mock.state;
  },
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
  getCachedLicenseAccess,
  LICENSE_BACKGROUND_TIMEOUT_MS,
  LICENSE_LOCAL_RECHECK_MS,
  LICENSE_ONLINE_RECHECK_MS,
  recheckLicenseInBackground,
  resetLicenseRuntimeCache,
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
  resetLicenseRuntimeCache();
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
    expect(mock.activate.mock.calls[0].slice(0, 2)).toEqual([lease.email, "legacy"]);
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

describe("background rechecks after the startup check", () => {
  const at = (ms: number) => vi.spyOn(Date, "now").mockReturnValue(now + ms);

  it("keeps the verified access in memory, bounded by its signed lease", async () => {
    mock.renew.mockResolvedValue({ activationToken: "new" });
    expect(getCachedLicenseAccess()).toBeNull();
    await checkLicenseAccess(true);
    expect(getCachedLicenseAccess()?.allowed).toBe(true);
    expect(getCachedLicenseAccess(lease.leaseUntil)).toBeNull();
  });

  it("asks nothing while no recheck is due, then the lease every 5 min and the server every 15 min", async () => {
    mock.renew.mockResolvedValue({ activationToken: "new" });
    await checkLicenseAccess(true);
    mock.renew.mockClear();
    mock.save.mockClear();
    expect(recheckLicenseInBackground("visibility", now + 60_000)).toBeNull();
    expect(recheckLicenseInBackground("interval", now + LICENSE_LOCAL_RECHECK_MS - 1)).toBeNull();
    at(LICENSE_LOCAL_RECHECK_MS);
    expect((await recheckLicenseInBackground("interval", now + LICENSE_LOCAL_RECHECK_MS))?.allowed).toBe(true);
    expect(mock.renew).not.toHaveBeenCalled();
    at(LICENSE_ONLINE_RECHECK_MS);
    await recheckLicenseInBackground("visibility", now + LICENSE_ONLINE_RECHECK_MS);
    expect(mock.renew).toHaveBeenCalledTimes(1);
    expect(mock.renew.mock.calls[0][2]).toBe(LICENSE_BACKGROUND_TIMEOUT_MS);
  });

  it("applies a revocation at the next server recheck", async () => {
    mock.renew.mockResolvedValue({ activationToken: "new" });
    await checkLicenseAccess(true);
    mock.renew.mockRejectedValue(new LicenseActivationError("Révoquée", 403, "REVOKED"));
    at(LICENSE_ONLINE_RECHECK_MS);
    const result = await recheckLicenseInBackground("interval", now + LICENSE_ONLINE_RECHECK_MS);
    expect(result?.allowed).toBe(false);
    expect(result?.message).toBe("Révoquée");
    expect(getCachedLicenseAccess()).toBeNull();
  });

  it("keeps the granted access when the check itself fails, never past the lease", async () => {
    mock.renew.mockResolvedValue({ activationToken: "new" });
    await checkLicenseAccess(true);
    mock.state = "locked";
    // The bare check still reports the failure as it always did.
    at(LICENSE_LOCAL_RECHECK_MS);
    expect((await checkLicenseAccess()).allowed).toBe(false);
    // A background recheck that cannot run decides nothing: the access holds.
    const kept = await recheckLicenseInBackground("interval", now + LICENSE_LOCAL_RECHECK_MS);
    expect(kept?.allowed).toBe(true);
    // Past the signed lease, nothing is kept.
    at(lease.leaseUntil);
    const late = await recheckLicenseInBackground("interval", lease.leaseUntil);
    expect(late?.allowed).toBe(false);
  });

  it("stays offline (banner, reconnection retry) until the server answers again", async () => {
    mock.renew.mockRejectedValue(new Error("offline"));
    expect((await checkLicenseAccess(true)).offlineUntil).toBe(lease.leaseUntil);
    at(LICENSE_LOCAL_RECHECK_MS);
    const local = await recheckLicenseInBackground("interval", now + LICENSE_LOCAL_RECHECK_MS);
    expect(local?.offlineUntil).toBe(lease.leaseUntil);
    mock.renew.mockResolvedValue({ activationToken: "new" });
    at(LICENSE_LOCAL_RECHECK_MS + 1000);
    const back = await recheckLicenseInBackground("online", now + LICENSE_LOCAL_RECHECK_MS + 1000);
    expect(back?.offlineUntil).toBeUndefined();
    expect(mock.renew).toHaveBeenCalledTimes(2);
  });

  it("runs a server check after a local one already in flight", async () => {
    mock.renew.mockResolvedValue({ activationToken: "new" });
    await Promise.all([checkLicenseAccess(false), checkLicenseAccess(true)]);
    expect(mock.renew).toHaveBeenCalledTimes(1);
  });
});
