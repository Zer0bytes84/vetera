/** Registered only together with the allocation-aware write paths. */
export const STOCK_LOTS_MIGRATION_SQL = `
CREATE TABLE stock_locations (
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL UNIQUE CHECK(length(trim(name)) > 0),
 active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
INSERT INTO stock_locations(id,name,created_at,updated_at)
 VALUES ('stock-main','Stock principal',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
CREATE TABLE product_lots (
 id TEXT PRIMARY KEY,
 product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
 lot_number TEXT NOT NULL CHECK(length(trim(lot_number)) > 0),
 expiry_date TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 UNIQUE(product_id,lot_number)
);
CREATE TABLE stock_balances (
 id TEXT PRIMARY KEY,
 product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
 lot_id TEXT REFERENCES product_lots(id) ON DELETE RESTRICT,
 location_id TEXT NOT NULL REFERENCES stock_locations(id) ON DELETE RESTRICT,
 quantity REAL NOT NULL,
 received_at TEXT NOT NULL,
 receipt_reference TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE INDEX stock_balances_product_fifo_idx ON stock_balances(product_id,received_at,id);
CREATE INDEX stock_balances_lot_location_idx ON stock_balances(lot_id,location_id);
CREATE TABLE stock_movement_allocations (
 id TEXT PRIMARY KEY,
 movement_id TEXT NOT NULL REFERENCES stock_movements(id) ON DELETE RESTRICT,
 balance_id TEXT NOT NULL REFERENCES stock_balances(id) ON DELETE RESTRICT,
 quantity_delta REAL NOT NULL,
 lot_number_snapshot TEXT,
 expiry_date_snapshot TEXT,
 location_name_snapshot TEXT NOT NULL
);
CREATE INDEX stock_allocations_movement_idx ON stock_movement_allocations(movement_id);
ALTER TABLE stock_movements ADD COLUMN selection_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE prescription_dispensation_lines ADD COLUMN selection_json TEXT NOT NULL DEFAULT '{}';
CREATE TABLE stock_inventory_operations (
 id TEXT PRIMARY KEY,
 kind TEXT NOT NULL,
 fingerprint TEXT NOT NULL,
 movement_id TEXT NOT NULL REFERENCES stock_movements(id) ON DELETE RESTRICT,
 author_id TEXT,
 created_at TEXT NOT NULL
);
CREATE TABLE stock_lot_registrations (
 id TEXT PRIMARY KEY,
 lot_id TEXT NOT NULL REFERENCES product_lots(id) ON DELETE RESTRICT,
 product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
 location_id TEXT NOT NULL REFERENCES stock_locations(id) ON DELETE RESTRICT,
 quantity REAL NOT NULL CHECK(quantity > 0),
 mode TEXT NOT NULL CHECK(mode IN ('identify','receive')),
 fingerprint TEXT NOT NULL,
 movement_id TEXT NOT NULL REFERENCES stock_movements(id) ON DELETE RESTRICT,
 author_id TEXT NOT NULL,
 created_at TEXT NOT NULL
);
INSERT INTO stock_balances(id,product_id,lot_id,location_id,quantity,received_at,created_at,updated_at)
 SELECT 'legacy-stock:' || id,id,NULL,'stock-main',quantity,
   coalesce(strftime('%Y-%m-%dT%H:%M:%fZ',created_at),strftime('%Y-%m-%dT%H:%M:%fZ','now')),
   CURRENT_TIMESTAMP,CURRENT_TIMESTAMP FROM products WHERE stock_tracked=1 AND quantity != 0;

-- A restored/imported/new catalogue row starts with its actual unassigned stock.
-- Later quantity changes must use the allocation-aware transaction service.
CREATE TRIGGER initialize_product_stock_balance AFTER INSERT ON products
 WHEN NEW.stock_tracked=1 AND NEW.quantity != 0
BEGIN
 INSERT INTO stock_balances(id,product_id,lot_id,location_id,quantity,received_at,created_at,updated_at)
 VALUES ('initial-stock:' || NEW.id,NEW.id,NULL,'stock-main',NEW.quantity,
   coalesce(strftime('%Y-%m-%dT%H:%M:%fZ',NEW.created_at),strftime('%Y-%m-%dT%H:%M:%fZ','now')),
   CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
END;
`;
