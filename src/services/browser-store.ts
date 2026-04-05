export type BrowserTableName =
  | "users"
  | "sessions"
  | "owners"
  | "patients"
  | "appointments"
  | "products"
  | "transactions"
  | "notes"
  | "tasks"
  | "app_settings"
  | "migrations"

export type BrowserRow = {
  id?: string
  createdAt?: string
  updatedAt?: string
}

type BrowserDatabaseState = {
  tables: Record<BrowserTableName, BrowserRow[]>
}

const STORAGE_KEY = "vetera.browser-db.v1"

const EMPTY_STATE: BrowserDatabaseState = {
  tables: {
    users: [],
    sessions: [],
    owners: [],
    patients: [],
    appointments: [],
    products: [],
    transactions: [],
    notes: [],
    tasks: [],
    app_settings: [],
    migrations: [],
  },
}

declare global {
  interface Window {
    __TAURI__?: unknown
    __TAURI_INTERNALS__?: unknown
  }
}

export function isTauriRuntime() {
  if (typeof window === "undefined") {
    return false
  }

  return Boolean(window.__TAURI__ || window.__TAURI_INTERNALS__)
}

function cloneState(state: BrowserDatabaseState): BrowserDatabaseState {
  return JSON.parse(JSON.stringify(state)) as BrowserDatabaseState
}

function readState(): BrowserDatabaseState {
  if (typeof window === "undefined") {
    return cloneState(EMPTY_STATE)
  }

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return cloneState(EMPTY_STATE)
  }

  try {
    const parsed = JSON.parse(raw) as Partial<BrowserDatabaseState>
    return {
      tables: {
        ...cloneState(EMPTY_STATE).tables,
        ...(parsed.tables ?? {}),
      },
    }
  } catch (error) {
    console.error(
      "[BrowserDB] Failed to parse browser database, resetting.",
      error
    )
    return cloneState(EMPTY_STATE)
  }
}

function writeState(state: BrowserDatabaseState) {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function withTimestamps<T extends BrowserRow>(
  row: T,
  existing?: BrowserRow
): T {
  const now = new Date().toISOString()

  return {
    ...row,
    createdAt: existing?.createdAt ?? row.createdAt ?? now,
    updatedAt: now,
  } as T
}

export function getBrowserTable<T extends BrowserRow>(
  tableName: BrowserTableName
): T[] {
  return readState().tables[tableName] as T[]
}

export function findBrowserRow<T extends BrowserRow>(
  tableName: BrowserTableName,
  predicate: (row: T) => boolean
): T | null {
  return (getBrowserTable<T>(tableName).find(predicate) ?? null) as T | null
}

export function insertBrowserRow<T extends BrowserRow>(
  tableName: BrowserTableName,
  row: T
): T {
  const state = readState()
  const preparedRow = withTimestamps(row)

  state.tables[tableName] = [...state.tables[tableName], preparedRow]
  writeState(state)

  return preparedRow as T
}

export function updateBrowserRow<T extends BrowserRow>(
  tableName: BrowserTableName,
  id: string,
  updates: Partial<T>
): boolean {
  const state = readState()
  const existing = state.tables[tableName].find((row) => row.id === id)

  if (!existing) {
    return false
  }

  state.tables[tableName] = state.tables[tableName].map((row) =>
    row.id === id ? withTimestamps({ ...row, ...updates } as T, existing) : row
  )
  writeState(state)

  return true
}

export function removeBrowserRow(tableName: BrowserTableName, id: string) {
  const state = readState()
  state.tables[tableName] = state.tables[tableName].filter(
    (row) => row.id !== id
  )
  writeState(state)
}

export function setBrowserRow<T extends BrowserRow>(
  tableName: BrowserTableName,
  id: string,
  row: Partial<T>
) {
  const exists = findBrowserRow<T>(tableName, (entry) => entry.id === id)
  if (exists) {
    updateBrowserRow(tableName, id, row)
    return
  }

  insertBrowserRow(tableName, { id, ...row } as T)
}

export function replaceBrowserTable<T extends BrowserRow>(
  tableName: BrowserTableName,
  rows: T[]
) {
  const state = readState()
  state.tables[tableName] = rows
  writeState(state)
}

export function getBrowserSetting(key: string): string | null {
  const setting = findBrowserRow<{ id: string; key: string; value: string }>(
    "app_settings",
    (entry) => entry.key === key
  )
  return setting?.value ?? null
}

export function setBrowserSetting(key: string, value: string) {
  const existing = findBrowserRow<{ id: string; key: string; value: string }>(
    "app_settings",
    (entry) => entry.key === key
  )

  if (existing) {
    updateBrowserRow<{ id: string; key: string; value: string }>(
      "app_settings",
      existing.id ?? key,
      { key, value }
    )
    return
  }

  insertBrowserRow("app_settings", {
    id: key,
    key,
    value,
  })
}

export function clearBrowserRows(
  tableName: BrowserTableName,
  predicate: (row: BrowserRow) => boolean
) {
  const state = readState()
  state.tables[tableName] = state.tables[tableName].filter(
    (row) => !predicate(row)
  )
  writeState(state)
}
