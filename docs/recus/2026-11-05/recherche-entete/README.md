# Recherche dans l'entête

Date : 5 novembre 2026. Branche locale `design/recherche-entete`, partie de `design/nettoyage-parametres` après la correction de la barre latérale claire (`1a98958`). Aucun push depuis cette session.

## En bref

- **Recherche déplacée.** Elle quitte la barre latérale pour l'entête, à gauche, juste après le bouton de la barre latérale, dont la séparent un filet vertical fin et un nouveau glyphe. Elle reste visible quand la barre latérale est repliée.
- **Comportement inchangé.** Même palette ⌘K, même moteur, mêmes résultats. Aucune ligne du moteur ni de la palette n'a été touchée : le diff est vide sur `CommandPalette.tsx`, `modules/shell/model` et `consultations/local-ai`.
- **Barre latérale.** La marque est suivie de la navigation : le premier titre de groupe est à 28 px du bord visible de la marque, le même pas qu'entre deux groupes.
- **Libellés de la navigation : 14 px en Clean** (13 px avant). La décision et ses mesures sont au § 5.
- **Hors entête et barre latérale, rien ne bouge.** 30 écrans Clean et 30 écrans Premium ont été comparés, entête et barre latérale masqués : tous sont identiques au pixel.

## 1. Captures avant/après annotées

Les captures sont dans `captures/`, en paires AVANT au-dessus, APRÈS en dessous, avec les valeurs lues dans le navigateur :

- `entete-sidebar-ouverte-clair.jpg` et `entete-sidebar-ouverte-sombre.jpg` ;
- `entete-sidebar-repliee-clair.jpg` et `entete-sidebar-repliee-sombre.jpg`.

| Élément | Avant | Après |
| --- | --- | --- |
| **Recherche** | Dans la barre latérale, à x 14 : 220 × 34 px, rayon plein, libellé « Rechercher » ; repliée, une icône de 44 px | Dans l'entête, à x 321 (ouverte) ou 137 (repliée) : **344 à 360 × 36 px**, rayon plein, « Rechercher un patient, une page… » |
| **Bouton de la barre latérale** | 32 × 32 px, rayon 8, glyphe Hugeicons de 16 px, gris d'encre | **36 × 36 px**, rond comme les outils de droite, glyphe dessiné de 18 px, trait 1,5, encre forte |
| **Séparateur** | Aucun | Filet vertical de 1 × 20 px, couleur du filet (`--clean-line` en Clean, `--border` en Premium) |
| **Premier groupe de la barre latérale** | À 154 px du haut, sous la recherche | À 94 px : 20 px sous le bloc de la marque, 28 px sous son bord visible |
| **Entête** | 60 px, vide au centre | 60 px, inchangé ; la recherche occupe la gauche |

## 2. Ce qui a été reconstruit

- **Le champ** (`src/modules/shell/components/header-search.tsx`, avec `shell-toolbar.css` et `clean.css`) :
  - **Forme.** Une capsule de 36 px, la hauteur des outils de l'entête, pour que la rangée se lise comme une seule ligne. Même matériau que ces outils : filet à 8 % de l'encre forte, fond à 5 % en Clean et 4 % en Premium.
  - **Contenu.** Loupe de 16 px à 12 px du bord, 8 px jusqu'au texte. Le texte fait 13 px en graisse 450, sur une ligne de 20 px, dans le gris discret.
  - **Pastille ⌘K.** Une capsule de 28 px à 4 px du bord droit, pour que ses courbes soient concentriques à celles du champ, en blanc comme un segment choisi. Elle affiche « Ctrl K » sur Windows, où l'ancienne affichait « ⌘K » à tort ; le raccourci lui-même ne change pas : Meta+K et Control+K.
  - **Largeur.** `clamp(240px, 30cqi, 360px)` ; sous 560 px d'entête, le champ cède la place à l'icône de recherche existante.
- **Les états**, tous capturés dans `etats-du-champ/` (16 captures : Clean et Premium, clair et sombre) :
  - **repos** ;
  - **survol**, réservé au pointeur fin : filet à 14 %, fond à 8 %, texte en encre ;
  - **pression** : échelle 0,99 en 160 ms, sans effet si le système demande de réduire les animations ;
  - **focus clavier** : anneau de 2 px ;
  - **saisie** : la palette est ouverte, et le champ le montre par `aria-expanded="true"`, avec un filet à 16 % et un fond à 8 %.
- **Le bouton de la barre latérale** (`header-sidebar-toggle.tsx`) :
  - **Glyphe.** Une fenêtre avec son panneau latéral. Le panneau est teinté quand la barre est ouverte et vide quand elle est repliée ; le chevron indique où la barre va aller.
  - **Comportement inchangé.** Même `toggleSidebar`, même raccourci ⌘B, mêmes libellés.
- **La barre latérale** (`app-sidebar.tsx`, `premium-sidebar.css`) :
  - l'ancien bouton est retiré, en état ouvert comme replié, ainsi que la prop `onSearch` devenue inutile ;
  - le haut du contenu passe de 12 à 20 px.

**Skills d'Emil appliqués.**

| Skill | Règle | Application ici |
| --- | --- | --- |
| emil-design-eng | Retour immédiat à la pression | Échelle 0,99 sur le champ |
| emil-design-eng | Survol réservé aux pointeurs fins | `@media (hover: hover) and (pointer: fine)` |
| emil-design-eng | Courbe « strong ease-out » | `cubic-bezier(0.23, 1, 0.32, 1)` en 160 ms |
| apple-design § 16 | « Grouping & mapping » | Le filet sépare la commande de navigation de la recherche |
| apple-design | Concentricité | Pastille de 28 px à 4 px du bord d'un champ de 36 px |

## 3. Le comportement de recherche n'a pas changé : les preuves

- **Moteur et palette intacts.** `git diff` ne montre aucune modification de `src/components/CommandPalette.tsx`, ni de `src/modules/shell/model/` (analyse des requêtes), ni de `src/modules/consultations/local-ai/` (recherche sémantique).
- **Tests existants verts.**
  - `tests/modules/shell/command-palette.test.ts` : 17 tests, dont normalisation, scores et analyse des requêtes.
  - Recherche hybride et par passages : `hybrid-exact-search.test.ts`, `passage-search.test.ts`.
- **Nouveau test : `tests/modules/shell/header-search.test.ts`** (5 tests). Il vérifie que :
  - le champ est un bouton qui annonce la boîte de dialogue et le raccourci Meta+K / Control+K ;
  - il appelle exactement `setPaletteOpen(true)` ;
  - le gestionnaire ⌘K et la fermeture de la palette sont inchangés ;
  - il vient juste après le bouton de la barre latérale ;
  - la barre latérale n'a plus de champ ;
  - le bouton garde `toggleSidebar` et ⌘B.
- **Essai dans l'application** (`preuves/etats.json`), dans les 4 thèmes :
  - un clic sur le champ, puis la frappe « Rex », ouvrent la palette avec les mêmes résultats partout (le patient Rex, « Rex - Chirurgie », « Rex - Consultation ») ;
  - Échap la referme, et ⌘K la rouvre ;
  - aucune erreur de page.

## 4. Premium

Le déplacement est structurel et vaut pour les deux thèmes.

- **Ce qui change en Premium.** Le champ, le glyphe, le filet et l'espace de la barre latérale, dans ses propres couleurs (jetons `--ink` et `--border`).
- **Ce qui ne change pas.** Partout ailleurs, l'écran est identique au pixel près (`preuves/recherche-empreintes.txt`).
- **Taille des libellés.** Le passage à 14 px ne touche que Clean : en Premium, la navigation garde sa taille.

## 5. Libellés de la barre latérale : 14 px retenus (13 px avant)

**Mesures sur la vraie navigation** (Clean, Geist, graisse 500) :

- les libellés faisaient 13 px, sur une ligne de 20 px, dans une rangée de 28 px ;
- le plus long, « Soins & hospitalisation », mesure 135 px à 13 px et 145 px à 14 px ;
- la place disponible est d'environ 171 px.

**Angle sous lequel l'œil voit la hauteur d'x** (Geist : 0,53 em). La référence de lecture confortable est d'environ 12′, soit 0,2°.

| Écran | Taille | 60 cm (assis) | 100 cm (coup d'œil depuis la table d'examen) |
| --- | --- | --- | --- |
| MacBook 14″ Retina | 13 px | 7,9′ | 4,7′ |
| | **14 px** | **8,5′** | **5,1′** |
| | 16 px | 9,7′ | 5,8′ |
| PC portable 15,6″, 1080p à 125 % | 13 px | 8,9′ | 5,3′ |
| | **14 px** | **9,6′** | **5,7′** |
| | 16 px | 10,9′ | 6,6′ |
| Écran 24″, 1080p à 100 % | 13 px | 10,9′ | 6,5′ |
| | **14 px** | **11,7′** | **7,0′** |
| | 16 px | 13,4′ | 8,0′ |

**Décision : 14 px.** Les libellés de navigation se lisent en coup d'œil, parfois à distance ; 13 px restait le plus petit choix des trois sur chaque écran.

- **Ce que 14 px apporte.**
  - **Lisibilité :** +7,7 % de hauteur d'x.
  - **Rien d'autre ne bouge :** les libellés tiennent toujours sur une ligne, dans la même rangée de 28 px avec la même ligne de 20 px, et les icônes restent à 16 px.
- **Pourquoi pas 15 px :** cette taille n'est pas dans l'échelle (12, 13, 14, 16, 18, 24).
- **Pourquoi pas 16 px :**
  - la navigation dépasserait les titres de carte, qui font 14 px ;
  - elle écraserait les titres de groupe, qui font 12 px ;
  - les captures montrent un texte lourd à côté d'icônes de 16 px ;
  - il faudrait passer à des rangées de 32 px, un changement de rythme plus large que ce brief.

**Ce que recouvre le changement.**

- **Application.** Un jeton `--clean-nav-text: 14px`, appliqué à la navigation, aux sous-pages, aux accès rapides et au bouton Paramètres.
- **Ce qui ne bouge pas.** Les titres de groupe restent à 12 px. Premium n'est pas touché, conformément au garde-fou du § 3 de ton brief. Si tu veux la même taille en Premium, c'est une ligne.
- **Captures comparatives.** Dans `polices-barre-laterale/`, en 13, 14 et 16 px côte à côte :
  - `comparatif-sombre-defaut.jpg` : barre latérale sombre, par défaut ;
  - `comparatif-claire.jpg` : barre latérale claire.

## 6. Tests, typage, lint

| Contrôle | Résultat |
| --- | --- |
| **Vitest** | 179 fichiers, 1 389 tests : **1 388 verts, 1 échec préexistant** |
| **Typage** (`tsc -b`) | 0 erreur |
| **ESLint** | 0 problème |

L'échec préexistant est `tests/type-scale.test.ts` : la taille de 15 px des initiales de l'avatar, dans l'entête, vient du commit `5e1d78a`. Il a déjà été signalé dans les bilans précédents. Je ne l'ai pas corrigé, car ce brief limite les changements de l'entête à la recherche et à son bouton.

## 7. Release 5.0.3

Rien ne bloque : la branche contient la finition, Geist, le nettoyage, la barre latérale claire rétablie et la recherche. Les fichiers non suivis de l'arbre, ainsi que la suppression de `AGENTS.md`, ne viennent pas de moi et ne sont pas commités.

## 8. Commits locaux

Ils sont listés dans `git log design/recherche-entete` : un commit pour le code, un pour ce bilan.
