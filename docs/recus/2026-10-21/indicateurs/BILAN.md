# Vue d'ensemble : indicateurs

Date : 21 octobre 2026. Commit local, aucun push.

## Ce qui change

- **Fraîcheur des données** : la plage affiche « Du 22 sept. au 21 oct. 2026 · Mis à jour à 10:31 ».
- **Chaque écart nomme sa base** : « +203,4 % contre 8 800 DA la période précédente », au lieu de « vs période précédente ». La phrase coule normalement, et le pourcentage ne se coupe plus.
- **Micro-histogramme** à droite de la valeur pour la trésorerie, les consultations et les patients suivis.
  - Une barre par jour jusqu'à 30 jours, par semaine sur 90 jours, par mois sur 12 mois ; aucune pour « Aujourd'hui ».
  - Les barres sont grises ; la plus récente prend la couleur de la série.
  - « Actions à suivre » n'en a pas : ces actions n'ont pas d'historique.
- **L'apparition de la flèche** au survol d'un indicateur suit la règle du socle : immédiate, puis disparition en 150 ms.

## Correction de données

Sous « Consultations », l'écart affiché était celui des **patients suivis** (+400 % sur la capture avant). Il est maintenant calculé sur les consultations elles-mêmes (+500 %, contre 1 consultation la période précédente). Les autres chiffres n'ont pas changé.

## Captures

- `avant/indicateurs-clair`.
- `apres/` : clair, sombre et période de 7 jours (une barre par jour).

Données de démonstration de l'instance de test.

## Vérifications

- Typage : 0 erreur.
- ESLint : 0 problème.
- Vitest : 142 fichiers, 1 084 tests verts, dont 2 nouveaux (`tests/dashboard/kpi-trend.test.ts`).
