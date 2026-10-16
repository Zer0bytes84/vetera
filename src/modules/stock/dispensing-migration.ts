export const DISPENSING_MIGRATION_SQL = `
CREATE TABLE clinical_stock_uses (
 id TEXT PRIMARY KEY,
 appointment_id TEXT NOT NULL REFERENCES appointments(id) ON DELETE RESTRICT,
 patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
 product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
 quantity REAL NOT NULL CHECK(quantity > 0),
 author_id TEXT NOT NULL,
 invoice_id TEXT REFERENCES invoices(id) ON DELETE SET NULL,
 movement_id TEXT REFERENCES stock_movements(id) ON DELETE RESTRICT,
 created_at TEXT NOT NULL
);
CREATE INDEX clinical_stock_uses_appointment_idx ON clinical_stock_uses(appointment_id,created_at);
CREATE TABLE prescription_dispensations (
 id TEXT PRIMARY KEY,
 prescription_id TEXT NOT NULL UNIQUE REFERENCES prescriptions(id) ON DELETE RESTRICT,
 patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
 author_id TEXT NOT NULL,
 invoice_id TEXT REFERENCES invoices(id) ON DELETE SET NULL,
 created_at TEXT NOT NULL
);
CREATE TABLE prescription_dispensation_lines (
 id TEXT PRIMARY KEY,
 dispensation_id TEXT NOT NULL REFERENCES prescription_dispensations(id) ON DELETE RESTRICT,
 prescription_item_id TEXT NOT NULL REFERENCES prescription_items(id) ON DELETE RESTRICT,
 product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
 product_name TEXT NOT NULL,
 unit TEXT NOT NULL,
 quantity REAL NOT NULL CHECK(quantity > 0),
 movement_id TEXT REFERENCES stock_movements(id) ON DELETE RESTRICT,
 invoice_line_id TEXT REFERENCES invoice_lines(id) ON DELETE SET NULL,
 UNIQUE(dispensation_id,prescription_item_id)
);
CREATE TRIGGER prescriptions_dispensed_locked BEFORE UPDATE OF id,appointment_id,patient_id,vet_id,prescription_date,weight_kg,diagnosis,general_instructions,status,signed_at,template_version,created_at ON prescriptions
 WHEN OLD.status = 'dispensed'
BEGIN
 SELECT RAISE(ABORT,'A dispensed prescription cannot be modified');
END;
CREATE TRIGGER prescription_items_dispensed_locked BEFORE UPDATE OF id,prescription_id,medication_id,medication_name,medication_class,form,dosage_per_kg,dosage_unit,dosage_min,dosage_max,concentration_mg_per_ml,computed_dose_mg,computed_volume_ml,frequency,duration,route,quantity,instructions,warnings,sort_order,created_at ON prescription_items
 WHEN EXISTS(SELECT 1 FROM prescriptions WHERE id=OLD.prescription_id AND status='dispensed')
BEGIN
 SELECT RAISE(ABORT,'Dispensed prescription items cannot be modified');
END;
CREATE TRIGGER prescription_items_dispensed_no_add BEFORE INSERT ON prescription_items
 WHEN EXISTS(SELECT 1 FROM prescriptions WHERE id=NEW.prescription_id AND status='dispensed')
BEGIN
 SELECT RAISE(ABORT,'Dispensed prescription items cannot be modified');
END;
CREATE TRIGGER prescription_items_dispensed_no_delete BEFORE DELETE ON prescription_items
 WHEN EXISTS(SELECT 1 FROM prescriptions WHERE id=OLD.prescription_id AND status='dispensed')
BEGIN
 SELECT RAISE(ABORT,'Dispensed prescription items cannot be modified');
END;
`;
