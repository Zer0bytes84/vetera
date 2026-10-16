/** Additive migration. Historical completed care is never consumed retroactively. */
export const CLINICAL_STOCK_MIGRATION_SQL = `
ALTER TABLE products ADD COLUMN stock_tracked INTEGER NOT NULL DEFAULT 1 CHECK(stock_tracked IN (0,1));
UPDATE products SET stock_tracked = 0
 WHERE lower(trim(category)) IN ('service','services','acte','actes','prestation','prestations','consultation','consultations');
ALTER TABLE care_tasks ADD COLUMN produit_quantite REAL NOT NULL DEFAULT 1 CHECK(produit_quantite > 0);
ALTER TABLE stock_movements ADD COLUMN source_type TEXT NOT NULL DEFAULT 'manual'
 CHECK(source_type IN ('manual','care','consultation','prescription','receipt','transfer'));
ALTER TABLE stock_movements ADD COLUMN source_id TEXT;
ALTER TABLE stock_movements ADD COLUMN source_line_id TEXT;
ALTER TABLE stock_movements ADD COLUMN source_label TEXT;
ALTER TABLE stock_movements ADD COLUMN patient_id TEXT REFERENCES patients(id) ON DELETE SET NULL;
ALTER TABLE stock_movements ADD COLUMN author_id TEXT;
ALTER TABLE stock_movements ADD COLUMN invoice_id TEXT REFERENCES invoices(id) ON DELETE SET NULL;
ALTER TABLE stock_movements ADD COLUMN invoice_line_id TEXT REFERENCES invoice_lines(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX stock_movements_clinical_source_idx
 ON stock_movements(source_type,source_id,source_line_id,product_id)
 WHERE source_type IN ('care','consultation','prescription') AND source_id IS NOT NULL AND source_line_id IS NOT NULL;
CREATE INDEX stock_movements_source_idx ON stock_movements(source_type,source_id);
CREATE INDEX stock_movements_patient_idx ON stock_movements(patient_id,created_at);
`;
