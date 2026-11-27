// Charge de calcul de factures pour le profileur : 200 000 lignes passées par les fonctions du domaine.
const { calculateLineAmounts, sumBillingLines, normalizeBillingLine } = await import("../../../../src/domain/billing/money.ts");
const { calculateInvoiceBalance } = await import("../../../../src/domain/billing/settlement.ts");
const t = performance.now(); let n = 0;
for (let inv = 0; inv < 50_000; inv++) {
  const lines = [];
  for (let j = 0; j < 4; j++) lines.push(calculateLineAmounts({ quantityMilli: 1000 + j * 500, unitAmount: 125_000 + inv, discountBps: j * 250, taxBps: 900 }));
  sumBillingLines(lines); n += lines.length;
}
console.log(JSON.stringify({ lines: n, ms: Math.round(performance.now() - t), usPerLine: Math.round((performance.now() - t) * 1000 / n * 100) / 100 }));
