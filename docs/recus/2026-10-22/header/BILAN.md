# Header de l'app, finition façon Linear

Date : 22 octobre 2026. Commit local, aucun push. Thème Clean, clair et sombre.

## Ce qui change (Clean seulement)

| | Avant | Après |
| --- | --- | --- |
| Hauteur | 60 px | **48 px** : boutons de 32 px, 8 px d'air au-dessus et au-dessous |
| Centrage | fil d'Ariane et glyphes à 30 px | à **24 px**, la moitié exacte, mesuré |
| Coins supérieurs | angle droit : l'en-tête recouvrait l'arrondi du panneau, à gauche comme à droite | **12 px**, l'arrondi du panneau, épousé par l'en-tête |
| Filet du bas | double : 1 px clair + 1 px d'ombre portée | **un seul filet de 1 px**, noir à 6 % (blanc à 6 % en sombre) |
| Icônes | 18 px dans des boutons de 32 px, 8 px d'écart | **16 px**, même trait (1,5 / 24, soit 1 px rendu), **4 px d'écart**, pas de 36 px régulier |
| Marges | texte à 32 px du bord, dernier bouton à 32 px | texte à **24 px** ; le dernier glyphe aussi à 24 px du bord (bouton à 16 px, plus ses 8 px d'air) |
| Pastille des notifications | gros rond posé à cheval | pastille de 16 px sur l'épaule de la cloche, détourée par un anneau de la couleur du panneau |
| Fil d'Ariane | gris fixes de Premium | encres de Clean : « Cabinet » et « / » en gris discret, page en encre forte, graisse 500 |

Pourquoi les coins : WebKit (la vue de Tauri) ne découpe pas un calque à `backdrop-filter` selon l'arrondi de son conteneur de défilement ; l'en-tête porte donc lui-même l'arrondi du panneau.

La hauteur : la référence décrite à « environ 56 px » est mesurée sur une capture agrandie. Ramenée à la même échelle que la nôtre (notre en-tête de 60 px y fait 78 px), celle de Linear fait environ 44 px. 48 px garde nos boutons de 32 px avec un air égal en haut et en bas.

`--header-height` passe à 48 px dans le panneau de contenu seulement, pour que les éléments collants qui s'y réfèrent restent sous l'en-tête. La barre latérale garde son en-tête.

## Ce qui ne change pas

- **Contenu et ordre :** « Cabinet / Tableau de bord » à gauche ; thème, recherche, messages, notifications, réglages à droite. Mêmes boutons, mêmes libellés, mêmes raccourcis, aucun composant modifié : seul `src/design-system/clean.css` change.
- **Premium :** toutes les règles nouvelles sont portées par `:root[data-skin="clean"]`. Empreinte des styles calculés (643 éléments, 18 propriétés + taille de chaque élément) du tableau de bord, identique avant et après :
  - Premium clair : `abdaf4e1` → `abdaf4e1`
  - Premium sombre : `135ee150` → `135ee150`
  - Clean clair : `9df8c69b` → `1768c1e5`, Clean sombre : `c93fa0d3` → `137b711b` (attendu).

## Captures

- `linear-vs-baitari-apres.jpg` : l'en-tête de Linear, puis le nôtre après, en clair et en sombre, à la même largeur.
- `avant-apres-clean-light.jpg`, `avant-apres-clean-dark.jpg` : l'en-tête avant (haut) et après (bas).
- `coin-superieur-gauche-avant-apres.jpg` : le coin gauche agrandi, avant (gauche) et après (droite), clair puis sombre.
- `avant-clean-*-page.jpg`, `apres-clean-*-page.jpg` : la page entière.
- `avant-tauri-clean-clair.jpg` (capture de l'utilisateur), `apres-tauri-clean-clair.jpg` : la vraie fenêtre Tauri, capturée par `screencapture -l` sans clic.
- `reference-linear.jpg` : la référence fournie.

Captures navigateur : instance de test isolée, données de démonstration, 1440 × 900 en rétina.

## Vérifications

- **Vitest :** 154 fichiers, 1 189 tests verts (deux règles de charte rattrapées en route : le gris « désactivé » n'est plus utilisé pour le séparateur, la pastille passe en 12 px, taille de l'échelle).
- **Typage :** 0 erreur. **ESLint :** 0 problème.
