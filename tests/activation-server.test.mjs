import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createPublicKey, verify } from "node:crypto";
import {
  createActivationServer,
  LEASE_MS,
} from "../activation-server/server.mjs";
import { validateLicenseBuild } from "../scripts/license-build-config.mjs";
const admin = "test-administrator-token-only-123456";
async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), "baitari-license-"));
  let clock = Date.parse("2026-09-22T12:00:00Z");
  let service, base;
  async function start() {
    service = await createActivationServer({
      dataDir: dir,
      adminToken: admin,
      now: () => clock,
    });
    await new Promise((r) => service.server.listen(0, "127.0.0.1", r));
    base = `http://127.0.0.1:${service.server.address().port}`;
  }
  async function stop() {
    service.server.closeAllConnections();
    await new Promise((r) => service.server.close(r));
  }
  await start();
  t.after(async () => {
    await stop();
    await rm(dir, { recursive: true, force: true });
  });
  const request = async (path, body, token = admin, extra = {}) => {
    const response = await fetch(base + path, {
      method: body !== undefined ? "POST" : "GET",
      headers: {
        "content-type": "application/json",
        "x-admin-token": token,
        ...extra,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return { status: response.status, ...(await response.json()) };
  };
  const rawRequest = (path, init = {}) => fetch(base + path, init);
  const create = async (input = {}) =>
    request("/v1/admin/licenses", {
      email: "clinic@example.test",
      plan: "clinic",
      maxDevices: 1,
      ...input,
    });
  const activate = async (
    key,
    deviceId = "device-A",
    email = "clinic@example.test"
  ) => request("/v1/activate", { key, deviceId, email }, "");
  const renew = async (token, deviceId = "device-A") =>
    request("/v1/verify", { activationToken: token, deviceId }, "");
  return {
    request,
    rawRequest,
    origin: () => base,
    create,
    activate,
    renew,
    dir,
    publicKey: service.publicKeyBase64,
    advance: (ms) => {
      clock += ms;
    },
    restart: async () => {
      await stop();
      await start();
    },
  };
}
test("administration refuses missing or wrong token and disallowed origins", async (t) => {
  const f = await fixture(t);
  assert.equal(
    (await f.request("/v1/admin/licenses", undefined, "")).status,
    401
  );
  assert.equal(
    (await f.request("/v1/admin/verify", undefined, "wrong")).status,
    401
  );
  assert.equal(
    (
      await f.request("/v1/admin/verify", undefined, admin, {
        origin: "https://untrusted.test",
      })
    ).status,
    403
  );
});
test("hosted admin page is served with a restrictive CSP and same-origin admin API works", async (t) => {
  const f = await fixture(t);
  const page = await f.rawRequest("/admin");
  assert.equal(page.status, 200);
  assert.match(page.headers.get("content-security-policy"), /script-src 'self'/);
  assert.match(await page.text(), /id="login-view"/);
  assert.equal(
    (
      await f.request("/v1/admin/verify", undefined, admin, {
        origin: f.origin(),
      })
    ).status,
    200
  );
});
test("activation signs a bounded lease and rejects wrong email/key", async (t) => {
  const f = await fixture(t);
  const c = await f.create();
  assert.equal(c.status, 201);
  const a = await f.activate(c.licenseKey);
  assert.equal(a.status, 200);
  const [p, s] = a.activationToken.split(".");
  assert.equal(
    verify(
      "sha256",
      Buffer.from(p),
      {
        key: createPublicKey({
          key: Buffer.from(f.publicKey, "base64"),
          format: "der",
          type: "spki",
        }),
        dsaEncoding: "ieee-p1363",
      },
      Buffer.from(s, "base64url")
    ),
    true
  );
  const lease = JSON.parse(Buffer.from(p, "base64url"));
  assert.equal(lease.leaseUntil - lease.issuedAt, LEASE_MS);
  assert.equal(
    (await f.activate(c.licenseKey, "device-A", "other@example.test")).status,
    403
  );
  assert.equal((await f.activate("AAAA-BBBB-CCCC-DDDD")).status, 403);
  assert.equal(
    (await f.activate(c.licenseKey.toLowerCase().replaceAll("-", ""))).status,
    200
  );
});
test("same device is idempotent and concurrent seats cannot exceed limit", async (t) => {
  const f = await fixture(t);
  const c = await f.create();
  const results = await Promise.all([
    f.activate(c.licenseKey, "one"),
    f.activate(c.licenseKey, "two"),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  const winner = results[0].status === 200 ? "one" : "two";
  assert.equal((await f.activate(c.licenseKey, winner)).license.deviceCount, 1);
});
test("revocation rejects already issued leases and persists after restart", async (t) => {
  const f = await fixture(t);
  const c = await f.create();
  const a = await f.activate(c.licenseKey);
  assert.equal(
    (await f.request(`/v1/admin/licenses/${c.license.id}/revoke`, {})).status,
    200
  );
  await f.restart();
  assert.equal((await f.renew(a.activationToken)).code, "REVOKED");
  assert.equal((await f.activate(c.licenseKey)).code, "REVOKED");
});
test("expiry bounds offline lease and denies renewal at exact expiration", async (t) => {
  const f = await fixture(t);
  const c = await f.create({
    plan: "trial",
    expiresAt: "2026-09-23T12:00:00.000Z",
  });
  const a = await f.activate(c.licenseKey);
  const payload = JSON.parse(
    Buffer.from(a.activationToken.split(".")[0], "base64url")
  );
  assert.equal(payload.leaseUntil, payload.expiresAt);
  f.advance(24 * 60 * 60 * 1000);
  assert.equal((await f.renew(a.activationToken)).code, "EXPIRED");
  assert.equal((await f.activate(c.licenseKey)).code, "EXPIRED");
});
test("invalid, normalized-impossible, past dates and endless trials are refused", async (t) => {
  const f = await fixture(t);
  for (const expiresAt of [
    "invalid",
    "2020-01-01T00:00:00Z",
    "2027-02-30T12:00:00Z",
    42,
    "",
  ])
    assert.equal((await f.create({ expiresAt })).status, 400);
  assert.equal((await f.create({ plan: "trial" })).status, 400);
  for (const maxDevices of [0, -1, 1.5, 21, "2"])
    assert.equal((await f.create({ maxDevices })).status, 400);
});
test("renewal checks signature and binding but allows expired offline lease online", async (t) => {
  const f = await fixture(t);
  const c = await f.create();
  const a = await f.activate(c.licenseKey);
  assert.equal(
    (await f.renew(a.activationToken, "other-device")).code,
    "DEVICE_MISMATCH"
  );
  const [p, s] = a.activationToken.split(".");
  const changed = Buffer.from(
    JSON.stringify({
      ...JSON.parse(Buffer.from(p, "base64url")),
      plan: "trial",
    })
  ).toString("base64url");
  assert.equal((await f.renew(`${changed}.${s}`)).code, "INVALID_TOKEN");
  f.advance(LEASE_MS + 1);
  assert.equal((await f.renew(a.activationToken)).status, 200);
});
test("release seat invalidates its lease and makes room for replacement", async (t) => {
  const f = await fixture(t);
  const c = await f.create();
  const a = await f.activate(c.licenseKey);
  const released = await f.request(
    `/v1/admin/licenses/${c.license.id}/release-device`,
    { deviceId: "device-A" }
  );
  assert.equal(released.license.deviceCount, 0);
  assert.equal((await f.renew(a.activationToken)).code, "DEVICE_REMOVED");
  assert.equal((await f.activate(c.licenseKey, "replacement")).status, 200);
});
test("keys are hashed at rest and signing identity survives restart", async (t) => {
  const f = await fixture(t);
  const c = await f.create();
  const a = await f.activate(c.licenseKey);
  const content = await readFile(join(f.dir, "licenses.json"), "utf8");
  assert.equal(content.includes(c.licenseKey), false);
  await f.restart();
  assert.equal((await f.renew(a.activationToken)).status, 200);
});
test("one-time migration imports validated license records only into an empty store", async (t) => {
  const f = await fixture(t);
  const fingerprint = "a".repeat(64);
  const record = {
    id: "legacy-license-001",
    email: "legacy@example.test",
    plan: "clinic",
    createdAt: "2026-09-01T12:00:00.000Z",
    expiresAt: null,
    maxDevices: 2,
    devices: ["legacy-device"],
    revokedAt: null,
  };
  const imported = await f.request("/v1/admin/migrate-import", {
    licenses: { [fingerprint]: record },
  });
  assert.equal(imported.status, 200);
  assert.equal(imported.imported, 1);
  const listed = await f.request("/v1/admin/licenses");
  assert.equal(listed.licenses.length, 1);
  assert.equal(listed.licenses[0].email, record.email);
  assert.equal(listed.licenses[0].devices[0], "legacy-device");

  const repeated = await f.request("/v1/admin/migrate-import", {
    licenses: { [fingerprint]: record },
  });
  assert.equal(repeated.status, 409);
  assert.equal(repeated.code, "IMPORT_REQUIRES_EMPTY_STORE");
});
test("migration rejects malformed fingerprints and records without changing storage", async (t) => {
  const f = await fixture(t);
  const invalid = await f.request("/v1/admin/migrate-import", {
    licenses: {
      bad: {
        id: "legacy-license-001",
        email: "legacy@example.test",
        plan: "clinic",
        createdAt: "2026-09-01T12:00:00.000Z",
        expiresAt: null,
        maxDevices: 2,
        devices: [],
        revokedAt: null,
      },
    },
  });
  assert.equal(invalid.status, 400);
  assert.equal((await f.request("/v1/admin/licenses")).licenses.length, 0);
});
test("shipping config rejects localhost, HTTP, missing and wrong public keys", async (t) => {
  const f = await fixture(t);
  for (const url of [
    "",
    "http://example.test",
    "https://127.0.0.1:8787",
    "https://localhost",
    "https://user:secret@example.test",
  ])
    assert.throws(() => validateLicenseBuild(url, f.publicKey));
  assert.throws(() =>
    validateLicenseBuild("https://activation.example.test", "bad")
  );
  assert.doesNotThrow(() =>
    validateLicenseBuild("https://activation.example.test", f.publicKey)
  );
});
