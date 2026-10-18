# Barre Trésorerie et harmonisation Premium

## Correction de la barre

La part en cours de règlement mesurait environ 1,2 px sur la capture initiale : elle disparaissait visuellement derrière la part encaissée. Chaque montant positif possède maintenant une largeur minimale de 6 px ; la part dominante se réduit pour que la barre tienne dans son conteneur. Les montants demeurent inchangés et sont disponibles dans la légende et au survol des segments.

Les couleurs restent celles demandées : neutre noir pour l’encaissé (clair en thème sombre), jaune pour les règlements en cours, bleu pour les échéances dépassées. Un montant nul n’est pas représenté par un faux segment. Une barre sans données ou en cours de chargement demeure neutre.

## Harmonisation

- Dix titres de widgets à 15 px, même graisse et même retrait de 16 px. Les quatre cartes KPI conservent leur hiérarchie compacte.
- Paddings et espaces entre cartes à 16 px ; suppression des doubles paddings et des doubles cadres des cartes analytiques.
- Bordures 1 px bas contraste, rayons issus du token Premium, mêmes surfaces claires/sombres.
- Alignement des corps de widgets, lignes d’informations, listes, légendes et bandeaux de métriques.
- Focus clavier visible sur les cartes et les actions.
- Libellés de l’axe des recettes agrandis dans leur espace disponible pour ne plus tronquer les grands montants.

Les règles nouvelles sont exclusivement conditionnées par le style Premium. Aucun changement de la logique métier, des données, du header ou de la sidebar.

## Reçus

- Typecheck : 0 erreur.
- Lint complet avec `--max-warnings=0` : 0 erreur, 0 avertissement.
- Suite complète : **572 tests réussis, 74 fichiers**.
- Quatre nouveaux tests sur les petits segments, les catégories nulles, les données absentes et les valeurs invalides.
- Navigateur : trois largeurs (1480, 1024 et 800 px), en clair et sombre, aucun débordement horizontal, aucune erreur de rendu.
- Cas de barre à trois montants positifs : noir 288 px, jaune 6 px, bleu 6 px sur une largeur de 300 px. Ces valeurs constituent un cas de test isolé, sans écriture dans la base.
- Classique : captures KPI et Recettes identiques pixel à pixel. La capture Créances diffère uniquement dans la jauge pendant son animation ; sa structure et ses styles n’ont pas été modifiés.

Les captures du dashboard utilisent un instantané des données locales réelles, lu sans modification. Les tests de données limites utilisent un montage isolé.

[Galerie avant/après en clair et sombre](/Users/zohir/.codex/visualizations/2026/09/04/01a06e82-45fb-75c1-b1f2-80782a465e8d/dashboard-harmony/index.html)

Le skill Impeccable signale un ancien format de PRODUCT.md et une version 4.5.2 disponible. La mise à jour du contexte (`init`) et du skill reste une intervention séparée, non exécutée pour cette correction.
