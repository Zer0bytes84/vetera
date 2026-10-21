# Retours sur la passe du tableau de bord

Date : 21 octobre 2026. Commit local, aucun push.

## Ce qui change

- **« Maintenant » aligné.** L'en-tête prend le même retrait (24 px) que le texte des cartes en dessous.
  - Le titre commence exactement au niveau de « Consultation en cours ».
  - Le bouton « Ouvrir Flux » finit au bord droit de la salle d'attente.
  - Mesuré dans la page : 304 px de chaque côté, 1384 px à droite.
- **Écart dégénéré.** Quand un indicateur vaut 0 sur les deux périodes, il n'affiche plus « 0 % contre 0 la période précédente » mais « Rien à comparer : 0 sur les deux périodes ».
- **Portée de « Cette semaine ».**
  - Les consultations de la semaine comptent maintenant toutes les visites de lundi jusqu'à la fin d'aujourd'hui : terminées, en cours et prévues. C'est la même règle que l'indicateur « Consultations » sur 30 jours.
  - « Semaine dernière » compte la même plage décalée de 7 jours.
  - Sous l'indicateur « Consultations », le détail dit ce qu'il compte : « 4 terminées · 2 en cours », et « · N prévues » s'il y en a.
- **Une seule mention de fraîcheur par vue.** Les widgets de la vue d'ensemble se rafraîchissent ensemble.
  - « Mis à jour à » ne reste qu'au bout de la barre de période.
  - Il quitte le graphique, « Cette semaine », « Gestion du cabinet » et les cartes « À surveiller ».
  - Dans la journée clinique, il reste dans l'en-tête de « Maintenant ».

## Captures

Données de démonstration de l'instance de test, thème clair, 1440 × 900.
- `avant/` : les captures « après » de la passe précédente (Maintenant, indicateurs, Cette semaine).
- `apres/maintenant-clair` : en-tête aligné.
- `apres/vue-ensemble-clair` :
  - fraîcheur seulement dans la barre de période ;
  - détail « terminées · en cours » ;
  - semaine à 4 consultations, dont les visites en cours d'aujourd'hui.

La formulation neutre n'apparaît pas sur ces captures : aucun indicateur de la démonstration ne vaut 0 sur les deux périodes. Elle est vérifiée par lecture du code, pas à l'écran.

## Vérifications

- Typage : 0 erreur.
- ESLint : 0 problème.
- Vitest : 142 fichiers, 1 085 tests verts. Un nouveau test vérifie le décompte terminées / en cours / prévues (`tests/dashboard/kpi-trend.test.ts`).
