# Version 5.4.1 : compagnons en couleurs et réglage de la barre latérale

Reçu du 27 novembre 2026, branche `essai/mascottes-couleurs-2026-11-27` (partie de `master` 5.4.0), tag local `v5.4.1` sur le deuxième amendement. Rien n'est poussé ni publié.

## 1. Les compagnons en couleurs

**Intégration.** Les quinze compagnons en couleurs remplacent les dessins au trait partout où le compagnon apparaît. Un seul aiguillage, `MascotAvatar`, sert tous ces endroits :
- le sélecteur « Votre petit compagnon » (Paramètres et menu de la barre latérale) ;
- la marque de la barre latérale ;
- l'avatar de l'assistant ;
- les messages ;
- les écrans vides.

**Les fichiers :**
- `src/assets/mascottes-couleurs/<clé>.png` : 512 × 512, environ 210 Ko chacun, 3,1 Mo au total ;
- `src/assets/mascottes-couleurs/<clé>-<expression>.webp` : les 105 expressions (amendement 2, section suivante), 8,35 Mo au total ;
- les originaux du Bureau ne sont pas touchés.

**Les dessins au trait restent dans le code, en secours.** `USE_COLOR_MASCOTS` (`color-mascots.ts`) à `false` les rend tels quels, avec leur vie propre (regard, clignements, humeurs).

**Transparence.** Les PNG d'origine n'en ont pas : chaque compagnon est posé sur un carré blanc. Les copies du projet ont donc été détourées : le blanc relié aux bords devient transparent, avec un bord adouci. Le disque crème et le liseré du cadre restent intacts. Vérifié sur fond clair et sur une barre sombre (`.dark`), dans le navigateur, avec les vrais styles : pas de carré blanc, et les oreilles qui dépassent du cadre restent nettes. À confirmer à l'œil sur la build finale, barre claire et sombre.

### Une vie visible, mais mesurée (`mascot.css`, `mascot-motion.ts`)

Amendée le 27 novembre après le premier essai à l'œil : la première version (respiration à 1,02 et 0,6 px) passait inaperçue, et son répertoire était trop pauvre.

**Trois couches**, pour que les mouvements s'additionnent sans se gêner :
- l'enveloppe porte le survol et la réaction au clic ;
- le corps porte la respiration ;
- l'image porte le clignement.

| Moment | Où | Comment |
|---|---|---|
| Respiration avec balancement | là où le compagnon est bien visible (≥ 34 px) : barre latérale, aperçu des réglages, en-tête du panneau de l'assistant | échelle jusqu'à 1,04, 2 px de montée, ±1,2°, cycle de 4,4 s |
| Clignement | mêmes endroits | micro-écrasement vertical à 0,96, environ 120 ms. Trois fois par cycle de 34,6 s, à des intervalles irréguliers de 13,1 s, 10,5 s et 11 s. Remplacé par le vrai clignement des yeux dès que les expressions sont chargées (amendement 2) |
| Petit pop à l'ouverture | compagnon de la barre latérale | de 0,82 à 1, en 0,56 s, une fois, puis la respiration |
| S'incline et s'approche | survol, sur la barre latérale, le sélecteur et l'aperçu | -3°, 1,5 px de montée, échelle 1,03 |
| Réaction au clic | clic sur la marque de la barre latérale et sur un compagnon du sélecteur | saut et hochement : -12 % de hauteur, -3° puis +2°, en 520 ms, une fois par clic |
| Pulsation de réflexion | avatar de l'assistant pendant qu'il réfléchit | échelle 1,045, 1,6 s |
| Petit saut de contentement | humeur « content » | une fois |

**La réaction au clic** se rejoue à chaque clic, ce que le CSS seul ne sait pas faire. C'est donc une Web Animation, lancée par le clic lui-même : rien ne s'exécute au démarrage. Le saut qui se rejouait à chaque ouverture du sélecteur est retiré : la réaction ne vient plus que du clic.

**Restent calmes :**
- les petites tailles, c'est-à-dire les boutons (18 à 24 px) et les messages (28 px sans humeur) ;
- le sélecteur ne respire pas, pour ne pas faire bouger quinze visages à la fois : survol et clic seulement.

**L'interrupteur « Animations discrètes » éteint coupe tout :** respiration, clignement, pop, pulsation, survol et réaction au clic. Mesuré dans le navigateur : aucune animation de compagnon ne reste. Seules restent les transitions de survol des boutons eux-mêmes, qui existaient déjà.

**Garde-fous vérifiés dans le navigateur** (Chromium, vrais styles, marque de barre latérale et sélecteur réels) :
- **Transform seulement :** toutes les animations actives, CSS et Web Animation, ne touchent que `transform`. Rien ne bouge la mise en page.
- **Amplitudes lues sur les animations :**
  - respiration : `translateY(-2px) scale(1.04)` au sommet, `rotate(±1.2deg)` aux quarts ;
  - survol : `matrix(1.0286, -0.0539, 0.0539, 1.0286, 0, -1.5)`, soit -3° et 1,03 ;
  - clic : une animation de 520 ms sur l'enveloppe, une seule, dans la barre comme dans le sélecteur ;
  - clignement : `scaleY(0.96)` à 9,86 s, 22,96 s et 33,46 s, et 1 entre les deux.
- **`prefers-reduced-motion` :** 0 animation, même après un clic.
- **Fluidité :** 60 images par seconde (intervalle médian 16,7 ms, p95 17,6 ms) avec la marque qui respire, le sélecteur et l'avatar qui réfléchit.
- **Test** `tests/components/mascot-motion.test.ts` (3 cas) : la réaction au clic joue une fois, en transform seulement, et jamais sans `data-motion` (interrupteur éteint ou petite taille) ni quand le système demande le calme.
- **Budget de démarrage :** voir les portes. Les animations sont du CSS dans la feuille des mascottes, déjà chargée, plus une fonction appelée au clic.

### Le visage vivant, par échanges d'images (amendement 2)

Gemini a livré, pour chacun des quinze animaux, sept expressions en plus de la base : yeux fermés, joyeux, endormi, regard à gauche, à droite, en haut, surpris. Zo les a vérifiées une à une.

**Préparation des 105 images.** Même traitement que les bases, puis encodage WebP :
- réduction en 512 × 512 par `sips`, comme les bases ;
- détourage par le même algorithme, porté en JavaScript. Le portage a été contrôlé sur trois bases (chat, âne, hérisson) : 0 octet différent des PNG déjà intégrés ;
- WebP « quasi sans perte » (`nearLossless`, qualité 60). Écart maximal de 2 niveaux sur 255 par rapport à l'image détourée. Un WebP classique en qualité 92 pesait 25 Ko au lieu de 79, mais s'écartait jusqu'à 15 niveaux sur le pelage : le compagnon aurait scintillé à chaque clignement ;
- environ 79 Ko par expression (88 Ko au plus), 8,35 Mo au total. Les bases PNG restent comme elles sont ;
- noms par clé sans accents : `chat-yeux-fermes.webp`, `chevre-surpris.webp`, `ane-endormi.webp`.

**Alignement mesuré.** Après traitement, chaque expression diffère de sa base sur 0,7 % à 4 % des pixels, toujours dans le visage. Le maximum, 4 %, est le fennec qui regarde à gauche : ses grands yeux bougent beaucoup. Vérifié sur une carte des différences : rien ne change hors des yeux et de la bouche, les contours sont identiques.

**Chargement à la demande** (`color-mascot-faces.ts`) :
- le module des expressions n'est atteint que par un import dynamique, quand un compagnon vivant apparaît. Il pèse 10,9 Ko, hors du démarrage ;
- seules les images de l'animal choisi sont téléchargées : 7 WebP pour le chien, aucune des 98 autres (mesuré dans le navigateur) ;
- les 8 images (la base et les 7 expressions) sont décodées avant le premier échange : pas de saccade ;
- le sélecteur n'affiche que la base, et ne charge rien de plus.

**Comportement** (`mascot-face.ts`, `use-mascot-face.ts`). Mêmes conditions que la vie actuelle : compagnon en couleurs, « Animations discrètes » allumé, au moins 34 px, mouvement non réduit par le système. Les dessins au trait ne sont pas touchés.

| Moment | Expression | Mesuré dans le navigateur |
|---|---|---|
| Toutes les 4 à 7 s, au hasard | yeux fermés pendant 140 ms, puis retour à l'expression du moment | 143 ms et 142 ms, à 5,5 s d'écart |
| Pointeur à droite, à gauche, au-dessus | regard à droite, à gauche, en haut | les trois |
| Pointeur proche, en dessous, ou hors de la fenêtre | base | les trois |
| Clic | joyeux 700 ms, en plus du saut actuel | joyeux, puis base |
| Double-clic | surpris 500 ms | surpris, puis base |
| 60 s sans pointeur ni clic sur le compagnon | endormi, et il ne cligne plus | endormi à 61 s ; aucun changement pendant 8 s de sommeil |
| Réveil par le pointeur | base | base |
| Réveil par un clic | surpris 400 ms, puis base | surpris, puis base |

**Deux choix d'interprétation :**
- **Le sommeil ne compte que le compagnon.** Le pointeur qui bouge ailleurs dans l'app oriente le regard, mais ne le tient pas éveillé. Mesuré : endormi au bout de 61 s de mouvements ailleurs. Seuls le pointeur sur le compagnon ou un clic le réveillent.
- **Réveil par un clic.** Pour cliquer, le pointeur passe toujours sur le compagnon avant le clic, et ce passage le réveillait déjà en douceur. Le réveil par clic, avec sa surprise, n'arrivait donc jamais : c'est le premier essai dans le navigateur qui l'a montré. Désormais, un clic dans les 600 ms qui suivent un réveil par le pointeur compte comme le clic qui l'a réveillé. Le pointeur qui s'attarde sans cliquer reste un réveil doux.

**Rendu.** Les sept expressions sont empilées sur la base et seule celle du moment est visible : l'échange ne touche que la visibilité, jamais la mise en page ni le décodage. Mesuré : une seule image visible à la fois. Le micro-écrasement du clignement CSS est coupé dès que les vraies expressions sont là. Respiration, survol et saut au clic sont inchangés.

**Garde-fous vérifiés dans le navigateur** (Chromium, vrai composant) :
- mouvement réduit par le système : 0 expression chargée, 0 WebP téléchargé, 0 animation ;
- « Animations discrètes » éteint : 0 expression, 0 WebP ;
- petite taille (28 px) et sélecteur : aucune expression ;
- fluidité pendant que le pointeur tourne autour du compagnon (40 changements de regard) : intervalle médian 16,7 ms, p95 18,6 ms.

**Machine à états propre :**
- toutes les minuteries appartiennent à la machine, qui les annule à sa fin ;
- un changement de compagnon, l'interrupteur coupé ou le démontage arrêtent minuteries et écouteurs. Aucune minuterie récurrente : chaque clignement programme le suivant.

**Tests :**
- `tests/components/mascot-face.test.ts` (13 cas) : regard selon la position, clignement aléatoire de 140 ms qui rend l'expression du moment, joie, surprise, sommeil sans clignement, réveil doux et réveil par clic, plus aucune minuterie après la fin ;
- `tests/components/mascot-avatar-faces.test.tsx` (4 cas, jsdom) :
  - seules les expressions de l'animal choisi sont chargées, empilées sur la base, et le clic donne la joie ;
  - rien n'est chargé en petite taille, interrupteur éteint ou mouvement réduit ;
  - au changement de compagnon, il ne reste qu'une machine (2 minuteries), et aucune après démontage ;
  - retour à la base fixe quand on coupe les animations ;
- `tests/components/mascot-face-assets.test.ts` (15 cas) : les sept expressions de chaque animal sont trouvées par le vrai module.

## 2. Le réglage « Réduire la barre latérale » (Paramètres, Apparence)

**Constat :** le défaut existe aussi sur `master` (5.4.0), pas seulement sur la branche d'essai. Les fichiers en jeu sont identiques sur les deux branches ; l'essai ne touchait que les mascottes. Ce sont `layout-provider.tsx`, `ui/sidebar.tsx`, `app-shell.tsx` et le réglage dans `Parametres.tsx`.

**Cause.** Le choix arrive bien à la barre (`collapsible`), mais la barre ne l'applique que dans l'état réduit (`data-collapsible={state === "collapsed" ? collapsible : ""}`). Mesuré dans le navigateur, avec les vrais styles :

| Choix | Barre ouverte | Après « réduire » |
|---|---|---|
| Icônes | 248 px, aucun changement | 56 px |
| Masquée | 248 px, aucun changement | sortie de l'écran (-248 px) |
| Jamais | 248 px, aucun changement | 248 px |

- Tant que la barre est ouverte, cliquer sur le réglage ne change rien à l'écran : c'est le « ne répond plus ».
- Défaut réel en plus, avec « Jamais » : le bouton et ⌘ B passaient quand même la barre en état réduit. `AppSidebar` dessine alors sa version réduite (`isCollapsed` : petite marque, pied de compte replié) dans une barre restée large.

**Correctif :**
- `src/modules/shell/sidebar-collapse-rule.tsx`, monté dans `SidebarProvider` :
  - choisir « Icônes » ou « Masquée » réduit la barre tout de suite, pour montrer le choix ;
  - choisir « Jamais » la rouvre, puis la garde ouverte (le bouton et ⌘ B n'y font plus rien) ;
  - au lancement, le choix enregistré s'applique sans faire bouger la barre.
- `HeaderSidebarToggle` : avec « Jamais », le bouton de réduction disparaît de l'en-tête (il ne ferait rien).

**Preuves :**
- Dans le navigateur, avec les vrais styles :
  - Masquée : barre sortie de l'écran, -248 px ;
  - Icônes : 56 px ;
  - Jamais : 248 px, et toujours 248 px après le bouton puis après ⌘ B.
- Test `tests/shell/sidebar-collapse-rule.test.tsx` (jsdom, 3 cas) : le choix se voit tout de suite ; « Jamais » résiste au bouton et à ⌘ B ; le choix enregistré ne bouge pas la barre au lancement.
- **Défaut réintroduit :** sans la règle, 2 des 3 tests échouent.

## Portes

- Suite complète verte : 2 497 tests, dont celui des notes de version (trois nouveautés, sans vocabulaire technique), celui de la réaction au clic des compagnons et les 32 du visage vivant (amendement 2).
- 13 tests de licence.
- Typecheck et lint à 0, biome sans aucune règle en hausse.
- Build et `check:startup` : 284,7 ko gzip sur 300.
  - La 5.4.0 était à 284,2. Les +0,5 ko viennent du texte de la note de version et de la règle de la barre latérale.
  - Le premier amendement (animations) n'ajoute rien : 284,7 avant et après.
  - Le visage vivant non plus : 284,7. À l'octet près, le build du premier amendement (`9f5402fd`, refait dans un worktree temporaire) donne 284 732 octets gzip, celui-ci 284 738. Les +6 octets sont une seule entrée : le nom du petit fichier de la machine à états (1 Ko) dans la liste de préchargement de la coque de l'app, qui se charge déjà à la demande. Le module des expressions et les images restent hors du démarrage.
- L'app (`tauri:build`) n'a pas été recompilée : Zo la lancera.

## Non prouvé

- **Rendu dans la vraie fenêtre :** compagnons, animations, expressions et barre latérale réglée sont à voir sur la build finale. Tout a été vérifié dans le navigateur (Chromium) avec les vrais styles, pas dans WKWebView. WebKit lit le WebP depuis macOS 11. Ce qui reste à voir à l'œil, c'est la netteté des échanges d'expressions dans WKWebView.
- **À 68 px**, les regards sont discrets : les pupilles bougent de quelques pixels. Le clin d'œil joyeux et le sommeil se voient nettement.
- **Barre latérale sur mobile :** la règle ne s'applique pas au tiroir mobile, qui garde son comportement.
