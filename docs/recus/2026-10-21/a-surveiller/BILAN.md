# Vue d'ensemble : « À surveiller » (rappels, stock, hospitalisés)

Date : 21 octobre 2026. Commit local, aucun push.

## Ce qui change

- **Fraîcheur** : chaque carte indique « Mis à jour à 10:43 » à la suite de sa note. Ce bloc ne se coupe pas : dans les cartes étroites, il passe en entier sur la deuxième ligne, et les trois cartes restent alignées.
- **Stock lisible** :
  - le détail dit « Sous le seuil de 5 » au lieu de répéter la quantité (« 3 dose · seuil 5 ») ;
  - la quantité à droite prend le pluriel (« 3 doses », « 2 boîtes »).

  Les unités sont stockées au singulier : un « s » est ajouté au-delà de 1, sauf si l'unité se termine déjà par s ou x, ou contient une espace. La donnée de démonstration « unite », sans accent, donne « unites ».
- **La carte des rappels** n'affiche qu'une erreur en navigateur : ces données n'existent qu'avec SQLite. Le module Rappels sera traité à son étape.

## Captures

- `avant/`.
- `apres/` : clair et sombre.

## Vérifications

- Typage : 0 erreur.
- ESLint : 0 problème.
- Vitest : 1 084 tests verts, dont les attentes du stock mises à jour (`tests/modules/dashboard/dashboard-watch.test.ts`).
