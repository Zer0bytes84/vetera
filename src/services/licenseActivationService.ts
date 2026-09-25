import { isTauriRuntime } from "./browser-store";
import { verifyLicenseLease } from "./licenseLease";

export const ACTIVATION_SERVER_URL = (
  import.meta.env.VITE_LICENSE_SERVER_URL ||
  (import.meta.env.DEV ? "http://127.0.0.1:8787" : "")
).replace(/\/$/, "");

export const LICENSE_PUBLIC_KEY = import.meta.env.VITE_LICENSE_PUBLIC_KEY || "";
const DEVICE_ID_SETTING = "baitari-license-installation-v2";
export interface ActivatedLicense {
  createdAt: string;
  email: string;
  deviceCount: number;
  expiresAt: string | null;
  id: string;
  maxDevices: number;
  plan: string;
  revokedAt: string | null;
}

export interface LicenseActivationResult {
  activationToken: string;
  license: ActivatedLicense;
}

export const ADMIN_TOKEN_STORAGE_KEY = "baitari_activation_admin_token";
let sessionAdminToken = "";
// Never ship credentials or recover the old persistent administrator secret.
export function getStoredAdminToken(): string {
  try {
    localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
  } catch {
    /* Storage unavailable. */
  }
  return sessionAdminToken;
}
export function setStoredAdminToken(token: string): void {
  sessionAdminToken = token.trim();
  try {
    localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
  } catch {
    /* Storage unavailable. */
  }
}

export interface ActivationAdminLicense {
  createdAt: string;
  deviceCount: number;
  devices?: string[];
  email: string;
  expiresAt: string | null;
  id: string;
  maxDevices: number;
  plan: string;
  revokedAt: string | null;
}

export interface CreatedActivationLicense {
  license: ActivationAdminLicense;
  licenseKey: string;
}

export class LicenseActivationError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status = 0, code = "") {
    super(message);
    this.name = "LicenseActivationError";
    this.status = status;
    this.code = code;
  }
}

let devicePromise: Promise<string> | null = null;
export function getDeviceId(): Promise<string> {
  if (!devicePromise) {
    devicePromise = (async () => {
      // The installation identity lives outside the clinic database and backups.
      if (isTauriRuntime()) {
        const { invoke } = await import("@tauri-apps/api/core");
        return invoke<string>("license_installation_id", {
          candidate: crypto.randomUUID(),
        });
      }
      const stored = localStorage.getItem(DEVICE_ID_SETTING);
      if (stored) return stored;
      const id = crypto.randomUUID();
      localStorage.setItem(DEVICE_ID_SETTING, id);
      return id;
    })().catch((error) => {
      devicePromise = null;
      throw error;
    });
  }
  return devicePromise;
}

async function licenseRequest(
  path: string,
  body: Record<string, string>
): Promise<LicenseActivationResult> {
  if (!ACTIVATION_SERVER_URL || !LICENSE_PUBLIC_KEY) {
    throw new LicenseActivationError(
      "Le serveur d’activation n’est pas configuré pour cette version. Contactez l’administrateur.",
      0,
      "CONFIGURATION"
    );
  }
  const deviceId = await getDeviceId();
  const response = await fetchAdminResponse(`${ACTIVATION_SERVER_URL}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...body, deviceId }),
  });
  const payload = await readAdminResponse<LicenseActivationResult>(response);
  if (!payload?.activationToken || !payload.license?.email)
    throw new LicenseActivationError("Réponse d’activation invalide.");
  const email = body.email || payload.license.email;
  const lease = await verifyLicenseLease(
    payload.activationToken,
    LICENSE_PUBLIC_KEY,
    deviceId,
    email
  );
  if (lease.sub !== payload.license.id)
    throw new LicenseActivationError("Réponse d’activation incohérente.");
  return payload;
}

export async function activateLicense(
  email: string,
  key: string
): Promise<LicenseActivationResult> {
  return licenseRequest("/v1/activate", {
    email: email.trim().toLowerCase(),
    key,
  });
}

export function renewLicenseActivation(
  activationToken: string,
  email: string
): Promise<LicenseActivationResult> {
  return licenseRequest("/v1/verify", { activationToken, email });
}

async function readAdminResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as {
    error?: string;
    code?: string;
  } | null;
  if (!response.ok) {
    throw new LicenseActivationError(
      payload?.error || "Le serveur d’activation a refusé la requête.",
      response.status,
      payload?.code || ""
    );
  }
  return payload as T;
}

async function fetchAdminResponse(
  input: string,
  init?: RequestInit
): Promise<Response> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(input, {
        ...init,
        signal: controller.signal,
        cache: "no-store",
      });
      const body = await response.text();
      return new Response(response.status === 204 ? null : body, {
        status: response.status,
        headers: response.headers,
      });
    } finally {
      clearTimeout(timer);
    }
  } catch {
    throw new LicenseActivationError(
      "Le serveur d’activation ne répond pas. Vérifiez votre connexion puis réessayez."
    );
  }
}

export async function checkActivationServer(): Promise<void> {
  const response = await fetchAdminResponse(
    `${ACTIVATION_SERVER_URL}/v1/health`,
    { cache: "no-store" }
  );
  await readAdminResponse(response);
}

export async function listActivationLicenses(
  adminToken: string
): Promise<ActivationAdminLicense[]> {
  const response = await fetchAdminResponse(
    `${ACTIVATION_SERVER_URL}/v1/admin/licenses`,
    {
      headers: { "x-admin-token": adminToken },
      cache: "no-store",
    }
  );
  const payload = await readAdminResponse<{
    licenses: ActivationAdminLicense[];
  }>(response);
  return payload.licenses;
}

export async function createActivationLicense(
  adminToken: string,
  input: {
    email: string;
    expiresAt: string | null;
    maxDevices?: number;
    plan: string;
  }
): Promise<CreatedActivationLicense> {
  const response = await fetchAdminResponse(
    `${ACTIVATION_SERVER_URL}/v1/admin/licenses`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-admin-token": adminToken,
      },
      body: JSON.stringify(input),
    }
  );
  return readAdminResponse<CreatedActivationLicense>(response);
}

export async function revokeActivationLicense(
  adminToken: string,
  licenseId: string
): Promise<ActivationAdminLicense> {
  const response = await fetchAdminResponse(
    `${ACTIVATION_SERVER_URL}/v1/admin/licenses/${encodeURIComponent(licenseId)}/revoke`,
    {
      method: "POST",
      headers: { "x-admin-token": adminToken },
    }
  );
  const payload = await readAdminResponse<{
    license: ActivationAdminLicense;
  }>(response);
  return payload.license;
}

export async function releaseActivationDevice(
  adminToken: string,
  licenseId: string,
  deviceId: string
): Promise<ActivationAdminLicense> {
  const response = await fetchAdminResponse(
    `${ACTIVATION_SERVER_URL}/v1/admin/licenses/${encodeURIComponent(licenseId)}/release-device`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-admin-token": adminToken,
      },
      body: JSON.stringify({ deviceId }),
    }
  );
  return (
    await readAdminResponse<{ license: ActivationAdminLicense }>(response)
  ).license;
}

export async function verifyAdminToken(adminToken: string): Promise<boolean> {
  try {
    const response = await fetchAdminResponse(
      `${ACTIVATION_SERVER_URL}/v1/admin/verify`,
      {
        headers: { "x-admin-token": adminToken },
        cache: "no-store",
      }
    );
    return response.ok;
  } catch {
    return false;
  }
}

export function createLicenseRequestMailto(email = "") {
  const subject = "Demande de licence Baitari";
  const body = [
    "Bonjour Zohir,",
    "",
    "Je souhaite recevoir une licence Baitari pour mon cabinet.",
    email ? `Adresse du cabinet : ${email}` : "Adresse du cabinet :",
    "",
    "Merci,",
  ].join("\n");
  return `mailto:Zohir.kh@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export interface LicenseEmailTemplateParams {
  clinicEmail: string;
  clinicName?: string;
  expiresAt: string | null;
  licenseKey: string;
  maxDevices: number;
  plan: string;
  recipientEmail?: string;
}

export function createLicenseEmailTemplate({
  clinicEmail,
  recipientEmail,
  clinicName,
  licenseKey,
  plan,
  maxDevices,
  expiresAt,
}: LicenseEmailTemplateParams) {
  const targetEmail = (recipientEmail || clinicEmail).trim();
  const nameDisplay = clinicName?.trim() || clinicEmail;
  const planDisplay =
    plan === "trial"
      ? "Période d'essai"
      : "Licence Cabinet Professionnel (Baitari)";
  const expiryDisplay = expiresAt
    ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(
        new Date(expiresAt)
      )
    : "Permanente (sans expiration)";

  const subject = `Baitari · Votre clé d’accès pour ${nameDisplay}`;

  const body = [
    "Bonjour,",
    "",
    `Voici les identifiants d'activation officiels pour votre installation Baitari :`,
    "",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "VOS ACCÈS CABINET",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    `• Cabinet : ${nameDisplay}`,
    `• Email de référence : ${clinicEmail}`,
    `• Formule : ${planDisplay}`,
    `• Postes autorisés : ${maxDevices} appareil${maxDevices > 1 ? "s" : ""}`,
    `• Validité : ${expiryDisplay}`,
    "",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    `VOTRE CLÉ D'ACTIVATION`,
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    `${licenseKey}`,
    "",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    `GUIDE D'ACTIVATION EN 3 ÉTAPES :`,
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    `1. Lancez l'application Baitari sur votre Mac ou PC.`,
    `2. Sur l'écran d'accueil (ou dans Paramètres > Licence), saisissez :`,
    `   • Votre adresse courriel : ${clinicEmail}`,
    `   • Votre clé d'activation : ${licenseKey}`,
    "3. Cliquez sur « Activer mon cabinet ». Tous vos modules seront déverrouillés instantanément.",
    "",
    "Pour votre sécurité :",
    "Cette clé est confidentielle et liée aux postes de votre cabinet. Conservez ce courriel.",
    "",
    `Besoin d'aide ? Répondez simplement à ce courriel.`,
    "",
    "Bien cordialement,",
    `L'équipe Baitari`,
  ].join("\n");

  const mailtoUrl = `mailto:${encodeURIComponent(targetEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return {
    subject,
    body,
    mailtoUrl,
    targetEmail,
  };
}
