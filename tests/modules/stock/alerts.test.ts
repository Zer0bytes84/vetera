import { expect, it } from "vitest";
import { restockNeed, stockAlert, stockExpiry } from "@/domain/stock-alerts";
const today="2026-10-15";const base={quantity:20,minStock:20,stockTracked:true};
it("l’échéance des lots prévaut sur celle générique et distingue hier d’aujourd’hui",()=>{
  expect(stockAlert({...base,nearestExpiryDate:"2026-10-14"},today)).toBe("expired");
  expect(stockAlert({...base,nearestExpiryDate:"2026-10-15"},today)).toBe("expiring");
  expect(stockExpiry({...base,expiryDate:"2028-01-01",nearestExpiryDate:"2026-10-20"})).toBe("2026-10-20");
  expect(stockAlert({...base,expiryDate:"2026-01-01",nearestExpiryDate:null},today)).toBe("healthy");
});
it("le besoin utilise les quantités utilisables sans commander deux fois à seuil atteint",()=>{
  expect(restockNeed(base)).toBe(0);expect(stockAlert(base,today)).toBe("healthy");
  expect(restockNeed({...base,availableQuantity:12.5})).toBe(7.5);
  expect(stockAlert({...base,availableQuantity:12.5,expiredQuantity:7.5},today)).toBe("expired");
});
it("une prestation n’a pas d’alerte physique ni de quantité à commander",()=>{
  expect(restockNeed({...base,quantity:0,stockTracked:false})).toBe(0);
  expect(stockAlert({...base,quantity:0,stockTracked:false},today)).toBe("healthy");
});
