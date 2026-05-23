import bcrypt from "bcryptjs";
import {
  clearBrowserRows,
  findBrowserRow,
  getBrowserTable,
  insertBrowserRow,
  isTauriRuntime,
  updateBrowserRow,
} from "../browser-store";
import { generateId, runDbOperation } from "./database";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  displayName: string;
  email: string;
  password: string;
}

export interface AuthUser {
  avatarUrl?: string | null;
  displayName: string;
  email: string;
  id: string;
  role: string;
}

async function getRegistrationRole(): Promise<string> {
  if (!isTauriRuntime()) {
    const existingUsers = getBrowserTable<BrowserUserRecord>("users");
    return existingUsers.length === 0 ? "admin" : "stagiaire";
  }

  const result = await runDbOperation((db) =>
    db.select<{ count: number }[]>("SELECT COUNT(*) as count FROM users")
  );

  return result[0]?.count === 0 ? "admin" : "stagiaire";
}

type BrowserUserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  role: string;
  status: "active" | "inactive";
  avatarUrl?: string | null;
};

type BrowserSessionRecord = {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
};

function legacySha256(value: string): string {
  const rightRotate = (word: number, amount: number) =>
    (word >>> amount) | (word << (32 - amount));
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = "length";
  const words: number[] = [];
  const ascii = unescape(encodeURIComponent(value));
  let hash = legacySha256.h as number[] | undefined;
  let k = legacySha256.k as number[] | undefined;
  let primeCounter = k?.length ?? 0;
  const isComposite: Record<number, boolean> = {};

  if (!(hash && k)) {
    hash = [];
    k = [];
    for (let candidate = 2; primeCounter < 64; candidate += 1) {
      if (!isComposite[candidate]) {
        for (let i = 0; i < 313; i += candidate) {
          isComposite[i] = true;
        }
        hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
        k[primeCounter] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
        primeCounter += 1;
      }
    }
    legacySha256.h = hash;
    legacySha256.k = k;
  }

  const message = `${ascii}\x80`;
  for (let i = 0; i < message[lengthProperty]; i += 1) {
    const j = message.charCodeAt(i);
    words[i >> 2] |= j << (((3 - i) % 4) * 8);
  }
  words[(((message[lengthProperty] + 8) >> 6) << 4) + 15] =
    ascii[lengthProperty] * 8;

  const workingHash = hash.slice();
  for (let j = 0; j < words[lengthProperty]; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = workingHash.slice();
    for (let i = 0; i < 64; i += 1) {
      const w15 = w[i - 15];
      const w2 = w[i - 2];
      const a = workingHash[0];
      const e = workingHash[4];
      const temp1 =
        workingHash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & workingHash[5]) ^ (~e & workingHash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);
      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & workingHash[1]) ^
          (a & workingHash[2]) ^
          (workingHash[1] & workingHash[2]));

      workingHash.unshift((temp1 + temp2) | 0);
      workingHash[4] = (workingHash[4] + temp1) | 0;
      workingHash.pop();
    }

    for (let i = 0; i < 8; i += 1) {
      workingHash[i] = (workingHash[i] + oldHash[i]) | 0;
    }
  }

  return workingHash
    .map((word) =>
      Array.from({ length: 4 }, (_value, index) =>
        ((word >> ((3 - index) * 8)) & 255).toString(16).padStart(2, "0")
      ).join("")
    )
    .join("");
}

legacySha256.h = undefined as number[] | undefined;
legacySha256.k = undefined as number[] | undefined;

/**
 * Hash un mot de passe (à implémenter côté Rust pour bcrypt)
 * Pour l'instant: hash simple (À REMPLACER en production)
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  if (
    hash.startsWith("$2") ||
    hash.startsWith("$2a") ||
    hash.startsWith("$2b")
  ) {
    return bcrypt.compare(password, hash);
  }

  if (/^[a-f0-9]{64}$/i.test(hash)) {
    return legacySha256(password) === hash.toLowerCase();
  }

  return false;
}

/**
 * Login local
 */
export async function login(credentials: LoginCredentials): Promise<AuthUser> {
  if (!isTauriRuntime()) {
    const user = findBrowserRow<BrowserUserRecord>(
      "users",
      (entry) => entry.email === credentials.email && entry.status === "active"
    );

    if (!user) {
      throw new Error("Email ou mot de passe incorrect");
    }

    const isValid = await verifyPassword(
      credentials.password,
      user.passwordHash
    );
    if (!isValid) {
      throw new Error("Email ou mot de passe incorrect");
    }

    const token = generateId() + generateId();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    insertBrowserRow("sessions", {
      id: generateId(),
      userId: user.id,
      token,
      expiresAt: expiresAt.toISOString(),
    } satisfies BrowserSessionRecord);

    localStorage.setItem("auth_token", token);

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      avatarUrl: user.avatarUrl ?? null,
    };
  }

  console.log("[AUTH] Starting login for:", credentials.email);

  const users = await runDbOperation((db) =>
    db.select<any[]>("SELECT * FROM users WHERE email = ? AND status = ?", [
      credentials.email,
      "active",
    ])
  );

  console.log("[AUTH] Users found:", users.length);

  if (users.length === 0) {
    console.error("[AUTH] No user found with email:", credentials.email);
    throw new Error("Email ou mot de passe incorrect");
  }

  const user = users[0];
  console.log("[AUTH] User found:", user.email, "Role:", user.role);

  // Vérifier le mot de passe
  const isValid = await verifyPassword(
    credentials.password,
    user.password_hash
  );
  console.log("[AUTH] Password valid:", isValid);

  if (!isValid) {
    console.error("[AUTH] Invalid password for:", credentials.email);
    throw new Error("Email ou mot de passe incorrect");
  }

  // Créer une session
  const sessionId = generateId();
  const token = generateId() + generateId(); // Token aléatoire
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 jours

  await runDbOperation((db) =>
    db.execute(
      "INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)",
      [sessionId, user.id, token, expiresAt.toISOString()]
    )
  );

  // Sauvegarder le token en localStorage
  localStorage.setItem("auth_token", token);
  console.log("[AUTH] Login successful, token saved");

  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    role: user.role,
    avatarUrl: user.avatar_url ?? null,
  };
}

/**
 * Register (créer un compte)
 */
export async function register(data: RegisterData): Promise<AuthUser> {
  if (!isTauriRuntime()) {
    const existing = findBrowserRow<BrowserUserRecord>(
      "users",
      (entry) => entry.email === data.email
    );
    if (existing) {
      throw new Error("Cet email est déjà utilisé");
    }

    const passwordHash = await hashPassword(data.password);
    const role = await getRegistrationRole();
    insertBrowserRow("users", {
      id: generateId(),
      email: data.email,
      passwordHash,
      displayName: data.displayName,
      role,
      status: "active",
    } satisfies BrowserUserRecord);

    return login({
      email: data.email,
      password: data.password,
    });
  }

  console.log("[AUTH] Starting registration for:", data.email);

  // Vérifier si l'email existe déjà
  const existing = await runDbOperation((db) =>
    db.select<any[]>("SELECT id FROM users WHERE email = ?", [data.email])
  );

  if (existing.length > 0) {
    console.error("[AUTH] Email already exists:", data.email);
    throw new Error("Cet email est déjà utilisé");
  }

  // Hasher le mot de passe
  const passwordHash = await hashPassword(data.password);
  const role = await getRegistrationRole();
  console.log("[AUTH] Password hashed, creating user...");

  // Créer l'utilisateur
  const userId = generateId();

  await runDbOperation((db) =>
    db.execute(
      "INSERT INTO users (id, email, password_hash, display_name, role, status) VALUES (?, ?, ?, ?, ?, ?)",
      [userId, data.email, passwordHash, data.displayName, role, "active"]
    )
  );

  console.log("[AUTH] User created, auto-logging in...");

  // Auto-login
  return login({
    email: data.email,
    password: data.password,
  });
}

/**
 * Logout
 */
export async function logout(): Promise<void> {
  const token = localStorage.getItem("auth_token");

  if (token) {
    if (!isTauriRuntime()) {
      clearBrowserRows(
        "sessions",
        (session) => (session as BrowserSessionRecord).token === token
      );
      localStorage.removeItem("auth_token");
      return;
    }

    await runDbOperation((db) =>
      db.execute("DELETE FROM sessions WHERE token = ?", [token])
    );
    localStorage.removeItem("auth_token");
  }
}

/**
 * Obtenir l'utilisateur courant depuis la session
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = localStorage.getItem("auth_token");

  if (!token) {
    return null;
  }

  if (!isTauriRuntime()) {
    const session = findBrowserRow<BrowserSessionRecord>(
      "sessions",
      (entry) =>
        entry.token === token &&
        new Date(entry.expiresAt).getTime() > Date.now()
    );

    if (!session) {
      localStorage.removeItem("auth_token");
      return null;
    }

    const user = findBrowserRow<BrowserUserRecord>(
      "users",
      (entry) => entry.id === session.userId
    );
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      avatarUrl: user.avatarUrl ?? null,
    };
  }

  // Vérifier la session
  const sessions = await runDbOperation((db) =>
    db.select<any[]>(
      "SELECT * FROM sessions WHERE token = ? AND expires_at > ?",
      [token, new Date().toISOString()]
    )
  );

  if (sessions.length === 0) {
    localStorage.removeItem("auth_token");
    return null;
  }

  const session = sessions[0];

  // Récupérer l'utilisateur
  const users = await runDbOperation((db) =>
    db.select<any[]>("SELECT * FROM users WHERE id = ?", [session.user_id])
  );

  if (users.length === 0) {
    return null;
  }

  const user = users[0];

  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    role: user.role,
    avatarUrl: user.avatar_url ?? null,
  };
}

/**
 * Mettre à jour le mot de passe
 */
export async function updatePassword(
  userId: string,
  newPassword: string
): Promise<void> {
  if (!isTauriRuntime()) {
    const passwordHash = await hashPassword(newPassword);
    updateBrowserRow<BrowserUserRecord>("users", userId, { passwordHash });
    return;
  }

  const passwordHash = await hashPassword(newPassword);

  await runDbOperation((db) =>
    db.execute("UPDATE users SET password_hash = ? WHERE id = ?", [
      passwordHash,
      userId,
    ])
  );
}

export async function createInitialAdmin(
  data: RegisterData
): Promise<AuthUser> {
  if (!isTauriRuntime()) {
    const existingUsers = getBrowserTable<BrowserUserRecord>("users");
    if (existingUsers.some((entry) => entry.email === data.email)) {
      throw new Error("Cet email est déjà utilisé");
    }

    const passwordHash = await hashPassword(data.password);
    insertBrowserRow("users", {
      id: generateId(),
      email: data.email,
      passwordHash,
      displayName: data.displayName,
      role: "admin",
      status: "active",
    } satisfies BrowserUserRecord);

    const createdUser = findBrowserRow<BrowserUserRecord>(
      "users",
      (entry) => entry.email === data.email
    );
    return {
      id: createdUser?.id ?? "",
      email: createdUser?.email ?? data.email,
      displayName: createdUser?.displayName ?? data.displayName,
      role: createdUser?.role ?? "admin",
      avatarUrl: createdUser?.avatarUrl ?? null,
    };
  }

  const existing = await runDbOperation((db) =>
    db.select<any[]>("SELECT id FROM users WHERE email = ?", [data.email])
  );

  if (existing.length > 0) {
    throw new Error("Cet email est déjà utilisé");
  }

  const passwordHash = await hashPassword(data.password);
  const userId = generateId();

  await runDbOperation((db) =>
    db.execute(
      `INSERT INTO users (id, email, password_hash, display_name, role, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'admin', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [userId, data.email, passwordHash, data.displayName]
    )
  );

  return {
    id: userId,
    email: data.email,
    displayName: data.displayName,
    role: "admin",
    avatarUrl: null,
  };
}
