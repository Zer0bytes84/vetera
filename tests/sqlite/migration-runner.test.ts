import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import {
  MigrationError,
  parseSqlStatements,
  runSqliteMigrations,
  type MigrationDatabase,
} from "../../src/services/sqlite/migration-runner";
import {
  SQLITE_MIGRATIONS,
  type SqliteMigration,
} from "../../src/services/sqlite/migrations";

class TestDatabase implements MigrationDatabase {
  readonly connection = new DatabaseSync(":memory:");

  async execute(query: string, bindValues: unknown[] = []): Promise<unknown> {
    if (bindValues.length === 0) {
      this.connection.exec(query);
      return undefined;
    }

    return this.connection.prepare(query).run(...bindValues);
  }

  async select<T>(query: string, bindValues: unknown[] = []): Promise<T> {
    return this.connection.prepare(query).all(...bindValues) as T;
  }

  close(): void {
    this.connection.close();
  }
}

let databases: TestDatabase[] = [];

function createDatabase(): TestDatabase {
  const database = new TestDatabase();
  databases.push(database);
  return database;
}

afterEach(() => {
  for (const database of databases) {
    database.close();
  }
  databases = [];
});

describe("parseSqlStatements", () => {
  it("keeps trigger bodies in a single statement", () => {
    const statements = parseSqlStatements(`
      CREATE TABLE sample (id TEXT PRIMARY KEY, updated_at TEXT);
      CREATE TRIGGER update_sample AFTER UPDATE ON sample
      BEGIN
        UPDATE sample SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;
    `);

    expect(statements).toHaveLength(2);
    expect(statements[1]).toContain("CREATE TRIGGER update_sample");
    expect(statements[1]).toContain("END;");
  });

  it("rejects incomplete SQL", () => {
    expect(() => parseSqlStatements("CREATE TABLE sample (id TEXT)")).toThrow(
      "incomplete statement"
    );
  });
});

describe("runSqliteMigrations", () => {
  it("creates the complete schema and remains idempotent", async () => {
    const database = createDatabase();

    await expect(
      runSqliteMigrations(database, SQLITE_MIGRATIONS)
    ).resolves.toEqual(SQLITE_MIGRATIONS.map(({ version }) => version));
    await expect(
      runSqliteMigrations(database, SQLITE_MIGRATIONS)
    ).resolves.toEqual([]);

    const tables = database.connection
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row) => String(row.name));
    const notificationColumns = database.connection
      .prepare("PRAGMA table_info(notification_state)")
      .all()
      .map((row) => String(row.name));

    expect(tables).toEqual(
      expect.arrayContaining([
        "appointments",
        "audit_log",
        "billing_sequences",
        "credit_notes",
        "consultation_soaps",
        "hospitalizations",
        "invoice_lines",
        "invoices",
        "owners",
        "payments",
        "patients",
        "prescriptions",
        "refunds",
        "reminders",
        "users",
      ])
    );
    expect(notificationColumns).toEqual(
      expect.arrayContaining(["id", "notification_id", "read_at"])
    );
    expect(
      database.connection.prepare("PRAGMA user_version").get()?.user_version
    ).toBe(16);
  });

  it("rolls back an entire migration when one statement fails", async () => {
    const database = createDatabase();
    const migrations: SqliteMigration[] = [
      {
        version: "001",
        name: "broken-migration",
        sql: `
          CREATE TABLE should_rollback (id TEXT PRIMARY KEY);
          INSERT INTO missing_table (id) VALUES ('failure');
        `,
      },
    ];

    await expect(runSqliteMigrations(database, migrations)).rejects.toEqual(
      expect.objectContaining<Partial<MigrationError>>({
        name: "MigrationError",
        version: "001",
      })
    );

    const table = database.connection
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'should_rollback'"
      )
      .get();
    const migration = database.connection
      .prepare("SELECT version FROM migrations WHERE version = '001'")
      .get();

    expect(table).toBeUndefined();
    expect(migration).toBeUndefined();
  });

  it("preserves notification state while upgrading migration 012", async () => {
    const database = createDatabase();
    const migrationsThrough011 = SQLITE_MIGRATIONS.filter(
      ({ version }) => version <= "011"
    );

    await runSqliteMigrations(database, migrationsThrough011);
    await database.execute(
      `INSERT INTO notification_state (
        notification_id,
        read_at,
        dismissed_at
      ) VALUES (?, ?, ?)`,
      ["reminder:patient-1", "2026-08-01T09:00:00Z", null]
    );

    await expect(
      runSqliteMigrations(database, SQLITE_MIGRATIONS)
    ).resolves.toEqual(["012", "013", "014", "015", "016"]);

    const state = database.connection
      .prepare(
        `SELECT id, notification_id, read_at
         FROM notification_state
         WHERE notification_id = ?`
      )
      .get("reminder:patient-1");

    expect(state).toEqual({
      id: "reminder:patient-1",
      notification_id: "reminder:patient-1",
      read_at: "2026-08-01T09:00:00Z",
    });
  });

  it("extends the appointment workflow without losing linked reminders", async () => {
    const database = createDatabase();
    const migrationsThrough012 = SQLITE_MIGRATIONS.filter(
      ({ version }) => version <= "012"
    );

    await runSqliteMigrations(database, migrationsThrough012);
    await database.execute("PRAGMA foreign_keys = ON");
    await database.execute(
      `INSERT INTO users (id, email, password_hash, display_name, role)
       VALUES ('vet-1', 'vet@example.com', 'hash', 'Dr Vet', 'vet_principal')`
    );
    await database.execute(
      `INSERT INTO owners (id, first_name, last_name, phone)
       VALUES ('owner-1', 'Amel', 'Benali', '0555123456')`
    );
    await database.execute(
      `INSERT INTO patients (id, owner_id, name, species, sex)
       VALUES ('patient-1', 'owner-1', 'Nala', 'Chat', 'F')`
    );
    await database.execute(
      `INSERT INTO appointments (
        id, patient_id, owner_id, vet_id, title, start_time, end_time, type, room
      ) VALUES (
        'appointment-1', 'patient-1', 'owner-1', 'vet-1', 'Consultation Nala',
        '2026-08-02T09:00:00Z', '2026-08-02T09:30:00Z', 'Consultation', 'consult-1'
      )`
    );
    await database.execute(
      `INSERT INTO reminders (
        id, appointment_id, minutes_before, scheduled_for
      ) VALUES (
        'reminder-1', 'appointment-1', 30, '2026-08-02T08:30:00Z'
      )`
    );

    await expect(
      runSqliteMigrations(
        database,
        SQLITE_MIGRATIONS.filter(({ version }) => version <= "013")
      )
    ).resolves.toEqual(["013"]);

    expect(
      database.connection
        .prepare("SELECT appointment_id FROM reminders WHERE id = 'reminder-1'")
        .get()
    ).toEqual({ appointment_id: "appointment-1" });
    expect(() =>
      database.connection
        .prepare("UPDATE appointments SET status = 'arrived' WHERE id = 'appointment-1'")
        .run()
    ).not.toThrow();
    expect(() =>
      database.connection
        .prepare("UPDATE appointments SET status = 'invalid' WHERE id = 'appointment-1'")
        .run()
    ).toThrow();
    expect(
      database.connection.prepare("PRAGMA foreign_key_check").all()
    ).toEqual([]);
  });

  it("adds owner contact preferences without altering existing contacts", async () => {
    const database = createDatabase();
    const migrationsThrough013 = SQLITE_MIGRATIONS.filter(
      ({ version }) => version <= "013"
    );

    await runSqliteMigrations(database, migrationsThrough013);
    await database.execute(
      `INSERT INTO owners (id, first_name, last_name, phone)
       VALUES ('owner-1', 'Amel', 'Benali', '0555123456')`
    );

    await expect(
      runSqliteMigrations(database, SQLITE_MIGRATIONS)
    ).resolves.toEqual(["014", "015", "016"]);
    await database.execute(
      `UPDATE owners
       SET preferred_contact = 'sms',
           secondary_contact_name = 'Karim Benali',
           secondary_contact_phone = '0555001122'
       WHERE id = 'owner-1'`
    );

    expect(
      database.connection
        .prepare(
          `SELECT first_name, last_name, preferred_contact,
                  secondary_contact_name, secondary_contact_phone
           FROM owners WHERE id = 'owner-1'`
        )
        .get()
    ).toEqual({
      first_name: "Amel",
      last_name: "Benali",
      preferred_contact: "sms",
      secondary_contact_name: "Karim Benali",
      secondary_contact_phone: "0555001122",
    });
  });

  it("upgrades v14 through v16 with a deterministic, non-duplicating legacy billing backfill", async () => {
    const database = createDatabase();
    const migrationsThrough014 = SQLITE_MIGRATIONS.filter(
      ({ version }) => version <= "014"
    );

    await runSqliteMigrations(database, migrationsThrough014);
    expect(
      database.connection.prepare("PRAGMA user_version").get()?.user_version
    ).toBe(14);

    await database.execute(
      `INSERT INTO users (id, email, password_hash, display_name, role)
       VALUES ('vet-1', 'vet@example.com', 'hash', 'Dr Vet', 'vet_principal')`
    );
    await database.execute(
      `INSERT INTO owners (id, first_name, last_name, phone)
       VALUES ('owner-1', 'Amel', 'Benali', '0555123456')`
    );
    await database.execute(
      `INSERT INTO patients (id, owner_id, name, species, sex)
       VALUES ('patient-1', 'owner-1', 'Nala', 'Chat', 'F')`
    );
    await database.execute(
      `INSERT INTO appointments (
        id, patient_id, owner_id, vet_id, title, start_time, end_time, type, room
      ) VALUES (
        'appointment-1', 'patient-1', 'owner-1', 'vet-1', 'Consultation Nala',
        '2026-07-31T09:00:00Z', '2026-07-31T09:30:00Z', 'Consultation', 'consult-1'
      )`
    );
    await database.execute(
      `INSERT INTO transactions (
        id, date, amount, type, category, description, reference_id, method, status
      ) VALUES
        ('matched-income', '2026-07-31T09:31:00Z', 12345, 'income', 'Consultation', 'Consultation Nala', 'appointment-1', 'cash', 'paid'),
        ('unresolved-income', '2026-07-31T10:00:00Z', 2000, 'income', 'Consultation', 'RDV introuvable', 'missing-appointment', 'card', 'paid'),
        ('pending-income', '2026-07-31T10:30:00Z', 3000, 'income', 'Consultation', 'En attente', 'appointment-1', 'cash', 'pending'),
        ('expense', '2026-07-31T11:00:00Z', 4000, 'expense', 'Stock', 'Achat', 'appointment-1', 'cash', 'paid')`
    );

    await expect(
      runSqliteMigrations(database, SQLITE_MIGRATIONS)
    ).resolves.toEqual(["015", "016"]);
    expect(
      database.connection.prepare("PRAGMA user_version").get()?.user_version
    ).toBe(16);

    expect(
      database.connection
        .prepare(
          `SELECT id, number, gross_amount, legacy_source_transaction_id
           FROM invoices ORDER BY id`
        )
        .all()
    ).toEqual([
      {
        id: "legacy-invoice-matched-income",
        number: "LEGACY-matched-income",
        gross_amount: 12345,
        legacy_source_transaction_id: "matched-income",
      },
    ]);
    expect(
      database.connection
        .prepare(
          `SELECT id, invoice_id, amount, status, journal_transaction_id
           FROM payments ORDER BY id`
        )
        .all()
    ).toEqual([
      {
        id: "legacy-payment-matched-income",
        invoice_id: "legacy-invoice-matched-income",
        amount: 12345,
        status: "completed",
        journal_transaction_id: "matched-income",
      },
    ]);
    expect(
      database.connection
        .prepare(
          `SELECT source_type, source_id, is_locked
           FROM transactions WHERE id = 'matched-income'`
        )
        .get()
    ).toEqual({
      source_type: "billing_payment",
      source_id: "legacy-payment-matched-income",
      is_locked: 1,
    });
    expect(
      database.connection
        .prepare("SELECT COUNT(*) AS count FROM transactions")
        .get()
    ).toEqual({ count: 4 });
    expect(
      database.connection
        .prepare(
          `SELECT i.gross_amount AS invoice_amount, p.amount AS payment_amount, t.amount AS transaction_amount
           FROM invoices i
           JOIN payments p ON p.invoice_id = i.id
           JOIN transactions t ON t.id = p.journal_transaction_id
           WHERE i.id = 'legacy-invoice-matched-income'`
        )
        .get()
    ).toEqual({
      invoice_amount: 12345,
      payment_amount: 12345,
      transaction_amount: 12345,
    });
    expect(
      database.connection
        .prepare("SELECT COUNT(*) AS count FROM billing_sequences")
        .get()
    ).toEqual({ count: 0 });
    expect(
      database.connection
        .prepare(
          `SELECT COUNT(*) AS count
           FROM invoices
           WHERE legacy_source_transaction_id IN ('unresolved-income', 'pending-income')`
        )
        .get()
    ).toEqual({ count: 0 });
    expect(() =>
      database.connection
        .prepare("UPDATE transactions SET amount = 1 WHERE id = 'matched-income'")
        .run()
    ).toThrow(/Locked billing journal transactions are immutable/);

    await expect(
      runSqliteMigrations(database, SQLITE_MIGRATIONS)
    ).resolves.toEqual([]);
    expect(
      database.connection
        .prepare("SELECT COUNT(*) AS count FROM invoices")
        .get()
    ).toEqual({ count: 1 });
    expect(
      database.connection
        .prepare("SELECT COUNT(*) AS count FROM payments")
        .get()
    ).toEqual({ count: 1 });
    expect(
      database.connection
        .prepare("SELECT COUNT(*) AS count FROM transactions")
        .get()
    ).toEqual({ count: 4 });
  });

  it("enforces integer line values and deterministic stored rounding", async () => {
    const database = createDatabase();
    await runSqliteMigrations(database, SQLITE_MIGRATIONS);
    await database.execute(
      `INSERT INTO owners (id, first_name, last_name, phone)
       VALUES ('owner-1', 'Amel', 'Benali', '0555123456')`
    );
    await database.execute(
      `INSERT INTO invoices (id, owner_id, document_status)
       VALUES ('invoice-draft', 'owner-1', 'draft')`
    );

    expect(() =>
      database.connection
        .prepare(
          `INSERT INTO invoice_lines (
            id, invoice_id, description, quantity_milli, unit_amount,
            discount_bps, tax_bps, base_amount, discount_amount,
            tax_amount, gross_amount
          ) VALUES (
            'invalid-line', 'invoice-draft', 'Consultation', 1500, 101,
            3333, 1900, 151, 51, 19, 119
          )`
        )
        .run()
    ).toThrow(/deterministic rounding/);
    expect(() =>
      database.connection
        .prepare(
          `INSERT INTO invoice_lines (
            id, invoice_id, description, quantity_milli, unit_amount,
            discount_bps, tax_bps, base_amount, discount_amount,
            tax_amount, gross_amount
          ) VALUES (
            'valid-line', 'invoice-draft', 'Consultation', 1500, 101,
            3333, 1900, 152, 51, 19, 120
          )`
        )
        .run()
    ).not.toThrow();
    expect(() =>
      database.connection
        .prepare(
          `INSERT INTO invoice_lines (
            id, invoice_id, description, quantity_milli, unit_amount,
            discount_bps, tax_bps, base_amount, discount_amount,
            tax_amount, gross_amount
          ) VALUES (
            'fractional-line', 'invoice-draft', 'Fraction', 1000.5, 100,
            0, 0, 100, 0, 0, 100
          )`
        )
        .run()
    ).toThrow();
  });

  it("repairs v15 cross-invoice credit provenance before enforcing v16", async () => {
    const database = createDatabase();
    const migrationsThrough015 = SQLITE_MIGRATIONS.filter(
      ({ version }) => version <= "015"
    );

    await runSqliteMigrations(database, migrationsThrough015);
    await database.execute("PRAGMA foreign_keys = ON");
    await database.execute(
      `INSERT INTO owners (id, first_name, last_name, phone)
       VALUES ('owner-1', 'Amel', 'Benali', '0555123456')`
    );
    for (const invoiceId of ["invoice-a", "invoice-b"]) {
      await database.execute(
        `INSERT INTO invoices (
          id, owner_id, document_status, subtotal_amount, discount_amount,
          tax_amount, gross_amount
        ) VALUES (?, 'owner-1', 'draft', 100, 0, 0, 100)`,
        [invoiceId]
      );
      await database.execute(
        `INSERT INTO invoice_lines (
          id, invoice_id, description, quantity_milli, unit_amount,
          discount_bps, tax_bps, base_amount, discount_amount, tax_amount,
          gross_amount
        ) VALUES (?, ?, 'Consultation', 1000, 100, 0, 0, 100, 0, 0, 100)`,
        [`${invoiceId}-line`, invoiceId]
      );
      await database.execute(
        `UPDATE invoices
         SET document_status = 'issued', number = ?, issued_at = '2026-08-01T10:00:00Z',
             owner_snapshot = '{"id":"owner-1"}', clinic_snapshot = '{"name":"Baitari"}',
             issue_idempotency_key = ?
         WHERE id = ?`,
        [`INV-2026-${invoiceId}`, `issue-${invoiceId}`, invoiceId]
      );
    }
    await database.execute(
      `INSERT INTO credit_notes (
        id, invoice_id, document_status, subtotal_amount, discount_amount,
        tax_amount, gross_amount
      ) VALUES ('credit-cross', 'invoice-a', 'draft', 100, 0, 0, 100)`
    );
    await database.execute(
      `INSERT INTO credit_note_lines (
        id, credit_note_id, invoice_line_id, description, quantity_milli,
        unit_amount, discount_bps, tax_bps, base_amount, discount_amount,
        tax_amount, gross_amount
      ) VALUES (
        'credit-cross-line', 'credit-cross', 'invoice-b-line', 'Consultation', 1000,
        100, 0, 0, 100, 0, 0, 100
      )`
    );
    await database.execute(
      `UPDATE credit_notes
       SET document_status = 'issued', number = 'CRN-2026-000001',
           issued_at = '2026-08-01T11:00:00Z',
           owner_snapshot = '{"id":"owner-1"}', clinic_snapshot = '{"name":"Baitari"}',
           idempotency_key = 'credit-cross-key'
       WHERE id = 'credit-cross'`
    );

    expect(
      database.connection
        .prepare("SELECT invoice_line_id FROM credit_note_lines WHERE id = 'credit-cross-line'")
        .get()
    ).toEqual({ invoice_line_id: "invoice-b-line" });

    await expect(
      runSqliteMigrations(database, SQLITE_MIGRATIONS)
    ).resolves.toEqual(["016"]);

    expect(
      database.connection
        .prepare("PRAGMA table_info(credit_note_lines)")
        .all()
        .map((row) => String(row.name))
    ).toContain("product_id");
    expect(
      database.connection
        .prepare(
          `SELECT invoice_line_id, description, quantity_milli, unit_amount,
                  discount_bps, tax_bps, base_amount, discount_amount,
                  tax_amount, gross_amount
           FROM credit_note_lines WHERE id = 'credit-cross-line'`
        )
        .get()
    ).toEqual({
      invoice_line_id: null,
      description: "Consultation",
      quantity_milli: 1000,
      unit_amount: 100,
      discount_bps: 0,
      tax_bps: 0,
      base_amount: 100,
      discount_amount: 0,
      tax_amount: 0,
      gross_amount: 100,
    });
    await database.execute(
      `INSERT INTO credit_notes (
        id, invoice_id, document_status, subtotal_amount, discount_amount,
        tax_amount, gross_amount
      ) VALUES ('credit-cross-after', 'invoice-a', 'draft', 100, 0, 0, 100)`
    );
    expect(() =>
      database.connection
        .prepare(
          `INSERT INTO credit_note_lines (
            id, credit_note_id, invoice_line_id, description, quantity_milli,
            unit_amount, discount_bps, tax_bps, base_amount, discount_amount,
            tax_amount, gross_amount
          ) VALUES (
            'credit-cross-line-after', 'credit-cross-after', 'invoice-b-line', 'Consultation',
            1000, 100, 0, 0, 100, 0, 0, 100
          )`
        )
        .run()
    ).toThrow(/must belong to the credited invoice/);
  });

  it("allows only a reasoned issued-credit void and rejects cross-invoice credit lines", async () => {
    const database = createDatabase();
    await runSqliteMigrations(database, SQLITE_MIGRATIONS);
    await database.execute("PRAGMA foreign_keys = ON");
    await database.execute(
      `INSERT INTO owners (id, first_name, last_name, phone)
       VALUES ('owner-1', 'Amel', 'Benali', '0555123456')`
    );

    for (const invoiceId of ["invoice-a", "invoice-b"]) {
      await database.execute(
        `INSERT INTO invoices (
          id, owner_id, document_status, subtotal_amount, discount_amount,
          tax_amount, gross_amount
        ) VALUES (?, 'owner-1', 'draft', 100, 0, 0, 100)`,
        [invoiceId]
      );
      await database.execute(
        `INSERT INTO invoice_lines (
          id, invoice_id, description, quantity_milli, unit_amount,
          discount_bps, tax_bps, base_amount, discount_amount, tax_amount,
          gross_amount
        ) VALUES (?, ?, 'Consultation', 1000, 100, 0, 0, 100, 0, 0, 100)`,
        [`${invoiceId}-line`, invoiceId]
      );
      await database.execute(
        `UPDATE invoices
         SET document_status = 'issued', number = ?, issued_at = '2026-08-01T10:00:00Z',
             owner_snapshot = '{"id":"owner-1"}', clinic_snapshot = '{"name":"Baitari"}',
             issue_idempotency_key = ?
         WHERE id = ?`,
        [`INV-2026-${invoiceId}`, `issue-${invoiceId}`, invoiceId]
      );
    }

    await database.execute(
      `INSERT INTO credit_notes (
        id, invoice_id, document_status, owner_snapshot, clinic_snapshot,
        subtotal_amount, discount_amount, tax_amount, gross_amount,
        idempotency_key
      ) VALUES (
        'credit-a', 'invoice-a', 'draft', '{"id":"owner-1"}', '{"name":"Baitari"}',
        100, 0, 0, 100, 'credit-a-key'
      )`
    );
    await database.execute(
      `INSERT INTO credit_note_lines (
        id, credit_note_id, invoice_line_id, description, quantity_milli,
        unit_amount, discount_bps, tax_bps, base_amount, discount_amount,
        tax_amount, gross_amount
      ) VALUES (
        'credit-a-line', 'credit-a', 'invoice-a-line', 'Consultation', 1000,
        100, 0, 0, 100, 0, 0, 100
      )`
    );
    await database.execute(
      `UPDATE credit_notes
       SET document_status = 'issued', number = 'CRN-2026-000001',
           issued_at = '2026-08-01T11:00:00Z'
       WHERE id = 'credit-a'`
    );

    expect(() =>
      database.connection
        .prepare("UPDATE credit_notes SET reason = 'tampered' WHERE id = 'credit-a'")
        .run()
    ).toThrow(/immutable/);
    expect(() =>
      database.connection
        .prepare(
          `UPDATE credit_notes
           SET document_status = 'void', voided_at = '2026-08-01T12:00:00Z',
               void_reason = '   '
           WHERE id = 'credit-a'`
        )
        .run()
    ).toThrow(/immutable/);
    expect(() =>
      database.connection
        .prepare(
          `UPDATE credit_notes
           SET document_status = 'void', voided_at = '2026-08-01T12:00:00Z',
               void_reason = 'Billing correction', updated_at = '2026-08-01T12:00:00Z'
           WHERE id = 'credit-a'`
        )
        .run()
    ).not.toThrow();
    expect(
      database.connection
        .prepare(
          `SELECT document_status, number, issued_at, gross_amount, void_reason
           FROM credit_notes WHERE id = 'credit-a'`
        )
        .get()
    ).toEqual({
      document_status: "void",
      number: "CRN-2026-000001",
      issued_at: "2026-08-01T11:00:00Z",
      gross_amount: 100,
      void_reason: "Billing correction",
    });
    expect(() =>
      database.connection
        .prepare("UPDATE credit_notes SET gross_amount = 99 WHERE id = 'credit-a'")
        .run()
    ).toThrow(/immutable/);

    await database.execute(
      `INSERT INTO credit_notes (
        id, invoice_id, document_status, subtotal_amount, discount_amount,
        tax_amount, gross_amount
      ) VALUES ('credit-cross', 'invoice-a', 'draft', 100, 0, 0, 100)`
    );
    expect(() =>
      database.connection
        .prepare(
          `INSERT INTO credit_note_lines (
            id, credit_note_id, invoice_line_id, description, quantity_milli,
            unit_amount, discount_bps, tax_bps, base_amount, discount_amount,
            tax_amount, gross_amount
          ) VALUES (
            'credit-cross-line', 'credit-cross', 'invoice-b-line', 'Consultation', 1000,
            100, 0, 0, 100, 0, 0, 100
          )`
        )
        .run()
    ).toThrow(/must belong to the credited invoice/);
  });

  it("preserves issued accounting history when linked clinical/catalogue rows are removed", async () => {
    const database = createDatabase();
    await runSqliteMigrations(database, SQLITE_MIGRATIONS);
    await database.execute("PRAGMA foreign_keys = ON");
    await database.execute(
      `INSERT INTO users (id, email, password_hash, display_name, role)
       VALUES ('vet-1', 'vet@example.com', 'hash', 'Dr Vet', 'vet_principal')`
    );
    await database.execute(
      `INSERT INTO owners (id, first_name, last_name, phone)
       VALUES ('owner-1', 'Amel', 'Benali', '0555123456')`
    );
    await database.execute(
      `INSERT INTO patients (id, owner_id, name, species, sex)
       VALUES ('patient-1', 'owner-1', 'Nala', 'Chat', 'F')`
    );
    await database.execute(
      `INSERT INTO appointments (
        id, patient_id, owner_id, vet_id, title, start_time, end_time, type, room
      ) VALUES (
        'appointment-1', 'patient-1', 'owner-1', 'vet-1', 'Consultation Nala',
        '2026-08-01T09:00:00Z', '2026-08-01T09:30:00Z', 'Consultation', 'consult-1'
      )`
    );
    await database.execute(
      `INSERT INTO products (
        id, name, category, quantity, unit, min_stock, purchase_price_amount, sale_price_amount
      ) VALUES ('product-1', 'Vaccin', 'Pharmacie', 1, 'dose', 0, 50, 100)`
    );
    await database.execute(
      `INSERT INTO invoices (
        id, owner_id, patient_id, appointment_id, document_status,
        subtotal_amount, discount_amount, tax_amount, gross_amount
      ) VALUES ('invoice-1', 'owner-1', 'patient-1', 'appointment-1', 'draft', 100, 0, 0, 100)`
    );
    await database.execute(
      `INSERT INTO invoice_lines (
        id, invoice_id, product_id, description, quantity_milli, unit_amount,
        discount_bps, tax_bps, base_amount, discount_amount, tax_amount, gross_amount
      ) VALUES ('line-1', 'invoice-1', 'product-1', 'Vaccin', 1000, 100, 0, 0, 100, 0, 0, 100)`
    );
    await database.execute(
      `UPDATE invoices
       SET document_status = 'issued', number = 'INV-2026-000001',
           issued_at = '2026-08-01T10:00:00Z',
           owner_snapshot = '{"id":"owner-1"}',
           clinic_snapshot = '{"name":"Baitari"}',
           issue_idempotency_key = 'issue-invoice-1'
       WHERE id = 'invoice-1'`
    );

    await expect(
      database.execute("DELETE FROM products WHERE id = 'product-1'")
    ).resolves.toBeUndefined();
    await expect(
      database.execute("DELETE FROM appointments WHERE id = 'appointment-1'")
    ).resolves.toBeUndefined();
    await expect(
      database.execute("DELETE FROM patients WHERE id = 'patient-1'")
    ).resolves.toBeUndefined();

    expect(
      database.connection
        .prepare(
          `SELECT patient_id, appointment_id, gross_amount, document_status
           FROM invoices WHERE id = 'invoice-1'`
        )
        .get()
    ).toEqual({
      patient_id: null,
      appointment_id: null,
      gross_amount: 100,
      document_status: "issued",
    });
    expect(
      database.connection
        .prepare("SELECT product_id, description, gross_amount FROM invoice_lines WHERE id = 'line-1'")
        .get()
    ).toEqual({ product_id: null, description: "Vaccin", gross_amount: 100 });
    expect(() =>
      database.connection.prepare("DELETE FROM invoices WHERE id = 'invoice-1'").run()
    ).toThrow(/cannot be deleted/);
  });

  it("refuses a database created by a newer application", async () => {
    const database = createDatabase();
    await database.execute(`
      CREATE TABLE migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version TEXT UNIQUE NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await database.execute("INSERT INTO migrations (version) VALUES ('999')");

    await expect(
      runSqliteMigrations(database, SQLITE_MIGRATIONS)
    ).rejects.toThrow("newer than this application");
  });
});
