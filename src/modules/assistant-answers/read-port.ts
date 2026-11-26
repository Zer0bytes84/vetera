/**
 * The Données tab's only door to the practice's tables: a read port, carried over from the agent harness
 * (`harnais-agent`, src/modules/agent-harness/read-port.ts, measured on 15 November 2026) on 19 November 2026.
 *
 * The reader never receives the app's database connection. It receives a guarded one whose `select` accepts a single
 * SELECT (or WITH) statement and whose `execute` accepts only the three statements a consistent snapshot read needs
 * (BEGIN DEFERRED / COMMIT / ROLLBACK). Anything else throws `ReadRefused` before it reaches SQLite. Every statement that
 * goes through is counted, and the count is shown under each answer.
 */

export interface ReadConnection {
  execute(query: string, values?: unknown[]): Promise<unknown>;
  select<T>(query: string, values?: unknown[]): Promise<T>;
}

export class ReadRefused extends Error {
  constructor(statement: string) {
    super(
      `Écriture refusée par la porte de lecture : ${statement.slice(0, 40)}`
    );
    this.name = "ReadRefused";
  }
}

const SNAPSHOT_STATEMENTS = new Set([
  "BEGIN DEFERRED TRANSACTION",
  "COMMIT",
  "ROLLBACK",
]);
const leadingComments = /^(?:\s|--[^\n]*\n|\/\*[\s\S]*?\*\/)*/;

/** A single statement that starts with SELECT or WITH and writes nothing. */
export function isReadStatement(query: string): boolean {
  const body = query.replace(leadingComments, "").trim().replace(/;\s*$/, "");
  if (!/^(?:SELECT|WITH)\b/i.test(body)) return false;
  if (body.includes(";")) return false;
  // A WITH clause may hide a write (WITH x AS (...) DELETE ...).
  return !/\b(?:INSERT|UPDATE|DELETE|REPLACE|DROP|ALTER|CREATE|ATTACH|DETACH|PRAGMA|VACUUM|REINDEX)\b/i.test(
    body
  );
}

export interface ReadCounter {
  statements: number;
}

/** Wraps a connection so that only reads go through; counts what went through. */
export function guardReadConnection(
  connection: ReadConnection,
  counter?: ReadCounter
): ReadConnection {
  return {
    select<T>(query: string, values: unknown[] = []) {
      if (!isReadStatement(query)) throw new ReadRefused(query);
      if (counter) counter.statements += 1;
      return connection.select<T>(query, values);
    },
    execute(query: string, values: unknown[] = []) {
      if (!SNAPSHOT_STATEMENTS.has(query.trim()) || values.length)
        throw new ReadRefused(query);
      if (counter) counter.statements += 1;
      return connection.execute(query, values);
    },
  };
}
