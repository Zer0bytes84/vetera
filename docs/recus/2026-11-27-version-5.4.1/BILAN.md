# Version 5.4.1 : compagnons en couleurs et réglage de la barre latérale

Reçu du 27 novembre 2026, branche `essai/mascottes-couleurs-2026-11-27` (partie de `master` 5.4.0), tag local `v5.4.1`. Rien n'est poussé ni publié.

## 1. Les compagnons en couleurs

**Intégration.** Les quinze compagnons en couleurs remplacent les dessins au trait partout où le compagnon apparaît. Un seul aiguillage, `MascotAvatar`, sert tous ces endroits :
- le sélecteur « Votre petit compagnon » (Paramètres et menu de la barre latérale) ;
- la marque de la barre latérale ;
- l'avatar de l'assistant ;
- les messages ;
- les écrans vides.

**Les fichiers :**
- `src/assets/mascottes-couleurs/<clé>.png` : 512 × 512, environ 210 Ko chacun, 3,1 Mo au total ;
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
| Clignement | mêmes endroits | micro-écrasement vertical à 0,96, environ 120 ms. Trois fois par cycle de 34,6 s, à des intervalles irréguliers de 13,1 s, 10,5 s et 11 s |
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

- Suite complète verte : 2 465 tests, dont celui des notes de version (trois nouveautés, sans vocabulaire technique) et celui de la réaction au clic des compagnons.
- 13 tests de licence.
- Typecheck et lint à 0, biome sans aucune règle en hausse.
- Build et `check:startup` : 284,7 ko gzip sur 300. La 5.4.0 était à 284,2 ; les +0,5 ko viennent du texte de la note de version et de la règle de la barre latérale. L'animation amendée n'ajoute rien (284,7 avant et après).

## Non prouvé

- **Rendu dans la vraie fenêtre :** compagnons, animations et barre latérale réglée sont à voir sur la build finale. Tout a été vérifié dans le navigateur (Chromium) avec les vrais styles, pas dans WKWebView.
- **Barre latérale sur mobile :** la règle ne s'applique pas au tiroir mobile, qui garde son comportement.
