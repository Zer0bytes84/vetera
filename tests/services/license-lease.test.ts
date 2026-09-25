import { generateKeyPairSync, sign } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  getLeaseTimeError,
  verifyLicenseLease,
  type LicenseLease,
} from "@/services/licenseLease";
const keys = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const publicKey = keys.publicKey
  .export({ type: "spki", format: "der" })
  .toString("base64");
const time = Date.parse("2026-09-22T12:00:00Z");
const lease: LicenseLease = {
  v: 2,
  aud: "baitari-desktop",
  sub: "license-1",
  email: "clinic@example.test",
  deviceId: "device-1",
  plan: "clinic",
  issuedAt: time,
  expiresAt: null,
  leaseUntil: time + 7 * 86400000,
};
function token(payload = lease) {
  const p = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${p}.${sign("sha256", Buffer.from(p), { key: keys.privateKey, dsaEncoding: "ieee-p1363" }).toString("base64url")}`;
}
describe("signed license lease", () => {
  it("verifies Node signatures using browser WebCrypto", async () => {
    expect(
      await verifyLicenseLease(
        token(),
        publicKey,
        "device-1",
        "CLINIC@example.test"
      )
    ).toEqual(lease);
  });
  it("rejects tampering and a different server key", async () => {
    const [p, s] = token().split(".");
    const edited = Buffer.from(
      JSON.stringify({ ...lease, leaseUntil: time + 999999999 })
    ).toString("base64url");
    await expect(
      verifyLicenseLease(`${edited}.${s}`, publicKey, "device-1", lease.email)
    ).rejects.toThrow();
    const other = generateKeyPairSync("ec", { namedCurve: "prime256v1" })
      .publicKey.export({ type: "spki", format: "der" })
      .toString("base64");
    await expect(
      verifyLicenseLease(`${p}.${s}`, other, "device-1", lease.email)
    ).rejects.toThrow();
  });
  it("rejects a copied activation on another installation or email", async () => {
    await expect(
      verifyLicenseLease(token(), publicKey, "device-2", lease.email)
    ).rejects.toThrow();
    await expect(
      verifyLicenseLease(token(), publicKey, "device-1", "other@example.test")
    ).rejects.toThrow();
  });
  it("rejects unlimited trials, overlong leases, and missing fields even when signed", async () => {
    for (const payload of [
      { ...lease, plan: "trial" },
      { ...lease, leaseUntil: time + 8 * 86400000 },
      { ...lease, expiresAt: time + 100 },
      { ...lease, issuedAt: undefined },
    ])
      await expect(
        verifyLicenseLease(
          token(payload as LicenseLease),
          publicKey,
          "device-1",
          lease.email
        )
      ).rejects.toThrow();
  });
  it("expires at the exact lease boundary without locally extending access", () => {
    expect(getLeaseTimeError(lease, lease.leaseUntil - 1)).toBeNull();
    expect(getLeaseTimeError(lease, lease.leaseUntil)).toContain("sept jours");
  });
  it("checks license expiry and clock rollback", () => {
    expect(
      getLeaseTimeError({ ...lease, expiresAt: time + 1000 }, time + 1000)
    ).toContain("expiré");
    expect(getLeaseTimeError(lease, time, time + 3600000)).toContain("horloge");
  });
});
