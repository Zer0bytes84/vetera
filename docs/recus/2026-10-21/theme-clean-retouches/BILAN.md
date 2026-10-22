# Clean : retouches après ton essai, en-tête en verre et interrupteurs segmentés

Date : 21 octobre 2026. Commits locaux, aucun push. Premium reste le thème par défaut. Tout le traitement vit dans `src/design-system/clean.css`, sous la portée `:root[data-skin="clean"]:not(.dark)`. Un seul fichier de composant est touché (`stock-workspace.tsx`), pour l'accessibilité ; voir plus bas.

## Les imperfections de ton essai

| Ce que tu as signalé | Cause | Correction dans Clean |
| --- | --- | --- |
| **Bande au-dessus de l'en-tête plus claire que la sidebar** (flèche jaune) | Le conteneur de la feuille porte un utilitaire Tailwind `!bg-white/40`, déclaré dans `@layer utilities`. Un `!important` en couche bat un `!important` hors couche : ma règle « fond = cadre » était ignorée. | La couleur du cadre est déclarée dans la même couche. La bande fait maintenant #EDEDEE, le gris exact de la sidebar. |
| **Barre des Rappels sur deux lignes, mal alignée** | Onglets, « Gérer les types », « Mes rappels » et la recherche ne tiennent pas sur une ligne sous 1 400 px environ. Le reste partait seul à droite. | Une requête de conteneur décide : si la barre ne tient pas, « Mes rappels » et la recherche prennent ensemble une seconde ligne pleine, alignée à gauche, et la recherche s'étire. Rien n'est tronqué, ni « En cours », ni « Mes rappels ». À 1 440 px, tout tient sur une ligne. |
| **Patients : « Réinitialiser les filtres » seul sur une seconde ligne à 1 280 px** | La recherche gardait ses 288 px. | La recherche cède la place la première (jusqu'à 120 px, jamais au-delà de ses 288 px habituels). Une seule ligne à 1 280 px, identique à 1 440 px. |
| **Champ de recherche plus haut que les filtres** (Patients, Produits, Finances, Rappels) | Les champs de page restaient à 36 px, les filtres et boutons de Clean à 32 px. | Le jeton `--field-height` passe à 32 px dans Clean. Les dialogues et formulaires gardent leurs 40 px. |
| **Produits : la rangée d'indicateurs collée au tableau** | Sur cette page, les blocs s'empilent en flux normal ; la marge que donnait `space-y-4` était annulée par la règle `margin: 0` de Premium sur les indicateurs. Patients et Finances, en flex, avaient déjà leurs 24 px. | Les indicateurs gardent 24 px sous eux dans toute mise en page en bloc. Les trois pages ont le même écart. |
| **Finances : registre sans carte** | Le registre gardait le cadre gravé de Premium, au lieu de la carte en papier des autres pages. | Le registre devient une carte en papier : fond blanc, un filet, coins de 10 px. |
| **Actions de ligne en boîtes** (Patients) | Le bouton fantôme hérité porte un fond `bg-muted/50`. | Fantôme au repos, un palier de survol (#F0F0F1). |
| **Filets de cellule dédoublés dans les tableaux** | Bordures de cellule et filet de ligne superposés. | Un seul filet par ligne, rien sous la dernière ligne ni sous la ligne courante. |

## L'en-tête en verre

L'en-tête de Clean devient translucide : un dégradé blanc de 78 à 56 %, un flou de 20 px saturé, un liseré de lumière en haut et un filet de 0,5 px en bas. Au défilement, le contenu passe dessous, flouté.

En mode « Verre liquide » des Paramètres, les six boutons d'icône se regroupent en plus dans une capsule de verre aux coins pleins.

- C'est la seule « magie » du thème, placée à l'endroit où l'on en sent l'effet : le haut de la feuille, pendant qu'on fait défiler.
- Ailleurs, tout reste opaque et calme, comme le veut Clean.
- *Étude § 1.2 : matières translucides réservées aux couches qui flottent au-dessus du contenu.*

Capture : `apres/defile.jpg` (Patients défilé de 380 px).

## Les interrupteurs segmentés

### Le traitement unique

Tous les contrôles de ce type reçoivent le même traitement :

- **Piste :** 32 px, la hauteur des boutons et des champs voisins. Elle est teintée #EDEDEE, sans bordure, avec des coins de 8 px.
- **Item :** 28 px, coins de 6 px, texte 13 px en 500 et icônes de 16 px.
- **Non sélectionné :** gris lisible #5D5D5D, sur la piste. Au survol, le texte fonce, sans fond.
- **Sélectionné :** une feuille blanche, l'encre forte #292929 et une ombre de 0,5 px.
  - La graisse ne change pas : rien ne bouge au clic.
  - Il suffit d'un palier de matière, sans couleur d'accent.

Quatre jetons portent ce traitement : `--clean-segment-track`, `--clean-segment-item`, `--clean-segment-radius` et `--clean-segment-active-shadow`. Un seul bloc de règles le pose, sans aucune variante par écran.

### Les contrôles repris

| Écran | Contrôle | Avant dans Clean |
| --- | --- | --- |
| Tableau de bord | Bascule de vue Vue d'ensemble / Journée clinique (grille et stéthoscope) | 34 px dans une boîte bordée, à côté de boutons de 36 px ; état choisi à peine visible |
| Tableau de bord | Période : Aujourd'hui, 7 jours, 30 jours, 90 jours, 12 mois | Bon dessin, ombre trop faible pour l'état choisi |
| Tableau de bord, Journée clinique | Filtres du planning (Toutes, À recevoir, En consultation, Terminées) et des actions (Tout, Tâches, Vaccins, Stock, Relances) | idem |
| Soins | Filtres (Tous, À faire, En retard, Terminés) et mode (Par patient, Par heure) | idem |
| Flux | Affichage Détaillée / Compacte | 34 px, piste ombrée, plus haute que la recherche et les boutons voisins |
| Produits | Vue tableau / Vue cartes | Capsule bordée aux coins pleins, état choisi en gris sur gris |
| Finances | Vue des finances | 36 px, liseré gravé de Premium |
| Rappels | Origine : Tous, Manuels, Médicaux | idem segmentés |
| Centre de notifications | Filtres | idem segmentés |
| Paramètres | Choix segmentés (variante et repli de la barre latérale) | Piste bordée, ombre de Premium |
| Notes | Bascule d'affichage segmentée | idem segmentés |

Captures avant et après : `cote-a-cote/tableau-de-bord.jpg` et `cote-a-cote/bascule-des-vues.jpg` (Tableau de bord dans ses deux vues, Flux, Finances, Produits).

### Deux contrôles mal conçus dans leur principe, et ce que je propose

1. **La bascule de vue du tableau de bord.**
   - **Le problème.** Ce sont deux icônes seules, placées dans la rangée des actions, et le stéthoscope y répète l'icône de « Nouvelle consultation » juste à côté. On lit une troisième action, et rien ne dit quelle vue est affichée.
   - **Ce que fait Clean.** Un filet sépare la bascule des boutons. La vue choisie affiche son nom à côté de son icône. Ce nom est le libellé qui existait déjà (`aria-label` et infobulle) : aucun texte n'est ajouté. L'icône, le nom et la vue affichée concordent toujours.
   - **Ce que je propose au-delà, à valider.** Déplacer la bascule hors de la rangée d'actions, sur la ligne de la période. Donner à la Journée clinique une icône qui ne soit pas celle d'une action, par exemple un calendrier du jour. C'est un changement de structure, donc hors de cette passe.
2. **La bascule Vue tableau / Vue cartes de Produits.**
   - **Le problème.** L'état choisi n'existait qu'en couleur, via la variante du bouton. Un lecteur d'écran ne pouvait pas savoir quelle vue était active, et le thème ne pouvait pas la cibler sans forker le composant.
   - **Ce que j'ai fait.** J'ai ajouté `aria-pressed` sur les deux boutons et une classe d'accroche (`stock-view-toggle`). Le comportement, les libellés et le rendu Premium ne changent pas : les empreintes de Produits sont identiques avant et après.

## Ce qui ne bouge pas

- **Premium clair et sombre, au pixel près.** Les empreintes de rendu ont été relevées avant et après, dans la même session et sur les mêmes données :

  | Écran | Premium clair | Premium sombre |
  | --- | --- | --- |
  | Patients | `465:a473c05` = | `464:9485aef4` = |
  | Tableau de bord | `666:8f267993` = | `665:844046b5` = |
  | Produits | `486:612b1f93` = | `485:e5f10ccd` = |
  | Finances | `342:36424e20` = | `341:ebf285ad` = |

  Clean mis en mode sombre retombe exactement sur Premium sombre.

  Les valeurs diffèrent de celles du premier bilan pour deux raisons :
  - les données de démonstration ont avancé d'un jour ;
  - le halo du pic de graphique pulse en continu, ce qui rendait l'empreinte du tableau de bord instable d'un relevé à l'autre. Il est désormais exclu du calcul.

  La comparaison ci-dessus est faite entre le dernier commit et ce travail, au même moment.
- **Structure :** mise en page, ordre, libellés, fonctions, données et menus. Le seul texte qui apparaît à l'écran (le nom de la vue du tableau de bord) est le libellé existant du bouton.
- **Mascottes, logo et identité Baitari :** intacts.

## Captures

1 440 × 900 (1 280 × 800 pour Patients et Rappels), données de démonstration. « Avant » est le Clean du dernier commit (`1171d5d`), « après » est cette passe, capturée dans la même session.
- `cote-a-cote/tableau-de-bord.jpg` : le tableau de bord entier, puis la bande d'actions et la période en gros plan.
- `cote-a-cote/bascule-des-vues.jpg` : la bascule du tableau de bord dans ses deux états, Flux, Finances et Produits.
- `cote-a-cote/imperfections.jpg` : bande au-dessus de l'en-tête, Rappels et Patients à 1 280 px, Produits, en-tête en verre au défilement.
- `avant/` et `apres/` : les écrans en pleine taille.

## Vérifications

- Vitest : tous les fichiers verts. La charte Clean gagne 6 tests :
  - les jetons des interrupteurs ;
  - le même traitement pour toutes les familles, à 32 px ;
  - l'état choisi sans changement de graisse ;
  - le nom de la vue tiré de `aria-label`, aucun texte écrit en dur dans le CSS ;
  - le flou de l'en-tête porté par un jeton ;
  - le cadre peint dans la couche utilities, et les champs à 32 px.
- Typage : 0 erreur. ESLint : 0 problème.
- Les chartes existantes (survols sous pointeur fin, pas de `transition-all`, échelle typographique) passent.
