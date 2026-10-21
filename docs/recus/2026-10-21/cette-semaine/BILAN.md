# Vue d'ensemble : « Cette semaine »

Date : 21 octobre 2026. Commit local, aucun push.

## Ce qui change

- **En-tête** : la période réelle (« Depuis lundi 19 oct. ») et l'heure de mise à jour, à la place de « Indicateurs consolidés et file d'attente ».
- **Recettes et consultations** : chaque chiffre a une ligne « Semaine dernière : … », calculée sur la même durée (de lundi au même jour et à la même heure la semaine précédente). Les deux chiffres sont donc comparables.
- **Taux de règlement et reste à recouvrer** : leurs calculs ne changent pas. Ils ne portent pas sur la semaine, et l'écran le dit désormais :
  - le taux, « Sur toutes les factures émises » ;
  - le reste, « Toutes périodes confondues ».
- **Flèches vers Flux** : l'info-bulle stylée remplace le `title` natif.
- **Graphique voisin** : son plafond de hauteur passe de 360 à 460 px, pour qu'il remplisse toujours sa carte maintenant que « Cette semaine » est plus haute.

## Captures

- `avant/` : la carte avant, en haut de page.
- `apres/` : clair et sombre.

## Vérifications

- Typage : 0 erreur.
- ESLint : 0 problème.
- Vitest : 1 084 tests verts.
