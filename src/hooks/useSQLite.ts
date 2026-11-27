import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { toast } from "sonner";
import { PATIENTS_WITH_REFERENCE_SQL } from "@/modules/patients/reference/reference";
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
  type CacheTarget,
  cacheTarget,
  patientScopedReadSql,
  rowInTarget,
} from "@/services/sqlite/patient-scope";
import { tablesAffectedByDelete } from "@/services/sqlite/related-tables";
import {
  type CachedRow,
  TableSnapshotCache,
} from "@/services/sqlite/table-snapshot-cache";
import {
  generateId,
  type getDatabase,
  runDbOperation,
  runDbRead,
  toSQLiteTimestamp,
} from "../services/sqlite/database";

interface UseSQLiteResult<T> {
  add: (item: Omit<T, "id" | "createdAt" | "updatedAt">) => Promise<T | null>;
  data: T[];
  error: string | null;
  /** True while a background re-read runs on top of already displayed rows. */
  isRefreshing: boolean;
  /** True only when no rows are known yet (first ever read of the table). */
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
  "stock_movements",
  "transactions",
  "notes",
  "consultation_documents",
  "library_items",
  "document_templates",
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
  products: ["stockTracked"],
  notes: ["isFavorite", "isPinned"],
  library_items: ["isFavorite", "isPinned"],
  tasks: ["isReminder"],
  patients: ["sterilized"],
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

// Lectures par patient vivantes, par table. Les plus anciennes sans abonné sont oubliées au-delà de cette limite :
// rouvrir un dossier récent reste instantané, et la mémoire ne grandit pas avec chaque dossier parcouru.
const RECENT_PATIENT_SCOPES = 8;
const patientScopesByTable = new Map<string, Map<string, CacheTarget>>();

const scopedTargets = (tableName: string) =>
  patientScopesByTable.get(tableName)?.values() ?? [];

const registerTarget = (target: CacheTarget) => {
  if (target.patientId === undefined) {
    return;
  }
  let scopes = patientScopesByTable.get(target.table);
  if (!scopes) {
    scopes = new Map();
    patientScopesByTable.set(target.table, scopes);
  }
  scopes.delete(target.key);
  scopes.set(target.key, target);
  for (const [key] of scopes) {
    if (scopes.size <= RECENT_PATIENT_SCOPES) {
      break;
    }
    if (key !== target.key && tableSnapshotCache.isIdle(key)) {
      scopes.delete(key);
      tableSnapshotCache.drop(key);
      tableRowsCache.delete(key);
      pendingTableReads.delete(key);
    }
  }
};

const getTableCacheGeneration = (key: string) =>
  tableSnapshotCache.generation(key);

const invalidateCacheKey = (key: string) => {
  tableSnapshotCache.invalidate(key);
  tableRowsCache.delete(key);
};

/** Une table a changé : sa lecture entière et chacune de ses lectures par patient sont périmées. */
const invalidateTableRows = (tableName: string) => {
  invalidateCacheKey(tableName);
  for (const target of scopedTargets(tableName)) {
    invalidateCacheKey(target.key);
  }
};

interface SQLiteChangedDetail {
  cacheFresh?: boolean;
  cacheInvalidated?: boolean;
  sourceId?: string;
  tableName: string;
}

// External writes (imports, authentication, invoicing) must invalidate even
// when no consumer of that table is mounted. Invalidate once per event, before
// subscriber effects request their shared, deduplicated read.
const invalidateExternalChange = (event: Event) => {
  const detail = (event as CustomEvent<SQLiteChangedDetail>).detail;
  if (
    detail &&
    ALLOWED_TABLES.has(detail.tableName) &&
    !detail.cacheFresh &&
    !detail.cacheInvalidated
  ) {
    invalidateTableRows(detail.tableName);
  }
};
if (typeof window !== "undefined") {
  window.addEventListener(DATA_CHANGED_EVENT, invalidateExternalChange);
  import.meta.hot?.dispose(() =>
    window.removeEventListener(DATA_CHANGED_EVENT, invalidateExternalChange)
  );
}

const readTauriTable = (target: CacheTarget, force = false) => {
  const { key, patientId, table } = target;
  const generation = getTableCacheGeneration(key);
  const cached = tableRowsCache.get(key);

  if (
    !force &&
    cached?.generation === generation &&
    cached.expiresAt > Date.now()
  ) {
    return cached.rows;
  }

  const pending = pendingTableReads.get(key);
  if (pending?.generation === generation) {
    return pending.promise;
  }

  const promise = runDbRead((db) =>
    patientId === undefined
      ? db.select<Record<string, unknown>[]>(tableReadSql(table))
      : db.select<Record<string, unknown>[]>(patientScopedReadSql(table), [
          patientId,
        ])
  )
    .then((rows) => {
      const normalizedRows = rows ?? [];
      if (getTableCacheGeneration(key) === generation) {
        tableRowsCache.set(key, {
          expiresAt: Date.now() + TABLE_CACHE_TTL_MS,
          generation,
          rows: normalizedRows,
        });
      }
      return normalizedRows;
    })
    .finally(() => {
      const current = pendingTableReads.get(key);
      if (current?.generation === generation) {
        pendingTableReads.delete(key);
      }
    });

  pendingTableReads.set(key, { generation, promise });
  return promise;
};

/** Les lignes d'une lecture hors Tauri : la table du magasin du navigateur, filtrée par patient s'il y a lieu. */
const browserRows = (target: CacheTarget) => {
  const rows = getBrowserTable(target.table as BrowserTableName) as CachedRow[];
  return target.patientId === undefined
    ? rows
    : rows.filter((row) => rowInTarget(target, row));
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
      detail: {
        cacheFresh,
        cacheInvalidated: !cacheFresh,
        sourceId,
        tableName,
      },
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
  for (const key of Object.keys(obj)) {
    mapped[mapper(key)] = obj[key];
  }
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
  const columns = await db.select<Array<{ name: string }>>(
    `PRAGMA table_info(${tableName})`
  );

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
  const mappedEntries: [string, unknown][] = [];
  for (const [key, value] of Object.entries(payload)) {
    // A patient's reference is read from its own table and is never written back.
    if (key === "reference" && !availableColumns.has(key)) {
      continue;
    }
    const resolvedKey = resolveDbFieldName(key, availableColumns);
    mappedEntries.push([resolvedKey, value]);
  }

  return Object.fromEntries(mappedEntries);
};

/** The statement that reads a whole table, as every store reads it (a patient carries its reference). */
export const tableReadSql = (tableName: string) =>
  tableName === "patients"
    ? PATIENTS_WITH_REFERENCE_SQL
    : `SELECT * FROM ${tableName}`;

/** A row as the stores hold it: camelCase keys, 0/1 columns read as booleans. Also used by the assistant's guarded reader. */
export function mapTableRow(
  tableName: string,
  row: Record<string, unknown>
): Record<string, unknown> {
  return normalizeBooleanFields(tableName, mapKeys(row, toCamelCase));
}

const normalizeBooleanFields = (
  tableName: string,
  row: Record<string, unknown>
) => {
  const booleanFields = BOOLEAN_FIELDS_BY_TABLE[tableName] ?? [];
  if (booleanFields.length === 0) {
    return row;
  }

  const next = { ...row };
  for (const field of booleanFields) {
    const current = next[field];
    if (current === 0 || current === 1) {
      next[field] = current === 1;
    }
  }
  return next;
};

export interface SQLiteWriteStatus {
  error: string | null;
  pending: number;
  savedAt: number | null;
}
let writeStatus: SQLiteWriteStatus = { pending: 0, error: null, savedAt: null };
const writeListeners = new Set<() => void>();
export const getSQLiteWriteStatus = () => writeStatus;
export const subscribeSQLiteWrites = (listener: () => void) => {
  writeListeners.add(listener);
  return () => {
    writeListeners.delete(listener);
  };
};
function updateWriteStatus(patch: Partial<SQLiteWriteStatus>) {
  writeStatus = { ...writeStatus, ...patch };
  for (const listener of writeListeners) {
    listener();
  }
}

/** Relit la ligne ecrite. Hors du hook : le `try` porte une expression conditionnelle que le compilateur React ne traduit pas. */
async function readAuthoritativeRow(
  db: SQLiteDatabase,
  safeTableName: string | null,
  mapRow: (row: Record<string, unknown>) => CachedRow,
  id: string,
  fallback: CachedRow
): Promise<CachedRow> {
  try {
    const rows = await db.select<Record<string, unknown>[]>(
      safeTableName === "patients"
        ? `${PATIENTS_WITH_REFERENCE_SQL} WHERE patients.id = ?`
        : `SELECT * FROM ${safeTableName} WHERE id = ?`,
      [id]
    );
    return rows[0] ? mapRow(rows[0]) : fallback;
  } catch {
    // The write already succeeded. A post-write read must not falsely roll it back.
    return fallback;
  }
}

/** Lecture d'une table. Hors du hook : « Réessayer » rappelle cette même fonction, ce qu'un rappel de composant ne peut pas faire. */
async function reloadTable(
  ops: {
    safeTableName: string | null;
    target: CacheTarget;
    tableName: string;
    setError: (message: string | null) => void;
    setLoading: (value: boolean) => void;
    setIsRefreshing: (value: boolean) => void;
  },
  force = false
): Promise<void> {
  const {
    safeTableName,
    target,
    tableName,
    setError,
    setLoading,
    setIsRefreshing,
  } = ops;
  try {
    if (!safeTableName) {
      throw new Error(`Table non autorisée: ${tableName}`);
    }
    setError(null);
    setIsRefreshing(tableSnapshotCache.has(target.key));
    await loadTableSnapshot(target, force);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lecture impossible";
    setError(message);
    toast.error("Les données n’ont pas pu être chargées.", {
      description: message,
      action: {
        label: "Réessayer",
        onClick: () => {
          void reloadTable(ops, true);
        },
      },
    });
  } finally {
    setLoading(false);
    setIsRefreshing(false);
  }
}

/** Ce que les opérations d'écriture reçoivent du hook : les valeurs de sa fermeture, passées explicitement. */
interface TableOps<T extends { id: string }> {
  authoritativeRow: (
    db: SQLiteDatabase,
    id: string,
    fallback: CachedRow
  ) => Promise<CachedRow>;
  loadData: (force?: boolean) => Promise<void>;
  /** Pour le typage seul : T n'apparaît que dans les signatures des opérations. */
  readonly rowType?: T;
  safeTableName: string | null;
  sourceId: string;
  tableName: string;
  /** La lecture du hook : la table entière, ou les lignes d'un patient. */
  target: CacheTarget;
  write: <R>(
    id: string,
    apply: (rows: CachedRow[]) => CachedRow[],
    operation: (
      db: SQLiteDatabase
    ) => Promise<{ value: R; row?: CachedRow | null }>,
    retry: () => unknown
  ) => Promise<R>;
}

async function addRow<T extends { id: string }>(
  ops: TableOps<T>,
  item: Omit<T, "id" | "createdAt" | "updatedAt">
): Promise<T | null> {
  const {
    safeTableName,
    tableName,
    sourceId,
    loadData,
    write,
    authoritativeRow,
  } = ops;
  if (!safeTableName) {
    throw new Error(`Table non autorisée: ${tableName}`);
  }
  const id = generateId();
  if (!isTauriRuntime()) {
    const created = insertBrowserRow(safeTableName as BrowserTableName, {
      id,
      ...item,
    });
    await loadData();
    publishPatchedTable(safeTableName, sourceId, id);
    return created as T;
  }
  const optimistic = {
    ...item,
    id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as unknown as CachedRow;
  try {
    return await write(
      id,
      (rows) => [...rows.filter((row) => row.id !== id), optimistic],
      async (db) => {
        const columns = await getTableColumns(db, safeTableName);
        const payload = normalizeDbPayloadToExistingColumns(
          stripUndefinedEntries(
            mapKeys(item as Record<string, unknown>, toSnakeCase)
          ),
          columns
        );
        const fields = Object.keys(payload).filter((field) => field !== "id");
        await db.execute(
          `INSERT INTO ${safeTableName} (id${fields.length ? `, ${fields.join(", ")}` : ""}) VALUES (?${fields.map(() => ", ?").join("")})`,
          [id, ...fields.map((field) => sanitizeParam(payload[field]))]
        );
        const row = await authoritativeRow(db, id, optimistic);
        return { value: row as unknown as T, row };
      },
      () => addRow(ops, item)
    );
  } catch {
    return null;
  }
}

async function updateRow<T extends { id: string }>(
  ops: TableOps<T>,
  id: string,
  updates: Partial<T>
): Promise<boolean> {
  const {
    safeTableName,
    tableName,
    sourceId,
    loadData,
    write,
    authoritativeRow,
    target,
  } = ops;
  if (!safeTableName) {
    throw new Error(`Table non autorisée: ${tableName}`);
  }
  const { id: _omittedId, ...patch } = stripUndefinedEntries(
    updates as Record<string, unknown>
  );
  if (!Object.keys(patch).length) {
    return true;
  }
  if (!isTauriRuntime()) {
    const updated = updateBrowserRow(
      safeTableName as BrowserTableName,
      id,
      patch
    );
    await loadData();
    publishPatchedTable(safeTableName, sourceId, id);
    return updated;
  }
  const known = (key: string) =>
    tableSnapshotCache.getRows(key)?.find((row) => row.id === id);
  const fallback = {
    ...(known(target.key) ?? known(safeTableName)),
    ...patch,
    id,
  } as CachedRow;
  try {
    return await write(
      id,
      (rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)),
      async (db) => {
        const columns = await getTableColumns(db, safeTableName);
        const payload = normalizeDbPayloadToExistingColumns(
          mapKeys(patch, toSnakeCase),
          columns
        );
        const fields = Object.keys(payload);
        const result = await db.execute(
          `UPDATE ${safeTableName} SET ${fields.map((field) => `${field} = ?`).join(", ")} WHERE id = ?`,
          [...fields.map((field) => sanitizeParam(payload[field])), id]
        );
        if (!result.rowsAffected) {
          throw new Error("L’élément n’existe plus. Actualisez la liste.");
        }
        return { value: true, row: await authoritativeRow(db, id, fallback) };
      },
      () => updateRow(ops, id, updates)
    );
  } catch {
    return false;
  }
}

async function removeRow<T extends { id: string }>(
  ops: TableOps<T>,
  id: string
): Promise<boolean> {
  const { safeTableName, tableName, sourceId, loadData, write } = ops;
  if (!safeTableName) {
    throw new Error(`Table non autorisée: ${tableName}`);
  }
  if (!isTauriRuntime()) {
    const removed = removeBrowserRow(safeTableName as BrowserTableName, id);
    await loadData();
    publishPatchedTable(safeTableName, sourceId);
    return removed;
  }
  try {
    const removed = await write(
      id,
      (rows) => rows.filter((row) => row.id !== id),
      async (db) => {
        const result = await db.execute(
          `DELETE FROM ${safeTableName} WHERE id = ?`,
          [id]
        );
        if (!result.rowsAffected) {
          throw new Error("L’élément n’existe plus. Actualisez la liste.");
        }
        return { value: true, row: null };
      },
      () => removeRow(ops, id)
    );
    // Cascades and SET NULL affect related tables; invalidate only those tables.
    for (const dependent of tablesAffectedByDelete(safeTableName)) {
      emitSQLiteDataChanged(dependent);
    }
    return removed;
  } catch {
    return false;
  }
}

async function setRow<T extends { id: string }>(
  ops: TableOps<T>,
  update: (id: string, updates: Partial<T>) => Promise<boolean>,
  id: string,
  item: Partial<T>
): Promise<void> {
  const {
    safeTableName,
    tableName,
    sourceId,
    loadData,
    write,
    authoritativeRow,
  } = ops;
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
    publishPatchedTable(safeTableName, sourceId, id);
    return;
  }
  const existing = await runDbRead((db) =>
    db.select<{ id: string }[]>(
      `SELECT id FROM ${safeTableName} WHERE id = ?`,
      [id]
    )
  );
  if (existing.length) {
    if (!(await update(id, item))) {
      throw new Error("La modification n’a pas été enregistrée.");
    }
    return;
  }
  const optimistic = { ...item, id } as unknown as CachedRow;
  await write(
    id,
    (rows) => [...rows.filter((row) => row.id !== id), optimistic],
    async (db) => {
      const columns = await getTableColumns(db, safeTableName);
      const payload = normalizeDbPayloadToExistingColumns(
        stripUndefinedEntries(
          mapKeys(item as Record<string, unknown>, toSnakeCase)
        ),
        columns
      );
      const fields = Object.keys(payload).filter((field) => field !== "id");
      await db.execute(
        `INSERT INTO ${safeTableName} (id${fields.length ? `, ${fields.join(", ")}` : ""}) VALUES (?${fields.map(() => ", ?").join("")})`,
        [id, ...fields.map((field) => sanitizeParam(payload[field]))]
      );
      return {
        value: undefined,
        row: await authoritativeRow(db, id, optimistic),
      };
    },
    () => setRow(ops, update, id, item)
  );
}

/**
 * L'écriture optimiste d'une ligne. Elle vit hors du hook : le compilateur React ne sait pas traduire son `try … finally`,
 * et `guard()` ajouterait des tours de micro-tâches que les tests de la file d'écriture observent. Le corps est celui d'origine.
 */
async function runTableWrite<R>({
  safeTableName,
  tableName,
  sourceId,
  setError,
  id,
  apply,
  operation,
  retry,
}: {
  safeTableName: string | null;
  tableName: string;
  sourceId: string;
  setError: (message: string | null) => void;
  id: string;
  apply: (rows: CachedRow[]) => CachedRow[];
  operation: (
    db: SQLiteDatabase
  ) => Promise<{ value: R; row?: CachedRow | null }>;
  retry: () => unknown;
}): Promise<R> {
  if (!safeTableName) {
    throw new Error(`Table non autorisée: ${tableName}`);
  }
  const tokens = beginTableLayers(safeTableName, id, apply);
  setError(null);
  updateWriteStatus({ pending: writeStatus.pending + 1, error: null });
  try {
    const result = await runDbOperation(operation);
    commitTableLayers(tokens, result.row);
    publishPatchedTable(safeTableName, sourceId, id);
    updateWriteStatus({ savedAt: Date.now() });
    return result.value;
  } catch (err) {
    for (const { target, token } of tokens) {
      tableSnapshotCache.rollback(target.key, token);
      tableRowsCache.delete(target.key);
    }
    const message = err instanceof Error ? err.message : "Écriture impossible";
    setError(message);
    updateWriteStatus({ error: message });
    toast.error("La modification n’a pas été enregistrée.", {
      description: message,
      action: {
        label: "Réessayer",
        onClick: () => {
          void Promise.resolve(retry()).catch(() => undefined);
        },
      },
    });
    throw err;
  } finally {
    updateWriteStatus({ pending: Math.max(0, writeStatus.pending - 1) });
  }
}

/**
 * Une écriture optimiste se pose sur chaque lecture de la table : la table entière et chaque lecture par patient,
 * où seules restent les lignes de ce patient. Tous les écrans voient ainsi la même écriture, au même moment.
 */
function beginTableLayers(
  table: string,
  id: string,
  apply: (rows: CachedRow[]) => CachedRow[]
) {
  const tokens = [
    {
      target: cacheTarget(table),
      token: tableSnapshotCache.begin(table, id, apply),
    },
  ];
  for (const target of scopedTargets(table)) {
    tokens.push({
      target,
      token: tableSnapshotCache.begin(target.key, id, (rows) =>
        apply(rows).filter((row) => rowInTarget(target, row))
      ),
    });
  }
  return tokens;
}

function commitTableLayers(
  tokens: { target: CacheTarget; token: number }[],
  row: CachedRow | null | undefined
) {
  for (const { target, token } of tokens) {
    // La ligne confirmée n'entre dans une lecture par patient que si elle est bien à ce patient ; sinon elle en sort.
    const confirmed =
      row && target.patientId !== undefined && !rowInTarget(target, row)
        ? null
        : row;
    tableSnapshotCache.commit(target.key, token, confirmed);
  }
}

async function loadTableSnapshot(target: CacheTarget, force = false) {
  registerTarget(target);
  if (!isTauriRuntime()) {
    tableSnapshotCache.replace(target.key, browserRows(target));
    return;
  }
  const generation = getTableCacheGeneration(target.key);
  const rows = await readTauriTable(target, force);
  const applied = tableSnapshotCache.replace(
    target.key,
    rows.map((row) => mapTableRow(target.table, row) as CachedRow),
    generation
  );
  if (!(applied || tableSnapshotCache.has(target.key))) {
    await loadTableSnapshot(target, true);
  }
}

/** Intent-only prefetch. Consumers keep exactly the same repository contracts. */
export async function prefetchSQLiteTables(tables: string[]) {
  await Promise.allSettled(
    tables
      .filter((table) => ALLOWED_TABLES.has(table))
      .map((table) => loadTableSnapshot(cacheTarget(table)))
  );
}

function publishPatchedTable(table: string, sourceId: string, rowId?: string) {
  const targets = [cacheTarget(table), ...scopedTargets(table)];
  for (const target of targets) {
    if (!isTauriRuntime()) {
      // Hors Tauri, l'écrivain n'a relu que sa propre lecture : les autres lectures de la table sont relues du magasin.
      if (tableSnapshotCache.has(target.key)) {
        tableSnapshotCache.replace(target.key, browserRows(target));
      }
      continue;
    }
    const rows = tableSnapshotCache.getConfirmedRows(target.key);
    // Pending optimistic layers must never become the confirmed read-cache:
    // another subscriber can revalidate while a later write is still in flight.
    if (rows) {
      tableRowsCache.set(target.key, {
        expiresAt: Date.now() + TABLE_CACHE_TTL_MS,
        generation: getTableCacheGeneration(target.key),
        rows: rows.map((row) => mapKeys(row, toSnakeCase)),
      });
    }
  }
  emitSQLiteDataChanged(table, true, sourceId);
  if (rowId) {
    window.dispatchEvent(
      new CustomEvent("sqlite-row-saved", {
        detail: { tableName: table, id: rowId },
      })
    );
  }
}

export interface UseSQLiteOptions {
  /** Les lignes de ce seul patient (`WHERE patient_id = ?`), pour les tables qui en portent la colonne. */
  patientId?: string;
}

export function useSQLite<T extends { id: string }>(
  tableName: string,
  options?: UseSQLiteOptions
): UseSQLiteResult<T> {
  const safeTableName = ALLOWED_TABLES.has(tableName) ? tableName : null;
  const patientId = options?.patientId;
  const target = useMemo(
    () => cacheTarget(tableName, patientId),
    [tableName, patientId]
  );
  const cacheKey = target.key;
  if (safeTableName && !isTauriRuntime() && !tableSnapshotCache.has(cacheKey)) {
    registerTarget(target);
    tableSnapshotCache.replace(cacheKey, browserRows(target));
  }
  const subscribe = useCallback(
    (listener: () => void) =>
      safeTableName
        ? tableSnapshotCache.subscribe(cacheKey, listener)
        : () => {
            // Pas de table autorisée : aucun abonnement à défaire.
          },
    [safeTableName, cacheKey]
  );
  const getSnapshot = useCallback(
    () =>
      safeTableName
        ? (tableSnapshotCache.getRows(cacheKey) ?? EMPTY_ROWS)
        : EMPTY_ROWS,
    [safeTableName, cacheKey]
  );
  const data = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot
  ) as unknown as T[];
  const [loading, setLoading] = useState(() =>
    safeTableName ? !tableSnapshotCache.has(cacheKey) : false
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sourceId = useId();

  const loadData = useCallback(
    (force = false) =>
      reloadTable(
        {
          safeTableName,
          target,
          tableName,
          setError,
          setLoading,
          setIsRefreshing,
        },
        force
      ),
    [safeTableName, target, tableName]
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);
  useEffect(() => {
    const changed = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          tableName: string;
          cacheFresh?: boolean;
          sourceId?: string;
        }>
      ).detail;
      if (detail?.tableName !== tableName || detail.sourceId === sourceId) {
        return;
      }
      // Optimistic/confirmed patches already reached every subscriber synchronously.
      if (detail.cacheFresh && tableSnapshotCache.has(cacheKey)) {
        return;
      }
      void loadData();
    };
    window.addEventListener(DATA_CHANGED_EVENT, changed);
    return () => window.removeEventListener(DATA_CHANGED_EVENT, changed);
  }, [loadData, sourceId, tableName, cacheKey]);

  const write = useCallback(
    <R>(
      id: string,
      apply: (rows: CachedRow[]) => CachedRow[],
      operation: (
        db: SQLiteDatabase
      ) => Promise<{ value: R; row?: CachedRow | null }>,
      retry: () => unknown
    ): Promise<R> =>
      runTableWrite({
        safeTableName,
        tableName,
        sourceId,
        setError,
        id,
        apply,
        operation,
        retry,
      }),
    [safeTableName, sourceId, tableName]
  );

  const mapRow = useCallback(
    (row: Record<string, unknown>) => mapTableRow(tableName, row) as CachedRow,
    [tableName]
  );
  const authoritativeRow = useCallback(
    (db: SQLiteDatabase, id: string, fallback: CachedRow) =>
      readAuthoritativeRow(db, safeTableName, mapRow, id, fallback),
    [mapRow, safeTableName]
  );

  const add = useCallback(
    (item: Omit<T, "id" | "createdAt" | "updatedAt">) =>
      addRow<T>(
        {
          safeTableName,
          tableName,
          sourceId,
          loadData,
          write,
          authoritativeRow,
          target,
        },
        item
      ),
    [
      authoritativeRow,
      loadData,
      safeTableName,
      sourceId,
      tableName,
      target,
      write,
    ]
  );

  const update = useCallback(
    (id: string, updates: Partial<T>) =>
      updateRow<T>(
        {
          safeTableName,
          tableName,
          sourceId,
          loadData,
          write,
          authoritativeRow,
          target,
        },
        id,
        updates
      ),
    [
      authoritativeRow,
      loadData,
      safeTableName,
      sourceId,
      tableName,
      target,
      write,
    ]
  );

  const remove = useCallback(
    (id: string) =>
      removeRow<T>(
        {
          safeTableName,
          tableName,
          sourceId,
          loadData,
          write,
          authoritativeRow,
          target,
        },
        id
      ),
    [
      authoritativeRow,
      loadData,
      safeTableName,
      sourceId,
      tableName,
      target,
      write,
    ]
  );

  const set = useCallback(
    (id: string, item: Partial<T>) =>
      setRow<T>(
        {
          safeTableName,
          tableName,
          sourceId,
          loadData,
          write,
          authoritativeRow,
          target,
        },
        update,
        id,
        item
      ),
    [
      authoritativeRow,
      loadData,
      safeTableName,
      sourceId,
      tableName,
      target,
      update,
      write,
    ]
  );

  const refresh = useCallback(async () => {
    if (safeTableName) {
      invalidateCacheKey(cacheKey);
    }
    await loadData(true);
  }, [loadData, safeTableName, cacheKey]);

  return {
    data,
    loading,
    isRefreshing,
    error,
    add,
    update,
    remove,
    set,
    refresh,
  };
}
