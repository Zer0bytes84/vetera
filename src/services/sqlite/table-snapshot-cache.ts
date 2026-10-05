/** Shared, immutable snapshots. Pending writes are separate layers so rollback
 * never discards a later write, including edits made by another hook instance. */
export type CachedRow = { id: string; [key: string]: unknown };
type Layer<R> = { id: string; apply: (rows: R[]) => R[] };
type Entry<R> = {
  base?: R[];
  visible?: R[];
  generation: number;
  layers: Map<number, Layer<R>>;
  listeners: Set<() => void>;
};

export class TableSnapshotCache<R extends { id: string }> {
  private tables = new Map<string, Entry<R>>();
  private nextToken = 0;
  private entry(table: string): Entry<R> {
    let entry = this.tables.get(table);
    if (!entry) {
      entry = { generation: 0, layers: new Map(), listeners: new Set() };
      this.tables.set(table, entry);
    }
    return entry;
  }
  getRows(table: string) {
    return this.entry(table).visible;
  }
  getConfirmedRows(table: string) {
    return this.entry(table).base;
  }
  has(table: string) {
    return this.entry(table).base !== undefined;
  }
  generation(table: string) {
    return this.entry(table).generation;
  }
  invalidate(table: string) {
    return ++this.entry(table).generation;
  }
  subscribe(table: string, listener: () => void) {
    const entry = this.entry(table);
    entry.listeners.add(listener);
    return () => {
      entry.listeners.delete(listener);
    };
  }
  private publish(entry: Entry<R>) {
    let rows = entry.base;
    if (rows !== undefined || entry.layers.size) {
      rows ??= [];
      for (const layer of entry.layers.values()) rows = layer.apply(rows);
    }
    entry.visible = rows;
    entry.listeners.forEach((listener) => listener());
  }
  replace(table: string, rows: R[], generation?: number) {
    const entry = this.entry(table);
    if (generation !== undefined && generation !== entry.generation)
      return false;
    entry.base = rows;
    this.publish(entry);
    return true;
  }
  begin(table: string, id: string, apply: (rows: R[]) => R[]) {
    const entry = this.entry(table);
    const token = ++this.nextToken;
    entry.generation++;
    entry.layers.set(token, { id, apply });
    this.publish(entry);
    return token;
  }
  commit(table: string, token: number, row?: R | null) {
    const entry = this.entry(table);
    const layer = entry.layers.get(token);
    if (!layer) return;
    if (entry.base !== undefined) {
      entry.base =
        row === undefined
          ? layer.apply(entry.base)
          : row === null
            ? entry.base.filter((item) => item.id !== layer.id)
            : entry.base.some((item) => item.id === row.id)
              ? entry.base.map((item) => (item.id === row.id ? row : item))
              : [...entry.base, row];
    }
    entry.layers.delete(token);
    entry.generation++;
    this.publish(entry);
  }
  rollback(table: string, token: number) {
    const entry = this.entry(table);
    entry.layers.delete(token);
    entry.generation++;
    this.publish(entry);
  }
}
