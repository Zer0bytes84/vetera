import { useCallback, useEffect, useState } from "react";

import {
  type BrowserTableName,
  getBrowserTable,
  insertBrowserRow,
  isTauriRuntime,
  removeBrowserRow,
  setBrowserRow,
  updateBrowserRow,
} from "@/services/browser-store";
import {
  generateId,
  getDatabase,
  toSQLiteTimestamp,
} from "../services/sqlite/database";

interface UseSQLiteResult<T> {
  add: (item: Omit<T, "id" | "createdAt" | "updatedAt">) => Promise<T | null>;
  data: T[];
  error: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
  remove: (id: string) => Promise<boolean>;
  set: (id: string, item: Partial<T>) => Promise<void>;
  update: (id: string, updates: Partial<T>) => Promise<boolean>;
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
  "consultation_documents",
  "tasks",
  "app_settings",
  "migrations",
]);

const BOOLEAN_FIELDS_BY_TABLE: Record<string, string[]> = {
  notes: ["isFavorite"],
  tasks: ["isReminder"],
};

const DATA_CHANGED_EVENT = "sqlite-data-changed";
let sqliteOperationQueue: Promise<void> = Promise.resolve();
const tableColumnsCache = new Map<string, Set<string>>();

const isDatabaseLockedError = (error: unknown) => {
  if (!error) {
    return false;
  }
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : JSON.stringify(error);
  const lower = message.toLowerCase();
  return lower.includes("database is locked") || lower.includes("code: 5");
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function withSqliteRetry<T>(operation: () => Promise<T>): Promise<T> {
  const delays = [120, 300, 650];
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= delays.length; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isDatabaseLockedError(error) || attempt === delays.length) {
        throw error;
      }
      await sleep(delays[attempt]);
    }
  }

  throw lastError;
}

export const emitSQLiteDataChanged = (tableName: string) => {
  window.dispatchEvent(
    new CustomEvent(DATA_CHANGED_EVENT, { detail: { tableName } })
  );
};

const toCamelCase = (value: string) =>
  value.replace(/_([a-z])/g, (_match, letter) => letter.toUpperCase());

const toSnakeCase = (value: string) =>
  value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

const toLegacyCamelFromSnake = (value: string) =>
  value.replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase());

const mapKeys = (
  obj: Record<string, unknown>,
  mapper: (key: string) => string
) => {
  const mapped: Record<string, unknown> = {};
  Object.keys(obj).forEach((key) => {
    mapped[mapper(key)] = obj[key];
  });
  return mapped;
};

const sanitizeParam = (value: unknown) => {
  if (value === undefined) {
    return null;
  }
  if (value === null) {
    return null;
  }
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  if (value instanceof Date) {
    return toSQLiteTimestamp(value);
  }
  return value;
};

const stripUndefinedEntries = (obj: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined)
  );

const getTableColumns = async (
  tableName: string,
  runSerializedTauriOp: <R>(operation: () => Promise<R>) => Promise<R>
) => {
  const cached = tableColumnsCache.get(tableName);
  if (cached) {
    return cached;
  }

  const columns = await runSerializedTauriOp(async () => {
    const db = await getDatabase();
    return db.select<Array<{ name: string }>>(
      `PRAGMA table_info(${tableName})`
    );
  });

  const normalized = new Set(
    (columns ?? []).map((column) => String(column.name))
  );
  tableColumnsCache.set(tableName, normalized);
  return normalized;
};

const resolveDbFieldName = (
  candidateSnake: string,
  availableColumns: Set<string>
) => {
  if (availableColumns.has(candidateSnake)) {
    return candidateSnake;
  }
  const legacyCamel = toLegacyCamelFromSnake(candidateSnake);
  if (availableColumns.has(legacyCamel)) {
    return legacyCamel;
  }
  return candidateSnake;
};

const normalizeDbPayloadToExistingColumns = (
  payload: Record<string, unknown>,
  availableColumns: Set<string>
) => {
  const mappedEntries: Array<[string, unknown]> = [];
  for (const [key, value] of Object.entries(payload)) {
    const resolvedKey = resolveDbFieldName(key, availableColumns);
    mappedEntries.push([resolvedKey, value]);
  }

  return Object.fromEntries(mappedEntries);
};

const normalizeBooleanFields = (
  tableName: string,
  row: Record<string, unknown>
) => {
  const booleanFields = BOOLEAN_FIELDS_BY_TABLE[tableName] ?? [];
  if (booleanFields.length === 0) {
    return row;
  }

  const next = { ...row };
  booleanFields.forEach((field) => {
    const current = next[field];
    if (current === 0 || current === 1) {
      next[field] = current === 1;
    }
  });
  return next;
};

export function useSQLite<T extends { id: string }>(
  tableName: string
): UseSQLiteResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const safeTableName = ALLOWED_TABLES.has(tableName) ? tableName : null;

  const runSerializedTauriOp = useCallback(
    async <R>(operation: () => Promise<R>): Promise<R> => {
      const job = sqliteOperationQueue
        .then(() => withSqliteRetry(operation))
        .catch(() => withSqliteRetry(operation));

      sqliteOperationQueue = job.then(
        () => undefined,
        () => undefined
      );

      return job;
    },
    []
  );

  const loadData = useCallback(async () => {
    try {
      if (!safeTableName) {
        throw new Error(`Table non autorisée: ${tableName}`);
      }
      setError(null);

      if (!isTauriRuntime()) {
        setData(
          getBrowserTable<T & Record<string, unknown>>(
            safeTableName as BrowserTableName
          ) as T[]
        );
        return;
      }

      const results = await runSerializedTauriOp(async () => {
        const db = await getDatabase();
        return db.select<Record<string, unknown>[]>(
          `SELECT * FROM ${safeTableName}`
        );
      });
      const mapped = (results ?? []).map((row) => {
        const camel = mapKeys(row, toCamelCase);
        return normalizeBooleanFields(safeTableName, camel);
      });

      setData(mapped as T[]);
    } catch (err) {
      console.error(`Error loading ${tableName}:`, err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [runSerializedTauriOp, safeTableName, tableName]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const handleDataChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ tableName: string }>;
      if (customEvent.detail?.tableName === tableName) {
        loadData();
      }
    };

    window.addEventListener(DATA_CHANGED_EVENT, handleDataChanged);
    return () =>
      window.removeEventListener(DATA_CHANGED_EVENT, handleDataChanged);
  }, [tableName, loadData]);

  const add = useCallback(
    async (
      item: Omit<T, "id" | "createdAt" | "updatedAt">
    ): Promise<T | null> => {
      if (!safeTableName) {
        throw new Error(`Table non autorisée: ${tableName}`);
      }

      if (!isTauriRuntime()) {
        const created = insertBrowserRow(safeTableName as BrowserTableName, {
          id: generateId(),
          ...(item as Record<string, unknown>),
        });

        await loadData();
        emitSQLiteDataChanged(safeTableName);
        return created as T;
      }

      const id = generateId();
      const dbItemRaw = stripUndefinedEntries(
        mapKeys(item as Record<string, unknown>, toSnakeCase)
      );
      const availableColumns = await getTableColumns(
        safeTableName,
        runSerializedTauriOp
      );
      const dbItem = normalizeDbPayloadToExistingColumns(
        dbItemRaw,
        availableColumns
      );

      const fields = Object.keys(dbItem);
      const placeholders = fields.map(() => "?").join(", ");
      const fieldNames = fields.join(", ");
      const values = Object.values(dbItem).map(sanitizeParam);

      const created = await runSerializedTauriOp(async () => {
        const db = await getDatabase();
        await db.execute(
          `INSERT INTO ${safeTableName} (id, ${fieldNames}) VALUES (?, ${placeholders})`,
          [id, ...values]
        );

        return db.select<Record<string, unknown>[]>(
          `SELECT * FROM ${safeTableName} WHERE id = ?`,
          [id]
        );
      });

      await loadData();
      emitSQLiteDataChanged(safeTableName);

      if (!created?.[0]) {
        return null;
      }
      return normalizeBooleanFields(
        safeTableName,
        mapKeys(created[0], toCamelCase)
      ) as T;
    },
    [loadData, runSerializedTauriOp, safeTableName, tableName]
  );

  const update = useCallback(
    async (id: string, updates: Partial<T>): Promise<boolean> => {
      if (!safeTableName) {
        throw new Error(`Table non autorisée: ${tableName}`);
      }

      if (Object.keys(updates).length === 0) {
        return true;
      }

      try {
        if (!isTauriRuntime()) {
          const updated = updateBrowserRow(
            safeTableName as BrowserTableName,
            id,
            updates as Partial<Record<string, unknown>>
          );
          await loadData();
          emitSQLiteDataChanged(safeTableName);
          return updated;
        }

        const dbUpdatesRaw = stripUndefinedEntries(
          mapKeys(updates as Record<string, unknown>, toSnakeCase)
        );
        const availableColumns = await getTableColumns(
          safeTableName,
          runSerializedTauriOp
        );
        const dbUpdates = normalizeDbPayloadToExistingColumns(
          dbUpdatesRaw,
          availableColumns
        );
        const fields = Object.keys(dbUpdates);
        if (fields.length === 0) {
          return true;
        }
        const setClause = fields.map((field) => `${field} = ?`).join(", ");
        const params = [...Object.values(dbUpdates).map(sanitizeParam), id];

        await runSerializedTauriOp(async () => {
          const db = await getDatabase();
          await db.execute(
            `UPDATE ${safeTableName} SET ${setClause} WHERE id = ?`,
            params
          );
        });
        await loadData();
        emitSQLiteDataChanged(safeTableName);
        return true;
      } catch (err) {
        console.error(`[useSQLite] Error updating ${safeTableName}:`, err);
        return false;
      }
    },
    [loadData, runSerializedTauriOp, safeTableName, tableName]
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      if (!safeTableName) {
        throw new Error(`Table non autorisée: ${tableName}`);
      }

      try {
        if (!isTauriRuntime()) {
          const removed = removeBrowserRow(
            safeTableName as BrowserTableName,
            id
          );
          if (!removed) {
            throw new Error(`Élément non trouvé: ${id}`);
          }
          await loadData();
          emitSQLiteDataChanged(safeTableName);
          return true;
        }

        const result = await runSerializedTauriOp(async () => {
          const db = await getDatabase();
          return db.execute(`DELETE FROM ${safeTableName} WHERE id = ?`, [id]);
        });
        if (result.rowsAffected === 0) {
          throw new Error(`Élément non trouvé: ${id}`);
        }
        await loadData();
        emitSQLiteDataChanged(safeTableName);
        return true;
      } catch (err) {
        console.error(`[useSQLite] Error removing from ${safeTableName}:`, err);
        setError(
          err instanceof Error ? err.message : "Erreur lors de la suppression"
        );
        return false;
      }
    },
    [loadData, runSerializedTauriOp, safeTableName, tableName, setError]
  );

  const set = useCallback(
    async (id: string, item: Partial<T>): Promise<void> => {
      if (!safeTableName) {
        throw new Error(`Table non autorisée: ${tableName}`);
      }

      if (!isTauriRuntime()) {
        setBrowserRow(
          safeTableName as BrowserTableName,
          id,
          item as Partial<Record<string, unknown>>
        );
        await loadData();
        emitSQLiteDataChanged(safeTableName);
        return;
      }

      const existing = await runSerializedTauriOp(async () => {
        const db = await getDatabase();
        return db.select<{ id: string }[]>(
          `SELECT id FROM ${safeTableName} WHERE id = ?`,
          [id]
        );
      });

      if (existing.length > 0) {
        await update(id, item);
        return;
      }

      const dbItemRaw = stripUndefinedEntries(
        mapKeys(item as Record<string, unknown>, toSnakeCase)
      );
      const availableColumns = await getTableColumns(
        safeTableName,
        runSerializedTauriOp
      );
      const dbItem = normalizeDbPayloadToExistingColumns(
        dbItemRaw,
        availableColumns
      );
      const fields = Object.keys(dbItem);
      const placeholders = fields.map(() => "?").join(", ");
      const values = Object.values(dbItem).map(sanitizeParam);

      await runSerializedTauriOp(async () => {
        const db = await getDatabase();
        await db.execute(
          `INSERT INTO ${safeTableName} (id${fields.length > 0 ? `, ${fields.join(", ")}` : ""}) VALUES (?${
            placeholders ? `, ${placeholders}` : ""
          })`,
          [id, ...values]
        );
      });

      await loadData();
      emitSQLiteDataChanged(safeTableName);
    },
    [loadData, runSerializedTauriOp, safeTableName, tableName, update]
  );

  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  return {
    data,
    loading,
    error,
    add,
    update,
    remove,
    set,
    refresh,
  };
}
