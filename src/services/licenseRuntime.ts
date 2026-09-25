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
  email?: string;
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
export function checkLicenseAccess(
  forceOnline = false
): Promise<LicenseAccess> {
  if (!pending)
    pending = check(forceOnline)
      .catch((error) => ({
        allowed: false,
        message:
          error instanceof Error
            ? error.message
            : "Impossible de lire l’activation locale.",
      }))
      .finally(() => {
        pending = null;
      });
  return pending;
}

async function check(forceOnline: boolean): Promise<LicenseAccess> {
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
          ? await activateLicense(stored.email, stored.key)
          : await renewLicenseActivation(stored.activationToken, stored.email);
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
    expiresAt: lease.expiresAt,
  };
}
