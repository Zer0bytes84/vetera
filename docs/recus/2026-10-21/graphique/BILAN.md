# Vue d'ensemble : graphique « Recettes & activité »

Date : 21 octobre 2026. Commit local, aucun push.

## Ce qui change

- **En-tête aligné sur les autres cartes.**
  - À gauche : le titre, puis une note qui dit exactement ce qui est tracé (« Encaissements en DA et consultations, par jour ») et l'heure de mise à jour.
  - À droite : le lien « Finances → », qui était perdu dans la ligne de légende.
- **Échelle des consultations rendue lisible.** La courbe des consultations a toujours eu sa propre échelle, sans axe pour le dire : elle semblait monter à 20 000. Un axe de droite, dans la couleur de la série, porte maintenant ses graduations (0 à 4 sur la période), et la légende précise « échelle de droite ». Les deux échelles ont cinq graduations alignées, donc aucune ligne n'est ajoutée.
- **Le jour survolé est nommé sur l'axe** (« 7 oct. » en gras), sous le réticule. L'info-bulle et la colonne survolée sont inchangées.

## Captures

- `avant/graphique-clair`.
- `apres/` : clair, survol, sombre.

## Vérifications

- Typage : 0 erreur.
- ESLint : 0 problème.
- Vitest : 1 084 tests verts, chartes du tableau de bord et des tailles de texte comprises.
