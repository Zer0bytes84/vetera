# Basculeur Vue d'ensemble / Journée clinique

Date : 22 octobre 2026. Commit local, aucun push.

## Ce qui change

- **Emplacement :** le basculeur quitte la tête de la rangée des périodes et revient dans la bande d'actions de la carte d'accueil, juste après « Nouveau patient », à la même place dans les deux vues. Un essai en en-tête de page, au-dessus de la carte, ajoutait trop de vide : abandonné.
- **Forme (Clean) :** deux icônes seules sur la piste segmentée, items carrés de 28 px. Le libellé ajouté à la vue choisie disparaît, ainsi que le filet qui le séparait des périodes. Chaque icône garde le nom de sa vue en info-bulle et pour les lecteurs d'écran (`aria-label`, `aria-pressed`).

## Alignement mesuré (1440 × 900)

| | Nouvelle consultation | Nouveau patient | Basculeur | Bande d'actions |
| --- | --- | --- | --- | --- |
| Clean, avant | y 224,5, h 32 | y 224,5, h 32 | rangée des périodes, y 318,5 (308,5 en vue clinique), 171 px de large avec libellé | h 56,1 |
| Clean, après | y 224,5, h 32 | y 224,5, h 32 | **y 224,5, h 32**, 62 px, à 10 px de « Nouveau patient » | **h 56,1** |
| Premium, après | y 240,4, h 36 | y 240,4, h 36 | y 241,4, h 34 (même centre, 258,4) | h 60 |

« Nouvelle consultation » ne bouge pas d'un pixel et la bande garde sa hauteur. Avant, le basculeur changeait de largeur et sautait de 10 px en changeant de vue ; il est maintenant fixe.

## Ce qui ne change pas

Les deux vues restent accessibles par le basculeur, le choix est mémorisé comme avant (`dashboard.version`), aucun composant ni comportement n'est modifié : seul l'endroit où il est rendu et son style Clean changent. En Premium, le basculeur était déjà en icônes seules ; il suit le même déplacement, puisque la carte d'accueil est commune.

## Captures

- `avant-apres-clean-light-vue-ensemble.jpg`, `avant-apres-clean-dark-vue-ensemble.jpg` : avant (haut), après (bas).
- `avant-apres-clean-light-journee-clinique.jpg`, `avant-apres-clean-dark-journee-clinique.jpg` : idem en vue clinique.
- `apres-premium-*-vue-ensemble.jpg` : Premium après.

Instance de test isolée, données de démonstration.

## Vérifications

- **Vitest :** 154 fichiers, 1 189 tests verts. Le test de charte qui imposait le libellé vérifie désormais l'inverse : icônes seules, items carrés, aucun texte ajouté.
- **Typage :** 0 erreur. **ESLint :** 0 problème.
