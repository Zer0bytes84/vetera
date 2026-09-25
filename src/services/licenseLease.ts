/** A lease is trusted only after verification with the public key pinned at build time. */
export interface LicenseLease {
  v: 2;
  aud: "baitari-desktop";
  sub: string;
  email: string;
  deviceId: string;
  plan: "trial" | "clinic";
  issuedAt: number;
  expiresAt: number | null;
  leaseUntil: number;
}

const MAX_LEASE_MS = 7 * 24 * 60 * 60 * 1000;
export const CLOCK_TOLERANCE_MS = 5 * 60 * 1000;

function decodeBase64(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(
    atob(value.replace(/-/g, "+").replace(/_/g, "/")),
    (char) => char.charCodeAt(0)
  );
}

export async function verifyLicenseLease(
  token: string,
  publicKeyBase64: string,
  deviceId: string,
  email: string
): Promise<LicenseLease> {
  try {
    const parts = token.split(".");
    if (parts.length !== 2 || token.length > 8000 || !publicKeyBase64)
      throw new Error();
    const key = await crypto.subtle.importKey(
      "spki",
      decodeBase64(publicKeyBase64),
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"]
    );
    const valid = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      decodeBase64(parts[1]),
      new TextEncoder().encode(parts[0])
    );
    if (!valid) throw new Error();
    const lease = JSON.parse(
      new TextDecoder().decode(decodeBase64(parts[0]))
    ) as LicenseLease;
    if (
      lease.v !== 2 ||
      lease.aud !== "baitari-desktop" ||
      typeof lease.sub !== "string" ||
      !lease.sub ||
      lease.deviceId !== deviceId ||
      lease.email !== email.trim().toLowerCase() ||
      !["clinic", "trial"].includes(lease.plan) ||
      !Number.isSafeInteger(lease.issuedAt) ||
      !Number.isSafeInteger(lease.leaseUntil) ||
      lease.leaseUntil <= lease.issuedAt ||
      lease.leaseUntil - lease.issuedAt > MAX_LEASE_MS ||
      (lease.expiresAt !== null &&
        (!Number.isSafeInteger(lease.expiresAt) ||
          lease.leaseUntil > lease.expiresAt)) ||
      (lease.plan === "trial" && lease.expiresAt === null)
    )
      throw new Error();
    return lease;
  } catch {
    throw new Error(
      "L’activation enregistrée n’est pas vérifiable. Connectez-vous au serveur pour réactiver ce poste."
    );
  }
}

export function getLeaseTimeError(
  lease: LicenseLease,
  now: number,
  lastSeen = 0
): string | null {
  if (now + CLOCK_TOLERANCE_MS < Math.max(lease.issuedAt, lastSeen))
    return "L’horloge de cet appareil a reculé. Vérifiez sa date et son heure.";
  if (lease.expiresAt !== null && now >= lease.expiresAt)
    return "Cette licence a expiré. Contactez l’administrateur pour la renouveler.";
  if (now >= lease.leaseUntil)
    return "Les sept jours hors connexion sont écoulés. Reconnectez ce poste pour vérifier sa licence.";
  return null;
}
