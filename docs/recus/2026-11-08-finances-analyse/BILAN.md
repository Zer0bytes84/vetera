# Finances > Analyse : le langage des pages refaites

8 novembre 2026. Captures des quatre thèmes (Clean et Premium, clair et sombre) dans `avant/` et `apres/`, à 1440 px de large.

## Ce qui a changé (présentation seulement)

- **En-tête** : une ligne, « Analyse financière : encaissements et trésorerie », « Retour aux finances » en pilule. Marge de page 16 / 24 px comme Patients.
- **Sections** : chacune est une bande grise (R20) avec son en-tête (icône, titre, sous-titre) et une carte blanche (R16) à bordure nette sur les quatre côtés. Espacement 12 / 24.
  - « Indicateurs financiers » : les quatre chiffres dans une carte, séparés par un filet.
  - « Origine des encaissements » : les catégories avec la barre `progress-bar` de Yuri, le total au pied.
- **Graphiques** : le graphique des encaissements et de la trésorerie (Premium) et la vue d'ensemble des encaissements (Clean) sont maintenant le `chart-card` de Yuri, déjà installé pour le tableau de bord, avec ses couleurs sur nos teintes. Le choix « Encaissements / Trésorerie » et la période (7 jours, 30 jours, 90 jours, 12 mois) sont des `segmented-control` de Yuri. La période précédente reste affichée, en teinte calme.
- **Retiré** : tout le CSS propre à cette page (`.finance-analysis*` pour Premium, `.finance-overview*` pour Clean, environ 200 lignes), remplacé par les composants. Les cadres gravés de Premium (repères d'angle) disparaissent de cette page.

## Ce qui n'a pas été touché

- Aucun chiffre, aucun calcul : `metrics`, `percentageDelta`, `categoryFinding`, `otherIncome`, `paidIncome`, `analyticsRanges`, `trendBuckets`, `invoicedByNature` sont les mêmes ; les textes, les formats (DA, %) et les variations sont les mêmes.
- Le comportement propre à chaque thème : Clean montre la vue d'ensemble (avec la période et « Facturé par nature »), Premium montre le graphique mensuel ; l'un remplace l'autre comme avant (`data-clean-only`, `data-clean-hidden`).
- La page « Finances » elle-même (registre) et la version de l'analyse pour l'ancien style de l'application (non Premium).

## Écarts à connaître

- Le graphique de Yuri compte cinq paliers égaux sur l'axe vertical (« 10k, 8k… ») là où l'ancien graphique choisissait ses repères : mêmes valeurs, graduation différente.
- Dans la vue d'ensemble de Clean, la période précédente est une ligne pleine de teinte calme (le chart-card ne dessine pas de pointillés) ; elle était en pointillés.
- Dans le navigateur, « Facturé par nature » affiche « Les factures n'ont pas pu être lues » : ces lignes viennent de SQLite natif (comme avant le changement). Seul `npm run tauri:dev` les montre.
- Un test de la charte Clean épinglait la règle `.finance-overview` ; il dit maintenant que la vue d'ensemble n'a plus de règle Clean propre.
