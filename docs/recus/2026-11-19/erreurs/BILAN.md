# Chantier erreurs : tsc -b et Ultracite, phase mécanique, 19 novembre 2026

**La branche :** `chantier/erreurs-2026-11-19`, dans le worktree `~/work/erreurs2-wt`, partie de master `0226fdc` (la 5.1.1).
- 24 commits locaux, un par famille. Rien n'est poussé, fusionné ni tagué.
- Le premier essai, `chantier/erreurs-2026-11-18`, partait de `52aa9b7` et a été abandonné : master avait avancé depuis. La famille de formatage a été rejouée ici avec les mêmes preuves.

## 1. Les 15 erreurs `tsc -b` : aucune correction de code, ce n'étaient pas des erreurs du code

- **Les fichiers touchés :** `sidebar-icon.tsx` (14 erreurs) et `stock-workspace.tsx` (1). Le motif est toujours le même : un composant Heroicons qu'on refuse là où un composant SVG de React est attendu.
- **La cause, mesurée :** dans la VM, `node_modules/@heroicons` est un lien vers la copie du Mac (`/media/psf/Home/work-fable-mac/node_modules`), que tu veux garder. Les types d'Heroicons y importent `react` depuis la copie du Mac : TypeScript voit deux copies de `@types/react`, de même version mais à deux chemins, donc deux types distincts.
- **La preuve :** sur master, `tsc -b` donne 15 erreurs.
  - Avec un `node_modules` où Heroicons est un vrai dossier, comme après `npm ci` (calque temporaire `~/work/nm-overlay`, sans toucher au lien partagé), `tsc -b` donne **0 erreur**. `--preserveSymlinks` donne aussi 0.
  - La CI lance `tsrs -b`, qui passe.

## 2. Ultracite : la phase mécanique

**Le périmètre :** celui de `npm run check`, c'est-à-dire `src` et les fichiers de configuration. Il passe de **9 009 remarques à 2 804**.

**Le protocole :**
- une famille à la fois, appliquée seule ;
- prouvée sans effet sur l'exécution ou le rendu ;
- puis typecheck, lint `--max-warnings=0` et suite complète, et un commit par famille.

Une famille dont un seul site n'est pas prouvé est défaite et examinée site par site. Les outils sont dans `outils/`.

| Famille | Fichiers | Preuve |
|---|---|---|
| formatage | 507 | JavaScript compilé par esbuild identique, à deux réserves près :<br>• un espace de fin de texte JSX sorti en `{" "}`, même texte affiché ;<br>• un nœud d'espaces dans un conteneur `flex`, qui ne s'affiche pas.<br>CSS minifié par lightningcss identique, à une réserve près : un `font` avec `var()`, vérifié identique dans Chromium. JSON relu identique. |
| `useSortedInterfaceMembers`, deux passes | 120 + 63 | Permutation pure des lignes ; JavaScript identique. |
| `useConsistentTypeDefinitions` | 68 | JavaScript identique. |
| `useBlockStatements` | 335 | Identique après simplification syntaxique des deux côtés ; sans elle, les 335 diffèrent. |
| `useImportType` | 18 | Identique (plus un bloc de `vite.config.ts`, identique après simplification). |
| `useNumericSeparators` | 32 | Identique, mêmes valeurs ; les constantes hexadécimales sont groupées par octet. |
| `useReadonlyClassProperties`, `useConsistentArrayType`, `noUnusedTemplateLiteral`, `useSelfClosingElements`, `useCollapsedIf`, `useConsistentArrowReturn`, `noUselessUndefined` | 3 à 7 chacune | Identique. |
| `useShorthandAssign` | 1 | `max = max + x` devient `max += x`, sur une variable locale. |
| `useSimplifiedLogicExpression` | 86 | Toutes les réécritures sont de De Morgan. Identiques après développement par l'arbre syntaxique ; sans lui, les 86 diffèrent. |
| `noNegationElse` | 39 | Branches échangées. Identiques après remise en forme positive ; sans elle, les 39 diffèrent. |
| `useNumberNamespace` | 11 | Seulement `Infinity`, `-Infinity` et `NaN`, mêmes valeurs. Aucun `isNaN` ni `parseInt` touché. |
| `useOptionalChain` | 7 | Chaque site examiné : toujours dans une condition ou sous une négation, donc même valeur de vérité. |
| `useConsistentBuiltinInstantiation` | 5 | `Array(n)` devient `new Array(n)`, identique selon la spécification. Le type `Array<number>`, retiré par Biome sur 7 sites, est remis. |
| `useTemplate` | 20 | Chaque site examiné : opérandes primitives seulement, donc même texte. |
| `useSortedProperties` (CSS) | 42 | **Par le rendu :** les 779 règles réordonnées, appliquées dans Chromium dans l'ordre d'avant puis d'après, donnent les mêmes styles calculés. |
| `useSortedAttributes` (JSX) | 174 | Identiques après tri par segment entre `{...spread}` ; sans ce tri, tous diffèrent. Aucun attribut ne modifie un état à l'évaluation. |
| `useSortedClasses` (Tailwind) | 172 | Mêmes classes dans chaque chaîne, et même résultat de `tailwind-merge`, avec la configuration de `cn`. |

**Les contrôles,** après chaque famille, sur l'état final : typecheck 0, lint 0, **2 117 tests verts**.

## 3. En attente de ta validation, un par un

### A. Ce que la mesure a montré comme changeant un rendu ou un état

1. **`useSortedProperties` dans `window-controls.css`.**
   - **Ce qui change :** le tri place `inset-inline-end: 0` avant `right: auto`, qui l'emporterait. Les boutons de fenêtre sous Windows ne seraient plus calés à droite.
   - **Proposition :** ne pas trier ce fichier, ou supprimer `right: auto` qui est redondant. Ce serait un changement de rendu, à valider.
2. **`organizeImports`, 327 sites.**
   - **Ce qui change :** le bundle de production change, avec 205 entrées différentes. Le découpage du CSS change lui-même : `app-shell` produit un fichier CSS là où il produisait du JS. Or l'ordre des imports fixe l'ordre d'exécution des modules et d'injection du CSS.
   - **Proposition :** l'appliquer fichier par fichier, en vérifiant à chaque fois que le CSS assemblé reste identique, ou l'écarter.
3. **`useAtIndex`, 16 sites.**
   - **Ce qui change :** `arr[arr.length - 1]` devient `arr.at(-1)`, qui donne 15 erreurs de type, puisque `at()` rend `T | undefined`.
   - **Ce qu'il faut décider :** pour chaque site, quoi faire d'un tableau vide (garde, valeur par défaut). C'est un choix de comportement.

### B. Des tests lisent le source mot à mot

Neuf fichiers restent hors du formatage et des tris. Les formater oblige à assouplir des tests de charte (`theme-clean-charter`, `sidebar-tone`, `header-search`, `clinic-services`, `fix-breches-workflow`, `agenda-ouvrir`), qui lisent le texte des fichiers. Ils portent 496 des remarques restantes :
- `CommandPalette.tsx`, `clean.css`, `premium.css`, `index.css`, `use-consultation-session.ts`, `open-in-flux.ts`, `app-shell.tsx`, `premium-sidebar.css` ;
- `window-controls.css` (point A1).

Deux fichiers n'ont été écartés que d'une seule famille :
- **`choice-controls.tsx` (tri des attributs) :** un test attend `role="switch"` avant `disabled` dans le HTML rendu. L'ordre des attributs HTML est sans effet au rendu.
- **`stat-grid.tsx` (tri des classes) :** un test de charte lit une chaîne de classes.

**Ce qu'il faut décider :** adapter ces tests pour qu'ils ne dépendent plus de la mise en page du source, ou garder ces fichiers tels quels.

### C. Les familles qui changent un comportement par nature

Je n'y ai pas touché. Pour chacune, il faut un choix site par site.

| Famille | Sites | Ce qui peut changer |
|---|---|---|
| `noVoid` | 346 | retirer `void` change ce qu'une fonction rend (une promesse au lieu de `undefined`), par exemple dans un `useEffect` |
| `noNestedTernary` | 375 | une réécriture de logique d'affichage |
| `noExcessiveCognitiveComplexity` | 160 | du découpage de fonctions |
| `useTopLevelRegex` | 213 | sûr seulement pour les expressions sans drapeau `g` ou `y`, qui gardent un état (`lastIndex`). Il faut aussi nommer chaque constante |
| `noNonNullAssertion` | 108 | chaque `!` demande un choix pour le cas absent |
| `useAwait` | 82 | retirer `async` change le type rendu |
| `noBitwiseOperators` | 67 | du calcul volontaire (hachage, `>>> 0`) |
| `useExhaustiveDependencies` | 41 | change quand les effets se relancent |
| `noArrayIndexKey` | 45 | change l'identité des lignes |
| `noForEach`, `useIterableCallbackReturn` | 46 + 42 | du contrôle de flux |
| `noDescendingSpecificity` (CSS) | 117 | réordonner des règles change la cascade |
| `useFilenamingConvention` | 55 | renomme des fichiers et leurs imports |
| les règles d'accessibilité (`noLabelWithoutControl`, `useSemanticElements`, etc.) | environ 150 | changent le balisage, donc le rendu |
| `noExplicitAny`, `noParameterProperties`, `noBarrelFile`, `noNamespaceImport` et les petites (`noDoubleEquals`, `noDelete`, `noCommaOperator`…) | — | à examiner une par une |

## 4. Ce qui n'est pas prouvé, et un point à signaler

- **Les appels dans les attributs JSX** (`cn(…)`, `t(…)`) sont supposés purs pour le tri des attributs. Seuls `++`, `--` et les affectations ont été recherchés et exclus.
- **La phase mécanique n'a pas tourné dans l'app assemblée :** ses preuves portent sur le code compilé, le CSS calculé et la suite de tests. L'organisation des imports, seule famille qui change l'assemblage, n'a pas été appliquée.
- **Deux tests de durée échouent souvent dans la VM :** `dashboard-widgets` (« phrase de prévision ») et une page de `patient-record-pdf`. Ils dépassent 5 s quand la suite complète tourne, et passent toujours seuls. Ils échouent pareil sans aucune famille appliquée, sur le commit précédent.
  - **Le facteur aggravant :** le test d'assemblage en mémoire ajouté par la 5.1.1 (`chunk-cycles`, environ 25 s), qui tourne en parallèle des autres.
  - **Le risque :** des échecs intermittents de la CI de publication.
  - **Proposition, à valider :** faire tourner ce test seul, après les autres, ou donner une marge de temps aux deux tests de durée.
