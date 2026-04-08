import { useCallback, useEffect, useState } from "react"

import {
  type BrowserTableName,
  getBrowserTable,
  insertBrowserRow,
  isTauriRuntime,
  removeBrowserRow,
  setBrowserRow,
  updateBrowserRow,
} from "@/services/browser-store"
import { generateId, getDatabase, toSQLiteTimestamp } from "../services/sqlite/database"

interface UseSQLiteResult<T> {
  data: T[]
  loading: boolean
  error: string | null
  add: (item: Omit<T, "id" | "createdAt" | "updatedAt">) => Promise<T | null>
  update: (id: string, updates: Partial<T>) => Promise<boolean>
  remove: (id: string) => Promise<void>
  set: (id: string, item: Partial<T>) => Promise<void>
  refresh: () => Promise<void>
}

const ALLOWED_TABLES = new Set([
  "users",
  "sessions",
  "owners",
  "patients",
  "appointments",
  "products",
  "transactions",
  "notes",
  "tasks",
  "app_settings",
  "migrations",
])

const BOOLEAN_FIELDS_BY_TABLE: Record<string, string[]> = {
  notes: ["isFavorite"],
  tasks: ["isReminder"],
}

const DATA_CHANGED_EVENT = "sqlite-data-changed"

export const emitSQLiteDataChanged = (tableName: string) => {
  window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT, { detail: { tableName } }))
}

const toCamelCase = (value: string) => value.replace(/_([a-z])/g, (_match, letter) => letter.toUpperCase())

const toSnakeCase = (value: string) => value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)

const mapKeys = (obj: Record<string, unknown>, mapper: (key: string) => string) => {
  const mapped: Record<string, unknown> = {}
  Object.keys(obj).forEach((key) => {
    mapped[mapper(key)] = obj[key]
  })
  return mapped
}

const sanitizeParam = (value: unknown) => {
  if (value === undefined) return null
  if (value === null) return null
  if (typeof value === "boolean") return value ? 1 : 0
  if (value instanceof Date) return toSQLiteTimestamp(value)
  return value
}

const stripUndefinedEntries = (obj: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined)
  )

const normalizeBooleanFields = (tableName: string, row: Record<string, unknown>) => {
  const booleanFields = BOOLEAN_FIELDS_BY_TABLE[tableName] ?? []
  if (booleanFields.length === 0) return row

  const next = { ...row }
  booleanFields.forEach((field) => {
    const current = next[field]
    if (current === 0 || current === 1) {
      next[field] = current === 1
    }
  })
  return next
}

export function useSQLite<T extends { id: string }>(tableName: string): UseSQLiteResult<T> {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const safeTableName = ALLOWED_TABLES.has(tableName) ? tableName : null

  const loadData = useCallback(async () => {
    try {
      if (!safeTableName) {
        throw new Error(`Table non autorisée: ${tableName}`)
      }
      setLoading(true)
      setError(null)

      if (!isTauriRuntime()) {
        setData(getBrowserTable<T & Record<string, unknown>>(safeTableName as BrowserTableName) as T[])
        return
      }

      const db = await getDatabase()
      const results = await db.select<Record<string, unknown>[]>(`SELECT * FROM ${safeTableName}`)
      const mapped = (results ?? []).map((row) => {
        const camel = mapKeys(row, toCamelCase)
        return normalizeBooleanFields(safeTableName, camel)
      })

      setData(mapped as T[])
    } catch (err) {
      console.error(`Error loading ${tableName}:`, err)
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [safeTableName, tableName])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const handleDataChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ tableName: string }>
      if (customEvent.detail?.tableName === tableName) {
        loadData()
      }
    }

    window.addEventListener(DATA_CHANGED_EVENT, handleDataChanged)
    return () => window.removeEventListener(DATA_CHANGED_EVENT, handleDataChanged)
  }, [tableName, loadData])

  const add = useCallback(
    async (item: Omit<T, "id" | "createdAt" | "updatedAt">): Promise<T | null> => {
      if (!safeTableName) {
        throw new Error(`Table non autorisée: ${tableName}`)
      }

      if (!isTauriRuntime()) {
        const created = insertBrowserRow(safeTableName as BrowserTableName, {
          id: generateId(),
          ...(item as Record<string, unknown>),
        })

        await loadData()
        emitSQLiteDataChanged(safeTableName)
        return created as T
      }

      const db = await getDatabase()
      const id = generateId()
      const dbItem = stripUndefinedEntries(
        mapKeys(item as Record<string, unknown>, toSnakeCase)
      )

      const fields = Object.keys(dbItem)
      const placeholders = fields.map(() => "?").join(", ")
      const fieldNames = fields.join(", ")
      const values = Object.values(dbItem).map(sanitizeParam)

      await db.execute(
        `INSERT INTO ${safeTableName} (id, ${fieldNames}) VALUES (?, ${placeholders})`,
        [id, ...values]
      )

      const created = await db.select<Record<string, unknown>[]>(
        `SELECT * FROM ${safeTableName} WHERE id = ?`,
        [id]
      )

      await loadData()
      emitSQLiteDataChanged(safeTableName)

      if (!created?.[0]) return null
      return normalizeBooleanFields(safeTableName, mapKeys(created[0], toCamelCase)) as T
    },
    [loadData, safeTableName, tableName]
  )

  const update = useCallback(
    async (id: string, updates: Partial<T>): Promise<boolean> => {
      if (!safeTableName) {
        throw new Error(`Table non autorisée: ${tableName}`)
      }

      if (Object.keys(updates).length === 0) return true

      try {
        if (!isTauriRuntime()) {
          const updated = updateBrowserRow(safeTableName as BrowserTableName, id, updates as Partial<Record<string, unknown>>)
          await loadData()
          emitSQLiteDataChanged(safeTableName)
          return updated
        }

        const db = await getDatabase()
        const dbUpdates = stripUndefinedEntries(
          mapKeys(updates as Record<string, unknown>, toSnakeCase)
        )
        const fields = Object.keys(dbUpdates)
        if (fields.length === 0) return true
        const setClause = fields.map((field) => `${field} = ?`).join(", ")
        const params = [...Object.values(dbUpdates).map(sanitizeParam), id]

        await db.execute(`UPDATE ${safeTableName} SET ${setClause} WHERE id = ?`, params)
        await loadData()
        emitSQLiteDataChanged(safeTableName)
        return true
      } catch (err) {
        console.error(`[useSQLite] Error updating ${safeTableName}:`, err)
        return false
      }
    },
    [loadData, safeTableName, tableName]
  )

  const remove = useCallback(
    async (id: string): Promise<void> => {
      if (!safeTableName) {
        throw new Error(`Table non autorisée: ${tableName}`)
      }

      if (!isTauriRuntime()) {
        removeBrowserRow(safeTableName as BrowserTableName, id)
        await loadData()
        emitSQLiteDataChanged(safeTableName)
        return
      }

      const db = await getDatabase()
      await db.execute(`DELETE FROM ${safeTableName} WHERE id = ?`, [id])
      await loadData()
      emitSQLiteDataChanged(safeTableName)
    },
    [loadData, safeTableName, tableName]
  )

  const set = useCallback(
    async (id: string, item: Partial<T>): Promise<void> => {
      if (!safeTableName) {
        throw new Error(`Table non autorisée: ${tableName}`)
      }

      if (!isTauriRuntime()) {
        setBrowserRow(safeTableName as BrowserTableName, id, item as Partial<Record<string, unknown>>)
        await loadData()
        emitSQLiteDataChanged(safeTableName)
        return
      }

      const db = await getDatabase()
      const existing = await db.select<{ id: string }[]>(`SELECT id FROM ${safeTableName} WHERE id = ?`, [id])

      if (existing.length > 0) {
        await update(id, item)
        return
      }

      const dbItem = stripUndefinedEntries(
        mapKeys(item as Record<string, unknown>, toSnakeCase)
      )
      const fields = Object.keys(dbItem)
      const placeholders = fields.map(() => "?").join(", ")
      const values = Object.values(dbItem).map(sanitizeParam)

      await db.execute(
        `INSERT INTO ${safeTableName} (id${fields.length > 0 ? `, ${fields.join(", ")}` : ""}) VALUES (?${
          placeholders ? `, ${placeholders}` : ""
        })`,
        [id, ...values]
      )

      await loadData()
      emitSQLiteDataChanged(safeTableName)
    },
    [loadData, safeTableName, tableName, update]
  )

  const refresh = useCallback(async () => {
    await loadData()
  }, [loadData])

  return {
    data,
    loading,
    error,
    add,
    update,
    remove,
    set,
    refresh,
  }
}
