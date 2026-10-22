-- Recalcul indépendant du taux de règlement, sur une copie en lecture seule.
WITH emises AS (
  SELECT i.id, i.number, i.gross_amount
    - COALESCE((SELECT SUM(c.gross_amount) FROM credit_notes c
                WHERE c.invoice_id = i.id AND c.document_status = 'issued'), 0) AS net,
    COALESCE((SELECT SUM(p.amount) FROM payments p
              WHERE p.invoice_id = i.id AND p.voided_at IS NULL), 0) AS regle
  FROM invoices i WHERE i.document_status = 'issued'
),
soldes AS (SELECT number, net, MIN(net, regle) AS regle, MAX(net - regle, 0) AS reste FROM emises)
SELECT COUNT(*) AS factures,
       SUM(net) / 100 AS facture_net_da,
       SUM(regle) / 100 AS regle_da,
       SUM(reste) / 100 AS reste_da,
       ROUND(100.0 * SUM(regle) / SUM(net), 1) AS taux_montant,
       SUM(reste = 0) AS soldees,
       ROUND(100.0 * SUM(reste = 0) / COUNT(*), 2) AS taux_nombre
FROM soldes;
WITH emises AS (
  SELECT i.id, i.number, i.gross_amount
    - COALESCE((SELECT SUM(c.gross_amount) FROM credit_notes c
                WHERE c.invoice_id = i.id AND c.document_status = 'issued'), 0) AS net,
    COALESCE((SELECT SUM(p.amount) FROM payments p
              WHERE p.invoice_id = i.id AND p.voided_at IS NULL), 0) AS regle
  FROM invoices i WHERE i.document_status = 'issued'
),
soldes AS (SELECT number, net, MIN(net, regle) AS regle, MAX(net - regle, 0) AS reste FROM emises)
SELECT number, net / 100 AS net_da, regle / 100 AS regle_da, reste / 100 AS reste_da FROM soldes WHERE reste > 0;
