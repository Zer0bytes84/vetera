# En-tête : bouton de la barre latérale, séparateur, rayons et alignements

Date : 24 octobre 2026. Commit local, aucun push.

## Ce qui change

- **Le bouton de la barre latérale** passe de la barre latérale à l'en-tête, à gauche de la recherche, suivi d'un séparateur vertical de 16 px (le filet de la charte).
  - Il sert dans les deux états de la barre. La bulle dit « Réduire la barre latérale » ou « Déployer la barre latérale », avec ⌘ B.
  - Sur téléphone, c'est le bouton « Menu ».
  - Les deux anciens boutons de la barre latérale sont retirés (celui de la barre déployée, et celui qui apparaissait au survol du logo en barre réduite).
- **Nouvelle icône** : `PanelLeft` de Hugeicons, la famille et le trait (1,5) des autres icônes de l'en-tête, en 16 px. La flèche indique où ira la barre : vers la gauche pour la réduire, vers la droite pour la déployer.
- **Courbes en harmonie** : la recherche quitte la pilule ronde et prend la géométrie des interrupteurs segmentés de Clean. Le champ fait 32 px avec des coins de 8 px, comme les contrôles, et les cartes en ont 10. Le repère ⌘K fait 28 px avec des coins de 6 px, à 2 px du bord : les deux arrondis sont concentriques.
- **Alignements** :
  - **Le tableau de bord** était la seule page décalée : ses widgets partaient à 32 px du bord de la feuille, au lieu de 24 px sur toutes les autres pages. Il est aligné sur elles. Le glyphe du bouton tombe ainsi exactement au niveau des widgets sur toutes les pages (mesuré : 272 px pour les deux, à 1440 px de large), et l'en-tête ne bouge plus d'une page à l'autre.
  - **À droite**, le disque de l'avatar finit maintenant au même niveau que le bord droit des cartes (1 408 px), y compris quand une barre de défilement classique prend 6 px.

## Ce qui ne change pas

- **Raccourcis** : ⌘ B replie et déplie toujours la barre ; ⌘K et la recherche ouvrent toujours la palette.
- **En-tête** : icônes de droite et avatar inchangés.
- **Contenu** : le contenu des pages n'est pas touché ; seul le tableau de bord gagne 8 px de largeur utile de chaque côté.
- **Charte** : variables de la charte uniquement, aucun `transition-all`.

## Captures

`avant/` et `apres/` : le haut de l'écran, barre déployée puis réduite, en clair et en sombre (instance de test isolée, 1440 × 900 rétina).

## Vérifications

- Typage : 0 erreur. ESLint : 0 problème.
- Vitest : 158 fichiers, **1 231 tests verts** (même compte).
- Non vérifié dans la fenêtre Tauri (WebKit).
