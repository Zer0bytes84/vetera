export const MOVEMENT_SNAPSHOT_MIGRATION_SQL = `
ALTER TABLE stock_movements ADD COLUMN unit_snapshot TEXT;
ALTER TABLE stock_movements ADD COLUMN product_name_snapshot TEXT;
`;
