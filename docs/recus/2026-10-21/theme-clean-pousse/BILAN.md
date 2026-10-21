# Clean poussé

Date : 21 octobre 2026. Commits locaux, aucun push. Premium reste le thème par défaut.

## Le constat de départ

Le Clean livré changeait des valeurs, pas la silhouette :
- un seul fond partout ;
- des cartes encadrées comme les panneaux gravés de Premium ;
- des boutons d'en-tête en boîtes ;
- une sidebar collée au contenu par un filet.

À l'œil, c'était un Premium éclairci. Ce qui rend Linear reconnaissable, ce ne sont pas ses gris, mais sa construction en profondeur : la navigation repose sur un cadre, et le travail se fait sur une feuille posée dessus. Le Clean poussé part de là.

## Les choix forts

Chaque choix : le raisonnement, puis la référence de l'étude (`docs/etudes/2026-10-21-linear-et-references.md`).

1. **Une feuille posée sur un cadre.** La sidebar et le pourtour reposent sur un cadre #EDEDEE. Tout le contenu vit sur une seule feuille #FAFAFA, décollée de 8 px du bord, aux coins de 12 px, bordée d'un filet de 0,5 px et d'une ombre de 4 %.
   - La profondeur dit tout de suite où l'on travaille et où l'on navigue, sans aucune bordure lourde.
   - *Étude § 1.1, géométrie : « feuille principale posée à 8 px du bord de la fenêtre, coins de 12 px, filet de 0,5 px » ; « en clair, l'ombre est presque invisible : 2 % et 4 % » ; cadre de luminance 94,4, feuille de 97,9.*
2. **Une sidebar silencieuse, posée sur le cadre.**
   - Ce qui part : le séparateur gravé et la boîte du compte.
   - Les items font 28 px, en 13 px et en #5D5D5D. L'item sélectionné est un palier de gris (#DFDFE2) au lieu d'une carte blanche ombrée. Le survol est un palier plus clair.
   - La navigation recule pour laisser la feuille au premier plan.
   - *Étude § 1.1 : « éléments de navigation 28 px, coins de 8 px » ; § 4, Clean : « navigation latérale 28 px ».*
3. **Une barre d'en-tête fondue dans la feuille.** Elle n'a plus de flou ni de transparence. Les six boutons d'icône deviennent fantômes : 32 px, sans bordure ni fond, avec un palier de survol #F0F0F1.
   - Des boîtes autour des icônes faisaient de l'en-tête une barre d'outils. Sans elles, la feuille commence vraiment en haut.
   - *Étude § 1.1 : « contrôles : coins de 8 px » ; § 1.2, point 2 : le survol révèle, il ne dessine pas.*
4. **Des cartes en papier.**
   - Ce qui change : fond blanc, un seul filet #E6E6E8, coins de 10 px, en-têtes de carte séparés par un filet plus léger (#EFEFF0).
   - Ce qui part : les croisillons, les filets doubles et les bandeaux à motif.
   - Concerne les widgets du tableau de bord, la grille d'indicateurs, l'en-tête d'accueil, les cadres de tableaux et la tuile d'icône de page.
   - Sur la feuille #FAFAFA, le blanc suffit à séparer. Le filet unique remplace le dessin gravé, qui était la signature de Premium.
   - *Étude § 4, Clean : « un seul filet #EBEBEB », « ombres : aucune au repos ».*
5. **Inter, avec son axe de taille optique.**
   - La police est Inter, la police de Linear, chargée sous un nom propre (« Inter Clean »).
   - Les titres de 24 px prennent ainsi d'eux-mêmes la coupe Display, plus serrée et plus fine, et le texte de 12 et 13 px garde la coupe de lecture.
   - Hiérarchie de Linear : 600 pour les titres, 500 pour les libellés et la navigation, 450 pour les métadonnées. Interlettrage de -0,022 em sur les titres de page et l'accueil, -0,015 em sur les titres de section, -0,006 em sur le texte.
   - Chiffres tabulaires pour les montants et les tableaux.
   - *Étude § 1.1, typographie : « Inter Variable partout », « titres de ligne 13 px en 500 », « identifiants et dates 12 et 13 px en 450 », « titre de ticket 24 px en 600 ».*
6. **Une densité à 32 px.**
   - Boutons, champs, contrôles segmentés et en-têtes de tableau passent de 36 à 32 px. Les lignes de tableau font 32 px, et les listes denses 40 px.
   - Les pastilles d'état perdent leur bordure : teintées, rayon plein.
   - Le tableau de bord tient davantage à l'écran sans paraître tassé, parce que la feuille respire autour.
   - *Étude § 4, densité : « ligne de liste 40 px », « texte de ligne 13 px en 500 » ; § 1.1 : « pastilles, rayon plein ».*
7. **Les commandes de widget, révélées au survol de la carte.** C'est le mécanisme de Clean, conservé : « Finances → », « Agenda → » et « Voir tout → » apparaissent quand on survole la carte, ou quand le focus y entre. Ils restent affichés au tactile.
   - *Étude § 3, point 8 ; § 1.2, point 3 : révélation au survol.*
8. **Le quatrième gris, #A6A6A6,** reste réservé au texte et aux icônes désactivés.
   - *Étude § 4 : « un quatrième niveau #A6A6A6 réservé au désactivé ».*

## Les polices : mon avis

**Ce que je recommande : Inter partout, avec l'axe optique.** C'est la décision la plus forte pour un thème qui vise Linear.

- **L'unité.** Une seule voix pour l'interface, le corps et les titres. Linear n'a qu'une famille, et sa clarté en vient en partie.
- **L'axe optique fait le travail de deux polices.** La coupe Display donne aux grands titres la tension que Space Grotesk apportait, sans changer de dessin entre un titre et sa note.
- **La signature Baitari ne vit pas dans les titres.** Elle tient au logo, aux mascottes et à la couleur, qui restent intacts.

**La déclinaison mixte (Inter, avec Space Grotesk pour les titres) reste à une valeur près** : `--clean-font-heading` dans `clean.css`. Elle a été capturée à l'étape précédente (`../theme-clean/polices/`). À l'œil, Space Grotesk y devient un accent de marque plus qu'un titre de travail. Je la garde comme option, pas comme recommandation.

**Geist et Space Grotesk restent la règle de Premium**, qui ne bouge pas.

## Écarts avec ton cadrage initial, assumés

- **Sidebar à 28 px au lieu de 30 px.** C'est la mesure de Linear, et la valeur basse de ta fourchette (28 à 32 px). Avec la feuille au premier plan, 30 px paraissait encore lourd.
- **Feuille #FAFAFA posée sur un cadre #EDEDEE**, et non une feuille #FAFAFA partout. Ton cadrage disait « la feuille passe à #FAFAFA » : c'est le cas, mais pour la feuille seulement. Le cadre plus sombre crée la profondeur. Sans lui, Clean restait plat comme Premium.
- **Cartes blanches.** L'étude proposait des sections sans boîte. Dans Baitari, les widgets sont des unités indépendantes, côte à côte : sans boîte, ils se fondaient. La carte en papier sur la feuille garde la lisibilité, avec un seul filet et aucune ombre.
- **Contrôles et boutons à 32 px** au lieu de 36 px. Ton cadrage ne fixait que les lignes. L'étude montre que la densité de Linear tient aussi à la taille des contrôles.
- **Police : Inter Clean à axe optique** plutôt que l'Inter installé. C'est le même dessin, avec l'axe de taille optique en plus. Le nom propre évite de modifier l'option Inter de l'apparence Classique.
- **Pastilles sans bordure.** Ce traitement n'était pas dans le cadrage. Il vient de la mesure de Linear.

## Ce qui ne bouge pas

- **Structure :** mise en page, ordre des éléments, libellés, fonctions, comportements, données et commandes. Aucun menu n'a été inventé.
- **Identité :** mascottes, logo et couleurs d'état.
- **Premium clair et sombre,** au pixel près. L'empreinte de rendu (styles calculés et dimensions de chaque élément) est identique à celle relevée avant tout travail sur Clean :
  - Premium clair : Patients `465:6f8890fa`, tableau de bord `670:4b2a9820` ;
  - Premium sombre : Patients `464:155e0011`, tableau de bord `669:3465a8e0`.

  Clean mis en mode sombre retombe exactement sur Premium sombre.
- **Aucun composant forké :** tout est dans `src/design-system/clean.css`, sous la seule portée `:root[data-skin="clean"]:not(.dark)`. La charte le vérifie sélecteur par sélecteur.
- **Le défaut reste Premium.** Passer Clean par défaut se fait en changeant `DEFAULT_SKIN` dans `src/lib/theme-skin.ts`.

## Mesures dans la page (Clean poussé, liste Patients)

- Feuille posée à 8 px du haut, coins de 12 px, sur un cadre #EDEDEE.
- Navigation : items de 28 px, icônes de 16 px. Compte sans fond.
- Boutons d'en-tête : 32 px, fond transparent.
- Boutons et en-têtes de tableau : 32 px.
- Titre de page : Inter Clean en 600, interlettrage de -0,528 px.

## Captures

1440 × 900, données de démonstration.
- `cote-a-cote/` : Premium clair, Clean actuel (Inter, `4b12703`) et Clean poussé, sur les mêmes écrans :
  - `tableau-de-bord`, `patients`, `dossier` ;
  - `sidebar` : gros plan de la sidebar ;
  - `widget-survol` : la carte « Recettes & activité » survolée.
- `clean-pousse/` : les écrans en pleine taille, et le widget au repos puis survolé.

## Vérifications

- Vitest : 150 fichiers, 1 135 tests verts. La charte Clean compte 17 tests :
  - cadre, feuille, filet, survol et quatre gris ;
  - hauteurs (listes, tableaux, contrôles, navigation) ;
  - décollement, rayon et ombre de la feuille ;
  - navigation posée sur le cadre, sans séparateur ;
  - Inter à axe optique sous un nom propre ;
  - polices par thème ;
  - interlettrage et chiffres tabulaires ;
  - trait et taille des icônes ;
  - gris désactivé ;
  - commandes de widget au survol ;
  - pureté de la portée ;
  - aucun composant forké ;
  - défaut et sélecteur.
- Typage : 0 erreur.
- Les chartes existantes (survols sous pointeur fin, pas de `transition-all`, échelle typographique 12/13/14/16/18/24) passent.
