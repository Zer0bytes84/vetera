import { DatabaseSync } from "node:sqlite";
import { afterEach, expect, it } from "vitest";
import { runSqliteMigrations } from "@/services/sqlite/migration-runner";
import { SQLITE_MIGRATIONS } from "@/services/sqlite/migrations";
import type { StockDatabase } from "@/modules/stock/services/stock-database";
import { inventorySnapshotInDatabase } from "@/modules/stock/services/inventory-store";
import { stockOperationsSnapshotInDatabase } from "@/modules/stock/services/stock-operations-store";

const now = "2026-10-15T12:00:00Z";
const connections: DatabaseSync[] = [];

function database() {
  const connection = new DatabaseSync(":memory:");
  connections.push(connection);
  const db: StockDatabase = {
    async select<T>(sql: string, values: unknown[] = []) {
      return connection.prepare(sql).all(...values) as T;
    },
    async execute(sql, values = []) {
      if (!values.length) {
        connection.exec(sql);
        return {rowsAffected: 0};
      }
      return {rowsAffected: Number(connection.prepare(sql).run(...values).changes)};
    },
  };
  return {connection, db};
}

afterEach(() => {
  for (const connection of connections) connection.close();
  connections.length = 0;
});

// Some installed databases recorded migration 017 without this column.
// Reproduce that schema through 033 instead of only testing fresh databases.
function legacyMigrations(through = "033") {
  return SQLITE_MIGRATIONS.filter(row => row.version <= through).map(row =>
    row.version === "017"
      ? {...row, sql: row.sql.replace("ALTER TABLE products ADD COLUMN archived_at TEXT;", "")}
      : row
  );
}

function seed(connection: DatabaseSync) {
  connection.exec(`
    INSERT INTO products(id,name,category,unit,quantity,purchase_price_amount,sale_price_amount,created_at)
      VALUES('product','Produit existant','Médicaments','ml',7.25,500,1000,'2026-09-01 10:00:00');
    INSERT INTO product_lots(id,product_id,lot_number,expiry_date,created_at,updated_at)
      VALUES('lot','product','LOT-EXISTANT','2027-12-31','${now}','${now}');
    UPDATE stock_balances SET lot_id='lot' WHERE product_id='product';
    INSERT INTO product_barcodes(id,product_id,code,created_at)
      VALUES('barcode','product','000123','${now}');
    INSERT INTO stock_movements(id,product_id,type,quantity_delta,quantity_after,created_at,updated_at)
      VALUES('movement','product','usage',-2,7.25,'${now}','${now}');
  `);
}

function history(connection: DatabaseSync) {
  return Object.fromEntries([
    "product_lots", "stock_locations", "stock_balances", "stock_movements",
    "stock_movement_allocations", "product_barcodes", "stock_transfers",
  ].map(table => [table, connection.prepare(`SELECT * FROM ${table} ORDER BY id`).all()]));
}

it("répare une base 033 sans archived_at et charge les lots et opérations sans perdre leur historique", async () => {
  const {connection, db} = database();
  await runSqliteMigrations(db, legacyMigrations());
  seed(connection);
  const before = history(connection);
  const productBefore = connection.prepare("SELECT * FROM products").get();

  await expect(inventorySnapshotInDatabase(db)).rejects.toThrow("no such column: p.archived_at");
  await expect(stockOperationsSnapshotInDatabase(db, now)).rejects.toThrow("no such column: p.archived_at");

  await expect(runSqliteMigrations(db, SQLITE_MIGRATIONS)).resolves.toEqual(["034", "035"]);
  expect(history(connection)).toEqual(before);
  expect(connection.prepare("SELECT * FROM products").get()).toEqual({...productBefore, archived_at: null});
  expect(connection.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  expect(connection.prepare("PRAGMA integrity_check").get()?.integrity_check).toBe("ok");
  expect(connection.prepare("PRAGMA user_version").get()?.user_version).toBe(35);

  const inventory = await inventorySnapshotInDatabase(db);
  expect(inventory.supported).toBe(true);
  expect(inventory.balances).toMatchObject([
    {productId: "product", lotNumber: "LOT-EXISTANT", quantity: 7.25, productArchived: false},
  ]);
  expect(inventory.locations).toMatchObject([{id: "stock-main", active: 1}]);
  const operations = await stockOperationsSnapshotInDatabase(db, now);
  expect(operations.barcodes).toMatchObject([{code: "000123", product_name: "Produit existant"}]);
  expect(operations.consumption).toMatchObject([{product_id: "product", quantity: 2}]);
  expect(operations.transfers).toEqual([]);

  await expect(runSqliteMigrations(db, SQLITE_MIGRATIONS)).resolves.toEqual([]);
  expect(await inventorySnapshotInDatabase(db)).toEqual(inventory);
  expect(await stockOperationsSnapshotInDatabase(db, now)).toEqual(operations);
  expect(history(connection)).toEqual(before);
});

it("conserve une colonne d’archivage déjà présente et ses valeurs à la mise à niveau", async () => {
  const {connection, db} = database();
  await runSqliteMigrations(db, SQLITE_MIGRATIONS.filter(row => row.version <= "033"));
  seed(connection);
  connection.prepare("UPDATE products SET archived_at=? WHERE id='product'").run(now);
  const before = history(connection);
  const productBefore = connection.prepare("SELECT * FROM products").get();

  await expect(runSqliteMigrations(db, SQLITE_MIGRATIONS)).resolves.toEqual(["034", "035"]);
  expect(connection.prepare("SELECT * FROM products").get()).toEqual(productBefore);
  expect(history(connection)).toEqual(before);
  expect((await inventorySnapshotInDatabase(db)).balances[0].productArchived).toBe(true);
  expect((await stockOperationsSnapshotInDatabase(db, now)).consumption).toEqual([]);
  expect((await stockOperationsSnapshotInDatabase(db, now)).barcodes[0].archived_at).toBe(now);
});

it("met aussi à niveau une ancienne base avant les lots sans changer les quantités", async () => {
  const {connection, db} = database();
  await runSqliteMigrations(db, legacyMigrations("030"));
  connection.exec(`INSERT INTO products(id,name,category,unit,quantity,purchase_price_amount,sale_price_amount)
    VALUES('old','Stock existant','Médicaments','ml',4.5,100,200);`);

  await expect(runSqliteMigrations(db, SQLITE_MIGRATIONS)).resolves.toEqual(["031", "032", "033", "034", "035"]);
  expect((await inventorySnapshotInDatabase(db)).balances).toMatchObject([
    {productId: "old", quantity: 4.5, lotId: null, productArchived: false},
  ]);
  expect(connection.prepare("SELECT quantity FROM products WHERE id='old'").get()?.quantity).toBe(4.5);
  await expect(stockOperationsSnapshotInDatabase(db, now)).resolves.toEqual({barcodes: [], consumption: [], transfers: []});
});

it("charge les deux onglets sur une installation neuve sans ajouter deux fois la colonne", async () => {
  const {connection, db} = database();
  await runSqliteMigrations(db, SQLITE_MIGRATIONS);
  expect(connection.prepare("PRAGMA table_info(products)").all().filter(row => row.name === "archived_at")).toHaveLength(1);
  await expect(inventorySnapshotInDatabase(db)).resolves.toMatchObject({supported: true, balances: []});
  await expect(stockOperationsSnapshotInDatabase(db, now)).resolves.toEqual({barcodes: [], consumption: [], transfers: []});
});
