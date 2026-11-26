import { StockError } from "@/domain/stock";

export interface StockDatabase {
  execute(sql: string, values?: unknown[]): Promise<unknown>;
  select<T>(sql: string, values?: unknown[]): Promise<T>;
}
export interface StockProduct {
  archived_at: string | null;
  expiry_date: string | null;
  id: string;
  name: string;
  quantity: number;
  sale_price_amount: number;
  stock_tracked: number;
  unit: string;
}
export async function stockProductInDatabase(
  db: StockDatabase,
  productId: string
): Promise<StockProduct> {
  const [product] = await db.select<StockProduct[]>(
    "SELECT id,name,unit,quantity,stock_tracked,archived_at,sale_price_amount,expiry_date FROM products WHERE id=?",
    [productId]
  );
  if (!product || product.archived_at) {
    throw new StockError(
      "PRODUCT_MISSING",
      "Le produit n’est plus disponible. Choisissez un produit actif avant de valider."
    );
  }
  return product;
}
