import { useCallback, useEffect, useId, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { tablesAffectedByDelete } from "@/services/sqlite/related-tables";
import { TableSnapshotCache, type CachedRow } from "@/services/sqlite/table-snapshot-cache";

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
  runDbOperation,
  runDbRead,
  toSQLiteTimestamp,
} from "../services/sqlite/database";

interface UseSQLiteResult<T> {
  add: (item: Omit<T, "id" | "createdAt" | "updatedAt">) => Promise<T | null>;
  data: T[];
  error: string | null;
  /** True only when no rows are known yet (first ever read of the table). */
  loading: boolean;
  /** True while a background re-read runs on top of already displayed rows. */
  isRefreshing: boolean;
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
  "stock_movements",
  "transactions",
  "notes",
  "consultation_documents",
  "tasks",
  "app_settings",
  "migrations",
  "weight_entries",
  "vaccinations",
  "consultation_soaps",
  "prescriptions",
  "prescription_items",
  "hospitalizations",
  "hospitalization_vitals",
  "anesthesia_sheets",
  "anesthesia_drug_log",
  "anesthesia_monitoring",
  "appointment_recurrences",
  "reminders",
  "audit_log",
  "notification_state",
]);

const BOOLEAN_FIELDS_BY_TABLE: Record<string, string[]> = {
  notes: ["isFavorite"],
  tasks: ["isReminder"],
};

const DATA_CHANGED_EVENT = "sqlite-data-changed";
const TABLE_CACHE_TTL_MS = 2000;
const tableColumnsCache = new Map<string, Set<string>>();
const tableRowsCache = new Map<
  string,
  { expiresAt: number; generation: number; rows: Record<string, unknown>[] }
>();
const pendingTableReads = new Map<
  string,
  { generation: number; promise: Promise<Record<string, unknown>[]> }
>();
const tableSnapshotCache = new TableSnapshotCache<CachedRow>();
const EMPTY_ROWS: CachedRow[] = [];


const getTableCacheGeneration = (tableName: string) =>
  tableSnapshotCache.generation(tableName);

const invalidateTableRows = (tableName: string) => {
  tableSnapshotCache.invalidate(tableName);
  tableRowsCache.delete(tableName);
};

type SQLiteChangedDetail = { tableName: string; cacheFresh?: boolean; cacheInvalidated?: boolean; sourceId?: string };

// External writes (imports, authentication, invoicing) must invalidate even
// when no consumer of that table is mounted. Invalidate once per event, before
// subscriber effects request their shared, deduplicated read.
const invalidateExternalChange = (event: Event) => {
  const detail = (event as CustomEvent<SQLiteChangedDetail>).detail;
  if (detail && ALLOWED_TABLES.has(detail.tableName) && !detail.cacheFresh && !detail.cacheInvalidated) {
    invalidateTableRows(detail.tableName);
  }
};
if (typeof window !== "undefined") {
  window.addEventListener(DATA_CHANGED_EVENT, invalidateExternalChange);
  import.meta.hot?.dispose(() => window.removeEventListener(DATA_CHANGED_EVENT, invalidateExternalChange));
}

const readTauriTable = async (tableName: string, force = false) => {
  const generation = getTableCacheGeneration(tableName);
  const cached = tableRowsCache.get(tableName);

  if (
    !force &&
    cached?.generation === generation &&
    cached.expiresAt > Date.now()
  ) {
    return cached.rows;
  }

  const pending = pendingTableReads.get(tableName);
  if (pending?.generation === generation) {
    return pending.promise;
  }

  const promise = runDbRead((db) =>
    db.select<Record<string, unknown>[]>(`SELECT * FROM ${tableName}`)
  )
    .then((rows) => {
      const normalizedRows = rows ?? [];
      if (getTableCacheGeneration(tableName) === generation) {
        tableRowsCache.set(tableName, {
          expiresAt: Date.now() + TABLE_CACHE_TTL_MS,
          generation,
          rows: normalizedRows,
        });
      }
      return normalizedRows;
    })
    .finally(() => {
      const current = pendingTableReads.get(tableName);
      if (current?.generation === generation) {
        pendingTableReads.delete(tableName);
      }
    });

  pendingTableReads.set(tableName, { generation, promise });
  return promise;
};

export const emitSQLiteDataChanged = (
  tableName: string,
  cacheFresh = false,
  sourceId?: string
) => {
  if (!cacheFresh) {
    invalidateTableRows(tableName);
  }
  window.dispatchEvent(
    new CustomEvent(DATA_CHANGED_EVENT, {
      detail: { cacheFresh, cacheInvalidated: !cacheFresh, sourceId, tableName },
    })
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

type SQLiteDatabase = Awaited<ReturnType<typeof getDatabase>>;

const getTableColumns = async (db: SQLiteDatabase, tableName: string) => {
  const cached = tableColumnsCache.get(tableName);
  if (cached) {
    return cached;
  }

  // Called inside the serialized write. Enqueuing another read here deadlocks
  // the shared read/write queue (the inner job would wait for its own parent).
  const columns = await db.select<Array<{ name: string }>>(`PRAGMA table_info(${tableName})`);

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

export type SQLiteWriteStatus = { pending: number; error: string | null; savedAt: number | null };
let writeStatus: SQLiteWriteStatus = { pending: 0, error: null, savedAt: null };
const writeListeners = new Set<() => void>();
export const getSQLiteWriteStatus = () => writeStatus;
export const subscribeSQLiteWrites = (listener: () => void) => {
  writeListeners.add(listener);
  return () => { writeListeners.delete(listener); };
};
function updateWriteStatus(patch: Partial<SQLiteWriteStatus>) {
  writeStatus = { ...writeStatus, ...patch };
  writeListeners.forEach(listener => listener());
}

async function loadTableSnapshot(table: string, force = false) {
  if (!isTauriRuntime()) {
    tableSnapshotCache.replace(table, getBrowserTable(table as BrowserTableName) as CachedRow[]);
    return;
  }
  const generation = getTableCacheGeneration(table);
  const rows = await readTauriTable(table, force);
  const applied = tableSnapshotCache.replace(table, rows.map(row => normalizeBooleanFields(table, mapKeys(row, toCamelCase)) as CachedRow), generation);
  if (!applied && !tableSnapshotCache.has(table)) await loadTableSnapshot(table, true);
}

/** Intent-only prefetch. Consumers keep exactly the same repository contracts. */
export async function prefetchSQLiteTables(tables: string[]) {
  await Promise.allSettled(tables.filter(table => ALLOWED_TABLES.has(table)).map(table => loadTableSnapshot(table)));
}

function publishPatchedTable(table: string, sourceId: string, rowId?: string) {
  const rows = tableSnapshotCache.getConfirmedRows(table);
  // Pending optimistic layers must never become the confirmed read-cache:
  // another subscriber can revalidate while a later write is still in flight.
  if (rows) tableRowsCache.set(table, {
    expiresAt: Date.now() + TABLE_CACHE_TTL_MS,
    generation: getTableCacheGeneration(table),
    rows: rows.map(row => mapKeys(row, toSnakeCase)),
  });
  emitSQLiteDataChanged(table, true, sourceId);
  if (rowId) window.dispatchEvent(new CustomEvent("sqlite-row-saved", { detail: { tableName: table, id: rowId } }));
}

export function useSQLite<T extends { id: string }>(tableName: string): UseSQLiteResult<T> {
  const safeTableName = ALLOWED_TABLES.has(tableName) ? tableName : null;
  if (safeTableName && !isTauriRuntime() && !tableSnapshotCache.has(safeTableName)) {
    tableSnapshotCache.replace(safeTableName, getBrowserTable(safeTableName as BrowserTableName) as CachedRow[]);
  }
  const subscribe = useCallback((listener: () => void) => safeTableName ? tableSnapshotCache.subscribe(safeTableName, listener) : () => {}, [safeTableName]);
  const getSnapshot = useCallback(() => safeTableName ? tableSnapshotCache.getRows(safeTableName) ?? EMPTY_ROWS : EMPTY_ROWS, [safeTableName]);
  const data = useSyncExternalStore(subscribe, getSnapshot, getSnapshot) as unknown as T[];
  const [loading, setLoading] = useState(() => Boolean(safeTableName) && !tableSnapshotCache.has(safeTableName!));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sourceId = useId();

  const loadData = useCallback(async (force = false) => {
    try {
      if (!safeTableName) throw new Error(`Table non autorisée: ${tableName}`);
      setError(null);
      setIsRefreshing(tableSnapshotCache.has(safeTableName));
      await loadTableSnapshot(safeTableName, force);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lecture impossible";
      setError(message);
      toast.error("Les données n’ont pas pu être chargées.", {
        description: message,
        action: { label: "Réessayer", onClick: () => { void loadData(true); } },
      });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [safeTableName, tableName]);

  useEffect(() => { void loadData(); }, [loadData]);
  useEffect(() => {
    const changed = (event: Event) => {
      const detail = (event as CustomEvent<{ tableName: string; cacheFresh?: boolean; sourceId?: string }>).detail;
      if (detail?.tableName !== tableName || detail.sourceId === sourceId) return;
      // Optimistic/confirmed patches already reached every subscriber synchronously.
      if (detail.cacheFresh && tableSnapshotCache.has(tableName)) return;
      void loadData();
    };
    window.addEventListener(DATA_CHANGED_EVENT, changed);
    return () => window.removeEventListener(DATA_CHANGED_EVENT, changed);
  }, [loadData, sourceId, tableName]);

  const write = useCallback(async <R,>(id: string, apply: (rows: CachedRow[]) => CachedRow[], operation: (db: SQLiteDatabase) => Promise<{ value: R; row?: CachedRow | null }>, retry: () => unknown): Promise<R> => {
    if (!safeTableName) throw new Error(`Table non autorisée: ${tableName}`);
    const token = tableSnapshotCache.begin(safeTableName, id, apply);
    setError(null);
    updateWriteStatus({ pending: writeStatus.pending + 1, error: null });
    try {
      const result = await runDbOperation(operation);
      tableSnapshotCache.commit(safeTableName, token, result.row);
      publishPatchedTable(safeTableName, sourceId, id);
      updateWriteStatus({ savedAt: Date.now() });
      return result.value;
    } catch (err) {
      tableSnapshotCache.rollback(safeTableName, token);
      tableRowsCache.delete(safeTableName);
      const message = err instanceof Error ? err.message : "Écriture impossible";
      setError(message);
      updateWriteStatus({ error: message });
      toast.error("La modification n’a pas été enregistrée.", {
        description: message,
        action: { label: "Réessayer", onClick: () => { void Promise.resolve(retry()).catch(() => undefined); } },
      });
      throw err;
    } finally {
      updateWriteStatus({ pending: Math.max(0, writeStatus.pending - 1) });
    }
  }, [safeTableName, sourceId, tableName]);

  const mapRow = useCallback((row: Record<string, unknown>) => normalizeBooleanFields(tableName, mapKeys(row, toCamelCase)) as CachedRow, [tableName]);
  const authoritativeRow = useCallback(async (db: SQLiteDatabase, id: string, fallback: CachedRow) => {
    try {
      const rows = await db.select<Record<string, unknown>[]>(`SELECT * FROM ${safeTableName} WHERE id = ?`, [id]);
      return rows[0] ? mapRow(rows[0]) : fallback;
    } catch {
      // The write already succeeded. A post-write read must not falsely roll it back.
      return fallback;
    }
  }, [mapRow, safeTableName]);

  const add = useCallback(async (item: Omit<T, "id" | "createdAt" | "updatedAt">): Promise<T | null> => {
    if (!safeTableName) throw new Error(`Table non autorisée: ${tableName}`);
    const id = generateId();
    if (!isTauriRuntime()) {
      const created = insertBrowserRow(safeTableName as BrowserTableName, { id, ...item });
      await loadData();
      publishPatchedTable(safeTableName, sourceId, id);
      return created as T;
    }
    const optimistic = { ...item, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as unknown as CachedRow;
    try {
      return await write(id, rows => [...rows.filter(row => row.id !== id), optimistic], async (db) => {
        const columns = await getTableColumns(db, safeTableName);
        const payload = normalizeDbPayloadToExistingColumns(stripUndefinedEntries(mapKeys(item as Record<string, unknown>, toSnakeCase)), columns);
        const fields = Object.keys(payload).filter(field => field !== "id");
        await db.execute(`INSERT INTO ${safeTableName} (id${fields.length ? `, ${fields.join(", ")}` : ""}) VALUES (?${fields.map(() => ", ?").join("")})`, [id, ...fields.map(field => sanitizeParam(payload[field]))]);
        const row = await authoritativeRow(db, id, optimistic);
        return { value: row as unknown as T, row };
      }, () => add(item));
    } catch { return null; }
  }, [authoritativeRow, loadData, safeTableName, sourceId, tableName, write]);

  const update = useCallback(async (id: string, updates: Partial<T>): Promise<boolean> => {
    if (!safeTableName) throw new Error(`Table non autorisée: ${tableName}`);
    const patch = stripUndefinedEntries(updates as Record<string, unknown>);
    delete patch.id;
    if (!Object.keys(patch).length) return true;
    if (!isTauriRuntime()) {
      const updated = updateBrowserRow(safeTableName as BrowserTableName, id, patch);
      await loadData();
      publishPatchedTable(safeTableName, sourceId, id);
      return updated;
    }
    const fallback = { ...tableSnapshotCache.getRows(safeTableName)?.find(row => row.id === id), ...patch, id } as CachedRow;
    try {
      return await write(id, rows => rows.map(row => row.id === id ? { ...row, ...patch } : row), async (db) => {
        const columns = await getTableColumns(db, safeTableName);
        const payload = normalizeDbPayloadToExistingColumns(mapKeys(patch, toSnakeCase), columns);
        const fields = Object.keys(payload);
        const result = await db.execute(`UPDATE ${safeTableName} SET ${fields.map(field => `${field} = ?`).join(", ")} WHERE id = ?`, [...fields.map(field => sanitizeParam(payload[field])), id]);
        if (!result.rowsAffected) throw new Error("L’élément n’existe plus. Actualisez la liste.");
        return { value: true, row: await authoritativeRow(db, id, fallback) };
      }, () => update(id, updates));
    } catch { return false; }
  }, [authoritativeRow, loadData, safeTableName, sourceId, tableName, write]);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    if (!safeTableName) throw new Error(`Table non autorisée: ${tableName}`);
    if (!isTauriRuntime()) {
      const removed = removeBrowserRow(safeTableName as BrowserTableName, id);
      await loadData();
      publishPatchedTable(safeTableName, sourceId);
      return removed;
    }
    try {
      const removed = await write(id, rows => rows.filter(row => row.id !== id), async (db) => {
        const result = await db.execute(`DELETE FROM ${safeTableName} WHERE id = ?`, [id]);
        if (!result.rowsAffected) throw new Error("L’élément n’existe plus. Actualisez la liste.");
        return { value: true, row: null };
      }, () => remove(id));
      // Cascades and SET NULL affect related tables; invalidate only those tables.
      for (const dependent of tablesAffectedByDelete(safeTableName)) emitSQLiteDataChanged(dependent);
      return removed;
    } catch { return false; }
  }, [loadData, safeTableName, sourceId, tableName, write]);

  const set = useCallback(async (id: string, item: Partial<T>): Promise<void> => {
    if (!safeTableName) throw new Error(`Table non autorisée: ${tableName}`);
    if (!isTauriRuntime()) {
      setBrowserRow(safeTableName as BrowserTableName, id, item as Partial<Record<string, unknown>>);
      await loadData();
      publishPatchedTable(safeTableName, sourceId, id);
      return;
    }
    const existing = await runDbRead(db => db.select<{ id: string }[]>(`SELECT id FROM ${safeTableName} WHERE id = ?`, [id]));
    if (existing.length) {
      if (!await update(id, item)) throw new Error("La modification n’a pas été enregistrée.");
      return;
    }
    const optimistic = { ...item, id } as unknown as CachedRow;
    await write(id, rows => [...rows.filter(row => row.id !== id), optimistic], async (db) => {
      const columns = await getTableColumns(db, safeTableName);
      const payload = normalizeDbPayloadToExistingColumns(stripUndefinedEntries(mapKeys(item as Record<string, unknown>, toSnakeCase)), columns);
      const fields = Object.keys(payload).filter(field => field !== "id");
      await db.execute(`INSERT INTO ${safeTableName} (id${fields.length ? `, ${fields.join(", ")}` : ""}) VALUES (?${fields.map(() => ", ?").join("")})`, [id, ...fields.map(field => sanitizeParam(payload[field]))]);
      return { value: undefined, row: await authoritativeRow(db, id, optimistic) };
    }, () => set(id, item));
  }, [authoritativeRow, loadData, safeTableName, sourceId, tableName, update, write]);

  const refresh = useCallback(async () => {
    if (safeTableName) invalidateTableRows(safeTableName);
    await loadData(true);
  }, [loadData, safeTableName]);

  return { data, loading, isRefreshing, error, add, update, remove, set, refresh };
}
