# Tableau de bord : widget « Maintenant »

Date : 21 octobre 2026. Commit local, aucun push.

## Ce qui change

- **Un en-tête de widget.**
  - À gauche : « Maintenant » et « Mis à jour à 10:14 ».
  - À droite : un vrai bouton « Ouvrir Flux → ». Il remplace le lien discret qui était en bas de la carte « Salle d'attente ». Il ouvre Flux sur la visite en cours, comme avant.
- **La salle d'attente donne la position et une heure de passage estimée** (« 1 · Milo · vers 11:00 »), avec la mention « Heures estimées d'après les créneaux prévus ».
  - **Le calcul :** la consultation en cours se termine à la fin de son créneau, puis chaque patient en attente prend la durée de son propre créneau (au moins 5 minutes). On ne part jamais d'une heure déjà passée.
  - **La limite :** l'estimation suppose un seul poste de consultation à la fois.
- **Le widget reste une synthèse** : aucun bouton de statut sur les visites, qui n'avancent que dans Flux.

## Écart avec l'étude

L'étude prévoyait de partir des durées réelles du journal de Flux. Ce journal n'est accessible au tableau de bord qu'en ajoutant une lecture de données. J'ai donc utilisé les créneaux prévus, et l'écran le dit. Brancher le journal reste possible plus tard.

## Captures

- `avant/maintenant-clair` : capture du 20 octobre (lien « Ouvrir Flux » en bas de la carte).
- `avant/maintenant-sombre` : capture de ce matin, avant le changement.
- `apres/` : clair et sombre, avec Milo passé en attente dans l'instance de test (données de démonstration).

## Vérifications

- Typage : 0 erreur.
- ESLint : 0 problème.
- Vitest : 141 fichiers, 1 082 tests verts, dont 3 nouveaux pour l'estimation (`tests/dashboard/queue-estimate.test.ts`).
