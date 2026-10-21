# Vue d'ensemble : « Gestion du cabinet »

Date : 21 octobre 2026. Commit local, aucun push.

## Ce qui change

Les huit tuiles restent, avec leurs destinations. Seuls leurs compteurs changent : ils n'affichent plus que de vrais chiffres, avec leur contexte.

- **Soins & hospitalisation** : le texte fixe « Soins et séjours », qui n'était pas un compteur, est retiré. La tuile n'a plus de chiffre, comme Hospitalisations et Bilan.
- **Produits** : si le catalogue n'était pas encore chargé, la tuile affichait un « 48 références » inventé. Elle n'affiche plus rien en attendant.
- **Facturation & Devis** : « 26 700 DA sur la période », pour dire que le montant suit la période choisie en haut.
- **Rappels & Vaccins** : « 2 actions à suivre » au lieu de « 2 rappels ». Le nombre compte les tâches, vaccins et alertes de stock, comme l'indicateur « Actions à suivre ».
- **En-tête** : l'heure de mise à jour.

## Captures

- `avant/`.
- `apres/` : clair et sombre.

## Vérifications

- Typage : 0 erreur.
- ESLint : 0 problème.
- Vitest : 1 084 tests verts.
