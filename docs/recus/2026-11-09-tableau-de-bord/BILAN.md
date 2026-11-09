# Tableau de bord : ménage de l'en-tête (9 novembre 2026)

Vérifié dans le navigateur, quatre thèmes (Clean/Premium × clair/sombre). `avant/` et `apres/`.

1. **Bienvenue dans la barre du haut**, à la place du fil d'Ariane et sur cette page seulement : « Bonjour Zouhir 👋 » (prénom en bleu, forme courte). La rangée de bienvenue de la page est supprimée avec « Nouvelle consultation », « Nouveau patient » (dans le menu +) et les icônes de vue.
2. **Périodes dans la bande Chiffres clés** : première rangée intérieure, sous l'en-tête et au-dessus des cartes. Pastilles et deux champs de dates à gauche, « Du … · Mis à jour à … » à droite. Mécanique : prop `lead` de `StatGrid`.
3. **Indicateurs / Mini-graphiques** : deux icônes (grille, courbe) à droite de l'en-tête de la bande, avec infobulle au survol (`apres/infobulle-mini-graphiques.png`).

Non touchés : les widgets, leurs données, le graphique Recettes & activité.

## À savoir
- Les « icônes de vue » retirées étaient le commutateur entre le tableau de bord actuel et la vue « clinique » (`DashboardModeToggle`). Il n'existe plus d'accès à cette bascule ; seul le chemin « Personnaliser » (session) force encore la vue clinique. Le composant reste dans le code.
- Le prénom vient du nom du compte de test (« Dr Test » → Test) ; avec votre compte il affichera Zouhir.

## Ajustements (même jour)
- **Date retirée** de la rangée, puis « Mis à jour à » aussi : plus rien à droite des dates.
- **Densité** : les périodes ne forment plus une rangée en plus ; elles sont sur la **même ligne que l'en-tête de la bande** (titre à gauche ; pastilles, dates et icônes à droite). La bande retrouve sa hauteur naturelle. Pastilles et champs de dates à 28 px.
- **Icônes** : Indicateurs = jauge (la grille doublait l'icône « Vue d'ensemble »), Mini-graphiques = courbe.
- **Vue clinique rétablie** : le commutateur Vue d'ensemble / Journée clinique est de retour, à droite de la bande ; dans la vue clinique il est à côté de « Ouvrir Flux », dans l’en-tête « Maintenant », pour revenir au tableau de bord (`apres/vue-clinique-retour.png`).
