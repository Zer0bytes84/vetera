import { getBrowserPasswordHash } from "./browserCredentials";
import { findBrowserRow, isTauriRuntime, type BrowserRow } from "./browser-store";

/** Privileged actions require an existing, unexpired session. Never auto-login. */
async function requireActiveSession() {
  const token = localStorage.getItem("auth_token");
  if (!token) throw new Error("Connectez-vous avec un compte administrateur.");
  let user: { id: string; email: string; role: string; status: string } | undefined;
  if (isTauriRuntime()) {
    const { runDbRead } = await import("./sqlite/database");
    const rows = await runDbRead(db => db.select<Array<NonNullable<typeof user>>>(
      "SELECT u.id, u.email, u.role, u.status FROM users u JOIN sessions s ON s.user_id = u.id WHERE s.token = ? AND s.expires_at > ? LIMIT 1",
      [token, new Date().toISOString()]
    ));
    user = rows[0];
  } else {
    const session = findBrowserRow<BrowserRow & { token: string; userId: string; expiresAt: string }>("sessions", row => row.token === token && Date.parse(row.expiresAt) > Date.now());
    if (session) user = findBrowserRow<BrowserRow & NonNullable<typeof user>>("users", row => row.id === session.userId) ?? undefined;
  }
  if (!user || user.status !== "active") throw new Error("Cet accès est réservé aux administrateurs.");
  return user;
}

export const ACTIVATION_OWNER_EMAIL = "zohir.kh@gmail.com";
export function isActivationOwner(email: string | null | undefined): boolean {
  return email?.trim().toLowerCase() === ACTIVATION_OWNER_EMAIL;
}
export async function requireAdministrator(): Promise<{ id: string; email: string }> {
  const user = await requireActiveSession();
  if (user.role !== "admin") throw new Error("Cet accès est réservé aux administrateurs.");
  return { id: user.id, email: user.email };
}
export async function requireActivationOwner(): Promise<{ id: string; email: string }> {
  const user = await requireActiveSession();
  if (!isActivationOwner(user.email)) throw new Error("Cet accès est réservé au propriétaire de Baitari.");
  return { id: user.id, email: user.email };
}

export async function verifyAdministratorPassword(password: string) {
  const administrator = await requireAdministrator();
  let hash: string | undefined;
  if (isTauriRuntime()) {
    const { runDbRead } = await import("./sqlite/database");
    const rows = await runDbRead(db => db.select<Array<{ password_hash: string }>>("SELECT password_hash FROM users WHERE id = ?", [administrator.id]));
    hash = rows[0]?.password_hash;
  } else {
    const user = findBrowserRow<BrowserRow & { passwordHash?: unknown; password_hash?: unknown }>("users", row => row.id === administrator.id);
    hash = user ? getBrowserPasswordHash(user) : undefined;
  }
  const { verifyPassword } = await import("./sqlite/auth");
  if (!hash || !await verifyPassword(password, hash)) throw new Error("Mot de passe incorrect.");
  return administrator;
}
