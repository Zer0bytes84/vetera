# Chantier erreurs : les décisions à prendre, 25 novembre 2026

**Où :** la branche `claude/erreurs-decisions`, partie de `chantier/erreurs-2026-11-19` (`8e6c9b6b`), poussée sans PR. Je n'ai touché ni à master ni à la branche du chantier.

**Ce que contient la branche :**
- ce document et ses annexes, avec les outils et les relevés de chaque mesure ;
- cinq commits `jetable(…)`, un par point. Chacun montre l'option que je recommande, et chacun se jette seul (`git revert <commit>`, ou on ne le reprend pas).
- **Aucune famille n'est appliquée en entier.** Le commit `jetable(A2)` range 225 des 327 fichiers : uniquement ceux dont l'assemblage est prouvé identique.

**Le point de départ, remesuré :** typecheck 0, lint 0, 2 117 tests verts, 2 801 remarques Ultracite et 2 avertissements sur le périmètre de `npm run check`.

**L'équipage :**
- trois analyses en parallèle ont classé les familles du point C site par site ;
- deux équipes rouges ont contesté le reste, en refaisant les mesures. Elles ont porté 23 objections. Leurs corrections sont intégrées au texte, et chaque fois que l'une a changé une recommandation ou un chiffre, le texte le dit.
- Leurs rapports complets : `rouge-1-A-B-D.md` et `rouge-2-C.md`.

## Les décisions en une page

| Point | Ma recommandation | La preuve | Patch d'essai |
|---|---|---|---|
| A1, tri de `window-controls.css` | retirer `right: auto` **et** `left: auto`, puis trier. L'option « retirer `right: auto` » seule déplace la barre en arabe | 0 écart de style, en français et en arabe, normal et agrandi, dans Chromium et dans l'app (aperçu) | `jetable(A1)` |
| A2, `organizeImports` | prendre les **225** fichiers à l'assemblage identique ; les **93** dont seul l'ordre d'exécution change, après ton accord et un passage dans l'app ; garder l'ordre des **9** qui changent le CSS (`biome-ignore-all`) | assemblage de production comparé fichier par fichier ; `dist/` identique octet pour octet avec les 225 | `jetable(A2)` (les 225) |
| A3, `useAtIndex` | prendre les 16 propositions : sur 13 sites le vide est impossible, 3 le traitaient déjà | exécution identique par la spécification ; typecheck, lint, tests verts | `jetable(A3)` |
| B, les neuf fichiers lus par des tests | adapter 8 tests pour qu'ils lisent le code et non sa mise en page ; puis formatter les fichiers avec le protocole habituel | les tests adaptés passent sur les sources d'origine et formatées (2 117 sur 2 117 chaque fois) ; 10 mutations attrapées | `jetable(B)` |
| C, les familles qui changent un comportement | voir le tableau du point C : appliquer en tout ou en partie 8 familles, en désactiver ou en exempter 4 autres (plus 4 règles d'accessibilité), en garder 2 en avertissement | classement site par site, essais tsc et tests par famille | aucun (un exemple en patch dans `releves/c/`) |
| D, tests de durée | sortir l'import du test de prévision dans un `beforeAll`, donner à l'annexe PDF les 20 s de son voisin ; laisser `chunk-cycles` en parallèle | 8 suites complètes, dont 2 sous charge ; aucun échec reproduit | `jetable(D)` |

**À traiter en priorité, hors du chantier :** l'aperçu des notes exécute le HTML d'une note (`NotesPro.tsx:980`), sans CSP. Voir le point C, « ce que l'examen a trouvé ».

**Avec les cinq patchs d'essai ensemble :**
- typecheck 0, lint 0 ;
- **2 117 tests sur 2 117** ;
- 2 554 remarques, contre 2 801 : moins 6 (A1), moins 225 (A2), moins 16 (A3).
## A1. `useSortedProperties` dans `window-controls.css`

**Ce qui change.** Le tri remonte `inset-inline-end: 0` au-dessus de `right: auto` et `left: auto`. La dernière déclaration l'emporte : `right: auto` gagne, et la barre des boutons de fenêtre quitte le coin.

**Un fait que le bilan ne disait pas : l'app existe aussi en arabe.** `App.tsx` pose `dir="rtl"` sur la racine quand la langue est l'arabe. En arabe, `inset-inline-end` vise la gauche : la barre est aujourd'hui en haut à gauche, du côté où l'en-tête lui garde sa place (`padding-inline-end`). Toute option doit donc tenir dans les deux sens.

**La mesure.** Deux outils, dans `outils/` :
- `a1-placement.mjs` monte la barre de decorum (`#window-controls`, trois boutons de 46 px) dans Chromium, fenêtre de 1 280 px. Il relève la place de la barre et du bouton Fermer, en `ltr` et en `rtl`, fenêtre normale, agrandie et plein écran, et compare tous les styles calculés à l'origine.
- `css-blocs.mjs` applique chaque règle du fichier, avant puis après, à un élément, en `ltr` puis en `rtl`, et compare tous les styles calculés.

Relevés : `releves/a1/` (les six variantes du fichier, `placement.json`, `regles.txt`).

| Variante | Barre en français (x, largeur) | Barre en arabe | Écarts de style, toutes règles |
|---|---|---|---|
| Origine | 1 142, 138 : coin droit | 0, 138 : coin gauche | référence |
| Trié tel quel | **8** : la barre part à gauche (0 dans l'app) | **1 134** : elle part à droite (1 142 dans l'app) | 2 règles × 2 sens |
| Option 1 : fichier exclu du tri | inchangé | inchangé | 0 (rien ne bouge) |
| Option 2 : `right: auto` supprimé, puis trié | 1 142 | **1 134** : à droite (1 142 dans l'app), en face de la place gardée | 1 (en `rtl`) |
| **Option 3 : `right: auto` et `left: auto` supprimés, puis trié** | 1 142 | 0 | **0** |

- Les valeurs 8 et 1 134 viennent de la marge de `<body>` de la page de mesure : dans l'app, la barre déplacée va à 0 ou à 1 142.
- Le plein écran cache la barre dans toutes les variantes (`display: none`), comme avant.
- Option 2, en arabe : une fois `right: auto` parti, le tri place `inset-inline-end: 0` avant `left: auto`, qui l'emporte. La barre se retrouve à droite, alors que l'en-tête lui garde la place à gauche. L'option proposée par le bilan ne tient donc qu'en français.
- Option 3 : `right` et `left` valent `auto` par défaut. Seul `inset-inline-end` les fixait, et aucune autre règle ne vise `#window-controls` (vérifié dans `src/` et `index.html`). decorum ne pose `left: 0` en style en ligne que s'il crée l'élément lui-même. Le nôtre est déjà dans `index.html`, donc ce code ne s'exécute pas (lu dans `tauri-plugin-decorum` 1.1.1, `src/js/titlebar.js`).
- Une fois trié, le fichier ne porte plus aucune remarque. Les 6 `useSortedProperties` disparaissent, et aucune autre famille n'y reste.

**Ma recommandation : l'option 3.** Elle retire les deux déclarations mortes, laisse le tri passer, et la barre reste au même pixel dans les deux langues, en fenêtre normale et agrandie. Le patch d'essai est le commit `jetable(A1)`.

**L'équipe rouge l'a mesurée dans l'app.** Elle a utilisé le serveur de développement, l'aperçu des boutons Windows (`baitari:window-controls-preview`) et le `<style>` que decorum injecte. L'option 3 donne 0 écart de style sur 6 états et 4 éléments, en français et en arabe, et la variante témoin (triée telle quelle) est bien détectée.

**Ce qui n'est pas prouvé.** La mesure porte sur Chromium. Windows affiche l'app dans WebView2, qui est un Chromium, mais rien n'a été lancé sous Windows. Dans l'app, la mesure s'arrête à l'écran d'activation : la place que l'en-tête garde aux boutons n'y a pas été mesurée.

## A2. `organizeImports`, 327 fichiers

**Ce qui change.** Ranger les imports change l'ordre dans lequel les modules s'exécutent. Il change aussi l'ordre dans lequel Vite assemble le CSS de chaque morceau et l'injecte dans la page. Rangés tous ensemble, les 327 fichiers donnent ceci, mesuré avec le relevé décrit plus bas :
- 4 feuilles CSS changent de contenu, et l'ordre de chargement des feuilles change à 7 endroits ;
- 10 morceaux JS apparaissent ou disparaissent ;
- l'ordre des modules change dans 19 morceaux, et les imports de morceaux dans 49.

Le bilan disait la même chose (205 entrées différentes, `app-shell` qui change de découpage).

**Le protocole.** Il tient en trois outils, dans `outils/` :
- `a2-vite.mesure.config.ts` fait l'assemblage de production réel (la configuration du projet, plus un relevé). Pour chaque morceau JS, y compris ceux des workers, il note l'ordre de ses modules (l'ordre d'exécution), ses imports et ses feuilles. Pour chaque feuille CSS, il note une empreinte de son contenu. Les noms sont débarrassés de leur empreinte.
- `a2-compare.mjs` compare deux relevés. Il compare aussi **l'ordre réel du CSS dans le navigateur** : les `<link>` de `index.html`, puis, pour chaque import dynamique, la liste des feuilles que le préchargement de Vite injecte (`__vite__mapDeps`), dans l'ordre. Il classe le résultat en trois verdicts :
  - **IDENTIQUE :** tout est pareil, CSS, ordre du CSS, morceaux, ordre des modules, imports ;
  - **CSS_IDENTIQUE :** le CSS et son ordre sont pareils, seul l'ordre d'exécution du JS change ;
  - **CSS_CHANGE :** le CSS ou son ordre change.
- `a2-protocole.sh` range les imports d'un seul fichier, assemble (6 à 8 s), puis compare au relevé de départ. Un fichier IDENTIQUE reste rangé et le suivant part de là. Sinon, il est remis tel quel, et son écart est noté.

**Le protocole tient : la preuve.**
- Deux assemblages de départ successifs donnent le même relevé : l'assemblage est déterministe.
- Les 327 fichiers rangés ensemble donnent bien CSS_CHANGE. L'outil voit donc l'écart que le bilan avait vu.
- À la fin, les 225 fichiers gardés ensemble redonnent un assemblage IDENTIQUE au départ. Le texte JS compilé est lui aussi identique, dans les 180 morceaux. L'équipe rouge a refait l'assemblage avec le patch : les 493 fichiers de `dist/` (JS, workers, CSS, `index.html`, wasm, polices) sont identiques octet pour octet.

**Le résultat, fichier par fichier** (`releves/a2/journal.tsv`) :

| Verdict | Fichiers | Ce que ça veut dire |
|---|---|---|
| IDENTIQUE | **225** | aucun effet sur l'app assemblée : même JS, même CSS, même ordre |
| CSS_IDENTIQUE | **93** | même CSS ; l'ordre d'exécution de modules ou de morceaux change |
| CSS_CHANGE | **9** | l'ordre du CSS change |

**Les 93 CSS_IDENTIQUE : ce qui s'exécute dans un autre ordre.** Une seconde passe a relevé, pour chacun de ces 93 fichiers rangé seul par-dessus les 225, la liste des modules et des morceaux déplacés (`releves/a2/passe2/`). `a2-effets.mjs` lit ensuite chaque module déplacé et y cherche ce qui s'exécute au chargement :
- **bibliothèques :** 1 262 modules déclarent `sideEffects: false`, ou seulement leur CSS ; 83 ne déclarent rien (React, Tauri, date-fns…), et ce sont des modules de définitions ;
- **modules de `src/`, selon mon outil :** 297 sans instruction exécutée au chargement, et 20 qui n'importent que du CSS, déjà couvert par la comparaison du CSS ;
- **Les modules de `src/` qui ont du code au chargement.** Mon outil en a vu 20. L'équipe rouge a montré qu'il en ratait 13 : il ne regarde que les instructions de premier niveau les plus simples, pas les `if`, `export default`, membres `static` ni appels imbriqués. Sur les 33 :
  - la plupart ne font que construire des valeurs : dépôts, formateurs `Intl`, schéma zod, files `Promise.resolve()`, lexique. Certaines lisent un autre module ou `localStorage` ;
  - **six agissent vraiment** : `main.tsx`, `i18n/config.ts` (qui lance i18next), et quatre abonnements, chacun le seul abonné de premier niveau à son évènement :
    - `care-tasks/service.ts` : la facturation à la fin d'un soin ;
    - `rooms/use-rooms.ts` : `ROOMS_CHANGED` ;
    - `tour/tour-store.ts` : `storage` ;
    - `hooks/useSQLite.ts` : `DATA_CHANGED_EVENT`, qui vide le cache.
- **Pourquoi l'ordre ne change rien, l'argument qui tient :**
  - **aucun cycle d'imports** entre les 645 fichiers de `src/` (2 688 liens, mesuré par l'équipe rouge et contrôlé sur un cycle témoin) ;
  - aucun cycle entre morceaux (`chunk-cycles` passe avec les 225 et les 93 appliqués) ;
  - un module est donc toujours évalué après ce qu'il importe, quel que soit l'ordre entre frères. Chaque abonnement est seul sur son évènement, donc l'ordre des abonnés ne change pas. Aucun module n'appelle i18n au chargement.
- **Les 93 ensemble** (mesuré par l'équipe rouge, rangés par-dessus les 225) : toujours CSS_IDENTIQUE, mais le découpage change. 11 morceaux apparaissent ou disparaissent (par exemple `useSQLite.js` part et `primitives.js` arrive), et le texte JS change dans 71 morceaux.

Ces 93 fichiers sont donc sûrs par analyse, mais pas par identité.

**Les 9 CSS_CHANGE :**
- **`NotesPro.tsx`, `stock-workspace.tsx`, `finances-view.tsx` :** les mêmes feuilles, injectées dans un autre ordre par le préchargement de la coquille.
- **`app-shell.tsx`, `patient-peek.tsx` :** le découpage du CSS change (une feuille déplacée vers un autre morceau).
- **`clinical-workspace.tsx`, `local-consultation-assistant.tsx`, `clinical-dashboard-view.tsx`, `premium-analytics.tsx` :** les mêmes règles, dans un autre ordre à l'intérieur d'une feuille. `a2-css-permutation.mjs` compte, parmi les règles qui ont échangé leur place, celles qui déclarent une même propriété sur un sujet qui peut être le même élément :
  - `local-consultation-assistant` : 0 ;
  - `clinical-workspace` : 6, entre Soins et Hospitalisation, deux vues qui ne s'affichent jamais ensemble ;
  - `clinical-dashboard-view` : 18 ;
  - `premium-analytics` : 16.

  Cette heuristique ne prouve ni un effet ni son absence.

**Ma recommandation, en trois temps :**
1. **Les 225 fichiers IDENTIQUE : les prendre.** Ils sont prouvés sans effet par l'assemblage lui-même. Le patch d'essai est le commit `jetable(A2)` : typecheck, lint et suite complète passent, voir les contrôles. Il faut repasser `biome format` sur `patient-header.tsx`, où le rangement laisse `import {AlertTriangle,` (remarque de l'équipe rouge, faite dans le commit).
2. **Les 93 CSS_IDENTIQUE : les prendre ensuite, en un lot.** Il faut d'abord ton accord sur l'argument ci-dessus, puis un passage dans l'app de bureau avec ce lot, puisque son découpage change : démarrage, Soins, une facture après un soin, les salles, le tour.
3. **Les 9 CSS_CHANGE : garder leur ordre d'imports,** avec en tête de fichier `// biome-ignore-all assist/source/organizeImports:` et la raison. C'est vérifié : Biome ne les signale plus. L'ordre actuel est celui que l'app montre depuis la 5.1 : le changer serait un changement de rendu, à décider écran par écran, et pas par un outil de tri.

**Ce qui n'est pas prouvé.**
- Pour les 93, l'absence d'effet repose sur l'absence de cycle et sur la revue des modules qui agissent au chargement, pas sur une exécution comparée.
- Le formatage des neuf fichiers du point B et ce rangement se recouvrent : `b-sources-formatees.patch` ne s'applique plus après A2 (`use-consultation-session.ts`). L'ordre de travail compte : A2 d'abord, puis B.
- Pour les 9, l'heuristique de chevauchement ne tient pas compte de l'imbrication réelle des vues.
- Rien n'a été lancé dans l'app de bureau.

**Pour relancer :** copier `outils/a2-vite.mesure.config.ts` à la racine du dépôt, puis lancer `outils/a2-protocole.sh <liste de fichiers> <dossier>`. Les chemins de travail (`/tmp/claude-0/…`) sont en tête des scripts.

## A3. `useAtIndex`, 16 sites

**Ce qui change à l'exécution : rien.** Sur un tableau, `arr.at(-1)` et `arr[arr.length - 1]` rendent la même valeur, y compris `undefined` sur un tableau vide (spécification d'`Array.prototype.at` : l'indice `-1` devient `length - 1`, et s'il est négatif, le résultat est `undefined`). Seul le type change : `at()` rend `T | undefined`, alors que l'accès par indice rend `T`, puisque `noUncheckedIndexedAccess` n'est pas activé. Appliquer le correctif de Biome donne **15 erreurs `tsc` sur 13 sites**. Les 3 autres sites traitaient déjà le cas vide.

La décision porte donc sur ce qu'on écrit pour le cas vide. Ce n'est un choix de comportement que là où le vide peut arriver. J'ai relu chaque site pour savoir si le vide est possible.

| Site | Le vide est-il possible ? | Aujourd'hui, si vide | Proposition | Effet |
|---|---|---|---|---|
| `mascot/use-mascot-life.ts:69` | Non : garde `eyes.length` juste avant | — | garde sur `first && last` | identique |
| `ui/stat-grid.tsx:333` | Non : l'appelant exige `trend.length > 1` | TypeError (déstructuration de `undefined`) | `if (!end) return null` | identique ; un jour vide, rien au lieu d'un plantage |
| `patterns/initials-avatar.tsx:17` | Non : 2 mots ou plus ici | — | `words.at(-1)?.[0] ?? ""` | identique |
| `agenda/agenda-calendar.tsx:87` | Non : `getWeekDays` rend toujours 7 jours | — | `weekDays.at(-1) ?? first` | identique |
| `agenda/use-agenda-page-model.tsx:637` | Non : mêmes 7 jours | — | `weekDays.at(-1) ?? start` | identique |
| `agenda/agenda-layout.ts:255` | Non : `out` part de `[0]` | — | `(out.at(-1) ?? 0) + h` | identique |
| `local-ai/treatment-routing.ts:240` | Non : la première clause d'une phrase ouvre toujours un groupe | TypeError, la dictée guidée échoue | ouvrir un groupe s'il n'y en a pas, puis `groups.at(-1)?.push` | identique ; si l'invariant casse un jour, la clause est gardée au lieu de planter |
| `local-ai/treatment-routing.ts:248` | Non : groupes vides filtrés juste avant | — | `(parts.at(-1) ?? "")` | identique |
| `local-ai/treatment-routing.ts:265` | Oui, au premier tour | déjà géré (`last &&`) | `groups.at(-1)` | identique, sans erreur de type |
| `v2/kpi-visuals.tsx:271` | Non : sous `points.length >= 2` | — | `lastPoint` calculé avant, ajouté à la condition | identique |
| `v2/kpi-visuals.tsx:275` | Oui | déjà géré (`lastPoint ? … : …`) | `points.at(-1)` | identique |
| `v2/settle-widgets.tsx:95` | Non : `values.length < 2` rend `null` plus haut | — | `if (!lastPoint) return null` | identique |
| `finances/receivables-aging.ts:36` | Non : liste constante de 4 tranches | — | `AGING_BUCKETS[3]`, la tranche « Plus de 90 jours » | identique ; TypeScript connaît la tranche |
| `hospitalizations/vitals-chart.tsx:32` | Non : `sorted.length < 2` rend `null` | — | `latest` lu avant la garde, ajouté à la garde | identique |
| `stays/stay-detail.tsx:217` | Non : sous `vitals.length > 0` | — | `latestVitals && …` | identique |
| `patients/patient-kpi-strip.tsx:40` | Oui, animal jamais pesé | déjà géré (`lastWeight?.`, `lastWeight ? …`) | `sortedWeights.at(-1)` | identique, sans erreur de type |

**La mesure.** Le patch d'essai (commit `jetable(A3)`) applique ces 16 propositions :
- typecheck 0, lint 0 ;
- plus aucune remarque `useAtIndex`, et aucune nouvelle remarque Biome dans les 13 fichiers ;
- les 24 fichiers de tests liés aux 13 fichiers passent (240 tests) ;
- la suite complète passe sur la branche, voir la section des contrôles.

**Ma recommandation : prendre le patch.** Sur 13 sites, le vide est impossible : le comportement ne change pas. Sur 3 sites, il était déjà traité. Deux sites, `stat-grid` et `treatment-routing:240`, plantaient si leur invariant cassait un jour. Ils ne plantent plus, ce qui reste le comportement le plus sûr pour une dictée clinique.

**L'équipe rouge** a reproduit les 16 sites et les 15 erreurs. Tous les receveurs sont de vrais tableaux, et aucune garde ajoutée ne passe avant un hook. Elle ajoute deux remarques :
- `AGING_BUCKETS[3]` deviendra faux sans alerte si une tranche est ajoutée un jour. Un commentaire le dit dans le patch ; `AGING_BUCKETS.at(-1)!` serait l'autre choix, au prix d'un `!` ;
- `.at()` demande Safari 15.4, donc macOS 11 au moins pour l'app de bureau. `src/` en contient déjà 25 : ce n'est pas une nouvelle exigence.

**Ce qui n'est pas prouvé.** « Le vide est impossible » est prouvé par la lecture des gardes et des constructions, pas par un test qui force chaque cas.

## B. Les neuf fichiers que des tests lisent mot à mot

**Le compte exact.** Les 496 remarques des neuf fichiers ne sont pas toutes débloquées par le formatage :

| Fichier | Remarques |
|---|---|
| `design-system/clean.css` | 136 |
| `index.css` | 129 |
| `components/CommandPalette.tsx` | 89 |
| `design-system/premium.css` | 53 |
| `shell/app-shell.tsx` | 38 |
| `shell/premium-sidebar.css` | 35 |
| `flow-board/open-in-flux.ts` | 7 |
| `shell/window-controls.css` | 6 (point A1) |
| `consultation-workspace/use-consultation-session.ts` | 3 |

- **388 sont mécaniques**, des familles déjà prouvées ailleurs : tri des propriétés 273, tri des classes 42, tri des attributs 38, `useBlockStatements` 23, formatage 8, et 4 autres.
- **108 restent** même après le formatage : 105 appartiennent aux familles du point C (`noDescendingSpecificity` 82, `noVoid` 5, `useTopLevelRegex` 5, etc.) et 3 à `organizeImports` (point A2).
- En dehors de `window-controls.css` (point A1), le formatage débloque donc **382 remarques**, pas 496.

**La mesure.** Sur une copie de la branche, j'ai appliqué aux huit autres fichiers les familles mécaniques déjà appliquées ailleurs, sans `organizeImports` (point A2). J'ai fait de même pour les deux exclusions partielles, `choice-controls.tsx` (tri des attributs) et `stat-grid.tsx` (tri des classes). Puis j'ai lancé la suite complète.
- **16 assertions échouent dans 6 fichiers de tests,** et deux autres dans deux fichiers avec les exclusions partielles. Aucun autre test ne bouge.
- Les tests touchés : `theme-clean-charter` (8), `sidebar-tone` (3), `header-search` (2), `agenda-ouvrir`, `clinic-services`, `fix-breches-workflow` (1 chacun), plus `theme-clean-charter` (classes de `stat-grid`) et `ai-models-onboarding` (ordre des attributs HTML) pour les exclusions partielles.
- Les causes, toutes de mise en page :
  - un sélecteur réparti sur plusieurs lignes ;
  - un appel coupé à la ligne ;
  - un `else` qui reçoit ses accolades ;
  - une chaîne de classes réordonnée ;
  - des attributs HTML réordonnés.

**Option 1 : adapter les tests (patch d'essai, commit `jetable(B)`).**
- Un petit module `tests/helpers/code-text.ts` :
  - `codeText`, pour le JS seulement, défait ce que le formatage change dans le source et dans le fragment attendu : chaque suite d'espaces devient une espace ; l'espace juste après `(`, `[`, `{` et juste avant `)`, `]`, `}`, `,`, `;` disparaît, ainsi que le retour à la ligne avant `.membre` et la virgule finale. Toutes les autres espaces restent, et donc le sens d'une chaîne ou d'un sélecteur ;
  - `selectorText` récrit un sélecteur sur une ligne ;
  - `hasClassName` compare un ensemble de classes, quel que soit leur ordre ;
  - `tagsWith` lit une balise rendue, quel que soit l'ordre de ses attributs.
- Les tests de charte CSS lisaient déjà la feuille avec postcss. Ils normalisent maintenant les sélecteurs à la lecture. Deux lectures par regex deviennent des requêtes sur l'arbre CSS :
  - la variante `@custom-variant dark`, lue par postcss ;
  - le trait des icônes : la dernière déclaration `stroke-width` de la règle, celle qui l'emporte, doit être la bonne.
- **Le coût :** 8 fichiers de tests, 89 lignes ajoutées et 24 retirées, et aucun fichier de `src/` touché.
- **La preuve :**
  - les tests adaptés passent sur les sources d'origine et sur les sources formatées : **2 117 tests sur 2 117 dans les deux cas** ;
  - ils attrapent toujours ce qu'ils gardent : **10 mutations, toutes attrapées**, dont 3 proposées par l'équipe rouge :
    - un `else` qui ouvre au lieu de cibler ;
    - le `return` retiré après le refus de clôture ;
    - `!important` retiré du trait des icônes ;
    - une seconde déclaration qui écrase le trait ;
    - un sélecteur descendant devenu composé ;
    - la garde de la variante `dark` devenue descendante, par une seule espace ;
    - la garde `dark` inversée ;
    - l'état de la palette inversé ;
    - la condition d'hospitalisation retirée ;
    - l'interrupteur qui n'est plus désactivé ;
  - le formatage des fichiers lui-même reste à faire, avec les preuves de la phase mécanique (JavaScript compilé identique, styles calculés identiques). Le patch d'essai ne le contient pas.
- **L'équipe rouge a cassé la première version.** Elle retirait aussi les espaces autour de `.`, `:`, `*`, `-` et `/`. Elle confondait ainsi `.a .b` et `.a.b`, ou « Note : » et « Note: » (6 paires de sens différent sur 6 essayées). Deux mutations que l'ancien test attrapait passaient avec le nouveau. La version du patch corrige les deux, et les 10 mutations ci-dessus tournent sur elle.
- **Ce que les tests perdent :** `codeText` confond encore `f( x )` et `f(x)`, ou `"a ;"` et `"a;"` dans une chaîne. C'est voulu pour les parenthèses, rare dans les chaînes. La fenêtre `[\s\S]{0,400}` de `clinic-services` porte sur un texte un peu plus court qu'avant.

**Option 2 : garder les neuf fichiers tels quels.**
- **Le coût :** 388 remarques gardées pour toujours, dont 382 hors `window-controls.css`.
- Une liste d'exclusions à tenir à la main, que Biome ne connaît pas : il faudra l'ajouter dans `biome.jsonc` (`files.includes` avec des `!`), sinon `npm run check` ne passera jamais.
- Les quatre feuilles les plus lues de l'app (`index.css`, `clean.css`, `premium.css`, `premium-sidebar.css`) gardent une mise en page qui diverge du reste.

**Ma recommandation : l'option 1.** L'adaptation est petite et prouvée dans les deux sens. Elle rend ces tests indifférents à toute mise en page future, et pas seulement à celle-ci. Le formatage des neuf fichiers passera ensuite par le protocole de la phase mécanique, comme les 507 autres fichiers.

**Ce qui n'est pas prouvé.** Les mutations couvrent un cas par test touché, pas chaque assertion.

## C. Les familles qui changent un comportement, par risque croissant

**Le tableau d'ensemble.** Pour chaque famille : le compte, le classement des sites par risque, et ma recommandation. Le détail de chaque famille (sites un par un, exemples travaillés, mesures) est dans trois annexes. Chaque site y a sa classe et son remplacement proposé, aussi en JSON dans `releves/c/`.
- `C-1-async-assertions-dependances.md`
- `C-2-cles-boucles-css-noms.md`
- `C-3-accessibilite-void-ternaires-complexite.md`

`useTopLevelRegex` et `noBitwiseOperators` sont détaillés juste après le tableau.

| Famille | Sites | Le classement mesuré | Ma recommandation |
|---|---|---|---|
| `useTopLevelRegex` | 213 | **aucune** expression avec `g` ou `y` : toutes sans état | appliquer, fichier par fichier, avec des noms ; exemple travaillé sur `period.ts` |
| `noBitwiseOperators` | 67 | du calcul voulu dans 7 fichiers, dont 57 sites dans l'ancien hachage des mots de passe et le format des sauvegardes | ne pas réécrire ; `overrides` pour `auth.ts`, `backupCrypto.ts` et `uuid.ts` (61 sites), un `biome-ignore` par ligne pour les 6 autres |
| `useAwait` | 82 | 36 sûrs ; 9 exigés par un type ; 12 dont un appelant dépend de la promesse ; 25 qui peuvent lever (un throw deviendrait synchrone) | retirer `async` des 36 ; `biome-ignore` justifié sur les 46 autres |
| `noNonNullAssertion` | 108 | 6 redondants ; 72 gardés par un test que TypeScript ne voit pas ; 27 garantis par construction ; 3 non garantis (valeur lue en base) | réécrire les 78 premiers pour que TypeScript prouve ; erreur nommée pour les 27 ; vraie garde pour les 3 |
| `useExhaustiveDependencies` | 41 | 7 sûrs (valeurs stables) ; 3 manquants sans raison ; 31 omissions voulues (11 déjà sous `eslint-disable`, 20 déclencheurs) | appliquer les 7 ; `useEffectEvent` pour les 3 ; `biome-ignore` avec la raison pour les 31 |
| `noArrayIndexKey` | 45 | 37 listes statiques ; 7 listes dynamiques avec un identifiant et sans état ; 1 vraie : les lignes de facture modifiables | ignorer les 37 ; identifiant pour les 7 ; pour la facture, ajouter un `id` aux lignes, à décider (focus après suppression) |
| `noForEach` + `useIterableCallbackReturn` | 46 + 42 | 61 appels distincts : tableaux 30, Set 11, NodeList 2, Map 1 (`.values()`), 2 `return` devenus `continue`, 15 avec index | `for…of` pour les 46 (essai : 0 remarque, typecheck vert, 350 tests verts) ; corps en bloc pour les 15 avec index |
| `noDescendingSpecificity` (CSS) | 117 | 64 paires sans effet par construction ; 40 jamais sur le même élément dans 28 vues ; 13 vrais chevauchements | **ne pas réordonner,** désactiver la règle, **après avoir corrigé deux vraies surcharges mortes** trouvées par l'équipe rouge (voir plus bas). L'essai de réordonner (101 règles, 13 978 éléments comparés sur 20 vues) ne change aucun style, mais laisse 30 remarques et 568 lignes de diff |
| `useFilenamingConvention` | 55 | le kebab-case imposé ; renommer réécrit 330 références, dont 4 tests qui lisent un chemin ; 8 renommages de casse seule, risqués sur macOS et Windows | exception nominative des 55 fichiers dans `biome.jsonc` ; renommer plus tard, dossier par dossier |
| Accessibilité | 203 | **23 vrais défauts** : 9 étiquettes orphelines (stock), 10 `aria-label` sur un div ou un span sans rôle (nom calculé par Chromium, mais non garanti par ARIA), 1 `aria-selected` sur un `article`, la courbe des constantes sans texte, 2 boutons sans `type` ; le reste, des faux positifs ou des choix ARIA voulus | corriger les 23 ; option `inputComponents`, qui fait tomber `noLabelWithoutControl` de 62 à 11 ; couper `useSemanticElements`, `noStaticElementInteractions`, `noNoninteractiveElementInteractions` et `useImageSize` |
| `noVoid` | 346 | 202 instructions, 144 rappels ; sans `void`, seuls 3 sites cassent (`NotesPro.tsx:382`, deux dans `vite.config.ts`), et tsc les refuse | désactiver la règle : `void` y dit « promesse lancée exprès », et la règle n'a pas d'option |
| `noNestedTernary` | 375 | 293 chaînes : 229 à deux niveaux, 49 sur une même variable comparée à des littéraux | passer en avertissement ; réécrire d'abord les 49. Essai sur 3 chaînes, équivalence vérifiée sur 196 combinaisons |
| `noExcessiveCognitiveComplexity` | 160 | médiane 30, maximum 163 (`assemblePatientRecordSnapshot`) | avertissement au seuil 20, qui ne fait pas échouer le lint (vérifié) ; en erreur, un seuil de 60 laisse 14 fonctions |
| Les petites (25 règles) | 140 environ | la plupart sans risque ; `noEmptyCharacterClassInRegex` et `noFocusedTests` sont des faux positifs (`[^]`, une méthode `this.fit`) | corriger en une passe, sauf les deux faux positifs |

**Ce que l'examen site par site a trouvé, qui dépasse le lint :**
1. **À traiter en priorité, hors du chantier erreurs : l'aperçu des notes exécute du HTML.** `NotesPro.tsx:980` injecte le HTML de la note tel qu'il est en base (`dangerouslySetInnerHTML`). L'éditeur Tiptap ne le nettoie pas, puisqu'il se synchronise avec `emitUpdate: false`. Dans Chromium, un `<img onerror>` placé dans une note s'exécute à l'aperçu (mesuré par l'équipe rouge). La CSP est désactivée (`"csp": null`) et `withGlobalTauri: true` : le script aurait accès aux API Tauri que l'app ouvre, dont le disque personnel et le SQL. Une note piégée peut arriver par une sauvegarde restaurée ou par le réseau de la clinique. Ce n'est pas démontré de bout en bout dans l'app de bureau, et l'authentification du réseau n'a pas été vérifiée. La correction est simple : nettoyer le HTML à l'affichage (DOMPurify), et poser une CSP.
2. **Les étapes du tour (`tour-steps.ts`) ont une méthode `then`.** Un `await` sur une étape ne se résoudrait jamais. Aucun code ne le fait aujourd'hui : c'est un piège, pas un bogue.
3. **Les lignes de facture modifiables ont l'index pour clé.** Mesuré dans Chromium sur une reproduction : après une suppression au clavier, le focus reste sur le bouton Supprimer de la ligne suivante. Une clé par description ferait perdre le focus à chaque lettre tapée.
4. **`calendar.tsx` définit des composants dans son rendu.** Les jours sont probablement remontés à chaque rendu. Ce n'est pas mesuré.
5. **Deux surcharges CSS qui ne s'appliquent jamais** (trouvées par l'équipe rouge parmi les paires `noDescendingSpecificity`) :
   - en mode sombre, le libellé d'étape de l'écran d'activation garde le bleu du mode clair, `rgb(10, 111, 159)`, mesuré dans Chromium. Son contraste est de 3,30:1, sous le seuil de 4,5:1 (`auth-clinic.css:639`) ;
   - la préférence « transparence réduite » ne s'applique pas aux bannières illustrées (`index.css:1648`).
6. **Le compteur du centre de notifications** (`notification-center.tsx:345`) : la correction `role="img"` proposée dans l'annexe ne change rien. Mesuré dans Chromium, le bouton s'appelle toujours « Notifications ». Le nombre doit aller dans l'`aria-label` du bouton.

### `useTopLevelRegex`, 213 sites (210 dans `src/`, 96 fichiers)

- **Ce qui change :** une expression régulière écrite dans une fonction est recréée à chaque appel. Sortie au niveau du module, elle est créée une fois. Le seul risque, c'est l'état : une expression avec le drapeau `g` ou `y` garde `lastIndex` d'un appel à l'autre, et `test` ou `exec` reprendraient là où le précédent s'est arrêté.
- **La mesure, le point clé : aucun des 210 sites n'a `g` ni `y`.** Les drapeaux relevés : aucun drapeau 144, `i` 31, `u` 21, `iu` 13, `s` 1. Sans `g` ni `y`, `test` et `exec` ne lisent ni n'écrivent `lastIndex` (spécification, `RegExpBuiltinExec`). Aucun code de `src/` ne touche `lastIndex` ni `compile` : le seul `lastIndex` trouvé est un `lastIndexOf` de chaîne. Les usages : `test` 96, `split` 36, `replace` 25, `exec` 21, `match` 6, passée en argument 26.
- **Les sites, par risque :** une seule classe, sans état. Le seul travail est de nommer chaque constante. Trois motifs reviennent souvent : `/\s+/` (17 fois), la date ISO `/^\d{4}-\d{2}-\d{2}$/` (12 fois) et l'heure `HH:MM` (6 fois). Ils méritent une constante partagée.
- **Exemple travaillé :** `assistant-answers/period.ts`, le fichier qui en a le plus (16). Les 16 expressions deviennent 16 constantes nommées en tête du fichier : `YESTERDAY = /\bhier\b/`, `LAST_N = /\b(\d{1,4}) (?:derniers|dernieres) (jours|semaines|mois)\b/`… Typecheck 0, lint 0, plus aucune remarque, et les 3 fichiers de tests liés passent (80 tests). Le patch est dans `releves/c/useTopLevelRegex-period.patch`, sans commit : il montre la forme, il n'applique pas la famille.
- **Ma recommandation : l'appliquer, fichier par fichier.** Les constantes partagées vont dans un module `lib/patterns.ts`. Une famille sans risque d'exécution, mais 210 noms à choisir : à faire à la main, pas en lot.
- **L'équipe rouge** a recompté les 213 sites sur le texte complet des expressions, sans passer par l'extrait des diagnostics : aucun n'a `g` ni `y`. Avec le patch de `period.ts`, la suite complète passe (2 117 tests).
- **Ce qui n'est pas prouvé :** la sûreté vient de la spécification et du relevé des drapeaux. Les 197 autres sites n'ont pas encore été réécrits.

### `noBitwiseOperators`, 67 sites (7 fichiers)

- **Ce qui change :** la règle demande de remplacer `&`, `|`, `^`, `<<`, `>>`, `>>>` par de l'arithmétique. Dans ce code, chaque opérateur binaire est voulu.
- **Les sites, par fichier :**

| Fichier | Sites | Ce que fait le calcul |
|---|---|---|
| `services/sqlite/auth.ts` | 36 | SHA-256 écrit à la main (`legacySha256`) : la vérification des mots de passe des anciens comptes, avant bcrypt |
| `services/backupCrypto.ts` | 21 | en-tête binaire des sauvegardes : octets, drapeau chiffré, version |
| `lib/uuid.ts` | 4 | bits de version et de variante d'un UUID v4 |
| `lib/invoice-pdf.ts` | 2 | hachage FNV-1a (`^`, `Math.imul`, `>>> 0`) |
| `patients/export/patient-record-pdf-source.ts` | 2 | drapeaux d'annotation PDF (`flags & (2 \| 32)`) |
| `ui/hex-density.tsx` | 1 | parité d'une rangée (`row & 1`) |
| `hooks/use-tauri-drag.ts` | 1 | bouton gauche enfoncé (`buttons & 1`) |

- **Le risque d'une réécriture :** 57 des 67 sites sont dans la vérification des anciens mots de passe et dans le format des sauvegardes. Une erreur d'un bit y empêche un ancien compte de se connecter, ou une sauvegarde d'être relue. Les équivalents arithmétiques (`Math.floor(x / 2 ** n)`, `% 2`) se trompent sur les nombres négatifs et au-delà de 2³¹.
- **Ma recommandation : ne pas réécrire.** Désactiver la règle dans `biome.jsonc` (`overrides`) pour les trois fichiers de calcul binaire, `auth.ts`, `backupCrypto.ts` et `uuid.ts` (61 sites). Pour les 4 autres fichiers (6 sites), un `biome-ignore` sur la ligne, avec la raison, pour que la règle continue de veiller sur le reste de ces fichiers.
- **Ce qui n'est pas prouvé :** rien n'a été réécrit, donc rien à prouver. Le classement vient de la lecture de chaque fichier.

## D. Les deux tests de durée et `chunk-cycles`

**Ce qu'on sait du bilan :** `dashboard-widgets` (« phrase de prévision ») et une page de `patient-record-pdf` dépassent parfois les 5 s par défaut de Vitest quand la suite complète tourne. Ils passent toujours seuls, et échouaient déjà avant le chantier. `chunk-cycles` assemble toute l'app en mémoire, en parallèle des autres tests.

**La mesure, dans la VM du cloud (4 cœurs)** (`outils/durees.sh`, relevés dans `releves/durees/durees.json`) :
- trois suites complètes telles quelles ;
- trois suites sans `chunk-cycles`, suivies de `chunk-cycles` seul ;
- une suite de chaque sorte sous charge, avec 6 boucles de calcul qui occupent les 4 cœurs.

| Test | Suite telle quelle | `chunk-cycles` à part | Sous charge, tel quel | Sous charge, à part |
|---|---|---|---|---|
| `dashboard-widgets`, « s'écrit avec les chiffres calculés » | 347 à 363 ms | 311 à 334 ms | 499 ms | 736 ms |
| `patient-record-pdf`, « décrit chaque page d'une annexe de plus de vingt pages » | 850 à 966 ms | 752 à 840 ms | 2 102 ms | 1 684 ms |
| `patient-record-pdf`, « intègre une image entière » | 854 à 902 ms | 717 à 842 ms | 1 946 ms | 1 861 ms |
| `chunk-cycles` | 5,7 à 5,9 s | 4,9 à 5,8 s seul | 13,9 s | — |
| Durée totale | 42 à 45 s | 45 à 49 s (deux lancements) | 85 s | 80 s, plus `chunk-cycles` |

- **Aucun échec en 8 suites complètes,** même sous charge. Je n'ai pas reproduit l'échec ici. Le test le plus lent reste à 2,1 s, soit moins de la moitié des 5 s.
- `chunk-cycles` ralentit les autres d'environ 10 %. Sous charge, l'écart mesuré sur une seule paire de suites (25 % pour l'annexe PDF, l'inverse pour la prévision) est du bruit. Ce n'est pas lui qui fait passer de 1 s à plus de 5 s.
- `chunk-cycles` a déjà sa marge (180 s), et l'image entière de `patient-record-pdf` aussi (20 s). Il reste deux tests sans marge : la prévision et l'annexe de plus de vingt pages, qui sont bien les deux que nomme le bilan.
- Le test de prévision importe son module de composant **dans le test** (`await import("…/widget-units")`). Le temps de chargement, transformation comprise, est compté dans ses 5 s. L'équipe rouge l'a mesuré : 264 à 296 ms au premier appel, moins de 20 ms au second. C'est donc presque tout le temps du test, et la cause la plus probable d'un dépassement sur une machine lente. Dans ta VM, le premier `node_modules` était un lien vers le dossier partagé du Mac, et chaque lecture de fichier y coûte plus cher.

**Les options et ce qu'elles coûtent :**

| Option | Ce qu'on gagne | Ce que ça coûte |
|---|---|---|
| `chunk-cycles` seul, après les autres | environ 10 % sur les tests lents | deux commandes dans `npm test` et dans les deux workflows de CI ; 3 à 6 s de plus au total ; et la cause du dépassement reste |
| Une marge pour les deux tests (`20_000`, comme leur voisin) | le dépassement ne fait plus échouer la CI | deux lignes ; un vrai ralentissement de ces tests passerait inaperçu jusqu’à 20 s |
| **Sortir l'import du test de prévision** (`beforeAll`, qui a 10 s à lui) **et donner à l'annexe PDF les 20 s de son voisin** | le chargement n'est plus compté dans le test ; la page PDF, qui fait un vrai travail de 1 à 2 s, a sa marge | quelques lignes dans deux fichiers de tests, sans rien changer à `npm test` ni à la CI |

**Ma recommandation : la troisième option.** Le patch d'essai est le commit `jetable(D)` : 10 lignes dans deux fichiers de tests, 31 tests verts sur les deux fichiers, typecheck et lint à 0. Elle traite la cause du test de prévision au lieu de la masquer. Elle ne touche pas à l'organisation de la suite, et laisse `chunk-cycles` en parallèle, ce qui ne coûte presque rien.

**Ce qu'il me faudrait de toi :** la sortie d'un échec chez toi (le nom du test et sa durée). Elle dirait si c'est bien l'annexe, et si la marge suffit.

**Ce qui n'est pas prouvé.**
- L'échec n'a pas été reproduit, ni dans la VM du cloud ni sous charge.
- La page de `patient-record-pdf` que nomme le bilan n'est pas précisée. La seule des deux plus lentes sans marge est l'annexe, d'où mon choix. Il faudra le confirmer chez toi.
- L'effet du dossier partagé du Mac est une hypothèse.

## Les contrôles

| État | Typecheck (`tsc -b`) | Lint (`--max-warnings=0`) | Tests | Remarques |
|---|---|---|---|---|
| Départ, `8e6c9b6b` | 0 | 0 | 2 117 sur 2 117 | 2 801 et 2 avertissements |
| Avec les cinq patchs d'essai | 0 | 0 | 2 117 sur 2 117 | 2 554 et 2 avertissements |
| Tests adaptés (B), sources des neuf fichiers formatées | — | — | 2 117 sur 2 117 | — |

L'équipe rouge a lancé deux suites complètes de son côté, avec A1, A2, A3 et B appliqués : 2 117 sur 2 117 chaque fois.

## Les commits

1. `docs(erreurs)` : ce document, les annexes, les outils et les relevés.
2. `jetable(A1)` : `window-controls.css`, sans `right: auto` ni `left: auto`, trié.
3. `jetable(A2)` : `organizeImports` sur les 225 fichiers à l'assemblage identique, plus `biome format` sur `patient-header.tsx`.
4. `jetable(A3)` : les 16 sites `useAtIndex`.
5. `jetable(B)` : `tests/helpers/code-text.ts` et les 8 tests adaptés.
6. `jetable(D)` : la prévision importée dans un `beforeAll`, la marge de l'annexe PDF.

Chaque commit `jetable` est indépendant des autres, à un recouvrement près : A3 touche `treatment-routing.ts`, que A2 range aussi. Pris dans cet ordre, ils s'appliquent sans conflit.

## Ce qui n'est pas prouvé, en tout

- **L'app de bureau n'a pas été lancée** : la VM ne construit pas Tauri. Les preuves portent sur l'assemblage de production, sur Chromium et sur la suite de tests.
- **A2 :** les 93 fichiers CSS_IDENTIQUE sont sûrs par analyse, pas par identité. Rangés ensemble, ils changent le découpage en morceaux.
- **B :** le formatage des neuf fichiers n'est pas fait. Seuls les tests sont prêts.
- **C :** chaque famille est classée site par site, mais seuls les exemples travaillés ont été réécrits et testés. Le CSS de `noDescendingSpecificity` a été comparé sur 20 vues, sans survol ni écran étroit.
- **D :** l'échec des tests de durée n'a pas été reproduit.
- **La faille possible de l'aperçu des notes** est démontrée dans Chromium, pas dans l'app de bureau.

## Les annexes

- `C-1-async-assertions-dependances.md` : `useAwait`, `noNonNullAssertion`, `useExhaustiveDependencies`.
- `C-2-cles-boucles-css-noms.md` : `noArrayIndexKey`, `noForEach` et `useIterableCallbackReturn`, `noDescendingSpecificity`, `useFilenamingConvention`.
- `C-3-accessibilite-void-ternaires-complexite.md` : accessibilité, `noVoid`, `noNestedTernary`, `noExcessiveCognitiveComplexity`, petites règles.
- `rouge-1-A-B-D.md` et `rouge-2-C.md` : les deux équipes rouges.
- `releves/` : un dossier par point (`a1`, `a2`, `c`, `durees`), avec les sites de C en JSON.
- `outils/` : chaque outil dit en tête ce qu'il mesure et comment le lancer. Les chemins de travail (`/tmp/claude-0/…`, `/home/user/vetera/node_modules`) sont à adapter à ta machine.

**graphify** n'est pas installé dans la VM : la consigne du `CLAUDE.md` n'a pas pu être suivie (ni requête, ni `graphify update .`).
