import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, expect, it } from "vitest";
import { SQLITE_MIGRATIONS } from "@/services/sqlite/migrations";
import { runSqliteMigrations } from "@/services/sqlite/migration-runner";
import { STOCK_OPERATIONS_MIGRATION_SQL } from "@/modules/stock/stock-operations-migration";
import { registerLotInDatabase, stockBucketsInDatabase } from "@/modules/stock/services/lot-store";
import { applyConsumptionThresholdInDatabase, barcodeProductInDatabase, barcodeStockOperationInDatabase, normalizeBarcode, saveBarcodeInDatabase, saveLocationInDatabase, stockOperationsSnapshotInDatabase, transferStockInDatabase } from "@/modules/stock/services/stock-operations-store";
import { consumeStockInDatabase } from "@/modules/stock/services/stock-store";
import type { StockDatabase } from "@/modules/stock/services/stock-database";

let sqlite: DatabaseSync; let db: StockDatabase; let serial: number;
const now="2026-10-15T12:00:00Z";const id=()=>`operation-test-${++serial}`;
async function transaction<T>(operation:()=>Promise<T>):Promise<T>{sqlite.exec("BEGIN IMMEDIATE");try{const result=await operation();sqlite.exec("COMMIT");return result;}catch(error){sqlite.exec("ROLLBACK");throw error;}}
const balance=()=>Number(sqlite.prepare("SELECT quantity FROM products WHERE id='p1'").get()?.quantity);
const incoming=(lotNumber="LOT-A",quantity=10,receivedAt="2026-09-01T10:00:00Z",expiryDate:string|null="2028-01-01")=>transaction(()=>registerLotInDatabase(db,{id:`receipt-${lotNumber}`,productId:"p1",lotNumber,quantity,receivedAt,expiryDate,mode:"receive",locationId:"stock-main",authorId:"vet"},id,now));
const scan=(direction:"in"|"out",quantity=1,requestId="scan")=>transaction(()=>barcodeStockOperationInDatabase(db,{id:requestId,code:"000123",direction,quantity,locationId:"stock-main",authorId:"vet"},id,now));
const transfer={id:"transfer",productId:"p1",fromLocationId:"stock-main",toLocationId:"room",quantity:3,authorId:"vet"};
beforeEach(async()=>{
  sqlite=new DatabaseSync(":memory:");serial=0;
  db={async select<T>(sql:string,args:unknown[]=[]){return sqlite.prepare(sql.replace(/\$\d+/g,"?")).all(...args) as T;},async execute(sql,args=[]){if(!args.length){sqlite.exec(sql);return{rowsAffected:0};}return{rowsAffected:Number(sqlite.prepare(sql.replace(/\$\d+/g,"?")).run(...args).changes)};}};
  await runSqliteMigrations(db,SQLITE_MIGRATIONS.some(m=>m.version==="033")?SQLITE_MIGRATIONS:[...SQLITE_MIGRATIONS,{version:"033",name:"stock-barcodes-and-transfers",sql:STOCK_OPERATIONS_MIGRATION_SQL}]);
  sqlite.exec(`PRAGMA foreign_keys=ON;INSERT INTO products(id,name,category,unit,quantity,purchase_price_amount,sale_price_amount) VALUES('p1','Produit de test','Médicaments','ml',0,100,200),('p2','Autre produit','Médicaments','comprimé',0,100,300);
    INSERT INTO owners(id,first_name,last_name,phone) VALUES('owner','Test','Stock','');INSERT INTO patients(id,owner_id,name,species) VALUES('patient','owner','Patient de test','Chien');`);
  await saveBarcodeInDatabase(db,{id:"barcode",productId:"p1",code:"000123"},now);
  await saveLocationInDatabase(db,{id:"room",name:"Salle de soins"},now);
});
afterEach(()=>sqlite.close());

it("code exact : zéros initiaux et casse conservés, aucune association silencieuse à un autre produit",async()=>{
  expect(normalizeBarcode(" 000123\n")).toBe("000123");
  expect((await barcodeProductInDatabase(db,"000123")).id).toBe("p1");
  await expect(barcodeProductInDatabase(db,"123")).rejects.toThrow("aucun produit");
  await expect(saveBarcodeInDatabase(db,{id:"other",productId:"p2",code:"000123"},now)).rejects.toThrow("autre produit");
  expect(await saveBarcodeInDatabase(db,{id:"retry",productId:"p1",code:"000123"},now)).toBe("barcode");
  await saveBarcodeInDatabase(db,{id:"upper",productId:"p1",code:"AbC"},now);
  await expect(barcodeProductInDatabase(db,"abc")).rejects.toThrow();
});
it("scanner identifie sans écriture de stock, puis entrée et sortie utilisent la quantité humaine",async()=>{
  await barcodeProductInDatabase(db,"000123");expect(balance()).toBe(0);
  await scan("in",5.25);await scan("out",2,"out");
  expect(balance()).toBe(3.25);
  expect(sqlite.prepare("SELECT type,quantity_delta,source_label FROM stock_movements ORDER BY rowid").all()).toMatchObject([
    {type:"restock",quantity_delta:5.25,source_label:"Entrée par code-barres 000123"},{type:"usage",quantity_delta:-2,source_label:"Sortie par code-barres 000123"},
  ]);
});
it("entrée avec lot et péremption, réessai inchangé sans doublon, contenu divergent refusé",async()=>{
  const input={id:"in-lot",code:"000123",direction:"in" as const,quantity:2.5,lotNumber:"LOT-SCAN",expiryDate:"2027-01-01",locationId:"room",authorId:"vet"};
  await transaction(()=>barcodeStockOperationInDatabase(db,input,id,now));
  await transaction(()=>barcodeStockOperationInDatabase(db,input,id,"2026-10-15T13:00:00Z"));
  expect(balance()).toBe(2.5);
  expect((await stockBucketsInDatabase(db,"p1"))[0]).toMatchObject({lotNumber:"LOT-SCAN",expiryDate:"2027-01-01",locationId:"room"});
  await expect(transaction(()=>barcodeStockOperationInDatabase(db,{...input,quantity:3},id,now))).rejects.toThrow("autres informations");
});
it("la disponibilité est contrôlée dans l’emplacement choisi et exclut les périmés",async()=>{
  await incoming();await transaction(()=>transferStockInDatabase(db,{...transfer,quantity:10},id,now));
  await expect(scan("out",1)).rejects.toMatchObject({code:"INSUFFICIENT_STOCK"});
  await transaction(()=>barcodeStockOperationInDatabase(db,{id:"out-room",code:"000123",direction:"out",quantity:1,locationId:"room",authorId:"vet"},id,now));
  expect(balance()).toBe(9);
  await incoming("EXPIRED",2,"2026-09-01T10:00:00Z","2026-09-30");
  await expect(scan("out",1,"expired")).rejects.toMatchObject({code:"INSUFFICIENT_STOCK"});
  expect(balance()).toBe(11);
});
it("un échec d’allocation annule la sortie, son mouvement et son identifiant de réessai",async()=>{
  await incoming();
  sqlite.exec("CREATE TRIGGER fail_allocation BEFORE INSERT ON stock_movement_allocations BEGIN SELECT RAISE(ABORT,'allocation failure'); END;");
  await expect(scan("out",2)).rejects.toThrow("allocation failure");
  expect(balance()).toBe(10);
  expect(sqlite.prepare("SELECT * FROM stock_movements WHERE type='usage'").all()).toHaveLength(0);
  expect(sqlite.prepare("SELECT * FROM stock_inventory_operations WHERE id='scan'").all()).toHaveLength(0);
});
it("transfert partiel : total, numéro de lot, péremption et réception FIFO conservés",async()=>{
  await incoming();await incoming("LOT-B",5,"2026-10-01T10:00:00Z","2026-11-01");
  const result=await transaction(()=>transferStockInDatabase(db,transfer,id,now));
  expect(balance()).toBe(15);
  expect((await stockBucketsInDatabase(db,"p1")).find(b=>b.locationId==="room")).toMatchObject({lotNumber:"LOT-A",quantity:3,receivedAt:"2026-09-01T10:00:00.000Z",expiryDate:"2028-01-01"});
  const allocations=sqlite.prepare("SELECT quantity_delta FROM stock_movement_allocations WHERE movement_id=?").all(result.movementId);
  expect(allocations.map(a=>a.quantity_delta)).toEqual([-3,3]);
  expect(sqlite.prepare("SELECT quantity_delta,quantity_after FROM stock_movements WHERE id=?").get(result.movementId)).toEqual({quantity_delta:0,quantity_after:15});
  await transaction(()=>transferStockInDatabase(db,transfer,id,now));expect(balance()).toBe(15);
  await expect(transaction(()=>transferStockInDatabase(db,{...transfer,quantity:4},id,now))).rejects.toThrow("autres informations");
});
it("deux transferts relisent le solde de départ et ne déplacent jamais le même stock deux fois",async()=>{
  await incoming();await transaction(()=>transferStockInDatabase(db,{...transfer,quantity:8},id,now));
  await expect(transaction(()=>transferStockInDatabase(db,{...transfer,id:"second",quantity:3},id,now))).rejects.toMatchObject({code:"INSUFFICIENT_STOCK"});
  expect((await stockBucketsInDatabase(db,"p1")).filter(b=>b.locationId==="room").reduce((sum,b)=>sum+b.quantity,0)).toBe(8);
  expect(balance()).toBe(10);
});
it("un échec à l’arrivée annule le débit, la trace et les allocations de transfert",async()=>{
  await incoming();
  sqlite.exec("CREATE TRIGGER fail_target BEFORE INSERT ON stock_balances WHEN NEW.location_id='room' BEGIN SELECT RAISE(ABORT,'target failure'); END;");
  await expect(transaction(()=>transferStockInDatabase(db,transfer,id,now))).rejects.toThrow("target failure");
  expect((await stockBucketsInDatabase(db,"p1"))[0].quantity).toBe(10);
  expect(sqlite.prepare("SELECT * FROM stock_transfers").all()).toHaveLength(0);
  expect(balance()).toBe(10);
});
it("déplacer un périmé permet son isolement sans le rendre consommable",async()=>{
  await incoming("EXPIRED",5,"2026-09-01T10:00:00Z","2026-09-30");
  await transaction(()=>transferStockInDatabase(db,transfer,id,now));
  await expect(transaction(()=>barcodeStockOperationInDatabase(db,{id:"expired-out",code:"000123",direction:"out",quantity:1,locationId:"room",authorId:"vet"},id,now))).rejects.toMatchObject({code:"INSUFFICIENT_STOCK"});
  expect((await stockBucketsInDatabase(db,"p1")).filter(b=>b.locationId==="room")[0].expiryDate).toBe("2026-09-30");
});
it("emplacement plein protégé, principal actif, noms distincts et historique des noms mémorisé",async()=>{
  await incoming();await transaction(()=>transferStockInDatabase(db,transfer,id,now));
  await expect(saveLocationInDatabase(db,{id:"room",name:"Salle de soins",active:false},now)).rejects.toThrow("à zéro");
  await expect(saveLocationInDatabase(db,{id:"stock-main",name:"Stock principal",active:false},now)).rejects.toThrow("rester actif");
  await expect(saveLocationInDatabase(db,{id:"new",name:"salle de soins"},now)).rejects.toThrow("déjà ce nom");
  await saveLocationInDatabase(db,{id:"room",name:"Réserve"},now);
  expect((await stockOperationsSnapshotInDatabase(db,now)).transfers[0].target_name).toBe("Salle de soins");
});
it("la consommation ne compte que les sorties réelles de 30 jours, pas les réceptions et transferts",async()=>{
  await incoming();await scan("out",2);
  await transaction(()=>consumeStockInDatabase(db,{productId:"p1",quantity:3,sourceType:"care",sourceId:"care",sourceLineId:"care",sourceLabel:"Soin de test",patientId:"patient",authorId:"vet",occurredAt:now},id));
  await transaction(()=>transferStockInDatabase(db,{...transfer,quantity:1},id,now));
  sqlite.exec(`INSERT INTO stock_movements(id,product_id,type,quantity_delta,quantity_after,created_at,updated_at) VALUES
    ('old-usage','p1','usage',-9,0,'2026-08-01 10:00:00','2026-08-01 10:00:00'),
    ('future-usage','p1','usage',-8,0,'2026-11-01 10:00:00','2026-11-01 10:00:00'),
    ('count-adjustment','p1','adjustment',-7,0,'2026-10-14 10:00:00','2026-10-14 10:00:00');`);
  const first=await stockOperationsSnapshotInDatabase(db,now);
  expect(first.consumption).toEqual([{product_id:"p1",product_name:"Produit de test",unit:"ml",quantity:5,min_stock:0,suggested_minimum:2.333334}]);
  expect(await stockOperationsSnapshotInDatabase(db,now)).toEqual(first);
});
it("un seuil proposé exige un clic explicite et une proposition encore à jour",async()=>{
  await incoming();await scan("out",3);
  const proposal=(await stockOperationsSnapshotInDatabase(db,now)).consumption[0].suggested_minimum;
  expect(sqlite.prepare("SELECT min_stock FROM products WHERE id='p1'").get()?.min_stock).toBe(0);
  await transaction(()=>applyConsumptionThresholdInDatabase(db,"p1",proposal,now));
  expect(sqlite.prepare("SELECT min_stock FROM products WHERE id='p1'").get()?.min_stock).toBe(proposal);
  expect(balance()).toBe(7);
  await scan("out",1,"next");
  await expect(transaction(()=>applyConsumptionThresholdInDatabase(db,"p1",proposal,now))).rejects.toThrow("a changé");
});
it("produit archivé, code invalide, absence d’auteur et quantité non physique sont refusés",async()=>{
  for(const code of ["", "a\tb", "x".repeat(129)])expect(()=>normalizeBarcode(code)).toThrow();
  for(const quantity of [0,-1,Number.NaN,Number.POSITIVE_INFINITY])await expect(scan("in",quantity)).rejects.toThrow();
  await expect(transaction(()=>barcodeStockOperationInDatabase(db,{id:"no-actor",code:"000123",direction:"in",quantity:1,locationId:"stock-main",authorId:""},id,now))).rejects.toThrow("utilisateur");
  sqlite.exec("UPDATE products SET archived_at='2026-10-15' WHERE id='p1'");
  await expect(scan("in")).rejects.toMatchObject({code:"PRODUCT_MISSING"});
  expect(balance()).toBe(0);
});
