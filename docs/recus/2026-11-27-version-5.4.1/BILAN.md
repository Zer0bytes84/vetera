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

### Une vie discrète (CSS seulement, `mascot.css`)

| Moment | Où | Comment |
|---|---|---|
| Respiration lente | là où le compagnon est bien visible (≥ 34 px) : barre latérale, aperçu des réglages, en-tête du panneau de l'assistant | échelle de 1 à 1,02 et 0,6 px de montée, cycle de 4,2 s |
| Petit pop à l'ouverture | compagnon de la barre latérale | de 0,82 à 1, en 0,56 s, une fois, puis la respiration |
| Se penche vers vous | survol, sur la barre latérale, le sélecteur et l'aperçu | inclinaison de -4°, 2 px de montée, échelle 1,04 |
| Se tasse à l'appui | barre latérale, sélecteur | échelle 0,95 |
| Mini saut joyeux | compagnon choisi dans le sélecteur ; humeur « content » | un saut de 9 % de sa taille, une fois |
| Pulsation de réflexion | avatar de l'assistant pendant qu'il réfléchit | échelle 1,045, 1,6 s |

- **Restent calmes :** les petites tailles, c'est-à-dire les boutons (18 à 24 px) et les messages (28 px sans humeur).
- **Réglage « Animations discrètes » éteint :** plus de respiration, de pop ni de pulsation. Le retour au survol et à l'appui reste : c'est une réponse au geste, pas une animation de fond.
- **Le saut du compagnon choisi** se rejoue chaque fois qu'on ouvre le sélecteur, puisque le choix est affiché à l'ouverture.

**Garde-fous vérifiés :**
- **Transform seulement :** dans le navigateur, toutes les animations actives ne touchent que `transform`. Rien ne bouge la mise en page, tout reste sur le compositeur.
- **`prefers-reduced-motion` :** quand le système demande le calme, aucune animation ne tourne (0 dans le navigateur) et les transitions sont coupées.
- **Fluidité :** avec 30 compagnons qui respirent en même temps, plus un qui réfléchit, la page tient 60 images par seconde (intervalle médian 16,7 ms, p95 17,5 ms, maximum 17,6 ms). L'app en anime au plus trois à la fois.
- **Budget de démarrage :** les animations n'y ajoutent rien. Mesuré avec les animations en place, avant le bump : 284,2 ko gzip, comme la 5.4.0. Les animations sont du CSS dans la feuille déjà chargée des mascottes. Les images sont des fichiers à part, chargées quand un compagnon s'affiche, hors du JavaScript de démarrage.

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

- Suite complète verte : 2 462 tests, dont celui des notes de version : trois nouveautés, sans vocabulaire technique.
- 13 tests de licence.
- Typecheck et lint à 0, biome sans aucune règle en hausse.
- Build et `check:startup` : 284,7 ko gzip sur 300. La 5.4.0 était à 284,2 ; les +0,5 ko viennent du texte de la note de version et de la règle de la barre latérale.

## Non prouvé

- **Rendu dans la vraie fenêtre :** compagnons, animations et barre latérale réglée sont à voir sur la build finale. Tout a été vérifié dans le navigateur (Chromium) avec les vrais styles, pas dans WKWebView.
- **Barre latérale sur mobile :** la règle ne s'applique pas au tiroir mobile, qui garde son comportement.
