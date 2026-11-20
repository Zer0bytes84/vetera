# Agenda : le séparateur entre la colonne des heures et la grille retiré, 19 novembre 2026

**Où :** branche `integration/release-2026-11-19`, commit local. Rien n'est poussé ni publié.

**La demande :** retirer le trait vertical entre la colonne des heures et la grille du jour, bande d'en-tête comprise, et le même dans Semaine et Mois. Rien d'autre ne change.

## Ce qui change

- **Le trait venait d'un seul composant**, `src/modules/agenda/components/agenda-calendar.tsx`, commun aux vues Jour et Semaine :
  - la case vide de la bande d'en-tête ;
  - la colonne des heures.
- **Les deux bordures sont devenues transparentes.** Leur pixel est gardé : la colonne des heures garde sa largeur, et les heures leur place. Sans bordure, chaque heure aurait glissé d'1 px.
- **Mois n'a pas de colonne des heures,** donc pas ce trait.
- **Pas touchés :**
  - les traits entre les jours de la Semaine, qui sont un autre élément, que tu n'as pas demandé ;
  - le cadre de la grille ;
  - les lignes des heures, la ligne de l'heure courante et les fonds.

## La preuve que rien d'autre ne bouge

Mesure dans l'app assemblée, Agenda en vues Jour, Semaine et Mois, en clair et en sombre (`traits.mjs`). L'outil relève chaque élément qui dessine un trait vertical (bordure, ombre interne, barre fine, pseudo-élément), et compare les captures pixel par pixel :

| Vue | Traits disparus | Traits apparus | Pixels changés |
|---|---|---|---|
| Jour, clair et sombre | les 2 de la colonne des heures | 0 | une colonne de 1 px (x = 344 à 345), du haut de la grille au bas de l'écran |
| Semaine, clair et sombre | les mêmes 2 | 0 | la même colonne, rien d'autre |
| Mois, clair et sombre | 0 | 0 | **aucun** |

Aucune erreur console.

**Captures :**
- `jour-light-avant-apres.png` et `jour-dark-avant-apres.png` : le coin de la grille, bande d'en-tête comprise ;
- `jour-*-avant.jpg` et `jour-*-apres.jpg` : la page entière.

**Contrôles :**
- tests de l'Agenda : 64 / 64 ;
- typecheck 0, lint 0 ;
- suite entière : **2 225 / 2 225**.

## Ce qui n'est pas prouvé

- Pas vu dans l'app de bureau (WebKit). Une bordure transparente s'y rend de la même façon.
