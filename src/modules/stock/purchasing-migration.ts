export const PURCHASING_MIGRATION_SQL = `
CREATE TABLE stock_suppliers (
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL CHECK(length(trim(name)) > 0),
 phone TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '',
 address TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '',
 archived_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE purchase_orders (
 id TEXT PRIMARY KEY, reference TEXT NOT NULL UNIQUE,
 supplier_id TEXT NOT NULL REFERENCES stock_suppliers(id) ON DELETE RESTRICT,
 status TEXT NOT NULL CHECK(status IN ('draft','ordered','partial','received','cancelled')),
 fingerprint TEXT NOT NULL, author_id TEXT NOT NULL,
 ordered_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX purchase_orders_supplier_idx ON purchase_orders(supplier_id,created_at);
CREATE TABLE purchase_order_lines (
 id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE RESTRICT,
 product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
 product_name TEXT NOT NULL, unit TEXT NOT NULL,
 quantity REAL NOT NULL CHECK(quantity > 0), unit_cost_amount INTEGER NOT NULL CHECK(unit_cost_amount >= 0),
 sort_order INTEGER NOT NULL, UNIQUE(order_id,product_id)
);
CREATE TABLE purchase_receipts (
 id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE RESTRICT,
 reference TEXT NOT NULL DEFAULT '', fingerprint TEXT NOT NULL,
 received_at TEXT NOT NULL, author_id TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX purchase_receipts_order_idx ON purchase_receipts(order_id,received_at);
CREATE TABLE purchase_receipt_lines (
 id TEXT PRIMARY KEY, receipt_id TEXT NOT NULL REFERENCES purchase_receipts(id) ON DELETE RESTRICT,
 order_line_id TEXT NOT NULL REFERENCES purchase_order_lines(id) ON DELETE RESTRICT,
 quantity REAL NOT NULL CHECK(quantity > 0),
 movement_id TEXT NOT NULL UNIQUE REFERENCES stock_movements(id) ON DELETE RESTRICT,
 lot_number TEXT, expiry_date TEXT, location_id TEXT NOT NULL REFERENCES stock_locations(id) ON DELETE RESTRICT,
 UNIQUE(receipt_id,order_line_id)
);
`;
