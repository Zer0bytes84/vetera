# Équipe rouge, partie C : contre-mesures

Dépôt de référence : /tmp/claude-0/erreurs-b (commit 8e6c9b6b), non modifié. Toutes les mesures ont été faites dans le worktree /tmp/claude-0/wt-rouge2, remis à l'état du commit après chaque essai (`git status` vide à la fin). Scripts et sorties dans /tmp/claude-0/rouge/w/. Rien n'a été commité.

## Les objections qui changent une recommandation ou un texte

### 1. `noDescendingSpecificity` : la règle trouve deux vrais défauts que le document classe « sans effet »

**Affirmation contestée.** « 64 paires sans effet par construction ; 40 jamais sur le même élément dans 28 vues ; 13 vrais chevauchements » et « L'essai de réordonner […] ne change aucun style ». Recommandation : « ne pas réordonner, désactiver la règle ».

**Ce que j'ai fait.** J'ai repris les 117 paires analysées par l'auteur (/tmp/claude-0/c2tools/spec-rows.json). J'en ai retenu les 53 qui ont une propriété commune de valeur différente. Parmi elles, j'ai cherché les cas où la règle tardive est une surcharge voulue, c'est-à-dire une variante `.dark` ou une requête `@media` de préférence, et où elle perd contre la règle plus spécifique placée avant. Il y en a 5. J'ai écarté 3 faux cas : `shell-toolbar.css:550` et `:591`, où la même liste de sélecteurs contient une variante plus spécifique qui gagne, et `clean.css:586`, qui vise un autre élément. Les deux qui restent, je les ai mesurés dans Chromium (Playwright, avec la vraie feuille).

**Résultat.**
- `components/auth-clinic.css:639`. La règle `.dark .auth-clinic .auth-clinic-step-label { color: #8fd6f7 }` (spécificité 0,3,0) perd contre `:root:root .auth-clinic .auth-clinic-step-label { color: #0a6f9f }` (0,4,0). Couleur mesurée avec `html.dark` : `rgb(10, 111, 159)`, la couleur claire. Sur le panneau sombre (environ `rgb(18 21 26)`), le contraste est de 3,30:1, sous le seuil AA de 4,5:1 pour un texte de 12 px. La couleur voulue donnerait 11,44:1. L'élément est l'étiquette d'étape de l'assistant d'activation (`SetupWizard.tsx:174`), un écran que les 28 relevés n'ont pas visité. C'est pourquoi la paire était classée a4.
- `index.css:1648`. Sous `@media (prefers-reduced-transparency: reduce)`, la règle `.modal-banner-glass { background: #fbf0fb }` perd contre `.modal-banner-illustrated .modal-banner-glass { background: rgb(255 255 255 / 0.5) }`. Fond mesuré avec la préférence émulée (CDP, `matchMedia` vrai) : `rgba(255, 255, 255, 0.5)`. Dans les bannières illustrées (`ui/modal-banner.tsx:100`, `:108`), la préférence de transparence réduite n'est donc pas respectée.
- La couverture : la peau est fixée à `clean` (`lib/theme-store.ts:62`, `FIXED.skin`), donc l'opposition Clean contre Premium n'existe pas à l'exécution. Les 6 paires qui touchent un sélecteur RTL n'ont aucune propriété commune de valeur différente. 11 paires portent un état (survol, focus, `data-active`).

**Verdict : à nuancer, avec une correction de la recommandation.** Désactiver la règle ne change rien à l'exécution, et le réordonnancement est bien inutile. Mais c'est justement parce que réordonner ne change rien que ces surcharges sont mortes. Le texte doit dire : « La règle signale des surcharges qui ne s'appliquent jamais. Deux sont de vrais défauts : le libellé d'étape en mode sombre de l'écran d'activation, et la transparence réduite des bannières illustrées. Les corriger en relevant la spécificité de la surcharge, puis désactiver la règle. » Il faut aussi remplacer « ne change aucun style » par « ne change aucun style dans les 20 vues rendues, sans survol, sans focus et sans fenêtre étroite ». Les 51 autres paires de valeurs différentes n'ont pas été triées une à une sous cet angle.

### 2. Accessibilité : la correction proposée pour le compteur de notifications ne marche pas

**Affirmation contestée.** Exemple travaillé de `useAriaPropsSupportedByRole` : ajouter `role="img"` au `span` de `notification-center.tsx:345`, et « Le lecteur d'écran lira « 3 non lues » au lieu de « 3 » ou de rien ».

**Ce que j'ai fait.** J'ai lu le parent : le `span` est dans un `Button` qui porte `aria-label="Notifications"` (`notification-center.tsx:333`). J'ai reproduit la structure dans Chromium et lu l'arbre d'accessibilité par CDP (`Accessibility.getFullAXTree`).

**Résultat.** Avec ou sans `role="img"` sur le `span`, le bouton s'appelle « Notifications ». L'`aria-label` du bouton remplace le contenu dans le calcul du nom. Sans `aria-label` sur le bouton, le nom devient « 3 non lues ». Le défaut est donc réel (le nombre n'est pas annoncé), mais la correction proposée n'y change rien. Pour `patient-detail-page.tsx:1224`, l'onglet n'a pas d'`aria-label`, et `role="img"` y fonctionne. Autre point : Chromium calcule bien un nom pour un `div` ou un `span` générique qui porte un `aria-label` (« Zone soins », mesuré). Le mot « ignorés » est donc trop fort. ARIA 1.2 interdit ce nom, et beaucoup de lecteurs ne l'annoncent pas, mais le navigateur le calcule.

**Verdict : à nuancer.** Pour `notification-center.tsx:345`, il faut mettre le nombre dans le nom du bouton, par exemple `aria-label={unreadCount ? \`Notifications, ${unreadCount} non lues\` : "Notifications"}`, et marquer le `span` `aria-hidden`. Dans le tableau, il faut écrire « `aria-label` interdit par ARIA sur un div ou un span sans rôle, souvent non annoncé » au lieu de « ignorés ».

### 3. NotesPro : le chemin jusqu'à l'exécution est démontré, il reste à prouver la source

**Affirmation contestée.** « `NotesPro.tsx:980` affiche le HTML d'une note sans le nettoyer […] Ce n'est pas démontré : il faut savoir d'où vient ce HTML et s'il peut contenir un script. »

**Ce que j'ai fait.** J'ai suivi la valeur `content` dans le code, mesuré l'exécution dans Chromium et lu les capacités Tauri.

**Résultat.**
- Le HTML affiché est celui de la base, brut. `handleSelectNote` fait `setContent(note.content)` (lignes 337 et 297). L'éditeur se synchronise par `editor.commands.setContent(content, { emitUpdate: false })` (`Editor.tsx:372`). Le schéma de ProseMirror nettoie donc ce que l'éditeur affiche, mais pas l'état `content`. Or c'est cet état que l'aperçu injecte par `dangerouslySetInnerHTML`. Tiptap ne protège que la vue d'édition.
- Mesuré dans Chromium : par `innerHTML`, une balise `<script>` ne s'exécute pas, mais `<img src="x" onerror="…">` s'exécute (`{ script: false, onerror: true }`).
- Ce que l'application écrit elle-même est sûr. L'éditeur sort du HTML normalisé (`getHTML`). Les notes hors visite et les documents relus passent par `documentToHtml`, qui échappe le texte (`document-templates.ts:120`). Mais la base peut venir d'ailleurs. En mode « client » du réseau de clinique, toute requête SQL part au poste principal (`RemoteClinicDatabase`, `remote-database.ts`), et une sauvegarde restaurée remplace la base. N'importe quel poste peut écrire une ligne `notes` avec le `user_id` de la victime : le filtre `n.userId === currentUser?.uid` ne protège pas. Le reste du code traite déjà ce HTML comme hostile : `patientRecordPlainText` (« Inert conversion: no DOM insertion, scripts… », `patient-record-data.ts:158`) et `noteText` (DOMParser, puis retrait des `script` et des `iframe`, `consultation-documents-assistant.tsx:86`).
- Ce qu'un script obtiendrait : `csp: null`, `withGlobalTauri: true`, et dans `capabilities/default.json`, `fs:allow-read`, `fs:allow-write`, `fs:allow-remove` sur `$HOME/**`, `sql:allow-execute`, `shell:allow-open`, `process:allow-restart`.

**Verdict : tient, et il faut le renforcer.** Le texte doit dire : « Le chemin est démontré : HTML de la base, puis aperçu, puis exécution d'un `onerror` avec l'accès au disque personnel et à la base. Il reste à prouver qu'une source réelle peut y écrire une note piégée (un poste du réseau de clinique, une sauvegarde reçue). Je n'ai pas vérifié l'authentification du canal réseau. » La correction : nettoyer avant l'aperçu (DOMPurify, ou `generateHTML` depuis le JSON de l'éditeur), et poser une CSP.

### 4. `noBitwiseOperators` : la désactivation par fichier est trop large pour 4 des 7 fichiers

**Affirmation contestée.** « Désactiver la règle pour ces 7 fichiers dans `biome.jsonc` (`overrides`). »

**Ce que j'ai fait.** J'ai relevé, pour chaque fichier, le nombre de sites, les lignes concernées et la taille du fichier.

**Résultat.** `auth.ts` : 36 sites, tous entre les lignes 75 et 152, c'est-à-dire dans `legacySha256` (lignes 73 à 156) ; le fichier fait 519 lignes. `backupCrypto.ts` : 21 sites, entre les lignes 124 et 253, sur 266 lignes. `uuid.ts` : 4 sites dans un fichier de 19 lignes. Les quatre autres fichiers n'ont que 1 ou 2 sites, dans du code d'interface ou de PDF : `hex-density.tsx` (1 sur 508 lignes), `invoice-pdf.ts` (2 sur 384), `patient-record-pdf-source.ts` (2 sur la même ligne, sur 196), `use-tauri-drag.ts` (1 sur 104). Une exception par fichier y cacherait tout opérateur binaire ajouté plus tard. Deux sites ont d'ailleurs une réécriture exacte, puisque les valeurs sont des entiers positifs : `row & 1` équivaut à `row % 2`, et `buttons & 1` à `buttons % 2`.

**Verdict : à nuancer.** Le texte doit dire : « `overrides` pour `auth.ts`, `backupCrypto.ts` et `uuid.ts` (61 sites). Un `biome-ignore` justifié par ligne pour `invoice-pdf.ts`, `patient-record-pdf-source.ts`, `hex-density.tsx` et `use-tauri-drag.ts` (5 commentaires pour 6 sites), ou `% 2` pour les deux derniers. » Biome 2.4.15 admet aussi `// biome-ignore-all` en tête de fichier, qui garde la raison dans le fichier lui-même.

## Les objections qui confirment le document

### 5. `useTopLevelRegex` : « aucune expression avec `g` ou `y` »

**Ce que j'ai fait.** J'ai écrit un relevé indépendant (/tmp/claude-0/rouge/w/rx.mjs). Il lit le texte complet de chaque expression depuis le source, sur toute l'étendue du diagnostic, sans la coupe à 200 caractères de `c-sites.mjs`. J'ai aussi relancé Biome sur l'ensemble des fichiers inclus par la configuration, pour compter les sites hors de `src/`. Enfin, j'ai cherché `lastIndex`, `compile`, `.flags`, `.source` et `new RegExp(<variable>)` dans `src/`.

**Résultat.** Il y a 210 sites dans `src/` (96 fichiers) et 3 dans `vite.config.ts` (lignes 88, 124 et 134), soit 213. Les drapeaux relevés : aucun 144, `i` 31, `u` 21, `iu` 13, `s` 1, et 0 avec `g` ou `y`. Un seul texte semblait tronqué (`MotivationalHeader.tsx:154`, à cause d'un emoji compté sur deux colonnes) ; il n'a aucun drapeau. Les 26 expressions passées en argument vont toutes à des fonctions locales (`has(text, /…/)`, tableaux de motifs) ou à la configuration de Vite et Rolldown, qui ne gardent pas d'état. Aucun code ne lit `lastIndex` (le seul résultat est `lastIndexOf`). Le seul usage de `new RegExp(<regex>)` (`dictation-scaffold.ts:79`, `:90`) copie exprès une expression `g` déjà au niveau du module, et la règle ne le signale pas. J'ai appliqué le correctif `period.ts` : 0 remarque, et la suite complète passe (232 fichiers, 2117 tests). C'est le seul lancement complet que j'ai fait.

**Verdict : tient.** Une précision possible : les 3 sites de `vite.config.ts` sont dans un objet de configuration évalué une seule fois, donc les sortir ne gagne rien.

### 6. `useAwait` : les 36 sites « sûrs »

**Ce que j'ai fait.** J'ai lu 7 des 36 sites et tous leurs appelants : `Parametres.tsx:706`, `useSQLite.ts:137`, `create-stock-snapshot.ts:19`, `use-stock-inventory.ts:23`, `licenseActivationService.ts:165`, `clinique-shared.tsx:164`, et les 16 sites de `billingService.ts` (début de chaque corps). J'ai cherché `instanceof Promise` et `typeof … then`, ainsi que les appelants qui font `.then` ou `.catch`. Ensuite, j'ai retiré `async` sur les 36 sites (/tmp/claude-0/rouge/w/unasync.mjs), puis lancé tsc, Biome et tous les tests qui importent un des 13 fichiers touchés.

**Résultat.** Aucun appelant ne dépend d'un rejet que le retrait rendrait synchrone. `activateLicense` a 3 appelants, tous en `await` dans un `try` ou dans `guard`. `readFileAsDataUrl` en a 2, en `await`. `readTauriTable` en a 1, en `await`. Les `refresh` du stock ne sont appelés qu'en `void`, et le hook expose `invalidate`, pas `refresh`. Les appelants qui font `.then` ou `.catch` (`patient-header.tsx:79`, `use-dashboard-financials.ts:11`…) reçoivent toujours une promesse, puisque `runDbRead` et `runBillingCommand` rendent celle de `sqliteOperationQueue.then(...)`, sans travail synchrone avant. Il n'y a aucun `instanceof Promise` dans `src/`. Après le retrait : tsc 0 erreur, `useAwait` passe de 82 à 46, et 38 fichiers de tests passent (453 tests). L'auteur en avait lancé 271.

**Verdict : tient.** La réserve de l'auteur sur l'ordre des microtâches reste valable : aucun test ne la vérifie.

### 7. `noForEach` : Set modifiés, NodeList vivantes, tableaux creux

**Ce que j'ai fait.** J'ai comparé `forEach` et `for…of` dans Node, puis relu les 61 appels.

**Résultat.**
- Sur un Set dont un abonné se retire et en ajoute un autre pendant la notification, les deux formes donnent le même ordre (`a,b,a2`).
- Sur un tableau modifié pendant le parcours, elles diffèrent : `forEach` donne `1,2,3`, `for…of` donne `1,2,3,9`. Aucun site ne modifie le tableau qu'il parcourt. Dans `useRowSaveFlash.ts:47`, `animation.cancel()` ne déclenche pas `onfinish`, donc la Map n'est pas modifiée.
- Sur un tableau creux, elles diffèrent aussi (`[1,3]` contre `[1,undefined,3]`). Aucune source n'est creuse : `Array.from({ length })` remplit le tableau (3 passages sur 3).
- Les deux NodeList viennent de `querySelectorAll`, qui est statique. Une HTMLCollection n'a pas de `forEach`, donc aucun site ne peut en être une.

**Verdict : tient.**

### 8. `noVoid` : le retrait sur les 343 sites changerait-il l'exécution ?

**Ce que j'ai fait.** J'ai relevé, pour chacun des 142 rappels, la prop qui le reçoit (/tmp/claude-0/rouge/w/voidprops.mjs) : `onClick` 100, `onRetry` 11, 7 rappels hors JSX, puis une vingtaine de props maison. J'ai lu la définition de chaque composant maison. J'ai cherché aussi une règle de promesses flottantes dans Ultracite et dans ESLint.

**Résultat.** Les props maison sont typées `() => void`, et leur composant les appelle sans lire le résultat : `ConfirmationCard` fait `onClick={() => onConfirm?.()}`, `DocumentPreviewDialog` fait `onChanged?.()`, et `onSaveDraft` est passé tel quel à `onClick`. Les trois composants qui font `await onConfirm(...)` (`walk-in-dialog.tsx:64`, `clinique-shared.tsx:1325`, `medical-reminder-dialog.tsx:112`) ne reçoivent aucun des rappels signalés. `prefetchConsultationAssistant` est passé à `onFocus` et à `onPointerEnter`, et `useCreationRequest` ignore la valeur rendue. Aucune règle `noFloatingPromises` n'est active, ni dans Ultracite ni dans ESLint.

**Verdict : tient.** La recommandation est cohérente avec `useAwait` : retirer `async` ne crée aucun besoin de `void`.

### 9. Accessibilité : 5 « vrais défauts » et 5 « faux positifs » vérifiés

**Vrais défauts.**
- `purchasing-panel.tsx:566` : un label de texte seul, avec le contrôle à côté. Confirmé.
- `Tasks.tsx:1515` : `aria-selected` sur un `article`, sans `listbox` autour. Confirmé.
- `care-page.tsx:97` : `aria-label` sur un `div`. Confirmé.
- `SlashCommandMenu.tsx:83` : bouton sans `type`. Le menu est rendu par `ReactRenderer` dans une fenêtre flottante, hors de tout `form`. Le risque n'est que latent, comme le dit le document.
- `vitals-chart.tsx:106` : confirmé, avec une nuance. La légende donne le nom des séries, et les dernières valeurs sont affichées en texte au-dessus (`hospitalization-detail.tsx:286` à `:350`). Ce qui manque, c'est l'historique.

Le cas `notification-center.tsx:345` est traité en objection 2.

**Faux positifs.** Les 5 sont confirmés :
- `stock-workspace.tsx:1222` : le label enveloppe un `NativeSelect`.
- `Auth.tsx:76` : poignée de déplacement de la fenêtre, sur `onMouseDown`.
- `settle-widgets.tsx:144` : `role` et `tabIndex` posés seulement si `onClick` existe, avec Entrée et Espace gérés.
- `agent-composer.tsx:186` : `role={menu ? "combobox" : undefined}`.
- `kpi-visuals.tsx:619` : la valeur `{recoveryRate}%` est affichée à côté de la jauge.

**Verdict : tient**, sauf l'objection 2.

### 10. Les étapes du tour ont une méthode `then`

**Ce que j'ai fait.** J'ai testé dans Node un `await` sur un objet de même forme (`{ then: (n) => "x" }`), et cherché tout usage asynchrone de `TOUR_STEPS`.

**Résultat.** L'`await` est toujours en attente après 300 ms. `TOUR_STEPS` n'est lu que de façon synchrone (`tour-guide.tsx:120`, `:190`, `:191`, `:295`, et `tour-target.ts`).

**Verdict : tient.** C'est un piège, pas un bogue.

### 11. `useEffectEvent` pour les 3 dépendances manquantes

**Ce que j'ai fait.** J'ai vérifié la version de React, puis réécrit `Parametres.tsx:361` avec `useEffectEvent` et relancé Biome sur le fichier.

**Résultat.** React 19.2.4 exporte bien `useEffectEvent`, et le projet l'utilise déjà (`use-agenda-page-model.tsx:814`). Après la réécriture, la remarque de la ligne 361 disparaît, et il ne reste que les 2 autres sites du fichier.

**Verdict : tient.**

### 12. « Un avertissement ne fait pas échouer le lint »

**Ce que j'ai fait.** J'ai lu les workflows et les scripts du dépôt.

**Résultat.** La CI lance `npm run lint -- --max-warnings=0`, qui est ESLint, pas Biome (`release-updater.yml:118`). `ultracite check` ne figure dans aucun workflow, et il n'y a ni husky ni lint-staged.

**Verdict : tient.** Une précision à ajouter : si Biome entre un jour dans la CI avec `--error-on-warnings`, le seuil de 20 la ferait échouer.

## Ce que je n'ai pas contre-mesuré

- `noNonNullAssertion` (108 sites).
- `noArrayIndexKey`, dont la reproduction du focus dans les lignes de facture.
- `useFilenamingConvention`.
- `noNestedTernary` et ses 196 combinaisons.
- Le classement des 51 autres paires CSS de valeurs différentes.
- L'authentification du canal du réseau de clinique.
- Le rendu réel par un lecteur d'écran : seul l'arbre d'accessibilité de Chromium a été lu.
