# Équipe rouge 1 : contre-mesures sur A1, A2, A3, B et D

Worktree de mesure : `/tmp/claude-0/wt-rouge1` (détaché sur 8e6c9b6b, patchs appliqués avec `git apply`, rien de commité). Outils écrits pour cette revue : `/tmp/claude-0/rouge/outils/` (cycles.mjs, effets2.mjs, mutations.mjs, collisions.mjs) et `/tmp/claude-0/rouge/a1/app.mjs`. Relevés : `/tmp/claude-0/rouge/a1/`, `/tmp/claude-0/rouge/a2/` (base, p225, p318), `/tmp/claude-0/rouge/suite1.log`, `/tmp/claude-0/rouge/suite2.log`.

Les objections qui changent un chiffre ou une recommandation viennent en premier.

---

## 1. B : `codeText` confond des codes différents, et deux mutations passent inaperçues

**Affirmation contestée.** « Ils attrapent toujours ce qu'ils gardent : 7 mutations, une par test touché, échouent toutes » et « Ce que les tests perdent : un détail ». Le commentaire du module ajoute : « Words, names, strings and the order of the code stay as they are. »

**Ce que j'ai fait.** J'ai remis les anciens tests à côté des nouveaux, puis appliqué des mutations aux sources d'origine, une à une, en lançant l'ancien et le nouveau test (`outils/mutations.mjs`). J'ai aussi passé des paires de codes à `codeText` (`outils/collisions.mjs`).

**Résultat.**

| Mutation | Ancien test | Nouveau test |
|---|---|---|
| Témoin, aucune mutation | passe | passe |
| S1 `index.css` : `(&:is(.dark *):where(:not(` devient `(&:is(.dark *) :where(:not(` (la garde passe de l'élément à ses descendants) | échoue | **passe** |
| S2 `clean.css` : la règle du trait des icônes reçoit une seconde déclaration `stroke-width: 2 !important`, qui l'emporte | échoue | **passe** |
| S3 `clean.css` : `.app-sidebar .premium-shortcut-icon` devient `.app-sidebar.premium-shortcut-icon` | échoue | échoue |

`codeText` retire l'espace avant `.`, `:`, `(`, `[` et autour de `-`, `/`, `*`, `<`, `>`. Il rend donc identiques, sur 6 paires essayées, 6 paires de sens différent :
- un combinateur descendant et un sélecteur composé (`".app-sidebar .icon"` et `".app-sidebar.icon"` dans une chaîne JS, `:is(.dark *):where(` et `:is(.dark *) :where(` en CSS) ;
- le texte des chaînes et du JSX (`"Note : requise"` et `"Note: requise"`, `{done} / {total}` et `{done}/{total}`, `"9 h - 18 h"` et `"9 h-18 h"`).

La phrase du commentaire sur les chaînes est donc fausse. De plus, la fenêtre `[\s\S]{0,400}` de `clinic-services` porte maintenant sur du texte compressé : dans `CommandPalette.tsx`, le rapport brut sur compressé est de 1,56, donc la fenêtre couvre environ 620 caractères d'origine au lieu de 400.

`selectorText`, lui, garde l'espace descendant : S3 reste attrapée par les tests de charte qui l'utilisent.

**Verdict : à nuancer, et le patch est à corriger avant d'être pris.**
- Pour `sidebar-tone`, ne pas passer `index.css` par `codeText` : lire la règle `@custom-variant` avec postcss et normaliser ses paramètres avec `selectorText`, qui garde le sens des espaces.
- Pour la règle du trait des icônes, exiger que la **dernière** déclaration `stroke-width` de la règle soit `var(--clean-icon-stroke) !important`, ou qu'elle soit la seule. « Qu'elle porte celle-ci » ne suffit pas.
- Dans `codeText`, ne retirer les espaces ni autour de `.`, `:`, `*`, `[`, `(` ni dans les chaînes, ou réserver `codeText` au JS et le dire dans son commentaire.
- Le texte doit remplacer « un détail » par : « les tests ne voient plus une déclaration ajoutée qui écrase la bonne, ni un espace qui change un sélecteur dans `index.css` (deux mutations mesurées) ».

## 2. A2 : l'inventaire des effets au chargement oublie des abonnements

**Affirmation contestée.** « Seuls trois modules agissent vraiment au chargement » et, pour les 17 autres, « aucune ne lit l'état d'un autre module ».

**Ce que j'ai fait.** `a2-effets.mjs` ne regarde que les instructions-expressions et la racine des initialiseurs. Il ne voit ni les `if`, `for` et `try` de premier niveau, ni `export default <appel>`, ni les membres `static` de classe, ni un appel imbriqué dans un initialiseur. Sa liste `PURE_CALLS` n'est ancrée qu'au début : `cn…`, `memo…`, `lazy…` ou `String…` passent pour purs. J'ai écrit une contre-analyse (`outils/effets2.mjs`) et je l'ai lancée sur les 337 modules de `src/` de `effets-chunks.json`.

**Résultat.** 13 modules ont du code au chargement que l'outil n'a pas vu. Trois d'entre eux **s'abonnent à un évènement de `window`** dans un `if (typeof window !== "undefined")` :
- `src/modules/rooms/use-rooms.ts` : `ROOMS_CHANGED` ;
- `src/modules/tour/tour-store.ts` : `storage` ;
- `src/hooks/useSQLite.ts` : `DATA_CHANGED_EVENT`, qui vide le cache.

Les autres manques sont des constructions de valeurs : `veterinary-lexicon` (boucles `for…of`), `visit-flow/migration` (`trigger(...)`), `line-mascots`, `header-search` (`navigator.platform`), `i18n/config` (`localStorage.getItem`). Ces initialiseurs lisent d'autres modules (`sizeLabel(sizeOf(...))`, `createTourStore(browserStorage())`), et même `localStorage`.

Ce qui sauve la conclusion :
- chacun de ces trois abonnements est le seul abonné de premier niveau à son évènement (les autres s'abonnent dans un `useEffect`, donc après tout chargement de module) : l'ordre entre abonnés ne change pas ;
- le graphe des imports à valeur de `src/` n'a **aucun cycle** (645 fichiers, 2 688 arêtes, `outils/cycles.mjs`, contrôlé sur un cycle témoin) ;
- le graphe des morceaux n'a aucun cycle non plus : `chunk-cycles` passe avec les 225 et les 93 appliqués ensemble.

Un module importé est donc toujours évalué avant celui qui l'importe, quel que soit l'ordre entre frères.

**Verdict : à nuancer.** La recommandation sur les 93 tient, mais pas son argument.
- Remplacer « Seuls trois modules agissent vraiment au chargement » par une liste de six modules, avec les trois abonnements, en précisant que chacun est seul sur son évènement.
- Remplacer « aucune ne lit l'état d'un autre module » par l'argument qui tient : pas de cycle entre modules de `src/`, pas de cycle entre morceaux.
- Dire que `a2-effets.mjs` ne regarde que les instructions de premier niveau les plus simples.

## 3. A2 : « le morceau d'entrée, déjà exécuté avant que tout autre morceau ne se charge »

**Ce que j'ai fait.** J'ai lu le relevé des 225 et des 93 rangés ensemble (`/tmp/claude-0/rouge/a2/p318`).

**Résultat.** Le morceau d'entrée importe statiquement une vingtaine de morceaux (`react.js`, `database.js`, `useSQLite.js`…), qui s'exécutent **avant** ses propres modules. Avec les 93, la liste de modules du morceau d'entrée change (« modules différents »), et l'ordre de ses imports aussi. La place de `i18n/config` parmi ces modules bouge donc bien. C'est sans effet, parce qu'aucun autre module n'appelle i18n au chargement et que `main.tsx` importe déjà `App` avant `i18n/config` aujourd'hui.

**Verdict : à nuancer.** Corriger la phrase : l'argument est l'absence de cycle et d'appel à i18n au chargement, pas l'ordre des morceaux.

## 4. A2 : les 93 pris en un lot ont été mesurés un par un, jamais ensemble

**Affirmation contestée.** « Les 93 CSS_IDENTIQUE : les prendre ensuite, en un lot. »

**Ce que j'ai fait.** J'ai rangé les 93 ensemble par-dessus les 225 (même commande Biome que le protocole), assemblé, comparé au départ, puis lancé `chunk-cycles`.

**Résultat.** `CSS_IDENTIQUE : css 0, ordre css 0, morceaux 11, ordre 19, imports 48`, avec un texte JS changé dans 71 morceaux. `chunk-cycles` passe.

**Verdict : tient**, avec un chiffre à ajouter. Le lot ensemble garde le CSS et son ordre, mais 11 morceaux apparaissent ou disparaissent (par exemple `useSQLite.js` disparaît et `primitives.js` apparaît). Le texte doit dire que le découpage change, et que c'est ce lot qu'il faudra passer dans l'app de bureau.

## 5. A2 : les 225 fichiers IDENTIQUE

**Affirmation contestée.** « À la fin, les 225 fichiers gardés ensemble redonnent un assemblage IDENTIQUE au départ. Le texte JS compilé est lui aussi identique, dans les 180 morceaux. »

**Ce que j'ai fait.** J'ai assemblé deux fois avec la configuration de mesure dans mon worktree : sur 8e6c9b6b, puis avec `a2-organizeImports-225.patch`. Ensuite `diff -rq` sur les deux `dist/` complets.

**Résultat.** Les 493 fichiers de `dist/` sont identiques octet pour octet : 180 JS, 1 `.mjs`, 19 CSS, `index.html`, les 5 fichiers de workers, le wasm et les polices. Cette preuve est plus forte que le relevé : elle ne dépend plus de la question de savoir si `moduleIds` donne l'ordre d'exécution. Elle couvre aussi les modules CommonJS enveloppés (`require_x()`), les workers, le préchargement et les assets. Aucun des 225 ne déplace un import sans liaison (`import "x"`) : 0 ligne dans le patch.

Deux réserves :
- le verdict IDENTIQUE de `a2-compare.mjs` ne tient pas compte du texte JS : seule la mesure finale le vérifie, et elle est juste ;
- le patch n'est pas formaté. Il a été produit avec le formateur coupé, et il laisse `src/modules/patients/components/patient-header.tsx` avec `import {AlertTriangle, ` (espace en fin de ligne signalée par `git apply`). Sur les 225 fichiers, `biome format` signale 2 fichiers après le patch contre 1 avant.

**Verdict : tient**, à une correction près. Ajouter qu'un `biome format` reste à passer sur le patch (sans effet sur l'assemblage), et que l'identité porte sur l'app assemblée : en `vite dev` et dans Vitest, l'ordre d'évaluation suit la source (non mesuré, la suite passe).

## 6. A2 : les 9 CSS_CHANGE et `biome-ignore-all`

**Ce que j'ai fait.** J'ai ajouté `// biome-ignore-all assist/source/organizeImports: …` en tête de `NotesPro.tsx`.

**Résultat.** On passe de 1 diagnostic `organizeImports` à 0, et la suppression n'est pas signalée comme inutile.

**Verdict : tient.**

## 7. Recouvrement entre les patchs A2 et B

**Ce que j'ai fait.** `git apply --check` de chaque patch par-dessus A2.

**Résultat.** A1, A3 et `b-tests` s'appliquent. `b-sources-formatees.patch` échoue sur `use-consultation-session.ts`, qui fait partie des 225 d'A2 et des neuf fichiers de B. `stat-grid.tsx` est aussi dans les deux.

**Verdict : à nuancer.** Le texte de B doit dire que le formatage des neuf fichiers se fera après A2, et sera régénéré. Le décompte B compte aussi 3 remarques `organizeImports` (point A2) parmi les « 108 qui appartiennent aux familles du point C ». J'ai recompté 496 remarques, dont 82 `noDescendingSpecificity`, 5 `noVoid`, 5 `useTopLevelRegex` et 3 `organizeImports`. Il faut écrire « 105 du point C et 3 du point A2 ».

## 8. A1 : l'option 3, mesurée dans l'app réelle

**Affirmation contestée.** « La mesure monte la barre seule : l'arabe n'a pas été ouvert dans l'app assemblée. » La question était de savoir si l'option 3 reste identique avec toutes les feuilles de l'app, les `@layer` et le `<style>` de decorum.

**Ce que j'ai fait.**
- Serveur `vite` de dev dans mon worktree, avec `baitari:window-controls-preview = "1"` et `vetera.language` à `fr` puis `ar`.
- Injection du `<style>` exact de decorum 1.1.1 (`controls.js`).
- Fenêtre normale, agrandie et plein écran, 1 280 × 800.
- Relevé de la place de la barre et de Fermer, et de tous les styles calculés des 4 éléments.
- Mesures sur l'origine, l'option 3 (`a1-window-controls.patch`, identique octet pour octet à `sans-right-left-trie.css`) et, comme témoin, la variante triée telle quelle.
- Relecture de `titlebar.js` et `controls.js`.

**Résultat.**
- Origine et option 3 : barre à x = 1 142 en français et à x = 0 en arabe, avec **0 écart de style calculé** sur 6 états × 4 éléments.
- Témoin trié : la barre part à x = 0 en français et à x = 1 142 en arabe. La mesure voit donc l'écart.
- `dir` est posé sur `<html>` (`App.tsx`, `document.documentElement.dir`), et `#window-controls` est un enfant de `<body>` : il hérite du sens.
- decorum n'écrit `left: 0` en ligne que s'il crée l'élément lui-même (`titlebar.js`). Le nôtre est statique dans `index.html`. Son `<style>` ne vise que `.decorum-tb-btn`, ni `left` ni `right`.
- Le fichier patché ne porte plus aucune remarque Biome.

Limites :
- l'app s'arrête à l'écran d'activation, donc la place gardée dans l'en-tête (`padding-inline-end`) n'a pas été mesurée dans l'app. Le patch ne touche pas cette règle ;
- dans l'app réelle, la variante triée met la barre à 0 et 1 142, pas à 8 et 1 134 comme dans le tableau. Les 8 px viennent de la marge par défaut de `<body>` de la page de mesure.

**Verdict : tient.** Il faut corriger dans le tableau « 8 » et « 1 134 » (artefact de la page de mesure : 0 et 1 142 dans l'app), et retirer de « ce qui n'est pas prouvé » la phrase sur l'arabe dans l'app, en la remplaçant par « mesuré dans l'app en dev sur l'écran d'activation ; en-tête non atteint ».

## 9. A3 : `at(-1)` et les gardes

**Affirmation contestée.** « Ce qui change à l'exécution : rien », « 15 erreurs `tsc` sur 13 sites », et « identique » pour chaque garde.

**Ce que j'ai fait.**
- Correctif Biome `useAtIndex` seul sur 8e6c9b6b, puis `tsc -p tsconfig.app.json`.
- Type de chaque receveur.
- Place des nouveaux `return null` par rapport aux hooks.
- Diagnostics Biome avant et après dans les 13 fichiers.
- Suite complète.

**Résultat.**
- 16 `useAtIndex`, et 15 erreurs `tsc` après le correctif brut : le compte tient.
- Tous les receveurs sont de vrais tableaux typés : `[...querySelectorAll]`, `split`, `Date[]`, tuples, `as const`. Il n'y a ni chaîne, ni tableau typé, ni `arguments`, ni NodeList. Un NodeList aurait d'ailleurs été refusé par `tsc`.
- Dans `Sparkline`, `useId()` précède le nouveau `return null` : l'ordre des hooks n'est pas touché. `SettleSparkLine` et `VitalsChart` n'ont pas de hook après la garde.
- `latestVitals && …` rend `undefined` là où `vitals.length > 0 && …` rendait `false` : React n'affiche rien dans les deux cas.
- Après le patch : `useAtIndex` passe de 16 à 0, sans nouvelle famille.
- `tsc` donne 0 erreur avec A1, A2, A3 et `b-tests` ensemble.
- Suite complète : 2 117 sur 2 117.

Deux remarques :
- `AGING_BUCKETS[3]` : le repli n'est plus atteignable, puisque l'âge est borné à 0 et que la dernière tranche va à l'infini. Mais si l'on ajoute une tranche, `[3]` ne désignera plus la dernière, sans erreur de type ;
- `.at()` demande Safari 15.4, et `minimumSystemVersion` vaut macOS 11.0. Le risque existe déjà : `src/` contient 25 `.at(-…)` hors tests.

**Verdict : tient.** À ajouter au texte : une ligne sur `[3]` (fragile si une tranche est ajoutée ; un test ou un commentaire suffit) et une ligne sur la cible Safari, qui n'est pas un risque nouveau.

## 10. B : le compte et la suite sur les sources formatées

**Affirmation contestée.** « 2 117 tests sur 2 117 dans les deux cas », et le compte de 496, 388 et 382.

**Ce que j'ai fait.** Deux suites complètes : A1, A2, A3 et `b-tests` sur les sources d'origine, puis A1, A3, `b-tests` et `b-sources-formatees`. Ensuite, `biome check --reporter=summary` sur les neuf fichiers à 8e6c9b6b.

**Résultat.** 2 117 sur 2 117 et 232 fichiers dans les deux cas, en 47 et 48 s. Le compte donne 496 remarques ; les familles mécaniques (273 + 42 + 38 + 23 + 8 de formatage + 4) font 388.

**Verdict : tient**, sous réserve de l'objection 1 sur la force des tests.

## 11. D : « échec non reproduit » et la recommandation

**Affirmation contestée.** « Le test de prévision importe son module dans le test : c'est la cause la plus probable », « `chunk-cycles` ralentit les autres de 25 % sous charge », et la recommandation de la troisième option.

**Ce que j'ai fait.**
- Relu `durees.json` (11 relevés).
- Lancé `dashboard-widgets` et `patient-record-pdf` seuls, deux fois chacun, avec le rapporteur JSON.
- Ajouté mes deux suites complètes.
- Cherché dans le bilan un journal d'échec.

**Résultat.**
- Dans « phrase de prévision », le premier test met 264 à 296 ms et le second, qui refait le même `await import`, moins de 20 ms. Le temps du test est donc presque tout entier celui de l'import. C'est cohérent avec l'hypothèse, mais il faudrait un ralentissement de 17 fois pour atteindre 5 s.
- Côté PDF, le test « image entière » importe `@napi-rs/canvas` dans le test, mais un test précédent l'a déjà chargé (44 ms). Ses 614 à 646 ms sont un vrai travail : le texte tient.
- Le « 25 % sous charge » repose sur une seule suite de chaque sorte. Sur la même paire, le test de prévision va dans l'autre sens (499 ms avec `chunk-cycles`, 736 ms sans) : c'est du bruit.
- Le bilan ne garde aucun journal d'échec, seulement la phrase « échouent souvent dans la VM ». La page PDF en cause reste inconnue.
- Avec mes deux suites, on arrive à 10 suites complètes sans échec.

**Verdict : à nuancer.**
- « Échec non reproduit » est honnête.
- Retirer « 25 % sous charge », ou le donner comme une mesure unique, contredite par l'autre test.
- La recommandation reste la bonne, puisqu'elle ne touche pas à la CI et retire l'import de la mesure. Il faut toutefois demander à Zouhir la sortie d'un échec (nom du test, durée) avant de dire quelle page PDF reçoit la marge.

---

## État laissé

Worktree `/tmp/claude-0/wt-rouge1` : A1, A3, `b-tests` et `b-sources-formatees` appliqués, plus `vite.mesure.config.ts` et `tests/helpers/` non suivis. Rien n'est commité. `/tmp/claude-0/erreurs` et `/tmp/claude-0/erreurs-b` n'ont pas été modifiés. Le serveur de dev a été arrêté.
