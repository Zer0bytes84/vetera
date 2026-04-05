import bcrypt from "bcryptjs"
import {
  clearBrowserRows,
  findBrowserRow,
  getBrowserTable,
  insertBrowserRow,
  isTauriRuntime,
  updateBrowserRow,
} from "../browser-store"
import { getDatabase, generateId } from "./database"

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  displayName: string
}

export interface AuthUser {
  id: string
  email: string
  displayName: string
  role: string
  avatarUrl?: string | null
}

async function getRegistrationRole(): Promise<string> {
  if (!isTauriRuntime()) {
    const existingUsers = getBrowserTable<BrowserUserRecord>("users")
    return existingUsers.length === 0 ? "admin" : "stagiaire"
  }

  const db = await getDatabase()
  const result = await db.select<{ count: number }[]>(
    "SELECT COUNT(*) as count FROM users"
  )

  return result[0]?.count === 0 ? "admin" : "stagiaire"
}

type BrowserUserRecord = {
  id: string
  email: string
  passwordHash: string
  displayName: string
  role: string
  status: "active" | "inactive"
  avatarUrl?: string | null
}

type BrowserSessionRecord = {
  id: string
  userId: string
  token: string
  expiresAt: string
}

/**
 * Hash un mot de passe (à implémenter côté Rust pour bcrypt)
 * Pour l'instant: hash simple (À REMPLACER en production)
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12)
  return bcrypt.hash(password, salt)
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
    return bcrypt.compare(password, hash)
  }
  const passwordHash = await hashPassword(password)
  return passwordHash === hash
}

/**
 * Login local
 */
export async function login(credentials: LoginCredentials): Promise<AuthUser> {
  if (!isTauriRuntime()) {
    const user = findBrowserRow<BrowserUserRecord>(
      "users",
      (entry) => entry.email === credentials.email && entry.status === "active"
    )

    if (!user) {
      throw new Error("Email ou mot de passe incorrect")
    }

    const isValid = await verifyPassword(
      credentials.password,
      user.passwordHash
    )
    if (!isValid) {
      throw new Error("Email ou mot de passe incorrect")
    }

    const token = generateId() + generateId()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    insertBrowserRow("sessions", {
      id: generateId(),
      userId: user.id,
      token,
      expiresAt: expiresAt.toISOString(),
    } satisfies BrowserSessionRecord)

    localStorage.setItem("auth_token", token)

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      avatarUrl: user.avatarUrl ?? null,
    }
  }

  console.log("[AUTH] Starting login for:", credentials.email)
  const db = await getDatabase()
  console.log("[AUTH] Database loaded")

  const users = await db.select<any[]>(
    "SELECT * FROM users WHERE email = ? AND status = ?",
    [credentials.email, "active"]
  )

  console.log("[AUTH] Users found:", users.length)

  if (users.length === 0) {
    console.error("[AUTH] No user found with email:", credentials.email)
    throw new Error("Email ou mot de passe incorrect")
  }

  const user = users[0]
  console.log("[AUTH] User found:", user.email, "Role:", user.role)

  // Vérifier le mot de passe
  const isValid = await verifyPassword(credentials.password, user.password_hash)
  console.log("[AUTH] Password valid:", isValid)

  if (!isValid) {
    console.error("[AUTH] Invalid password for:", credentials.email)
    throw new Error("Email ou mot de passe incorrect")
  }

  // Créer une session
  const sessionId = generateId()
  const token = generateId() + generateId() // Token aléatoire
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // 7 jours

  await db.execute(
    "INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)",
    [sessionId, user.id, token, expiresAt.toISOString()]
  )

  // Sauvegarder le token en localStorage
  localStorage.setItem("auth_token", token)
  console.log("[AUTH] Login successful, token saved")

  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    role: user.role,
    avatarUrl: user.avatar_url ?? null,
  }
}

/**
 * Register (créer un compte)
 */
export async function register(data: RegisterData): Promise<AuthUser> {
  if (!isTauriRuntime()) {
    const existing = findBrowserRow<BrowserUserRecord>(
      "users",
      (entry) => entry.email === data.email
    )
    if (existing) {
      throw new Error("Cet email est déjà utilisé")
    }

    const passwordHash = await hashPassword(data.password)
    const role = await getRegistrationRole()
    insertBrowserRow("users", {
      id: generateId(),
      email: data.email,
      passwordHash,
      displayName: data.displayName,
      role,
      status: "active",
    } satisfies BrowserUserRecord)

    return login({
      email: data.email,
      password: data.password,
    })
  }

  console.log("[AUTH] Starting registration for:", data.email)
  const db = await getDatabase()

  // Vérifier si l'email existe déjà
  const existing = await db.select<any[]>(
    "SELECT id FROM users WHERE email = ?",
    [data.email]
  )

  if (existing.length > 0) {
    console.error("[AUTH] Email already exists:", data.email)
    throw new Error("Cet email est déjà utilisé")
  }

  // Hasher le mot de passe
  const passwordHash = await hashPassword(data.password)
  const role = await getRegistrationRole()
  console.log("[AUTH] Password hashed, creating user...")

  // Créer l'utilisateur
  const userId = generateId()

  await db.execute(
    "INSERT INTO users (id, email, password_hash, display_name, role, status) VALUES (?, ?, ?, ?, ?, ?)",
    [userId, data.email, passwordHash, data.displayName, role, "active"]
  )

  console.log("[AUTH] User created, auto-logging in...")

  // Auto-login
  return login({
    email: data.email,
    password: data.password,
  })
}

/**
 * Logout
 */
export async function logout(): Promise<void> {
  const token = localStorage.getItem("auth_token")

  if (token) {
    if (!isTauriRuntime()) {
      clearBrowserRows(
        "sessions",
        (session) => (session as BrowserSessionRecord).token === token
      )
      localStorage.removeItem("auth_token")
      return
    }

    const db = await getDatabase()
    await db.execute("DELETE FROM sessions WHERE token = ?", [token])
    localStorage.removeItem("auth_token")
  }
}

/**
 * Obtenir l'utilisateur courant depuis la session
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = localStorage.getItem("auth_token")

  if (!token) {
    return null
  }

  if (!isTauriRuntime()) {
    const session = findBrowserRow<BrowserSessionRecord>(
      "sessions",
      (entry) =>
        entry.token === token &&
        new Date(entry.expiresAt).getTime() > Date.now()
    )

    if (!session) {
      localStorage.removeItem("auth_token")
      return null
    }

    const user = findBrowserRow<BrowserUserRecord>(
      "users",
      (entry) => entry.id === session.userId
    )
    if (!user) {
      return null
    }

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      avatarUrl: user.avatarUrl ?? null,
    }
  }

  const db = await getDatabase()

  // Vérifier la session
  const sessions = await db.select<any[]>(
    "SELECT * FROM sessions WHERE token = ? AND expires_at > ?",
    [token, new Date().toISOString()]
  )

  if (sessions.length === 0) {
    localStorage.removeItem("auth_token")
    return null
  }

  const session = sessions[0]

  // Récupérer l'utilisateur
  const users = await db.select<any[]>("SELECT * FROM users WHERE id = ?", [
    session.user_id,
  ])

  if (users.length === 0) {
    return null
  }

  const user = users[0]

  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    role: user.role,
    avatarUrl: user.avatar_url ?? null,
  }
}

/**
 * Mettre à jour le mot de passe
 */
export async function updatePassword(
  userId: string,
  newPassword: string
): Promise<void> {
  if (!isTauriRuntime()) {
    const passwordHash = await hashPassword(newPassword)
    updateBrowserRow<BrowserUserRecord>("users", userId, { passwordHash })
    return
  }

  const db = await getDatabase()
  const passwordHash = await hashPassword(newPassword)

  await db.execute("UPDATE users SET password_hash = ? WHERE id = ?", [
    passwordHash,
    userId,
  ])
}

export async function createInitialAdmin(
  data: RegisterData
): Promise<AuthUser> {
  if (!isTauriRuntime()) {
    const existingUsers = getBrowserTable<BrowserUserRecord>("users")
    if (existingUsers.some((entry) => entry.email === data.email)) {
      throw new Error("Cet email est déjà utilisé")
    }

    const passwordHash = await hashPassword(data.password)
    insertBrowserRow("users", {
      id: generateId(),
      email: data.email,
      passwordHash,
      displayName: data.displayName,
      role: "admin",
      status: "active",
    } satisfies BrowserUserRecord)

    const createdUser = findBrowserRow<BrowserUserRecord>(
      "users",
      (entry) => entry.email === data.email
    )
    return {
      id: createdUser?.id ?? "",
      email: createdUser?.email ?? data.email,
      displayName: createdUser?.displayName ?? data.displayName,
      role: createdUser?.role ?? "admin",
      avatarUrl: createdUser?.avatarUrl ?? null,
    }
  }

  const db = await getDatabase()
  const existing = await db.select<any[]>(
    "SELECT id FROM users WHERE email = ?",
    [data.email]
  )

  if (existing.length > 0) {
    throw new Error("Cet email est déjà utilisé")
  }

  const passwordHash = await hashPassword(data.password)
  const userId = generateId()

  await db.execute(
    `INSERT INTO users (id, email, password_hash, display_name, role, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'admin', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [userId, data.email, passwordHash, data.displayName]
  )

  return {
    id: userId,
    email: data.email,
    displayName: data.displayName,
    role: "admin",
    avatarUrl: null,
  }
}
