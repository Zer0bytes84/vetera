export const STOCK_OPERATIONS_MIGRATION_SQL = `
CREATE TABLE product_barcodes (
 id TEXT PRIMARY KEY, product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
 code TEXT COLLATE BINARY NOT NULL UNIQUE CHECK(length(trim(code)) > 0), created_at TEXT NOT NULL
);
CREATE INDEX product_barcodes_product_idx ON product_barcodes(product_id);
CREATE TABLE stock_transfers (
 id TEXT PRIMARY KEY, product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
 source_location_id TEXT NOT NULL REFERENCES stock_locations(id) ON DELETE RESTRICT,
 target_location_id TEXT NOT NULL REFERENCES stock_locations(id) ON DELETE RESTRICT,
 source_name TEXT NOT NULL, target_name TEXT NOT NULL,
 quantity REAL NOT NULL CHECK(quantity > 0), fingerprint TEXT NOT NULL,
 movement_id TEXT NOT NULL UNIQUE REFERENCES stock_movements(id) ON DELETE RESTRICT,
 author_id TEXT NOT NULL, created_at TEXT NOT NULL,
 CHECK(source_location_id != target_location_id)
);
`;
