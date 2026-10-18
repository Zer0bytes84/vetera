# Lots : préparation isolée non intégrée, 15 octobre 2026

**Archive de prévalidation.** Les états « non intégré » de ce document décrivent la décision temporaire antérieure. Le nouvel objectif utilisateur du 15 octobre demande ensuite explicitement « intégrer la préparation isolée (migration 031) » et l’achèvement des cinq priorités. Le patch validé a depuis été appliqué au projet principal; les migrations 031 et 032 y sont enregistrées. L’état courant est suivi dans [le bilan d’intégration](clinical-stock-integration.md). Les reçus et captures archivés ci-dessous restent ceux de la préparation, sans être présentés comme une nouvelle validation native.

**État : `prepared_not_integrated`.** La priorité 3 est préparée et vérifiée uniquement dans `/private/tmp/baitari-stock-lots-validation-2026-10-14`. Le raccordement au projet principal n’est pas appliqué et la migration 031 n’y est pas enregistrée. Les priorités 1 et 2 restent livrées dans le build **3.3.14**, inchangé; les priorités **3 à 5 restent ouvertes et non livrées**.

Les preuves utilisent une base SQLite isolée en mémoire, sans écriture dans les données de la clinique. Le [reçu](../.impeccable/review/stock-lots-preparation-2026-10-15/receipt.json) et le [patch proposé, non appliqué](../.impeccable/review/stock-lots-preparation-2026-10-15/integration-proposee.patch) décrivent cette préparation. Le patch est identifié dans le reçu par son empreinte SHA-256.

## Écritures proposées

La migration 031 proposée crée des lots, des soldes par réception, un emplacement principal et les allocations de mouvements. Dans la copie isolée, le stock existant conserve sa quantité et reste sans lot inventé. La migration doit être enregistrée dans le même changement que les chemins d’écriture adaptés : consommation clinique, dispensation, réception, comptage et enregistrement du catalogue. Il ne faut pas activer une moitié de ce changement.

La préparation relit le stock dans la transaction existante, exclut les stocks périmés et choisit les réceptions par ordre d’arrivée. À la dispensation, un choix explicite de lot est réservé avant les lignes automatiques. Un échec de facture restaure aussi les soldes et allocations de lots. Les réessais vérifient le contenu et la sélection, sans doubler le stock ni la facture.

Le frontend testé comprend les nouveaux `stock-lots-panel.tsx` et `stock-lot-select.tsx`, ainsi que l’adaptation de `prescription-dispensing.tsx`. Cette vérification appartient à la copie de validation et ne constitue pas une intégration de ces parcours au projet principal.

La quantité est saisie explicitement dans l’unité du stock, conformément à la réponse utilisateur. Aucune conversion de conditionnement ni déduction de quantité depuis une posologie.

## Conservation et compatibilité

Les clés étrangères restent en `RESTRICT`. Aucune suppression en cascade de stock et aucune nouvelle politique de suppression d’orphelins n’est introduite. L’interface Produits utilise déjà l’archivage. Le test de lots vérifie que l’archivage conserve quantité, lots, soldes par réception, mouvements et allocations, tout en empêchant une nouvelle consommation.

Le test comptable de suppression des références reste actif, avec un produit dont le stock physique est nul. Il vérifie toujours la suppression réelle des références catalogue/patient/consultation et la conservation des montants et instantanés de facture émise. Le nouveau test de lots vérifie séparément qu’un `DELETE` physique d’un produit stocké est bloqué. Les fixtures des tests cliniques ont une date de stock initial antérieure à la consommation simulée, afin de ne pas dépendre de la date de lancement des tests.

Les chemins sans tables de lots gardent le comportement antérieur; une sélection de lot explicite y est refusée. Le catalogue web reste accessible. Les tests de contrat de repository rendent un composant React pour respecter les règles des hooks.

## Concordance avec l’interface existante

La préparation prolonge le contrat [Stock clinique, mode Operate](../.impeccable/surfaces/src-modules-stock-pages-stock-page-tsx.md) : produit, quantité physique et disponibilité avant confirmation, puis réception, mouvement et facture dans les détails. Elle réutilise les composants existants, les surfaces neutres, les libellés visibles, les nombres tabulaires et les erreurs écrites. Les formulaires distinguent l’identification du stock présent, qui ne change pas le total, et une réception, qui l’augmente.

[PRODUCT.md](../PRODUCT.md), [DESIGN.md](../DESIGN.md) et [le sidecar](../.impeccable/design.json) restent les autorités existantes, sans modification. Cette extension n’ajoute pas de règle visuelle globale et préserve les thèmes Classique et Premium ainsi que les mascottes. Les limites préexistantes sur les vues classiques et la vérification native restent inchangées; aucune dérive n’est consacrée comme règle ni réparée dans ce passage documentaire.

## Revue fraîche et corrections bornées

La revue UI fraîche a d’abord rendu **fix**, puis **ship** uniquement pour les deux corrections matérielles signalées dans la préparation isolée :

- Le formulaire de comptage est réinitialisé par identifiant de réception (`CountForm key={counting.id}`). Passer de la réception A avec une saisie de **99** et un motif à la réception B affiche sa quantité de **3**, un motif vide et une nouvelle requête; le brouillon de A ne peut pas être soumis pour B.
- Le filtre produit actif utilise une encre lisible en thème sombre. La correction reste locale au contrôle de la liste des lots.

Ce verdict ne déclare ni la priorité 3 livrée ni le raccordement au projet principal validé. Il ne vaut pas validation Tauri native.

## Preuves enregistrées dans la copie isolée

- `npm run typecheck` : code de sortie 0.
- `npm run lint -- --max-warnings 0 --ignore-pattern '.vite-cache/**'` : zéro erreur et zéro avertissement. L’exclusion vise uniquement le cache Vite généré propre à cette copie; aucun fichier source ni test n’est exclu.
- `npm test` : **647 tests réussis dans 84 fichiers**.
- Licences : **13 contrôles réussis**.
- Build frontend de production : réussi, **274,3 kB gzip au démarrage**, avec la configuration publique de licence existante. Aucun modèle ni secret ajouté.
- WebKit : **8 contrôles réussis**, zéro erreur JavaScript, en clair et sombre, aux formats **1400 × 800** et **820 × 800**. Identification sans augmentation du stock, réception avec heure 24 h, réinitialisation du comptage, écart journalisé, lot imposé insuffisant, délivrance et liens facture, péremption, annulation sans écriture.
- Détecteur Impeccable exécuté **une seule fois** sur les trois composants concernés : aucune alerte ([`[]`](../.impeccable/review/stock-lots-preparation-2026-10-15/detector.json)).

Le [reçu](../.impeccable/review/stock-lots-preparation-2026-10-15/receipt.json) rassemble ces résultats. La [vérification finale WebKit](../.impeccable/review/stock-lots-preparation-2026-10-15/final/verification.json) rapporte `previewOnly: true`, `productionWrites: false`, cinq mouvements et un solde final de **11,75** dans la base de validation. Aucun test ni nouvelle revue n’a été relancé pour ce bilan documentaire.

| Preuve finale | Captures |
| --- | --- |
| Identification et réception | [stock initial](../.impeccable/review/stock-lots-preparation-2026-10-15/final/lots-stock-initial.png), [identification](../.impeccable/review/stock-lots-preparation-2026-10-15/final/lot-identification.png), [réception à confirmer](../.impeccable/review/stock-lots-preparation-2026-10-15/final/lot-reception-a-confirmer.png) |
| Comptage et changement de réception | [comptage](../.impeccable/review/stock-lots-preparation-2026-10-15/final/lot-comptage.png), [nouvelle réception](../.impeccable/review/stock-lots-preparation-2026-10-15/final/comptage-nouvelle-reception.png) |
| Lot explicite à la dispensation | [confirmation](../.impeccable/review/stock-lots-preparation-2026-10-15/final/dispensation-lot-a-confirmer.png), [insuffisance du lot choisi](../.impeccable/review/stock-lots-preparation-2026-10-15/final/dispensation-lot-insuffisant.png) |
| Thèmes et largeur réduite | [clair](../.impeccable/review/stock-lots-preparation-2026-10-15/final/lots-clair.png), [sombre](../.impeccable/review/stock-lots-preparation-2026-10-15/final/lots-sombre.png), [réception sombre à 820 px](../.impeccable/review/stock-lots-preparation-2026-10-15/final/lot-reception-compacte-sombre.png) |

## Décision : conserver la préparation isolée

Après prévalidation, le contrôle automatique d’approbation a refusé le raccordement de la migration persistante 031 et des chemins d’écriture cliniques. Le 15 octobre 2026, l’utilisateur a explicitement choisi **« Garder la préparation isolée pour le moment »**. Le patch reste proposé et non appliqué; aucune activation ni migration 031 n’est effectuée dans le principal. Les écritures refusées n’ont pas été appliquées.

Le contrôle final du projet principal conservé sans intégration a terminé avec typecheck réussi (code 0), lint sans erreur ni avertissement et **642 tests réussis dans 84 fichiers**. Les **647 tests**, **13 contrôles de licences** et **8 contrôles WebKit** ci-dessus appartiennent à la préparation isolée.

Toute intégration ultérieure devra encore recevoir et vérifier ce changement cohérent avant une déclaration de livraison. Aucun build natif de la priorité 3 n’a été produit. Cette préparation ne clôture ni les lots, ni les fournisseurs et commandes, ni les codes-barres, analyses de consommation, propositions de seuil et transferts. La réception et l’emplacement principal préparés ici ne livrent pas les priorités 4 et 5.
