import { StockError } from "@/domain/stock";

export interface StockDatabase {
  select<T>(sql: string, values?: unknown[]): Promise<T>;
  execute(sql: string, values?: unknown[]): Promise<unknown>;
}
export interface StockProduct {
  id: string; name: string; unit: string; quantity: number;
  stock_tracked: number; archived_at: string | null; sale_price_amount: number;
  expiry_date: string | null;
}
export async function stockProductInDatabase(db: StockDatabase, productId: string): Promise<StockProduct> {
  const [product] = await db.select<StockProduct[]>("SELECT id,name,unit,quantity,stock_tracked,archived_at,sale_price_amount,expiry_date FROM products WHERE id=?", [productId]);
  if (!product || product.archived_at) throw new StockError("PRODUCT_MISSING", "Le produit n’est plus disponible. Choisissez un produit actif avant de valider.");
  return product;
}
