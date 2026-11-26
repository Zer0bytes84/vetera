# Chantier erreurs : application des décisions du 25 novembre

**Branche :** `appli/erreurs-decisions-2026-11-25`, partie de `chantier/erreurs-2026-11-19` (`8e6c9b6b`). Locale, non poussée. Ni master ni la branche du chantier n'ont bougé.
**Source de vérité :** `docs/recus/2026-11-25-erreurs-decisions/DECISIONS.md` (branche `claude/erreurs-decisions`), annexes C-1/C-2/C-3, rapports rouge-1 et rouge-2.

## Départ remesuré

typecheck (`tsc -b`) 0, lint (`eslint . --max-warnings=0`) 0, 2 117 tests sur 2 117, 2 801 remarques et 2 avertissements (`npm run check`). Identique au document.

## Arrivée

typecheck 0, lint 0, 2 117 sur 2 117, **39 remarques et 475 avertissements** (318 `noNestedTernary` et 157 `noExcessiveCognitiveComplexity` passés en avertissement, plus les 2 de départ). `npm run check` échoue encore à cause des 39 remarques laissées exprès (liste plus bas).

## Reçus, point par point (remarques avant → après)

| Point | Avant → après | Preuve rejouée |
|---|---|---|
| A1, option 3 | 2 801 → 2 795 | `a1-placement.mjs` : barre à x=1142 en français, x=0 en arabe, normal/agrandi/plein écran, 0 écart ; la variante triée telle quelle reste détectée |
| A2.1, 225 fichiers | 2 795 → 2 570 | deux builds de départ identiques ; `dist/` identique octet pour octet après (493 fichiers) |
| A2.2, 93 fichiers — **EN ATTENTE de ton passage dans l'app** | 2 570 → 2 477 | CSS_IDENTIQUE, morceaux 11, ordre 19, imports 48, texte JS changé dans 71 morceaux (chiffres de l'équipe rouge reproduits) ; chunk-cycles passe ; Tasks.tsx et hugeicons.ts reformatés, build identique avant/après formatage |
| A2.3, 9 fichiers | 2 477 → 2 468 | `biome-ignore-all` motivé ; build IDENTIQUE |
| A3 | 2 468 → 2 452 | seul `useAtIndex` bouge (−16) |
| B, tests | 2 452 | 2 117/2 117 sur sources d'origine ; 10 mutations attrapées |
| B, formatage des 8 fichiers | 2 452 → 2 070 (−382, le chiffre du document) | format : JS esbuild et CSS lightningcss identiques ; propriétés : css-rendu 267/267 identiques en ltr et rtl ; attributs : jsx-attributs + témoin, 0 effet ; classes : classes-tw 42/42 ; blocs : js-identique --syntaxe + témoin ; noNegationElse : negation-else + témoin ; Number.parseFloat === parseFloat |
| B, exclusions partielles (choice-controls, stat-grid) | 2 070 → 2 053 | mêmes outils ; les 10 mutations attrapées aussi sur les sources formatées |
| D | 2 053 | 3 suites après D sans échec ; prévision ~300 ms → 1-3 ms ; annexe PDF 1,5-1,9 s sous 20 s |
| C useTopLevelRegex | 2 053 → 1 840 | 0 expression g/y ; multiensemble des expressions conservé (doublons fusionnés dans `src/lib/patterns.ts`) |
| C noBitwiseOperators | 1 840 → 1 773 | overrides pour auth.ts, backupCrypto.ts, uuid.ts ; 6 biome-ignore par ligne ; aucune ligne de code modifiée |
| C useAwait | 1 773 → 1 691 | async retiré sur 36 sites (appelants listés), 46 biome-ignore motivés |
| C noNonNullAssertion | 1 691 → 1 585 | 6 redondants, 72 réécrits, 27 par `mustExist` (src/lib/must-exist.ts), 1 vraie garde ; 2 laissés |
| C useExhaustiveDependencies | 1 585 → 1 545 | 6 sûrs, 3 useEffectEvent, 31 biome-ignore ; 1 laissé |
| C noArrayIndexKey | 1 545 → 1 504 | 37 statiques motivés, 4 clés par identifiant ; 4 laissés |
| C noForEach + useIterableCallbackReturn | 1 504 → 1 416 | for…of, aucune collection modifiée ni creuse |
| C noDescendingSpecificity | 1 416 → 1 299 | 2 surcharges mortes corrigées, puis règle coupée ; mesure Chromium : seuls changent le verre des bannières illustrées sous transparence réduite et le libellé d'étape en sombre |
| C useFilenamingConvention | 1 299 → 1 244 | exception nominative des 55 fichiers |
| C accessibilité | 1 244 → 1 042 | 23 défauts corrigés, inputComponents, 4 règles coupées, biome-ignore motivés ; compteur des notifications : arbre d'accessibilité Chromium « Notifications, N non lues » ; 3 laissés |
| C noVoid | 1 042 → 696 | règle coupée |
| C noNestedTernary | 696 → 318 (+318 avertissements) | 49 chaînes réécrites : 714 combinaisons, 0 écart, mutant détecté sur les 49 ; build : 493 fichiers, 5 workers émis |
| C noExcessiveCognitiveComplexity | 318 → 161 (+157 avertissements) | avertissement au seuil 20 |
| C petites règles | 161 → 39 | 124 traitées ; build comparé avant/après : IDENTIQUE pour le CSS, l'ordre et les morceaux (texte JS changé dans 12 morceaux) |

Après chaque point : tsc 0, lint 0, suite complète verte.

## Ce qui reste, et pourquoi (39 remarques)

À décider par toi :
- **Lignes de facture modifiables** (`clinique-shared.tsx`, noArrayIndexKey) : non touchées. La suite n'a pas d'environnement DOM, donc le focus après suppression ne peut pas être prouvé par un test. Le piège est remesuré sur une reproduction Chromium : avec un id, le focus retombe sur la page. Il faut décider où va le focus, et ajouter jsdom + Testing Library ou un test Playwright.
- **3 clés « dynamiques »** (chart.tsx:308, settle-widgets.tsx:262 et :345) : code sans appelant ou appelé par un test seulement, donc l'unicité de l'identifiant n'est pas démontrable.
- **noNonNullAssertion, 2** : `document-store.ts:603` (quel message montrer) et `stay-billing.tsx:57` (cacher la section ou afficher « date de sortie absente »).
- **useExhaustiveDependencies, 1** : `invoice-settings-panel.tsx:86`. L'appliquer fait réapparaître l'avertissement local `react-hooks/todo`, voulu par eslint.config.js.
- **Petites règles mises de côté par l'annexe** (passe à part avec essai dans l'app) : noAlert 3 (dont 2 dans NotesPro), noReactForwardRef 2, noNestedComponentDefinitions 4.
- **Petites règles laissées** : noExplicitAny 4, noBarrelFile 8, noExportedImports 2, noNamespaceImport 1 (use-mobile.ts), useHookAtTopLevel 1 et useJsxKeyInIterable 1 (faux positifs sans décision), noDocumentCookie 1, noEmptySource 1 (patients-list.css).
- **Accessibilité, 2** absentes de l'annexe : useFocusableInteractive (agent-composer.tsx), useValidAnchor (stock-invoice-link.tsx).

Hors périmètre : noDangerouslySetInnerHtml et useKeyWithClickEvents de `NotesPro.tsx`, la faille de l'aperçu.

## Écarts avec le document, signalés

- **Transparence réduite** : en mode sombre aussi, les bannières illustrées gardaient leur verre translucide (0,07), ce qu'aucun rapport ne disait. Corrigé dans les deux modes, puisque c'est le même défaut.
- **patterns.ts** : deux motifs partagés de plus que les trois cités (`/\s/` et le préfixe de date ISO, 5 fois chacun). Faciles à défaire.
- **Accessibilité** : 205 remarques et non 203. L'annexe ne comptait pas useFocusableInteractive ni useValidAnchor.
- **Étiquettes du stock reliées** : cliquer sur l'étiquette ouvre désormais le sélecteur de date.

## Ce qui n'est pas prouvé

- L'app de bureau n'a pas été lancée. Le lot des 93 attend ton passage : démarrage, Soins, une facture après un soin, les salles, le tour.
- **D** : une suite a échoué sur 1 test pendant l'étape B (exclusions partielles), et j'ai perdu son nom et sa durée (journal tronqué). Pas reproduit en 5 suites ensuite.
- Les cas absents de noNonNullAssertion et l'équivalence des useEffectEvent sont établis par lecture du code, pas par des tests.
- `role="toolbar"` sur l'éditeur (la proposition de l'annexe) promet une navigation aux flèches que la barre n'a pas.
- Rien n'a été écouté avec un lecteur d'écran ; seul l'arbre d'accessibilité de Chromium a été lu.
- Les familles C ont été préparées par des agents dans des worktrees, puis intégrées une par une avec les contrôles complets. Leurs branches `c/*` restent pour référence.
