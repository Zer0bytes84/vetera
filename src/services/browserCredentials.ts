/** Accept both browser records and restored SQLite column names. Never invent a credential. */
export function getBrowserPasswordHash(user: { passwordHash?: unknown; password_hash?: unknown }): string | undefined {
  if (typeof user.passwordHash === "string" && user.passwordHash.length > 0) return user.passwordHash;
  if (typeof user.password_hash === "string" && user.password_hash.length > 0) return user.password_hash;
  return undefined;
}
