# Finition Clean : espacements, textes, fonds et polices

Date : 5 novembre 2026. Branche locale `design/finition-espacements`, partie de `feat/dictee-turbo-native`. Aucun push.

## En bref

- **Ce qui a été fait.** J'ai mesuré l'application en marche, écran par écran, sur les styles calculés par le navigateur et non sur le CSS. J'ai ramené les écarts sur une échelle unique, puis ajouté un réglage de police réservé à Clean.
- **Thème Premium.** Il est identique au pixel près sur 30 écrans sur 30 (clair et sombre). Seule la mascotte animée de la sidebar varie, et elle est masquée pour la comparaison.
- **Sidebar et en-tête.** Ils n'ont pas été touchés.
- **Part des valeurs dans l'échelle, avant → après** (Clean clair et sombre, sidebar exclue) :

| Mesure | Avant | Après |
| --- | --- | --- |
| Paddings | 79,4 % | 95,7 % |
| Gaps | 93,3 % | 98,2 % |
| Marges | 91,0 % | 93,4 % |
| Rayons | 89,5 % | 94,8 % |
| Hauteurs de contrôles (≤ 56 px) | 77,3 % | 95,3 % |
| Tailles de police | 97,5 % | 97,5 % |

- **Contraste du gris discret.** Ce gris colore 366 textes de 12 et 13 px. Il passait de 3,84:1, sous le seuil AA de 4,5:1, à 4,54:1.
- **Interlettrage.** 934 textes recevaient un interlettrage fixe de −0,096 px hérité du body. Ils ont maintenant 0.
- **Réglage « Police ».** Il est ajouté dans Apparence, en Clean seulement. Inter reste la police par défaut. Trois jeux sont proposés en plus : Geist, Plex et Signature.

## 1. Les quatre questions préalables, et ce qui en a été retenu

| Question | Réponse donnée avant de commencer | Retenu | Pas retenu, et pourquoi |
| --- | --- | --- | --- |
| **1. Ce qu'un très bon professionnel ferait sans qu'on le demande** | <ul><li>Mesurer les styles calculés plutôt que le CSS.</li><li>Vérifier l'alignement optique et le rythme vertical.</li><li>Mesurer les contrastes.</li><li>Figer le résultat par un test.</li></ul> | <ul><li>Crawl des styles calculés.</li><li>Alignements optiques corrigés : bande d'accueil, icônes des réglages.</li><li>Contrastes WCAG.</li><li>Test de régression `tests/clean-finish-scale.test.ts`.</li><li>Détection automatique des retours à la ligne provoqués par les corrections.</li></ul> | <ul><li>**Rythme vertical des hauteurs de ligne :** non corrigé (voir § 6).</li><li>**Contraste APCA :** non calculé, seulement WCAG 2.</li></ul> |
| **2. La matière la plus brute** | <ul><li>Les pixels et les styles calculés de l'application qui tourne.</li><li>Les fichiers de police eux-mêmes.</li></ul> | <ul><li>`getComputedStyle` et `getBoundingClientRect` sur chaque élément visible, avec les données de démonstration.</li><li>Métriques lues dans les fichiers woff2 avec fontTools (hauteur d'x, chasse, figures tabulaires).</li></ul> | **Rendu réel :** pas mesuré dans l'application Tauri (WKWebView sur macOS, WebView2 sur Windows). Tout a été mesuré dans Chromium sans interface. |
| **3. Méthodes et outils** | <ul><li>Playwright</li><li>Histogrammes</li><li>Captures annotées</li><li>fontTools</li><li>Vitest</li></ul> | Tous. Les scripts sont dans `outils/`. | **WebKit :** il est installé dans Playwright mais n'a pas servi. Un passage WebKit serait la prochaine preuve utile pour les polices. |
| **4. Preuves extérieures à nous deux** | <ul><li>Chiffres avant et après</li><li>WCAG</li><li>Tests, typage et lint</li><li>Empreintes Premium</li><li>Licences</li></ul> | <ul><li>Tous les points ci-contre.</li><li>En plus : zéro requête réseau hors `localhost` pour les polices, vérifié en interceptant les requêtes.</li></ul> | **Test humain :** aucun essai avec un vétérinaire, ni sur un vrai écran Windows 1x. |

## 2. Méthode

- **Environnement.**
  - Application web en mode dev : Vite et Chromium sans interface, 1440 × 900 à 2x, fuseau Africa/Algiers.
  - Base navigateur avec les données de démonstration.
  - Compte local fictif, « Dr Capture Test », avec un mot de passe aléatoire jamais affiché.
- **Banc de mesure (`outils/bench.mjs`).**
  - Il parcourt 15 vues en Clean clair puis sombre : `dashboard`, `agenda`, `clinique`, `flux`, `patients`, dossier patient, `notes`, `stock`, `finances`, `finances_analytics`, `parametres`, `equipe`, `taches`, `soins`, `aide`.
  - Il relève pour chaque élément visible : paddings, marges, gaps, hauteur, rayons, taille, graisse, hauteur de ligne, interlettrage, couleurs de texte, de fond et de bordure, lissage.
- **Analyse (`outils/analyze.py`, `outils/perview.py`).** Histogrammes, valeurs hors échelle, part dans l'échelle par écran. La sidebar est exclue, et l'en-tête aussi dans le tableau par écran.
- **Captures annotées (`outils/annot.mjs`).**
  - Le cadre mesuré est dessiné dans la page avant la capture : contour, padding teinté, étiquette avec les valeurs calculées en px.
  - Avant et après sont pris à heure figée, avec le même profil. L'état « avant » a été obtenu en mettant de côté mes seuls fichiers suivis (`git stash push -- <mes fichiers>`), puis en les restaurant.
- **Retours à la ligne (`outils/wraps.py`).** Le script compare la hauteur du contenu de chaque texte avant et après. Il a trouvé 2 retours à la ligne provoqués par mes corrections ; ils sont corrigés (§ 4, n° 9 et 10). Il n'en reste aucun.

## 3. L'audit chiffré de départ

Les données complètes sont dans `audit/audit-avant.json` et `audit/audit-apres.json` (histogrammes et liste des valeurs hors échelle avec leur chemin DOM). Captures pleine page : `ecrans/avant/` et `ecrans/apres/`, 15 vues × 2 modes.

### Ce que l'application utilisait réellement (Clean, hors sidebar)

- **Paddings.**
  - Valeurs de l'échelle : 12 (946), 6 (556), 8 (468), 20 (420), 24 (338), 16 (280), 4 (238).
  - **Hors échelle :** 14 (230), 10 (210), 22 (164), 3 (152), 9 (44), 18 (38), 7 (28), 30 (6).
- **Gaps.**
  - Valeurs de l'échelle : 8 (1 106), 6 (932), 4 (650), 12 (428), 16 (254), 2 (146).
  - **Hors échelle :** 10 (108), 14 (64), 3 (36), 5 (24), 18 (18), 7 (8), 26 (4), 28 (4).
- **Rayons.**
  - Valeurs de l'échelle : plein (474), 8 (342), 6 (144), 4 (114), 10 (92), 12 (78).
  - **Hors échelle :** 14 (40), 11,2 (26), 9 (22), 16 (16), 3 (16), 6,4 (8), 14,4 (4).
- **Hauteurs de contrôles.** 32 (236), 40 (118), 36 (116), **30 (98)**, 28 (32). Les 30 et les 36 correspondaient aux pistes segmentées.
- **Tailles de police.** 13 (828), 12 (776), 14 (218), 24 (168), 16 (32), 18 (28). Hors charte :
  - 15 : initiales de l'avatar dans l'en-tête ;
  - 20 : émojis du choix d'avatar ;
  - 36 : initiales du profil.
- **Graisses.** 400, 450, 500, 560 et 600.
- **Hauteurs de ligne.** Souvent fractionnaires : 13/20,15, 12/18,6, 13/18,57, 24/28,8.
- **Interlettrage.** −0,096 px sur 934 textes : c'est −0,006 em calculé à 16 px sur le body, puis hérité tel quel en px.
- **Couleurs de texte.**
  - Les gris de la charte dominent : #7f7f7f (368), #292929 (351), #5d5d5d (202), et leurs équivalents sombres.
  - **Aide** utilisait les gris zinc de Tailwind (teinte 286) au lieu des jetons Clean.
- **Bordures.**
  - Le jeton #e6e6e8 domine (416).
  - On trouve aussi #f2f2f2, des zinc `oklch(0.967 0.001 286)` et `oklch(0.92 0.004 286)`, et `rgba(9, 9, 11, 0.05)`.
- **Lissage.** `antialiased` partout, conforme.

### Part des valeurs d'espacement dans l'échelle, par écran (Clean clair, hors sidebar et en-tête)

| Écran | Avant | Après |
| --- | --- | --- |
| Aide | 97,7 % | 98,6 % |
| Patients | 95,7 % | 99,3 % |
| Rappels (`taches`) | 93,2 % | 97,7 % |
| Finances | 92,3 % | 99,3 % |
| Clinique | 92,1 % | 99,4 % |
| Soins | 92,1 % | 99,4 % |
| Analyse financière | 91,4 % | 99,3 % |
| Documents (`notes`) | 91,2 % | 97,5 % |
| Agenda | 90,3 % | 98,9 % |
| Dossier patient | 89,3 % | 95,1 % |
| Équipe | 84,6 % | 93,0 % |
| Réglages | 82,9 % | 90,5 % |
| Tableau de bord | 78,2 % | 97,4 % |
| Produits (`stock`) | 76,1 % | 99,4 % |
| Flux | 72,1 % | 96,3 % |

### Contrastes mesurés (WCAG 2)

| Texte sur fond | Avant | Après |
| --- | --- | --- |
| Gris discret clair sur la feuille (#fafafa) | #7f7f7f, **3,84:1**, sous AA | #737373, **4,54:1** |
| Gris discret clair sur blanc | 4,00:1 | 4,74:1 |
| Gris discret sombre (#959698) sur #171719 | 6,05:1 | inchangé |
| Encre (#5d5d5d) sur la feuille | 6,31:1 | inchangé |
| Gris désactivé (#a6a6a6) | 2,43:1 | inchangé : le texte désactivé est exempté par WCAG |

## 4. L'échelle cible retenue, et pourquoi

| Rôle | Échelle | D'où elle vient |
| --- | --- | --- |
| **Espacement** | 2 · 4 · 6 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 px | <ul><li>La base de 4 px de DESIGN.md (`spacing.unit`).</li><li>Les valeurs déjà nommées : `control-gap` 8, `row-gap` 12, `panel-body` 20, `section-gap` 24, `page-block` 32.</li><li>Le 2 et le 6 ne servent qu'à l'intérieur des contrôles de 32 px ou moins. La piste segmentée en a besoin : 2 + 28 + 2 = 32.</li></ul> |
| **Rayons** | 4 · 6 · 8 · 10 · 12 · plein | Les jetons Clean existants : `--clean-segment-radius` 6, `--clean-control-radius` 8, `--clean-card-radius` 10, `--clean-sheet-radius` 12. |
| **Hauteurs de contrôles** | 20 · 24 · 28 · 32 · 36 · 40 | Les jetons Clean : `--clean-segment-item` 28, `--clean-control` 32, `--clean-header-control` 36, `--clean-row-list` 40. |
| **Typographie** | 12 · 13 · 14 · 16 · 18 · 24 | La charte, inchangée (`tests/type-scale.test.ts`). |

- **Validation sur les écrans sains, avant toute correction.**
  - Sur Patients, l'écran le plus propre hors Aide, l'échelle couvrait déjà 95,7 % des valeurs.
  - Les écarts restants venaient tous de composants partagés : cartes d'indicateurs à 22, en-tête de page à 14, menus filtres à 10.
  - Ajouter 10 ou 14 à l'échelle aurait donc validé les incohérences au lieu de les résoudre.
- **Pas de 14 ni de 18.** Ces valeurs ne figurent dans aucun jeton : elles provenaient de réglages ponctuels (Tailwind `py-3.5`, `gap-2.5`, `14px` de `premium-workspace.css`).

### Les corrections, module par module

Toutes les règles sont dans un bloc unique, à la fin de `src/design-system/clean.css` (« Finish of 5 November 2026 »). Chaque sélecteur commence par `:root[data-skin="clean"]` ; le test de pureté existant le vérifie.

Les captures annotées « avant | après » sont dans `corrections/`. Les valeurs en px y sont lues dans le navigateur.

| N° | Module | Avant (mesuré) | Après | Pourquoi | Capture |
| --- | --- | --- | --- | --- | --- |
| 1 | Tableau de bord, bande d'accueil | Actions à x 302, titre à x 296 (6 px d'écart) ; boutons à 14 px d'intérieur et 7 de gap ; actions espacées de 10 | Actions sur la ligne du titre (24 px) ; boutons 12 et 6 ; actions espacées de 8 | Un bord gauche par bloc. Le titre et ses actions doivent partager la même ligne. | `01-dashboard-bande-accueil.jpg`, `13-…` (sombre) |
| 2 | **Toutes les pistes segmentées** : périodes, graphique, agenda, rappels, finances | Piste de 36 px avec 3 de padding, éléments de 30, à côté de contrôles de 32 | Piste de 32 px avec 2 de padding, éléments de 28 | La règle Clean prévoyait déjà « 32 px, alignée sur les contrôles voisins ». La règle partagée `:root:root:root` de `tabs.css` passait devant. Clean répond maintenant un cran plus haut. | `02-…`, `04-agenda-segments.jpg` |
| 3 | Cartes d'indicateurs : tableau de bord, Patients, Équipe, Finances, Clinique, Soins, Agenda, « Cette semaine » | 20/22/18/22, 20/24/22/24, 20/22/22/22 | 20/24/20/24 partout | Une même carte doit avoir un même intérieur. | `03-…`, `06-patients-indicateurs.jpg` |
| 4 | Tableaux (Produits) | 14 px de chaque côté | 12 entre colonnes, 16 aux bords, comme Patients | Les tableaux des deux modules ne s'alignaient pas. | `05-produits-tableau.jpg` |
| 5 | En-tête de page (tous les modules) | 14 px entre l'icône et le titre | 12 | Valeur de l'échelle. | `06-…` |
| 6 | Rayons des composants shadcn | 4,8 / 6,4 / 11,2 / 14,4 (`--radius` × 0,6, 0,8, 1,4, 1,8) | 4 / 6 / 10 / 12 | Les multiplicateurs produisaient des rayons fractionnaires. Les règles propres aux composants gardent la priorité (`:where`). | Visible sur les cartes d'Équipe et d'Aide (`ecrans/`) |
| 7 | Flux, couloirs | Rayon 16, padding 10 ; « Prévus » à 10 | Rayon de carte 10, padding 12 | Cartes Clean à 10. | `07-flux-couloirs.jpg` |
| 8 | Agenda, cartes de la liste | Padding 18/18/18/22, gap 18, rayon 14 ; méta : gap 14, marge 10 | 16/16/16/20, gap 16, rayon 10 ; méta : 12 et 8 | Valeurs de l'échelle. Les 20 px à gauche tiennent compte de la barre de couleur. | `12-agenda-cartes-liste.jpg` |
| 9 | Flux, couloir vide | Padding 14/10 | 12/8 | La ligne fait 40 px. Les 8 px de côté gardent la largeur de texte d'avant : avec 12, « Aucune consultation en cours » passait à la ligne (détecté par `wraps.py`). | `07-…` |
| 10 | Réglages | Rayon de navigation 9, rayon des panneaux 14, gaps de 26 / 18 / 28 ; icônes de 18 | Rayons 8 et 10 ; gaps de 24 / 16 / 24 ; icônes de 16 | Jetons Clean. À interlettrage nul, « Modèles de documents » mesurait 145 px pour 145 de place et passait à la ligne. L'icône de 16 px, déjà la taille de la sidebar, libère la place. | `09-parametres-navigation.jpg` |
| 11 | Dossier patient, onglets | Intérieur de 10 | 12 | L'intérieur des autres onglets de navigation (Produits). | `08-dossier-onglets.jpg` |
| 12 | Tableau de bord, listes | Lignes à 10 en haut et en bas ; message vide à 22 sur les côtés ; titre d'accueil à 10 de l'intitulé et de la note | Lignes à 12 ; message vide à 20 ; titre à 8 | Valeurs de l'échelle. | `ecrans/` |
| 13 | Gaps de 10 (`gap-2.5`) entre une pastille ou une icône et son libellé | 10 | 8 ; listes et couloirs à 12 ; analyse financière à 24 (mesuré 28) | Valeurs de l'échelle. | `ecrans/` |
| 14 | Champs texte, menus filtres en deux parties, éléments de densité de Flux | Intérieur de 10 | 12, comme les boutons | Un intérieur unique pour tous les contrôles. | `ecrans/` |
| 15 | Pastilles de statut | 9 px de côté | 8 | Valeur de l'échelle. | `ecrans/` |
| 16 | **Texte : interlettrage** | −0,096 px fixe sur tous les textes de 12 et 13 px | 0 ; les titres gardent leurs jetons (−0,022 et −0,015 em) | <ul><li>L'axe de taille optique d'Inter espace déjà le petit texte.</li><li>Un `em` posé sur le body se calcule à 16 px et se transmet en px aux textes plus petits, d'où ce −0,096 px.</li></ul> | `audit/` : 934 textes à −0,096 px avant, 0 après. Les sous-titres de 14 px gardent leur propre interlettrage (capture `10-…`). |
| 17 | **Texte : gris discret (clair)** | #7f7f7f, 3,84:1 | #737373, 4,54:1 | WCAG AA pour les textes de 12 et 13 px (366 éléments). | `10-…` |
| 18 | **Fonds et filets : Aide** | Gris zinc de Tailwind : filets `oklch(0.92 0.004 286)`, textes `oklch(0.705 0.015 286)` | `--clean-line`, `--clean-ink-quiet`, `--clean-ink` | Même rôle, valeurs Clean. | `11-aide-filets.jpg` |

**Comment lire les captures.** Les paires sont prises à heure figée. Quand une piste perd 4 px, tout le contenu en dessous remonte de 4 px : c'est attendu.

## 5. Le jeu de polices

Réglage : **Paramètres → Apparence → Police**. Il n'apparaît qu'en Clean et vaut **Inter** par défaut.

- **Stockage séparé.** Le choix est enregistré dans un champ à part, `cleanFont`. Le champ `font` historique est lu par Classique et Premium ; un choix fait en Clean ne peut donc pas les atteindre.
- **Embarquement local.** Tous les fichiers sont sous licence OFL-1.1, livrés par npm et embarqués par Vite.
- **Aucune requête externe.** L'interception des requêtes sur les quatre jeux ne montre que `localhost` :
  - `inter-latin-opsz`
  - `geist-latin-wght`
  - `geist-mono-latin-wght`
  - `ibm-plex-sans-latin-wght`
  - `ibm-plex-mono-latin-500`
  - `space-grotesk-latin-wght`
- **Chargement.** Une police n'est téléchargée depuis le bundle que si le jeu actif l'utilise.

| Jeu | Interface et texte | Titres | Données (codes, références, raccourcis) | Mesures (fontTools) |
| --- | --- | --- | --- | --- |
| **Inter** (actuel, par défaut) | Inter, avec son axe de taille optique | Inter | Police à chasse fixe du système | <ul><li>Hauteur d'x : 7,10 px à 13 px.</li><li>Phrase témoin à 13 px : 283 px.</li><li>Figures tabulaires : oui.</li></ul> |
| **Geist** | Geist | Geist | Geist Mono | <ul><li>Hauteur d'x : 6,89 px.</li><li>Phrase témoin : 278 px.</li><li>Figures tabulaires : oui.</li><li>C'est la paire de Vercel, dans l'esprit demandé.</li></ul> |
| **Plex** | IBM Plex Sans | IBM Plex Sans | IBM Plex Mono (déjà embarquée) | <ul><li>Hauteur d'x : 6,71 px.</li><li>Phrase témoin : 269 px.</li><li>Chiffres tabulaires par défaut : les dix chiffres ont la même chasse (600).</li></ul> |
| **Signature** | Inter | Space Grotesk (la signature Baitari, déjà embarquée) | Geist Mono | Titres : hauteur d'x de 0,486 em, plus petite qu'Inter (0,546 em). |

- **Aucun retour à la ligne nouveau attendu.** Aucun jeu n'est plus large qu'Inter, qui reste le plus large des quatre : un écran qui tient en Inter tient avec les autres.
- **Captures.** Elles sont faites sur les vrais écrans, dans `polices/` :
  - `comparatif-<écran>.jpg` montre les quatre jeux en grille sur six écrans : tableau de bord, Patients, dossier patient, Produits, Agenda, Réglages ;
  - `gros-plan-<écran>.jpg` montre les textes de 12 et 13 px à 2x, pour juger le rendu aux petites tailles ;
  - `geist-sombre-*.jpg` montre Geist en sombre ;
  - `reglage-police-inter.png` et `reglage-police-geist.png` montrent le réglage lui-même.
- **Choisir.** Les quatre sont comparables directement dans l'application. Je ne tranche pas à ta place ; le défaut reste Inter.

## 6. Ce qui a été laissé tel quel, et pourquoi

- **Sidebar et en-tête : laissés, comme demandé.**
  - L'en-tête porte des valeurs hors échelle : padding de 22, gap de 10, initiales de l'avatar en 15 px.
  - Ces 15 px font échouer le test préexistant `tests/type-scale.test.ts` (voir § 8).
- **Thème Premium.** Rien n'y est touché ; c'est prouvé au pixel (§ 7).
- **Hauteurs de ligne fractionnaires (13/20,15, 12/18,6, 24/28,8).**
  - Les arrondir à la grille de 4 px imposerait de réécrire la hauteur de ligne de tous les éléments. L'unité sans dimension s'hérite comme facteur, et une valeur en `em` s'hérite figée, comme l'interlettrage.
  - Le risque sur toutes les mises en page est trop grand pour un gain d'un demi-pixel à 2x.
  - Ce sera un chantier à part, à mener avec le même banc.
- **Icône des titres de page (marges de 0,5 et 19,5 px).** C'est un centrage optique volontaire, documenté dans `clean.css`, sur un titre dont la ligne mesure 28,8 px. Il ne se corrige proprement qu'avec les hauteurs de ligne.
- **Micro-marques de visualisation** (cellules de la heatmap à 3 px, unités à 5, barres à 2). Ce sont des choix de dessin de données, pas de l'espacement d'interface.
- **Marges `auto`** (39,6 ou 61,4 px). C'est du placement par flexbox, pas une valeur posée.
- **Pastilles d'Équipe** (3 px vertical, dans une hauteur de 20). Elles tiennent dans 20 px, une hauteur de l'échelle.
- **Bordures sombres en `rgba(255, 255, 255, 0.08 / 0.1)`** à côté du jeton #232426. Leur luminance est proche du jeton. Les unifier toucherait des surfaces de verre ; non mesuré à fond.
- **Sidebar en teinte claire (option non par défaut).** Ses libellés de groupe utilisent le gris discret ; ils passent donc aussi de #7f7f7f à #737373.
  - La surcharge qui l'aurait évité est refusée par la charte de Clean (aucune règle propre à un seul mode) et par le test de la sidebar, qui limite à 4 ses sélecteurs.
  - La sidebar sombre, celle par défaut, est inchangée au pixel près.
- **Graisses.** Il y en a cinq : 400, 450, 500, 560 et 600. Le 450 des textes discrets est une règle Clean voulue ; le 560 apparaît sur 4 éléments seulement. Pas de changement sans ton avis.
- **Captures dans l'application Tauri.** Non faites : uniquement Chromium sur macOS. WebView2 (Windows) et WKWebView peuvent lisser autrement les polices à 12 et 13 px.

## 7. Preuve que Premium n'a pas bougé

`audit/premium-empreintes.txt` : 30 captures de Premium (15 vues × clair et sombre), prises à heure figée avant et après les changements.

- **Résultat :** 30 sur 30 identiques, empreintes SHA-256 égales, une fois masquée la zone de la mascotte animée de la sidebar (180 × 140 px d'image en haut à gauche).
- **Sans masque :** les seules différences tombent toutes dans ce cadre. Ce sont des images d'animation, pas un changement de style.

## 8. Tests, typage, lint

| Contrôle | Résultat |
| --- | --- |
| **Vitest** | 177 fichiers, 1 381 tests : **1 380 verts, 1 échec préexistant.** |
| **Typage** (`tsc -b`) | 0 erreur |
| **ESLint** (`npm run lint`) | 0 problème |

**L'échec préexistant :** `tests/type-scale.test.ts`, « n'utilise aucune taille de texte libre hors de l'échelle de la charte ».

- **Le test signale :** `src/design-system/clean.css: font-size: 15px`.
- **La cause :** les initiales de l'avatar dans l'en-tête, introduites par le commit `5e1d78a` (« header plus grand… »).
- **Preuve que l'échec précède mon travail :** je l'ai reproduit sur `HEAD` sans mes changements.
- **Pourquoi je ne l'ai pas corrigé :** l'en-tête est hors périmètre. Je le signale sans le masquer.

**Tests ajoutés et modifiés :**

- **Ajouté : `tests/clean-finish-scale.test.ts`** (8 tests). Il vérifie que :
  - le bloc de finition reste sous la portée Clean ;
  - aucun espacement ni rayon ne sort de l'échelle ;
  - la piste segmentée passe devant `tabs.css` ;
  - le gris discret reste à #737373 ;
  - les jeux de polices restent propres à Clean ;
  - aucun service de polices en ligne n'est appelé.
- **Modifié : `tests/theme-clean-charter.test.ts`.** La valeur attendue de `--clean-ink-quiet` passe de `#7f7f7f` à `#737373`. C'est le seul test existant modifié, et c'est la conséquence voulue de la correction n° 17.

## 9. Fichiers non commités rencontrés

`git status` au départ :
- un fichier suivi supprimé : `AGENTS.md` ;
- des dossiers et fichiers non suivis :
  - `.claude/`, `.gitattributes`, `.graphifyignore`, `.impeccable/`, `CLAUDE.md`
  - `briefs/`, `docs/etudes/`, `graphify-out/`
  - dans `docs/recus/` : plusieurs captures et PDF du 17 octobre, `2026-10-20/refonte-directions/`, des fichiers de voix du 1er novembre, `design-soins/`.

Aucun n'a été modifié ni commité par moi. Deux points à signaler :

- **`graphify-out/`.** `CLAUDE.md` demande de lancer `graphify update .` après une modification de code. Je ne l'ai pas fait, car cela réécrit ce dossier non suivi. En revanche, **le hook git de graphify a lancé tout seul une reconstruction en arrière-plan à chaque commit** (journal : `~/.cache/graphify-rebuild.log`). Ce dossier a donc pu changer sans que je le touche directement.
- **`.claude/launch.json`.** Je n'ai pas ajouté de serveur ; j'ai utilisé la configuration existante `baitari-web`.

**Autre point de méthode.** La mémoire du projet interdit d'entrer dans l'original pour le harnais agent. Ce travail n'est pas le harnais : il a été fait dans la copie de travail git de ce dépôt, sur une branche dédiée.

## 10. Commits locaux

| Commit | Contenu |
| --- | --- |
| `ba6a733` | `design(clean): finition mesurée, une échelle d'espacement et de rayons` : bloc de finition dans `clean.css`, gris discret, charte de test, section DESIGN.md |
| `4eafda3` | `design(clean): jeux de polices au choix, Inter par défaut` : `cleanFont`, réglage Apparence, `@fontsource-variable/geist-mono` et `@fontsource-variable/ibm-plex-sans` (OFL), test de l'échelle |
| Ce commit | `docs:` le présent bilan, les captures et les outils de mesure |

Aucun push.

## 11. Skills d'Emil Kowalski utilisés, et ce qu'ils ont tranché

- **emil-design-eng.**
  - « Unseen details compound » a guidé le choix des corrections : un écart de 6 px entre le titre d'accueil et ses boutons, ou des pistes de 36 px contre des contrôles de 32. Personne ne les nomme, mais l'œil les additionne.
  - Le format de revue « Avant | Après | Pourquoi » structure le tableau du § 4.
  - « Good defaults matter more than options » : Inter reste le défaut, les jeux restent un choix.
- **apple-design.**
  - § 15 « Tracking is size-specific, never one value for all sizes » a tranché l'interlettrage. Le −0,096 px fixe hérité du body était exactement ce défaut ; il passe à 0 aux tailles de texte, et les titres gardent leur interlettrage négatif.
  - § 15 « Default to the platform's font… override only with a reason » : chaque jeu de police a son rôle et sa mesure.
  - § 16 Craft, « every spacing value is a deliberate choice you can defend » : c'est l'échelle elle-même, et la règle « chaque correction nomme la valeur mesurée qu'elle remplace ».
  - § 16 Familiarity, « things that look the same must behave the same » : une seule piste segmentée, un seul intérieur de carte d'indicateur, un seul intérieur de cellule de tableau.
- **break-ui.** J'en ai repris le principe des libellés longs, appliqué à la détection automatique des retours à la ligne. C'est elle qui a trouvé « Modèles de documents » et « Aucune consultation en cours ». Je n'ai pas construit sa bascule « données extrêmes » : cela ajouterait une fonctionnalité.
- **animate, review-animations, improve-animations, animation-performance, find-animation-opportunities.** Non appliqués : aucune animation n'a été modifiée, ce qui était hors périmètre. Les transitions existantes de Clean (120 ms `ease-out`, survol réservé aux pointeurs fins) étaient déjà conformes.
- **mobile-native, ask-sonner, pick-ui-library, prototype.** Lus dans leur description, sans objet ici.
