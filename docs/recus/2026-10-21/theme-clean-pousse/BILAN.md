# Clean poussé

Date : 21 octobre 2026. Commits locaux, aucun push. Premium clair et Premium sombre restent les thèmes par défaut et n'ont pas bougé d'un pixel (empreintes plus bas). Passer Clean par défaut se fait en changeant une valeur : `DEFAULT_SKIN` dans `src/lib/theme-skin.ts`.

Deux livraisons :
1. **Première passe (`5be4470`).** Feuille posée sur un cadre, sidebar silencieuse, cartes en papier, Inter.
2. **Cette passe.** Elle ajoute :
   - Clean sombre et le sélecteur à quatre thèmes ;
   - l'en-tête en verre ;
   - les interrupteurs segmentés ;
   - le positionnement et les substitutions d'icônes ;
   - l'Agenda et les tableaux, inspirés de Tailwind Plus ;
   - le titre d'accueil et les pastilles des Accès rapides.

   Les retouches demandées après ton essai sont détaillées dans `../theme-clean-retouches/BILAN.md`.

## Le constat de départ

Le premier Clean changeait des valeurs, pas la silhouette :
- un seul fond partout ;
- des cartes encadrées comme les panneaux gravés de Premium ;
- des boutons d'en-tête en boîtes ;
- une sidebar collée au contenu.

C'était un Premium éclairci. Ce qui rend Linear reconnaissable, c'est sa construction en profondeur : la navigation repose sur un cadre, et le travail se fait sur une feuille posée dessus. Clean poussé part de là.

## Les choix forts

Pour chaque choix : le raisonnement en deux lignes, puis la référence qui l'appuie. Sauf mention contraire, l'étude citée est `docs/etudes/2026-10-21-linear-et-references.md` ; Catalyst et les modules Tailwind Plus viennent du dossier `Tailwindcss plus premium pack`.

1. **Une feuille posée sur un cadre.** Le contenu vit sur une feuille #FAFAFA, décollée de 8 px, aux coins de 12 px et au filet de 0,5 px, posée sur un cadre #EDEDEE qui porte la navigation.
   - La profondeur dit où l'on travaille et où l'on navigue, sans aucune bordure lourde.
   - *Étude § 1.1 (feuille à 8 px, coins de 12 px, ombre de 2 à 4 %). Catalyst `sidebar-layout` : la même construction, une feuille blanche sur un cadre zinc-100, posée à 8 px.*
2. **Une sidebar silencieuse.** Items de 28 px en 13 px #5D5D5D, la sélection marquée par un palier de gris, aucun séparateur, le compte sans boîte.
   - La navigation recule pour laisser la feuille au premier plan.
   - *Étude § 1.1 (items de 28 px) ; Catalyst `sidebar` (sélection par fond à 5 %, sans carte).*
3. **Un en-tête en verre liquide, ta signature.** Dégradé translucide, flou de 20 px saturé, liseré de lumière en haut et filet de 0,5 px en bas. En mode Liquid Glass, les outils se regroupent dans une capsule de verre.
   - C'est la seule matière translucide du thème, placée là où elle se voit : le contenu passe dessous au défilement.
   - *Étude § 1.2 (matières translucides réservées aux couches qui flottent) ; Tailwind Plus `tables/with_sticky_header` (en-tête blanc à 75 % flouté).*
4. **Des cartes en papier.** Fond blanc, un seul filet #E6E6E8, coins de 10 px. Ni croisillons, ni filets doubles, ni bandeaux à motif.
   - Sur la feuille #FAFAFA, le blanc suffit à séparer.
   - *Étude § 4 (un seul filet, aucune ombre au repos).*
5. **Inter, avec son axe de taille optique.** Graisses de Linear (600, 500 et 450), interlettrage resserré sur les titres, chiffres tabulaires.
   - Une seule voix ; la coupe Display donne aux grands titres la tension que Space Grotesk apportait.
   - *Étude § 1.1 (Inter Variable partout).*
6. **Une densité à 32 px.** Boutons, champs, interrupteurs et en-têtes de tableau font 32 px ; les lignes de tableau 32 px, les listes denses 40 px.
   - Plus de contenu à l'écran, sans tassement, parce que la feuille respire autour.
   - *Étude § 4 (ligne de liste de 40 px).*
7. **Clean sombre, à la Linear.** Noirs teintés tirés des luminances mesurées sur Linear, sans noir pur ni ombre :

   | Rôle | Couleur |
   | --- | --- |
   | Cadre | #0C0D0F |
   | Feuille | #111214 |
   | Cartes | #171719 |
   | Filet | #232426 |
   | Texte | #F3F3F5, #CBCCCD, #959698 |

   - La profondeur passe par les paliers de lumière et les filets fins. Les jetons ont les mêmes noms qu'en clair, et un seul jeu de règles sert les deux modes.
   - *Étude § 1.1 (sombre : cadre 3,5, feuille 5,5, survol 9,3 de luminance, teinte 272) ; Catalyst (cadre zinc-950, feuille zinc-900, filets blanc à 10 %).*
8. **Un seul traitement d'interrupteur segmenté.** Piste de 32 px teintée, la vue choisie en feuille blanche et en encre forte, sans changement de graisse.
   - Sélection nette sans crier, et alignée sur les boutons voisins. La vue choisie du tableau de bord affiche son nom (son libellé existant).
   - *Tailwind Plus `tabs/tabs_in_pills_on_gray` ; liste complète des contrôles repris dans `../theme-clean-retouches/BILAN.md`.*
9. **Une icône par sens, à sa place.**
   - L'icône de page se pose sur la ligne du titre ; elle flottait jusqu'à 11 px à côté.
   - Six icônes ambiguës sont remplacées (liste plus bas).
   - *Charte : trait fin, lecture immédiate. Mesures faites dans la page.*
10. **L'Agenda.** Le mois porte ses états sur le numéro du jour : le jour sélectionné dans un disque d'encre, aujourd'hui en couleur d'accent. Ni cadre noir de 2 px, ni case teintée, ni aplat gris lourd hors du mois.
    - En semaine, un rendez-vous est un bloc teinté de son type, sans bordure, qui montre le patient et l'heure même sur 30 min. Les en-têtes de jour passent en casse normale.
    - *Tailwind Plus `calendars/month_view` et `calendars/week_view`.*
11. **Les tableaux bord à bord.** Patients rejoint Produits et Finances : le tableau occupe toute la carte, une seule marge de 16 px pour les filtres, les cellules et la pagination, et des filets qui vont jusqu'aux bords. Les actions de ligne restent fantômes.
    - Une liste se lit comme un seul objet, et non comme un tableau posé dans une carte posée dans une carte.
    - *Tailwind Plus `tables/with_avatars_and_multi_line_content` ; Catalyst `table` (marge commune, lignes séparées par un filet à 5 %).*
12. **Les commandes de widget révélées.** « Finances → », « Agenda → » et « Voir tout → » apparaissent au survol, au focus clavier, et restent visibles au tactile. Aucun menu ⋮ inventé.
    - *Étude § 3, point 8 ; Tailwind Plus `month_view` (le bouton d'édition apparaît au survol de la ligne).*
13. **Le quatrième gris, #A6A6A6,** reste réservé au texte et aux icônes désactivés.
    - *Étude § 4.*

## Les polices : mon avis

**Ce que je recommande : Inter partout, avec l'axe optique.** C'est la décision la plus forte pour un thème qui vise Linear.
- **Une seule voix** pour l'interface, le corps et les titres.
- **L'axe optique fait le travail de deux polices** : la coupe Display tend les grands titres, la coupe Text garde la lecture à 12 et 13 px.
- **La signature Baitari ne vit pas dans les titres,** mais dans le logo, les mascottes et la couleur, qui restent intacts.

La déclinaison mixte (Inter, avec Space Grotesk pour les titres) reste à une valeur près : `--clean-font-heading`. Geist et Space Grotesk restent la règle de Premium.

## Le titre d'accueil

Mesuré dans la page à 1 440, 1 920 et 2 560 px de large : **24 px**, à chaque fois. Aucune règle ne le fait grandir.

Ce que ton œil voyait est réel, mais ce n'est pas la taille. Avec la même taille de 24 px :

| Titre | Hauteur d'x | Hauteur de capitale |
| --- | --- | --- |
| Clean, Inter 600 | 12,7 px | 17,5 px |
| Premium, Space Grotesk 500 | 11,8 px | 16,8 px |

Inter a donc environ 8 % d'œil en plus, et la graisse 600 ajoutait de la masse.

**Correction.** Le titre reste à 24 px, puisque 22 px n'existe pas dans l'échelle 12/13/14/16/18/24, et passe en graisse 500, celle de Premium. Il retrouve la masse visuelle d'un titre de 24 px. La charte vérifie les deux valeurs.

## Les pastilles des Accès rapides

Elles gardent leur teinte, mais mélangée pour moitié environ au gris atténué du thème (55 % en clair, 60 % en sombre). Le bleu, le vert et l'orange restent distincts sans être plus saturés que le reste.

## Substitutions d'icônes

Chacune est vétoable seule : il suffit de supprimer sa ligne dans le bloc « Icon substitutions » de `clean.css`. Toutes viennent de Lucide, en trait fin. Elles sont dessinées par masque CSS à la place de l'icône d'origine : Premium garde les siennes, et aucun composant n'est forké.

| Où | Avant | Après | Pourquoi |
| --- | --- | --- | --- |
| Navigation « Patients » et en-tête de la page Patients | Stéthoscope | Empreinte | Les patients sont des animaux. Le stéthoscope sert déjà à « Consultation » (raccourci, indicateur, bouton « Nouvelle consultation »). |
| Accès rapide « Soin » | Presse-papiers | Seringue | C'est l'icône de la page Soins. Le presse-papiers est celui de « Rappels » dans la navigation, juste au-dessus. |
| Agenda, « Urgences ouvertes » | Bouclier | Sirène | Un bouclier dit sécurité ou protection. La sirène dit urgence, sans hésitation pour une équipe de clinique. |
| Patients, « Relances à prévoir » | Bouclier | Calendrier avec horloge | Une relance est une échéance à tenir. Le bouclier était le même que pour les urgences. |
| « En retard » sur Rappels, Soins et Finances | Bouclier, puis deux autres icônes selon la page | Horloge avec alerte, partout | Le même état porte enfin la même icône sur les trois pages, et cette icône dit le temps dépassé. |
| Tableau de bord, vue « Journée clinique » | Stéthoscope | Calendrier avec cœur | Le stéthoscope répétait l'icône de « Nouvelle consultation », à côté. Une journée de soins se lit comme une vue, pas comme une action. |

Capture : `v2/cote-a-cote/icones.jpg`, Clean actuel contre Clean poussé.

## Tailwind Plus : le dossier et ce que j'en retiens

**Inventaire.** Dans `v4/react/components/application-ui`, 392 modules en 11 familles :

| Famille | Groupes |
| --- | --- |
| Application shells | multi-column, sidebar, stacked |
| Data display | calendars, description lists, stats |
| Elements | avatars, badges, button groups, buttons, dropdowns |
| Feedback | alerts, empty states |
| Forms | 9 groupes |
| Headings | card, page, section |
| Layout | cards, containers, dividers, list containers, media objects |
| Lists | feeds, grid lists, stacked lists, tables |
| Navigation | 8 groupes |
| Overlays | drawers, modal dialogs, notifications |
| Page examples | detail, home, settings |

Le dossier contient aussi :
- les mêmes modules en HTML, en Vue et en Alpine, en v3.4 et en v4 ;
- 13 templates ;
- le kit **Catalyst**, des composants d'application complets.

**Les modules retenus, la crème seulement.** Ils servent d'inspiration de traitement. Aucun composant n'est remplacé.

| Module | Notre écran | Pourquoi il bat le nôtre |
| --- | --- | --- |
| Catalyst, `sidebar-layout` et `table` | Toute l'app, Clean sombre, tableaux | La même feuille sur cadre que Clean, déjà déclinée en sombre (zinc-950, zinc-900, filets blanc à 10 %), et une marge commune aux tableaux. Il confirme la direction et fixe le sombre. |
| `calendars/month_view` | Agenda, mois | Les états passent par le numéro du jour (disque pour aujourd'hui), les jours hors du mois sont sur un gris à peine marqué. Notre cadre noir de 2 px et nos cases teintées criaient. |
| `calendars/week_view` | Agenda, semaine | Les rendez-vous sont des blocs teintés plats, avec le titre et l'heure, et les jours sont écrits en casse normale. Nos blocs à bordure et à ombre coupaient l'heure sur 30 min. |
| `tables/with_avatars_and_multi_line_content` | Patients, Produits, Finances | Tableau bord à bord, une seule marge, des lignes multi-niveaux aérées, une pastille teintée. Le nôtre était en retrait de 24 px dans sa carte. |
| `tables/with_sticky_header` | Listes longues | L'en-tête collant en verre (blanc à 75 % flouté) : c'est le même geste que ton en-tête Liquid Glass. |

Le reste du dossier est ignoré. Les captures de référence (`v2/tailwind-plus/`) sont rendues sur cette machine avec le Tailwind du projet, sans aucun appel réseau. Les aperçus fournis par le dossier chargent leurs styles depuis tailwindui.com, avec deux traceurs ; je ne les ai pas ouverts.

### Propositions de structure, séparées, à ta décision

Hors de cette passe, puisque la structure ne devait pas bouger.

1. **Agenda : regrouper « ‹ Aujourd'hui › » à droite**, comme `month_view` et `week_view`.
   - Aujourd'hui, les flèches entourent le mois à gauche et « Aujourd'hui » est isolé à l'autre bout.
   - La navigation se ferait en un seul geste, au même endroit, dans toutes les vues.
   - Capture : `v2/cote-a-cote/agenda.jpg`, colonne de droite.
2. **Agenda, mois : afficher les rendez-vous par leur nom** (deux au plus, puis « + n ») au lieu de « • 3 RDV ».
   - Le mois deviendrait lisible sans clic, comme `month_view`.
3. **Tableau de bord : sortir la bascule de vue de la rangée d'actions** et la poser sur la ligne de la période.
   - Une vue n'est pas une action.
   - Dans Clean, un filet la sépare déjà des boutons, et la vue choisie affiche son nom.

## Écarts avec ton cadrage, assumés

- **Sidebar à 28 px** (la valeur basse de ta fourchette), **cadre #EDEDEE sous la feuille #FAFAFA**, **cartes blanches**, **contrôles à 32 px**, **pastilles sans bordure** : ces écarts sont expliqués dans les choix forts ci-dessus, et inchangés depuis la première passe.
- **Titre d'accueil en graisse 500.** Les autres titres de Clean restent en 600. Raison : la mesure ci-dessus.
- **Trois accroches neutres ajoutées au code**, sans aucun effet visuel en Premium (empreintes identiques) :
  - `data-kpi` (titre de l'indicateur) dans `section-cards.tsx` ;
  - `data-page-title` dans l'en-tête de page ;
  - `aria-pressed` sur la bascule de vue de Produits.

  Elles permettent les substitutions d'icônes et le traitement des interrupteurs sans forker de composant.
- **Le sélecteur de thème passe de 3 à 4 cartes, en grille 2 × 2.**
  - C'est le seul changement visible hors de Clean : il est dans Paramètres, Apparence, et il est voulu par ton cadrage (« les quatre combinaisons »).
  - Le texte d'aide de la ligne devient « Premium clair, Premium sombre, Clean clair ou Clean sombre. »
- **Dans Clean, les libellés en capitales espacées passent en casse normale** (en-têtes de semaine, « Semaine »). Le texte lui-même ne change pas.

## Ce qui ne bouge pas

- **Premium clair et Premium sombre, au pixel près.** L'empreinte de rendu porte sur les styles calculés et les dimensions de chaque élément. Elle a été relevée sur le dernier commit, puis sur ce travail, dans la même session et sur les mêmes données. Les douze empreintes sont identiques :

  | Écran | Premium clair | Premium sombre |
  | --- | --- | --- |
  | Tableau de bord | `666:8f267993` | `665:844046b5` |
  | Patients | `465:a473c05` | `464:9485aef4` |
  | Produits | `486:612b1f93` | `485:e5f10ccd` |
  | Finances | `342:36424e20` | `341:ebf285ad` |
  | Agenda | `706:8b1bd0a4` | `705:8bed3efd` |
  | Soins | `338:17d5647c` | `337:b04da947` |

  Le halo du pic de graphique, qui pulse en continu, est exclu du calcul.
- **Structure.** Mise en page, ordre des éléments (organisation du tableau de bord comprise), libellés, fonctions, données et commandes. Aucun menu n'a été inventé.
- **Identité.** Mascottes, logo et couleur d'accent sont intacts. Clean sombre garde le violet de Premium sombre pour l'action principale.

## Captures

1 440 × 900, données de démonstration. « Clean actuel » est le Clean du commit `3900648`, celui de ton essai.

- `v2/cote-a-cote/` :
  - `tableau-de-bord`, `patients`, `dossier`, `sidebar` et `widget-survol` (au repos, puis survolé) : Premium clair, Clean actuel et Clean poussé ;
  - `clean-sombre` : tableau de bord, Patients, gros plan de la sidebar, Agenda en semaine et sélecteur des quatre thèmes ;
  - `agenda` : mois et semaine, Clean actuel, Clean poussé et module Tailwind Plus de référence ;
  - `tableaux` : liste Patients, Clean actuel, Clean poussé et module Tailwind Plus de référence ;
  - `icones` : les six substitutions et l'icône de page, avant et après.
- `v2/clean-pousse/` et `v2/clean-sombre/` : chaque écran en pleine taille, y compris Soins, Produits, Finances et le sélecteur.
- `v2/tailwind-plus/` : les modules de référence rendus.
- `cote-a-cote/` et `clean-pousse/` (racine du dossier) : les captures de la première passe, conservées.

## Vérifications

- **Vitest :** 150 fichiers, 1 148 tests verts. La charte Clean compte 30 tests. Ceux de cette passe couvrent :
  - le sombre : mêmes noms de jetons, noirs teintés sans noir pur, aucune règle réservée à un seul mode ;
  - les quatre thèmes du sélecteur ;
  - les substitutions d'icônes : la liste exacte, le masque et la couleur d'origine ;
  - l'icône de page posée sur la ligne du titre ;
  - le titre d'accueil à 24 px en 500 ;
  - les interrupteurs, l'en-tête en verre et les champs à 32 px.
- **Typage :** 0 erreur. **ESLint :** 0 problème.
- **Chartes existantes :** survols sous pointeur fin, pas de `transition-all`, échelle typographique. Elles passent.
