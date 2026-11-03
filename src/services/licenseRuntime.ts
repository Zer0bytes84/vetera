import {
  getLicenseInfo,
  saveLicenseState,
  type StoredLicense,
} from "./appSettingsService";
import {
  activateLicense,
  getDeviceId,
  LICENSE_PUBLIC_KEY,
  LicenseActivationError,
  renewLicenseActivation,
} from "./licenseActivationService";
import { getLeaseTimeError, verifyLicenseLease } from "./licenseLease";

export type LicenseAccess = {
  allowed: boolean;
  message: string;
  offlineUntil?: number;
  expiresAt?: number | null;
  /** End of the signed lease that granted this access (never extended locally). */
  leaseUntil?: number;
  email?: string;
  /** The check itself failed (local read, IPC): nothing was decided. */
  transient?: boolean;
};

export type LicenseCheckOptions = {
  /** Network timeout for the activation server; background rechecks use a short one. */
  timeoutMs?: number;
};
const TERMINAL_CODES = new Set([
  "REVOKED",
  "EXPIRED",
  "INVALID_LICENSE",
  "INVALID_TOKEN",
  "DEVICE_MISMATCH",
  "DEVICE_REMOVED",
]);
const RENEW_AFTER_MS = 12 * 60 * 60 * 1000;

export async function acceptLicenseActivation(
  email: string,
  token: string
): Promise<void> {
  const lease = await verifyLicenseLease(
    token,
    LICENSE_PUBLIC_KEY,
    await getDeviceId(),
    email
  );
  const error = getLeaseTimeError(lease, Date.now());
  if (error) throw new Error(error);
  await saveLicenseState({
    key: "",
    email: lease.email,
    activationToken: token,
    activatedAt: new Date().toISOString(),
    lastSeen: Date.now(),
  });
}

let pending: Promise<LicenseAccess> | null = null;
let pendingOnline = false;
export function checkLicenseAccess(
  forceOnline = false,
  options: LicenseCheckOptions = {}
): Promise<LicenseAccess> {
  // A local check in flight does not answer a request to ask the server.
  if (pending && forceOnline && !pendingOnline)
    return pending.then(() => checkLicenseAccess(true, options));
  if (!pending) {
    pendingOnline = forceOnline;
    pending = check(forceOnline, options)
      .catch((error): LicenseAccess => ({
        allowed: false,
        transient: true,
        message:
          error instanceof Error
            ? error.message
            : "Impossible de lire l’activation locale.",
      }))
      .then((result) => record(result, forceOnline))
      .finally(() => {
        pending = null;
        pendingOnline = false;
      });
  }
  return pending;
}

// ---------------------------------------------------------------------------
// One full check at startup, then quiet background rechecks. The last granted
// access is kept in memory for this process only: a restart always runs the
// full check again, and the cached access never outlives its signed lease.
// ---------------------------------------------------------------------------
export const LICENSE_LOCAL_RECHECK_MS = 5 * 60_000;
export const LICENSE_ONLINE_RECHECK_MS = 15 * 60_000;
export const LICENSE_BACKGROUND_TIMEOUT_MS = 4_000;
let lastAccess: LicenseAccess | null = null;
let lastCheckAt = 0;
let lastOnlineAt = 0;

function record(result: LicenseAccess, online: boolean): LicenseAccess {
  if (result.transient) return result;
  const now = Date.now();
  // A local check cannot tell that the server is back: an offline access stays
  // offline (banner and reconnection retry) until the server answers again.
  const access =
    !online && result.allowed && !result.offlineUntil && lastAccess?.allowed && lastAccess.offlineUntil
      ? { ...result, offlineUntil: lastAccess.offlineUntil, message: lastAccess.message }
      : result;
  lastAccess = access;
  lastCheckAt = now;
  if (online) lastOnlineAt = now;
  return access;
}

/** The last granted access, while its signed lease and licence term still hold. */
export function getCachedLicenseAccess(now = Date.now()): LicenseAccess | null {
  if (!lastAccess?.allowed) return null;
  if (lastAccess.leaseUntil === undefined || now >= lastAccess.leaseUntil) return null;
  if (lastAccess.expiresAt != null && now >= lastAccess.expiresAt) return null;
  return lastAccess;
}

export type LicenseRecheckReason = "interval" | "visibility" | "online";

/**
 * A background recheck, or null when none is due. Never shows a wait: the
 * server is asked every 15 minutes (or at once on reconnection while the
 * offline banner shows), the local lease every 5 minutes, with a short
 * network timeout. A check that fails to run keeps the access already granted,
 * within its lease; a decided refusal (revoked, expired, lease over) applies.
 */
export function recheckLicenseInBackground(
  reason: LicenseRecheckReason,
  now = Date.now()
): Promise<LicenseAccess> | null {
  const online =
    now - lastOnlineAt >= LICENSE_ONLINE_RECHECK_MS ||
    (reason === "online" && Boolean(lastAccess?.offlineUntil));
  if (!online && now - lastCheckAt < LICENSE_LOCAL_RECHECK_MS) return null;
  return checkLicenseAccess(online, { timeoutMs: LICENSE_BACKGROUND_TIMEOUT_MS }).then(
    (access) => (access.transient && getCachedLicenseAccess()) || access
  );
}

/** Tests only: forget the in-memory access between cases. */
export function resetLicenseRuntimeCache() {
  lastAccess = null;
  lastCheckAt = 0;
  lastOnlineAt = 0;
}

async function check(
  forceOnline: boolean,
  options: LicenseCheckOptions = {}
): Promise<LicenseAccess> {
  let stored = await getLicenseInfo();
  if (!stored)
    return {
      allowed: false,
      message: "Activez la licence de ce poste pour ouvrir votre cabinet.",
    };
  const deviceId = await getDeviceId();
  let lease;
  try {
    lease = await verifyLicenseLease(
      stored.activationToken,
      LICENSE_PUBLIC_KEY,
      deviceId,
      stored.email
    );
  } catch {
    /* A legacy installation can migrate online using its existing key. */
  }
  const now = Date.now();
  const lastSeen = Number.isFinite(stored.lastSeen) ? stored.lastSeen! : 0;
  const timeError = lease ? getLeaseTimeError(lease, now, lastSeen) : null;
  const needsOnline =
    forceOnline ||
    !lease ||
    stored.denied ||
    timeError ||
    now - lease.issuedAt >= RENEW_AFTER_MS;
  if (needsOnline) {
    try {
      const result =
        !lease && stored.key
          ? await activateLicense(stored.email, stored.key, options.timeoutMs)
          : await renewLicenseActivation(stored.activationToken, stored.email, options.timeoutMs);
      lease = await verifyLicenseLease(
        result.activationToken,
        LICENSE_PUBLIC_KEY,
        deviceId,
        stored.email
      );
      const freshError = getLeaseTimeError(lease, Date.now(), lastSeen);
      if (freshError)
        return { allowed: false, message: freshError, email: stored.email };
      const updated: StoredLicense = {
        key: "",
        email: lease.email,
        activationToken: result.activationToken,
        activatedAt: stored.activatedAt,
        lastSeen: Math.max(Date.now(), lastSeen),
      };
      await saveLicenseState(updated);
      stored = updated;
    } catch (error) {
      if (
        error instanceof LicenseActivationError &&
        TERMINAL_CODES.has(error.code)
      ) {
        stored = {
          ...stored,
          denied: error.message,
          lastSeen: Math.max(now, lastSeen),
        };
        await saveLicenseState(stored);
      }
      const invalidTime = lease
        ? getLeaseTimeError(lease, Date.now(), lastSeen)
        : null;
      if (stored.denied || !lease || invalidTime)
        return {
          allowed: false,
          email: stored.email,
          message:
            stored.denied ||
            invalidTime ||
            (error instanceof Error
              ? error.message
              : "Une connexion est nécessaire pour vérifier cette licence."),
        };
      // Only a still-valid signed lease permits a network outage, rate limit,
      // or server failure. The lease deadline is never extended locally.
      await saveLicenseState({
        ...stored,
        lastSeen: Math.max(Date.now(), lastSeen),
      });
      return {
        allowed: true,
        email: stored.email,
        message:
          "Serveur indisponible : votre accès hors connexion reste valide.",
        offlineUntil: lease.leaseUntil,
        leaseUntil: lease.leaseUntil,
        expiresAt: lease.expiresAt,
      };
    }
  }
  if (!lease)
    return {
      allowed: false,
      message: "Cette installation doit être réactivée.",
      email: stored.email,
    };
  const finalError = getLeaseTimeError(lease, Date.now(), lastSeen);
  if (finalError)
    return { allowed: false, message: finalError, email: stored.email };
  await saveLicenseState({
    ...stored,
    lastSeen: Math.max(Date.now(), lastSeen),
  });
  return {
    allowed: true,
    email: stored.email,
    message: "Licence vérifiée",
    leaseUntil: lease.leaseUntil,
    expiresAt: lease.expiresAt,
  };
}
