# Palette de recherche (⌘K) allégée

Date : 24 octobre 2026. Commit local, aucun push. Retour d'Aïssa : la fenêtre de recherche était trop chargée. Référence choisie ensuite : la recherche de la documentation Tailwind (champ simple, titres nets, lignes pleine largeur séparées par des filets).

La pilule de l'en-tête n'est pas touchée.

## Ce qui change

Le contenu change dans tous les thèmes ; la mise en forme, en Clean seulement (`src/design-system/clean.css`, portée `.command-palette`).

- **Champ** :
  - un simple champ posé sur la feuille, sans cadre dans le cadre ni anneau gris ;
  - loupe de 16 px, texte de 16 px ;
  - texte indicatif raccourci en « Rechercher un patient, une page… » ;
  - « esc » à droite dans un liseré discret, comme la référence.
- **Filtres** (Tout, Dossiers, Commandes) : trois mots, le choisi sur un léger fond, sans la piste grise.
- **Groupes** : titres en 14 px semi-gras dans l'encre forte (plus de capitales espacées), un filet léger dessous.
- **Lignes** :
  - pleine largeur, carrées, séparées par un filet léger ;
  - l'icône seule en 16 px, sans tuile ;
  - la ligne courante prend un fond léger ;
  - les repères (« Ouvrir ↵ », « Naviguer ↵ », raccourcis) n'apparaissent que sur la ligne courante.
- **Alignement** : tout part du même bord de 24 px (loupe, texte des filtres, titres, icônes, repères, pied), et « esc » finit sur le même bord à droite.
- **Fenêtre** : coins de 12 px, ombre flottante de Clean, plus de vides en haut et en bas, plus de barre de défilement visible.
- **Pied** : les touches seules (↑ ↓ Naviguer, ↵ Sélectionner, esc Fermer) ; la signature « Baitari ⌘K » est retirée.

## Ce qui ne change pas

- **Ouverture et fermeture** : ⌘K et la pilule ouvrent la palette, Échap la ferme.
- **Contenu** : mêmes résultats, mêmes filtres, mêmes actions et mêmes raccourcis.
- **Recherche** : même classement, recherche sémantique incluse.
- **Clavier** : ↑ ↓ et Entrée inchangés.
- **Charte** : variables de la charte uniquement, échelle typographique respectée, aucun `transition-all`.

## Captures

Instance de test isolée, 1440 × 900 rétina, en clair et en sombre :
- `avant/palette-*` : la palette à l'ouverture ;
- `avant/palette-recherche-*` : avec « ri » tapé et la deuxième ligne courante ;
- `apres/` : les mêmes vues après.

## Vérifications

- Typage : 0 erreur. ESLint : 0 problème.
- Vitest : 158 fichiers, **1 231 tests verts** (même compte qu'avant).
- Non vérifié dans la fenêtre Tauri (WebKit).
