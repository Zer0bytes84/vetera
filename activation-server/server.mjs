#!/usr/bin/env node
import {
  createHmac,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  randomBytes,
  sign,
  timingSafeEqual,
  verify,
} from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createFileStore } from "./file-store.mjs";

export const LEASE_MS = 7 * 24 * 60 * 60 * 1000;
const root = dirname(fileURLToPath(import.meta.url));
const normalizeEmail = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";
const normalizeKey = (value) =>
  typeof value === "string"
    ? value.replace(/[^a-z0-9]/gi, "").toUpperCase()
    : "";
const safeEqual = (left, right) => {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
};
const failure = (status, code, message) =>
  Object.assign(new Error(message), { status, code });
async function readOrCreate(path, generate) {
  try {
    return (await readFile(path, "utf8")).trim();
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    const value = generate();
    try {
      await writeFile(path, `${value}\n`, { flag: "wx", mode: 0o600 });
      return value;
    } catch (writeError) {
      if (writeError.code !== "EEXIST") throw writeError;
      return (await readFile(path, "utf8")).trim();
    }
  }
}
function parseBody(request) {
  // Vercel may have parsed the request before invoking the Node handler.
  if (request.body !== undefined) {
    try {
      const raw =
        typeof request.body === "string" || Buffer.isBuffer(request.body)
          ? String(request.body)
          : JSON.stringify(request.body);
      if (Buffer.byteLength(raw) > 32_000)
        return Promise.reject(
          failure(413, "PAYLOAD_TOO_LARGE", "Requête trop volumineuse.")
        );
      const value = JSON.parse(raw);
      if (!value || typeof value !== "object" || Array.isArray(value))
        throw new Error();
      return Promise.resolve(value);
    } catch {
      return Promise.reject(
        failure(400, "INVALID_JSON", "Objet JSON invalide.")
      );
    }
  }
  return new Promise((resolveBody, reject) => {
    let chunks = [];
    let length = 0;
    let failed = false;
    request.on("data", (chunk) => {
      if (failed) return;
      length += chunk.length;
      if (length > 32_000) {
        failed = true;
        chunks = [];
        reject(failure(413, "PAYLOAD_TOO_LARGE", "Requête trop volumineuse."));
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      if (failed) return;
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString() || "{}");
        if (!body || typeof body !== "object" || Array.isArray(body))
          throw new Error();
        resolveBody(body);
      } catch {
        reject(failure(400, "INVALID_JSON", "Objet JSON invalide."));
      }
    });
    request.on("error", reject);
  });
}
function newKey() {
  // 80 random bits, displayed in groups for manual entry.
  return randomBytes(10)
    .toString("hex")
    .toUpperCase()
    .match(/.{1,4}/g)
    .join("-");
}
export async function createActivationServer(options = {}) {
  const dataDir = resolve(
    options.dataDir ?? process.env.ACTIVATION_DATA_DIR ?? join(root, "data")
  );
  const now = options.now ?? Date.now;
  let serverSecret, privatePem, adminToken;
  if (options.secrets) {
    ({ serverSecret, privatePem, adminToken } = options.secrets);
    if (!serverSecret || serverSecret.length < 32 || !privatePem || !adminToken)
      throw new Error("Configuration du serveur incomplète.");
  } else {
    if (process.env.VERCEL)
      throw new Error("Le stockage persistant est obligatoire sur Vercel.");
    await mkdir(dataDir, { recursive: true, mode: 0o700 });
    serverSecret = await readOrCreate(join(dataDir, "server-secret"), () =>
      randomBytes(32).toString("hex")
    );
    privatePem = await readOrCreate(
      join(dataDir, "signing-private.pem"),
      () =>
        generateKeyPairSync("ec", {
          namedCurve: "prime256v1",
          privateKeyEncoding: { type: "pkcs8", format: "pem" },
          publicKeyEncoding: { type: "spki", format: "pem" },
        }).privateKey
    );
    adminToken =
      options.adminToken ??
      process.env.ACTIVATION_ADMIN_TOKEN ??
      (await readOrCreate(join(dataDir, "admin-token"), () =>
        randomBytes(32).toString("base64url")
      ));
  }
  const privateKey = createPrivateKey(privatePem);
  const publicKey = createPublicKey(privateKey);
  const publicKeyBase64 = publicKey
    .export({ type: "spki", format: "der" })
    .toString("base64");
  if (!options.secrets)
    await writeFile(
      join(dataDir, "signing-public.txt"),
      `${publicKeyBase64}\n`,
      { mode: 0o644 }
    );
  if (adminToken.length < 24)
    throw new Error(
      "Le jeton administrateur doit contenir au moins 24 caractères."
    );
  const storage =
    options.storage ?? (await createFileStore(join(dataDir, "licenses.json")));
  const transaction = (change) => storage.transaction(change);
  const hashKey = (key) =>
    createHmac("sha256", serverSecret).update(normalizeKey(key)).digest("hex");
  const publicLicense = (record) => ({
    id: record.id,
    email: record.email,
    plan: record.plan,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
    maxDevices: record.maxDevices,
    deviceCount: record.devices.length,
    revokedAt: record.revokedAt ?? null,
  });
  const adminLicense = (record) => ({
    ...publicLicense(record),
    devices: record.devices,
  });
  function checkRecord(record) {
    if (!record)
      throw failure(
        403,
        "INVALID_LICENSE",
        "Licence ou adresse email invalide."
      );
    if (record.revokedAt)
      throw failure(403, "REVOKED", "Cette licence a été révoquée.");
    if (
      record.expiresAt &&
      (!Number.isFinite(Date.parse(record.expiresAt)) ||
        Date.parse(record.expiresAt) <= now())
    )
      throw failure(403, "EXPIRED", "Cette licence a expiré.");
  }
  function tokenFor(record, deviceId) {
    const issuedAt = now();
    const payload = {
      v: 2,
      aud: "baitari-desktop",
      sub: record.id,
      email: record.email,
      deviceId,
      plan: record.plan,
      issuedAt,
      expiresAt: record.expiresAt ? Date.parse(record.expiresAt) : null,
      leaseUntil: Math.min(
        issuedAt + LEASE_MS,
        record.expiresAt ? Date.parse(record.expiresAt) : Infinity
      ),
    };
    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
    return `${encoded}.${sign("sha256", Buffer.from(encoded), { key: privateKey, dsaEncoding: "ieee-p1363" }).toString("base64url")}`;
  }
  function tokenPayload(token) {
    if (typeof token !== "string" || token.length > 8000)
      throw failure(403, "INVALID_TOKEN", "Activation invalide.");
    const parts = token.split(".");
    try {
      if (
        parts.length !== 2 ||
        !verify(
          "sha256",
          Buffer.from(parts[0]),
          { key: publicKey, dsaEncoding: "ieee-p1363" },
          Buffer.from(parts[1], "base64url")
        )
      )
        throw new Error();
      const p = JSON.parse(Buffer.from(parts[0], "base64url").toString());
      if (p.v !== 2 || p.aud !== "baitari-desktop") throw new Error();
      return p;
    } catch {
      throw failure(
        403,
        "INVALID_TOKEN",
        "Activation invalide. Réactivez cette installation."
      );
    }
  }
  const allowedOrigins = new Set(
    (
      options.allowedOrigins ??
      process.env.ACTIVATION_ALLOWED_ORIGINS ??
      "http://localhost:5180,http://127.0.0.1:5180,tauri://localhost,http://tauri.localhost,https://tauri.localhost"
    )
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
  );
  const attempts = new Map();
  async function rateLimit(request) {
    const address = options.clientAddress
      ? options.clientAddress(request)
      : request.socket.remoteAddress;
    if (storage.consumeRateLimit) {
      const allowed = await storage.consumeRateLimit(
        createHmac("sha256", serverSecret)
          .update(address || "unknown")
          .digest("hex"),
        now()
      );
      if (!allowed)
        throw failure(
          429,
          "RATE_LIMIT",
          "Trop de tentatives. Réessayez dans une minute."
        );
      return;
    }
    const time = now();
    for (const [key, entry] of attempts)
      if (time - entry.start >= 60_000) attempts.delete(key);
    const entry = attempts.get(address) ?? { start: time, count: 0 };
    entry.count++;
    attempts.set(address, entry);
    if (entry.count > 60 || attempts.size > 10_000)
      throw failure(
        429,
        "RATE_LIMIT",
        "Trop de tentatives. Réessayez dans une minute."
      );
  }
  function requireAdmin(request) {
    if (!safeEqual(request.headers["x-admin-token"] ?? "", adminToken))
      throw failure(
        401,
        "ADMIN_UNAUTHORIZED",
        "Jeton administrateur invalide."
      );
  }
  function isSameOrigin(request, origin) {
    if (!origin || origin === "null") return false;
    const forwardedHost = String(
      request.headers["x-forwarded-host"] || request.headers.host || ""
    )
      .split(",")[0]
      .trim()
      .toLowerCase();
    const forwardedProtocol = String(
      request.headers["x-forwarded-proto"] || "http"
    )
      .split(",")[0]
      .trim()
      .toLowerCase();
    try {
      const parsed = new URL(origin);
      return (
        parsed.host.toLowerCase() === forwardedHost &&
        parsed.protocol === `${forwardedProtocol}:`
      );
    } catch {
      return false;
    }
  }
  const staticFiles = new Map([
    ["/admin.html", ["admin.html", "text/html; charset=utf-8"]],
    ["/admin.js", ["admin.js", "text/javascript; charset=utf-8"]],
    ["/admin.css", ["admin.css", "text/css; charset=utf-8"]],
    ["/baitari-mark.svg", ["baitari-mark.svg", "image/svg+xml"]],
  ]);
  async function handle(request, response) {
    const origin = request.headers.origin;
    const originAllowed =
      !origin || allowedOrigins.has(origin) || isSameOrigin(request, origin);
    const headers = {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
      "x-content-type-options": "nosniff",
      ...(origin && originAllowed
        ? {
            "access-control-allow-origin": origin,
            vary: "Origin",
            "access-control-allow-headers": "content-type, x-admin-token",
            "access-control-allow-methods": "GET, POST, OPTIONS",
          }
        : {}),
    };
    const send = (status, payload) => {
      response.writeHead(status, headers);
      response.end(JSON.stringify(payload));
    };
    try {
      if (origin && !originAllowed)
        throw failure(403, "ORIGIN_DENIED", "Origine non autorisée.");
      if (request.method === "OPTIONS") return send(204, {});
      const url = new URL(request.url, "http://localhost");
      const path = url.pathname;
      if (request.method === "GET" && path === "/admin") {
        const html = await readFile(join(root, "admin.html"));
        response.writeHead(200, {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
          "content-security-policy":
            "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
          "x-content-type-options": "nosniff",
          "referrer-policy": "no-referrer",
          "x-frame-options": "DENY",
        });
        response.end(html);
        return;
      }
      if (request.method === "GET" && staticFiles.has(path)) {
        const [fileName, contentType] = staticFiles.get(path);
        const content = await readFile(join(root, fileName));
        response.writeHead(200, {
          "content-type": contentType,
          "cache-control": "no-store",
          "x-content-type-options": "nosniff",
        });
        response.end(content);
        return;
      }
      if (request.method === "GET" && path === "/") {
        response.writeHead(200, {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
          "content-security-policy":
            "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'",
        });
        response.end(
          '<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Baitari · Activation</title><body style="font:15px system-ui,-apple-system,sans-serif;max-width:680px;margin:12vh auto;padding:32px;color:#191d25;background:#f5f6f7"><img src="/baitari-mark.svg" width="36" height="36" alt="Baitari"><h1>Serveur d’activation Baitari</h1><p>Le service est prêt. Connectez-vous à la console pour gérer les licences et les appareils autorisés.</p><p><a href="/admin" style="display:inline-flex;align-items:center;padding:12px 18px;border-radius:10px;background:#191d25;color:white;text-decoration:none;font-weight:600">Ouvrir la console d’administration →</a></p><p style="color:#78808d;font-size:13px">La console demande le jeton administrateur privé. Il n’est pas conservé dans le navigateur après la fermeture de session.</p></body></html>'
        );
        return;
      }
      if (request.method === "GET" && path === "/v1/health")
        return send(200, {
          ok: true,
          service: "baitari-activation",
          protocol: 2,
        });
      if (path.startsWith("/v1/admin/")) {
        await rateLimit(request);
        requireAdmin(request);
      }
      if (request.method === "GET" && path === "/v1/admin/verify")
        return send(200, { ok: true, valid: true });
      if (request.method === "GET" && path === "/v1/admin/licenses") {
        const store = await storage.read();
        return send(200, {
          licenses: Object.values(store.licenses).map(adminLicense),
        });
      }
      if (request.method === "POST" && path === "/v1/admin/migrate-import") {
        const body = await parseBody(request);
        const incoming = body.licenses;
        if (
          !incoming ||
          typeof incoming !== "object" ||
          Array.isArray(incoming) ||
          Object.keys(incoming).length === 0 ||
          Object.keys(incoming).length > 50
        )
          throw failure(400, "INVALID_IMPORT", "Import de licences invalide.");

        const imported = {};
        const seenIds = new Set();
        for (const [fingerprint, value] of Object.entries(incoming)) {
          if (!/^[a-f0-9]{64}$/.test(fingerprint) || !value || typeof value !== "object")
            throw failure(400, "INVALID_IMPORT", "Import de licences invalide.");
          const email = normalizeEmail(value.email);
          const dateIsValid = (date) =>
            typeof date === "string" &&
            Number.isFinite(Date.parse(date)) &&
            new Date(date).toISOString() === date;
          if (
            typeof value.id !== "string" ||
            !value.id.trim() ||
            value.id.length > 100 ||
            seenIds.has(value.id) ||
            email.length > 254 ||
            !/^[^\s<>"']+@[^\s<>"']+\.[^\s<>"']+$/.test(email) ||
            !["trial", "clinic"].includes(value.plan) ||
            !dateIsValid(value.createdAt) ||
            (value.expiresAt !== null && !dateIsValid(value.expiresAt)) ||
            (value.revokedAt !== null && !dateIsValid(value.revokedAt)) ||
            !Number.isInteger(value.maxDevices) ||
            value.maxDevices < 1 ||
            value.maxDevices > 20 ||
            !Array.isArray(value.devices) ||
            value.devices.length > value.maxDevices ||
            value.devices.some(
              (device) => typeof device !== "string" || !device.trim() || device.length > 160
            ) ||
            new Set(value.devices).size !== value.devices.length
          )
            throw failure(400, "INVALID_IMPORT", "Import de licences invalide.");
          seenIds.add(value.id);
          imported[fingerprint] = {
            id: value.id,
            email,
            plan: value.plan,
            createdAt: value.createdAt,
            expiresAt: value.expiresAt,
            maxDevices: value.maxDevices,
            devices: [...value.devices],
            revokedAt: value.revokedAt,
          };
        }
        await transaction((next) => {
          if (Object.keys(next.licenses).length)
            throw failure(
              409,
              "IMPORT_REQUIRES_EMPTY_STORE",
              "Import refusé : le serveur contient déjà des licences."
            );
          next.licenses = imported;
        });
        return send(200, { imported: Object.keys(imported).length });
      }
      if (request.method === "POST" && path === "/v1/admin/licenses") {
        const body = await parseBody(request);
        const email = normalizeEmail(body.email);
        if (
          email.length > 254 ||
          !/^[^\s<>"']+@[^\s<>"']+\.[^\s<>"']+$/.test(email)
        )
          throw failure(400, "INVALID_EMAIL", "Adresse email invalide.");
        const maxDevices = body.maxDevices ?? 2;
        if (!Number.isInteger(maxDevices) || maxDevices < 1 || maxDevices > 20)
          throw failure(
            400,
            "INVALID_DEVICE_LIMIT",
            "Le nombre de postes doit être un entier de 1 à 20."
          );
        if (body.plan !== undefined && !["trial", "clinic"].includes(body.plan))
          throw failure(400, "INVALID_PLAN", "Formule invalide.");
        let expiresAt = null;
        if (body.expiresAt !== null && body.expiresAt !== undefined) {
          if (
            typeof body.expiresAt !== "string" ||
            !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(
              body.expiresAt
            ) ||
            !Number.isFinite(Date.parse(body.expiresAt))
          )
            throw failure(400, "INVALID_EXPIRY", "Date d’expiration invalide.");
          expiresAt = new Date(body.expiresAt).toISOString();
          if (
            expiresAt.slice(0, 19) !== body.expiresAt.slice(0, 19) ||
            Date.parse(expiresAt) <= now()
          )
            throw failure(
              400,
              "INVALID_EXPIRY",
              "Choisissez une date d’expiration future valide."
            );
        }
        if (body.plan === "trial" && !expiresAt)
          throw failure(
            400,
            "INVALID_EXPIRY",
            "Une période d’essai nécessite une date de fin."
          );
        const key = newKey();
        const record = {
          id: randomBytes(10).toString("hex"),
          email,
          plan: body.plan ?? "clinic",
          createdAt: new Date(now()).toISOString(),
          expiresAt,
          maxDevices,
          devices: [],
          revokedAt: null,
        };
        await transaction((next) => {
          next.licenses[hashKey(key)] = record;
        });
        return send(201, { licenseKey: key, license: adminLicense(record) });
      }
      const revoke = path.match(/^\/v1\/admin\/licenses\/([^/]+)\/revoke$/);
      const release = path.match(
        /^\/v1\/admin\/licenses\/([^/]+)\/release-device$/
      );
      if (request.method === "POST" && (revoke || release)) {
        const body = release ? await parseBody(request) : {};
        const record = await transaction((next) => {
          const found = Object.values(next.licenses).find(
            (r) => r.id === (revoke ?? release)[1]
          );
          if (!found) throw failure(404, "NOT_FOUND", "Licence introuvable.");
          if (revoke) found.revokedAt = new Date(now()).toISOString();
          else {
            if (
              typeof body.deviceId !== "string" ||
              !found.devices.includes(body.deviceId)
            )
              throw failure(404, "DEVICE_NOT_FOUND", "Poste introuvable.");
            found.devices = found.devices.filter((id) => id !== body.deviceId);
          }
          return found;
        });
        return send(200, { license: adminLicense(record) });
      }
      if (
        request.method === "POST" &&
        (path === "/v1/activate" || path === "/v1/verify")
      ) {
        await rateLimit(request);
        const body = await parseBody(request);
        const deviceId = body.deviceId;
        if (
          typeof deviceId !== "string" ||
          !deviceId.trim() ||
          deviceId.length > 160
        )
          throw failure(
            400,
            "INVALID_DEVICE",
            "Identifiant d’appareil invalide."
          );
        let record;
        if (path === "/v1/activate") {
          const email = normalizeEmail(body.email);
          const key = normalizeKey(body.key);
          if (![16, 20].includes(key.length))
            throw failure(
              403,
              "INVALID_LICENSE",
              "Licence ou adresse email invalide."
            );
          record = await transaction((next) => {
            const found = next.licenses[hashKey(key)];
            if (!found || found.email !== email)
              throw failure(
                403,
                "INVALID_LICENSE",
                "Licence ou adresse email invalide."
              );
            checkRecord(found);
            if (!found.devices.includes(deviceId)) {
              if (found.devices.length >= found.maxDevices)
                throw failure(
                  409,
                  "DEVICE_LIMIT",
                  "Cette licence a atteint sa limite de postes."
                );
              found.devices.push(deviceId);
            }
            return found;
          });
        } else {
          const payload = tokenPayload(body.activationToken);
          const store = await storage.read();
          if (payload.deviceId !== deviceId)
            throw failure(
              403,
              "DEVICE_MISMATCH",
              "Cette activation appartient à un autre poste."
            );
          record = Object.values(store.licenses).find(
            (r) => r.id === payload.sub
          );
          checkRecord(record);
          if (
            record.email !== payload.email ||
            !record.devices.includes(deviceId)
          )
            throw failure(
              403,
              "DEVICE_REMOVED",
              "Ce poste n’est plus autorisé."
            );
        }
        return send(200, {
          activationToken: tokenFor(record, deviceId),
          license: publicLicense(record),
        });
      }
      send(404, { error: "Route introuvable.", code: "NOT_FOUND" });
    } catch (error) {
      if (!error.status) console.error("[activation]", error.message);
      send(error.status ?? 500, {
        error: error.status ? error.message : "Erreur interne du serveur.",
        code: error.code ?? "SERVER_ERROR",
      });
    }
  }
  const server = createServer((request, response) => {
    void handle(request, response);
  });
  server.requestTimeout = 15_000;
  server.headersTimeout = 10_000;
  return { server, handler: handle, publicKeyBase64 };
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const { server } = await createActivationServer();
  const port = Number(process.env.ACTIVATION_PORT ?? 8787);
  const host = process.env.ACTIVATION_HOST ?? "127.0.0.1";
  server.listen(port, host, () =>
    console.log(
      `Baitari activation server: http://${host}:${port}\nConfiguration publique : signing-public.txt ; accès administrateur : admin-token (dans le répertoire de données).`
    )
  );
}
