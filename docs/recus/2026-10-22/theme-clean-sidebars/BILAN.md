# Clean : la sidebar en sombre, le contenu en clair

Date : 22 octobre 2026. Commit local, aucun push. Premium reste le thème par défaut et n'a pas bougé d'un pixel (empreintes plus bas).

## Ce qui change

En Clean clair, la sidebar prend le thème sombre ; tout le reste de l'interface reste en Clean clair, header Liquid Glass compris. C'est l'effet de ta référence : une navigation sombre à côté d'un contenu clair. La structure ne change pas : mêmes items, mêmes libellés, même ordre, mêmes états déplié et replié. Je n'ai importé ni le bloc profil ni le champ de recherche de la référence. Je n'ai pas ouvert le lien X, qui demande une connexion : ta description suffisait.

## Comment

**Aucune palette propre à la sidebar.** Dans `src/design-system/clean.css`, le bloc des jetons de Clean sombre porte deux sélecteurs : la racine en mode sombre, et la sidebar.

```css
:root[data-skin="clean"].dark,
:root[data-skin="clean"] :is([data-slot="sidebar"], [data-sidebar="sidebar"][data-mobile="true"]) { … }
```

La sidebar reçoit donc les mêmes valeurs, au même endroit. Le bloc qui fait pointer les jetons de Premium vers ceux de Clean (`--ink`, `--sidebar-*`, etc.) s'applique aussi à la sidebar. Toutes les règles Clean de la sidebar prennent alors d'elles-mêmes les valeurs sombres :
- fond, textes et icônes ;
- survol, état actif et séparateurs ;
- focus clavier et bloc du bas.

Le sélecteur couvre aussi la sidebar mobile, ouverte en panneau. La sidebar déclare enfin `color-scheme: dark` pour ses barres de défilement et ses contrôles natifs.

**Ce qu'il a fallu ajouter pour que la sidebar soit identique dans les deux déclinaisons :**
- **Les jetons de navigation de Premium** (`--nav-ink`, `--nav-text`, `--nav-muted`, `--nav-hover`, etc.) pointent désormais vers les jetons Clean. Sans cela, en clair, l'item actif, l'item survolé et le nom du compte restaient en encre sombre sur fond sombre.
- **L'accent et l'anneau de focus deviennent des jetons Clean,** avec les valeurs de chaque mode, inchangées : #191919 en clair, #3B1FE5 et anneau blanc en sombre. La sidebar porte ceux du sombre.
- **Les teintes des pastilles des Accès rapides** sont celles de Premium sombre, dans la sidebar comme en Clean sombre.
- **L'avatar du compte** tient son aspect sombre de classes Tailwind `dark:`, inactives sans la classe `.dark` sur la racine. Dans la sidebar, cet aspect sombre est posé directement.

**Le cadre autour de la feuille suit la sidebar.** La bande au-dessus de l'en-tête et le bord droit de 8 px prolongent la sidebar. Hier, tu as demandé que cette bande ait la couleur de la sidebar : elle prend donc le gris du cadre sombre, et la feuille de contenu reste claire. Un jeton `--clean-chrome` porte ce gris. En clair, il vaut la valeur du cadre sombre (#0C0D0F), et la charte vérifie l'égalité ; en sombre, il renvoie au cadre.

## Preuves

**La sidebar est identique dans les deux déclinaisons.** L'empreinte a été calculée sur le seul sous-arbre de la sidebar : styles calculés et dimensions de chaque élément, couleur des contours comprise.

| État | Clean clair | Clean sombre |
| --- | --- | --- |
| Déplié | 214 éléments | 214 éléments, aucun écart |
| Replié | 181 éléments | 181 éléments, aucun écart |

**Premium au pixel près.** Les empreintes ont été relevées avec le `clean.css` du dernier commit, puis avec celui-ci :

| Écran | Premium clair | Premium sombre |
| --- | --- | --- |
| Tableau de bord | `639:324faaca` = | `638:5cb576da` = |
| Patients | `465:a473c05` = | `464:9485aef4` = |
| Agenda | `609:9981aa91` = | `608:264ae361` = |
| Produits | `486:612b1f93` = | `485:e5f10ccd` = |

**Clean sombre.**
- Hors sidebar, il est identique sur les quatre écrans : `424:6febf01f`, `250:95fe8e89`, `394:9a2bde71`, `271:9a8a6bf`.
- Dans sa sidebar, les gris de navigation suivaient jusqu'ici ceux de Premium sombre (#C7C7C7, #6B6B6B…). Ils suivent désormais ceux de Clean sombre (#CBCCCD, #959698…). C'est l'écart voulu : sans lui, la sidebar ne pourrait pas être la même dans les deux déclinaisons.

**Lisibilité.** Un audit des textes de la sidebar en Clean clair, au repos et au survol, ne trouve aucun texte sombre.

## Ce qui ne bouge pas

- **Comportements, libellés et données :** aucun changement, aucun fichier de composant touché. Seuls `clean.css` et la charte changent.
- **Mascottes, logo et identité Baitari :** intacts.
- **Header Liquid Glass et contenu :** en Clean clair.

## Captures

1 440 × 900, données de démonstration.
- `cote-a-cote/` :
  - `tableau-de-bord`, `patients` et `agenda` : Premium clair, Clean clair actuel (dernier commit), Clean clair avec sidebar sombre, et Clean sombre ;
  - `sidebar` : gros plan de la sidebar dans les quatre états ;
  - `etats` : la sidebar sombre en Clean clair, au survol, au focus clavier et repliée.
- `ecrans/` : chaque écran en pleine taille, rangé par état.

## Vérifications

- **Vitest :** 150 fichiers, 1 152 tests verts. La charte Clean compte 34 tests ; les quatre nouveaux vérifient :
  - que la sidebar reçoit exactement le bloc de jetons de Clean sombre, sans aucun jeton propre ;
  - que les jetons de Premium et de navigation pointent vers Clean, dans la sidebar aussi ;
  - l'accent, l'anneau de focus, les teintes des pastilles et `color-scheme: dark` du sombre ;
  - que le cadre autour de la feuille a le gris du cadre sombre.
- **Typage :** 0 erreur. **ESLint :** 0 problème.
