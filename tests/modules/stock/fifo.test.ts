import { expect, it } from "vitest";
import { selectFifoAllocations, type StockBucket } from "@/domain/stock-fifo";

const first: StockBucket = {id: "old", productId: "product", lotId: "lot-old", locationId: "main", quantity: 3, receivedAt: "2026-09-01T10:00:00Z", expiryDate: "2027-12-01"};
const next: StockBucket = {id: "new", productId: "product", lotId: "lot-new", locationId: "main", quantity: 4, receivedAt: "2026-09-10T10:00:00Z", expiryDate: "2026-12-01"};
const input = {productId: "product", productName: "Produit de test", unit: "ml", quantity: 5, onDate: "2026-10-14"};

it("FIFO : l’ancienne réception est consommée avant la nouvelle, indépendamment de la péremption", () => {
  expect(selectFifoAllocations([next, first], input)).toEqual([{balanceId: "old", quantity: 3}, {balanceId: "new", quantity: 2}]);
});
it("une sélection explicite de lot ou d’emplacement ne bascule pas silencieusement sur un autre stock", () => {
  expect(selectFifoAllocations([next, first], {...input, quantity: 2, lotId: "lot-new"})).toEqual([{balanceId: "new", quantity: 2}]);
  expect(() => selectFifoAllocations([next, first], {...input, lotId: "lot-new"})).toThrow("Stock insuffisant");
  expect(() => selectFifoAllocations([next, first], {...input, locationId: "other"})).toThrow("Stock insuffisant");
});
it("les lots périmés, les soldes vides et les produits étrangers sont exclus", () => {
  const expired = {...first, id: "expired", expiryDate: "2026-10-13", quantity: 100};
  const foreign = {...first, id: "foreign", productId: "other", quantity: 100};
  expect(selectFifoAllocations([expired, foreign, {...first, quantity: 0}, next], {...input, quantity: 4})).toEqual([{balanceId: "new", quantity: 4}]);
  expect(() => selectFifoAllocations([expired, foreign], {...input, quantity: 1})).toThrow("Stock insuffisant");
});
it("un lot reste utilisable le jour de sa péremption et les petites quantités restent exactes", () => {
  expect(selectFifoAllocations([{...first, quantity: 0.1, expiryDate: "2026-10-14"}, {...next, quantity: 0.2}], {...input, quantity: 0.3})).toEqual([{balanceId: "old", quantity: 0.1}, {balanceId: "new", quantity: 0.2}]);
});
it("stock sans lot explicitement choisi et stabilité des réceptions à même date", () => {
  const a = {...first, id: "a", lotId: null};
  const b = {...first, id: "b", lotId: null};
  expect(selectFifoAllocations([b, next, a], {...input, quantity: 4, lotId: null})).toEqual([{balanceId: "a", quantity: 3}, {balanceId: "b", quantity: 1}]);
  expect(selectFifoAllocations([a, b, next], {...input, quantity: 4, lotId: null})).toEqual([{balanceId: "a", quantity: 3}, {balanceId: "b", quantity: 1}]);
});

it("dates impossibles, dates absentes et quantités non finies sont refusées", () => {
  for (const bucket of [{...first, expiryDate: "2026-02-30"}, {...first, receivedAt: "inconnue"}, {...first, quantity: Infinity}]) {
    expect(() => selectFifoAllocations([bucket], {...input, quantity: 1})).toThrow();
  }
  expect(() => selectFifoAllocations([first], {...input, onDate: ""})).toThrow();
  expect(() => selectFifoAllocations([{...first, receivedAt: "2027-01-01T12:00:00Z"}], {...input, quantity: 1})).toThrow("Stock insuffisant");
});
