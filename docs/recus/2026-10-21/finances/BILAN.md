# Module Finances : indicateurs honnêtes et constat sur l'origine des encaissements

Date : 21 octobre 2026. Commit local, aucun push.

## Indicateurs de la page Finances

- **Factures non lues : plus d'affirmation fausse.** Quand les factures n'ont pas pu être lues, les indicateurs affichaient quand même « 0 DA », « Soldé », « Toutes les factures sont acquittées » et « Aucun retard de paiement à déplorer ». C'est le cas dans le navigateur, et dans l'application si la lecture échoue.
  - Ils affichent maintenant « Indisponible ».
  - La raison est donnée une seule fois, sous le premier indicateur.
  - Pendant la lecture, ils affichent « Chargement… ».
- **Facturé.**
  - Le taux s'affichait seul, « taux de recouvrement » sans chiffre, quand rien n'était facturé. Il n'apparaît plus que s'il y a des factures, sous la forme « 62 % déjà encaissés ».
  - Le nombre ne compte plus que les factures émises (avant : tous les documents, brouillons et annulés compris), comme le montant.
  - « Période en cours » devient « toutes périodes » : aucun filtre de période n'était appliqué.
- **Encaissé.** Les mentions « Recettes confirmées » (en vert, avec une flèche de hausse) et « Reçus sans litige » ne reposaient sur rien. L'indicateur dit maintenant ce qu'il calcule : « Règlements reçus, moins les remboursements ».
- **Solde ouvert et En retard.**
  - Ils donnent le nombre de factures concernées : « 2 factures non soldées », « 1 facture à relancer ».
  - Sans facture émise, ils l'écrivent, au lieu de « Soldé ».

## Analyse financière

- **Une phrase de constat** au-dessus de l'origine des encaissements : « Consultation représente 60 % des encaissements des 30 derniers jours, devant Chirurgie (28 %). »
- **Une ligne « Autres catégories »** apparaît quand les cinq catégories affichées ne couvrent pas tout le total, pour que la colonne tombe juste.
- **Écarts nommés**, comme au tableau de bord : « contre 8 800 DA sur la période précédente » au lieu de « vs période précédente ».

## Point 20 de l'étude : ce qui n'est pas fait, et pourquoi

- **Carte de caisse avec « Encaisser » et « Clôturer » : non faite.** L'application n'a ni caisse ni clôture de journée. Les règlements s'enregistrent depuis chaque facture. Ajouter ces boutons reviendrait à inventer une fonction : c'est un chantier à décider.
- **Filtre par vétérinaire partagé : non fait.** Les factures et les écritures du journal ne portent pas de vétérinaire, donc rien ne permet de filtrer honnêtement. Il faudrait d'abord enregistrer le vétérinaire sur chaque facture.

## Vérification

- **Factures non vues à l'écran :** elles ne se lisent que dans SQLite. Le nouvel état « Indisponible » est vu dans le navigateur. Les chiffres avec de vraies factures restent à voir dans `npm run tauri:dev`.
- **Analyse :** elle lit le journal et fonctionne dans le navigateur, avec les données de démonstration.

## Captures

1440 × 900.
- `avant/` : page Finances, analyse.
- `apres/` : page Finances, analyse en clair et en sombre.

## Vérifications

- Typage : 0 erreur.
- ESLint : 0 problème.
- Vitest : 149 fichiers, 1 116 tests verts, dont 4 nouveaux (`tests/modules/finances/category-finding.test.ts`).
