# Biome sur test/clean-2026-11-26 : bilan

**Branche :** `fix/biome-clean-2026-11-26`, partie de `3566f1c7` (ta branche de test `test/clean-2026-11-26`). Locale, non poussée. Ta copie `bAItari-clean-test` du Mac n'a pas été touchée.
**Cadre :** les décisions du 25/11 (`DECISIONS.md`, annexes C-1/C-2/C-3) et ta décision du 26/11 : `tests/` entre dans le check.

## Avant / après

| | Erreurs | Avertissements |
|---|---|---|
| Départ, `3566f1c7`, périmètre de `npm run check` élargi à `tests/` | **2 153** (src 534, tests 1 615, vite.config.ts 4) | 507 |
| Arrivée | **136** (src 42, tests 94) | 507 (346 `noNestedTernary`, 161 `noExcessiveCognitiveComplexity`, avertissements décidés le 25/11) |

Contrôles à l'arrivée : `tsc -p tsconfig.app.json` 0, `tsc -p tsconfig.node.json` 0, `eslint . --max-warnings=0` 0, suite **2 258/2 258**, mêmes tests et mêmes statuts qu'au départ (comparaison test par test des rapports JSON), assemblage Vite réussi.

## Étape par étape (remarques, tout le périmètre)

| Étape | Après | Preuve |
|---|---|---|
| Périmètre : `tests/` dans check, fix, format | 2 153 | package.json seul |
| 1. Formatage (250 fichiers) | 1 902 | js-identique : 241/242 identiques à la compilation, le 242e ne perd que les guillemets d'une clé ; CSS/JSON 8/8 identiques. Un test qui lisait un sélecteur par son texte exact est adapté (`cssText`), vérifié sur source d'origine et formatée, deux mutations attrapées |
| 1. Imports et attributs triés, tests (141 fichiers) | 1 748 | mêmes noms importés, imports à effet dans le même ordre ; jsx-attributs 22/23 + 1 relu ; témoin 6 différents |
| 1. src : imports (7), propriétés CSS (128 règles), attributs, interfaces | 1 609 | imports : protocole A2 fichier par fichier, dist/ identique octet pour octet ; CSS : styles calculés identiques dans Chromium en ltr et rtl |
| 1. Accolades, séparateurs numériques, interfaces, import type (142 fichiers) | 1 088 | js-identique --syntaxe 142/142 ; témoin attrapé |
| 1. Membres d'interface, De Morgan (6), branches échangées (5), classes (2), petites règles (25 fichiers) | 988 | de-morgan, negation-else, classes-tw avec témoins ; le reste relu diff par diff ; 3 `.at(-1)` de src refusés par tsc, remis tels quels |
| 2. Correctifs du 25/11 perdus à la fusion, 6 fichiers repris | 965 | voir plus bas |
| 2. tests : useTopLevelRegex (270) | 695 | même suite de jetons une fois chaque constante remise en place ; aucune g/y |
| 2. tests : noEmptyBlockStatements (92) | 603 | « () => {} » devient « () => undefined », même valeur rendue ; preuve par arbre 23/24 + 1 relu ; témoin |
| 2. tests : noNonNullAssertion (259) | 344 | 255 `mustExist` (une valeur absente fait toujours échouer le test, avec une erreur nommée), 4 `!` redondants retirés |
| 2. tests : petites règles (28) | 316 | 231 tests des 16 fichiers, mêmes statuts |
| 2. src : useTopLevelRegex 58, useAwait 18, noNonNullAssertion 30, useExhaustiveDependencies 18, noArrayIndexKey 11, CSS 1, nommage 1, accessibilité 13, petites règles 30 | 136 | chaque famille : tsc 0, lint 0, tests concernés mêmes statuts ; sites identiques à 44103d34 repris tel quel |

Après l'intégration de chaque lot : suite complète, mêmes tests et mêmes statuts.

## Trouvé en route : la fusion 3566f1c7 a perdu des correctifs du 25/11

Dans 45 fichiers de `src`, 166 morceaux du diff `8e6c9b6b..44103d34` (ma branche du 25/11) s'appliquent de nouveau tels quels sur `3566f1c7` : le code d'avant est revenu. 216 autres ne s'appliquent plus, parce que le travail cloud a réécrit ces lignes. C'est pourquoi `npm run check` était passé de 39 à 538 erreurs dans `src` : 288 d'entre elles sont dans des fichiers qui existaient sur ma branche.

- Repris tels quels : 6 fichiers dont tous les morceaux manquants s'appliquent avec leur contexte exact.
- Le reste : traité règle par règle. Quand le code était resté le même, la correction de 44103d34 est reprise à l'identique.
- Le libellé d'étape en mode sombre (`auth-clinic.css`) avait survécu. Le correctif des bannières illustrées sous transparence réduite a disparu avec le composant `modal-banner.tsx`, que le travail des modales a supprimé.
- Ta copie de test du Mac (`3566f1c7`) n'a donc pas ces correctifs. Cette branche les rétablit.

## Ce qui reste (136), à décider par toi

### tests/ : la règle contredit l'intention du test (94)

- **useAwait, 83** : des faux objets (`select`/`execute` de bases simulées, mocks de fonctions async, `guard.test.ts` qui éprouve justement une fonction async qui lève). Retirer `async` transformerait une erreur en throw synchrone au lieu d'un rejet. Options : un `biome-ignore` motivé par site, ou couper `useAwait` pour `tests/**` dans `biome.jsonc`. Je recommande l'exception pour `tests/**` : une ligne, une raison, au lieu de 83 commentaires.
- **noDelete, 6** : le test vérifie qu'une propriété est **absente** (`delete globalThis.localStorage`, `delete mock.user.password_hash`…) ; `= undefined` laisserait la clé présente. Je recommande un `biome-ignore` motivé.
- **useThrowOnlyError, 2** : `throw "texte"` éprouve le cas où ce qui est lancé n'est pas une Error (`guard.test.ts:128`, `remote-database.test.ts:98`). Je recommande un `biome-ignore` motivé.
- **noNamespaceImport, 3** : `vi.spyOn(models, …)` exige l'objet du module, et `repository-contracts.test.ts` parcourt tous ses exports. Je recommande un `biome-ignore` motivé.

### src : décisions déjà ouvertes le 25/11

Les lignes de facture modifiables (`clinique-shared.tsx:1451`), les 3 clés « dynamiques » (`chart.tsx:307`, `settle-widgets.tsx:262` et `:345`), `document-store.ts:622` et `stay-billing.tsx:59` (`!`), `invoice-settings-panel.tsx:86`, `noExplicitAny` 4, `noBarrelFile` 8, `noExportedImports` 2, `noNamespaceImport` 1, `noDocumentCookie`, `noEmptySource`, `useHookAtTopLevel`, `useJsxKeyInIterable`, `useFocusableInteractive`, `useValidAnchor`.
Mis de côté par l'annexe pour une passe avec essai dans l'app : `noAlert` 3 (dont `activation-admin-page.tsx:1996`, nouveau), `noReactForwardRef` 2 (dont `lib/icons.tsx:163`, nouveau), `noNestedComponentDefinitions` 4.
Hors périmètre : l'aperçu de `NotesPro.tsx` (2).

### src : la correction changerait le rendu (2 sites, non appliqués)

- **`modal-charter.css:65-78`** : `place-items: initial !important`, en dernier, annule le `align-items: center !important` de la même règle depuis sa création. L'en-tête des fenêtres s'aligne donc par étirement, pas au centre. Rétablir le centre change ce que tu vois ; retirer la ligne morte ou trier fige l'état actuel. À toi de dire lequel est voulu (deux remarques liées).
- **`stat-grid.tsx:143`** : un `aria-label` de chargement sur un `div` sans rôle. Ajouter un rôle change ce que lit un lecteur d'écran (`status` en ferait une zone annoncée).

## Écarts et choix à connaître

- `biome.jsonc` : `useRememberedRows.ts` ajouté à l'exception nominative de `useFilenamingConvention` (la forme décidée le 25/11). C'est la seule modification de la configuration ; aucune règle n'a changé de niveau.
- `App.tsx` : un import global de module remplacé par ses deux fonctions nommées (noNamespaceImport, nouveau site).
- Nouveaux `biome-ignore` motivés, dans la forme du 25/11 : 2 masques binaires et 1 expression dans une fabrique `vi.mock` (tests), 2 déclencheurs d'effet, 7 squelettes de chargement, 1 repli `overflow`, 2 faux positifs `noAriaHiddenOnFocusable` (src).
- L'assemblage diffère de celui du départ : le CSS de 5 feuilles (le tri des propriétés, prouvé au rendu) et 4 morceaux qui importent désormais `patterns.js` (expressions partagées). Ordre des modules et des feuilles inchangé.

## Ce qui n'est pas prouvé

- L'app de bureau n'a pas été lancée. Rien n'a été regardé à l'œil.
- **Durée** : une fois, `presentation.test.ts` (« un pays où l'heure change à minuit… ») a échoué sur le délai de 5 s : 6,6 s sous charge, quand vitest tournait en même temps que tsc et eslint. Seul il prend 0,7 s ; au départ il prenait déjà 4,3 s. Sortie complète gardée (`~/work/mesures-erreurs-decisions/biome-clean/D-presentation-minuit-c1b.txt`). Ensuite, vitest tourne après tsc et eslint, et il n'a plus échoué. C'est un test du travail cloud, au bord de son délai : à décider (délai explicite, comme l'annexe PDF le 25/11).
- Les sites des familles C (`useEffectEvent`, cas vides de `mustExist`) sont établis par lecture du code et par tsc, pas par un test de rendu : la suite n'a pas d'environnement DOM.
- L'arbre d'accessibilité n'a pas été remesuré dans Chromium pour les rôles repris de 44103d34.
- Les 216 morceaux « réécrits depuis » n'ont pas tous été comparés un par un : seules les remarques Biome qu'ils laissaient ont été traitées. Un correctif du 25/11 sans remarque Biome associée (un changement de CSS, par exemple) a pu se perdre sans que je le voie.

## Où sont les choses

- Relevés et outils de preuve : `~/work/mesures-erreurs-decisions/biome-clean/`.
- Branches de travail des agents, intégrées : `c2/regex-tests`, `c2/nonnull-tests`, `c2/src`. `c2/regex-src` : agent arrêté (doublon), rien d'intégré.
- Le correctif de la référence du règlement reste à part : `fix/reference-reglement-2026-11-26` (`80802a64`).

<details><summary>Les 94 sites de tests/</summary>

- useAwait : `tests/guard.test.ts:9`, `tests/guard.test.ts:26`, `tests/guard.test.ts:48`, `tests/guard.test.ts:66`, `tests/guard.test.ts:96`, `tests/hooks/sqlite-write-queue.test.ts:21`, `tests/modules/assistant-answers/answer.test.ts:680`, `tests/modules/assistant-answers/clinic-reads.test.ts:36`, `tests/modules/assistant-answers/clinic-reads.test.ts:42`, `tests/modules/assistant-answers/clinic-reads.test.ts:143`, `tests/modules/billing/billing-amounts.test.ts:50`, `tests/modules/billing/billing-amounts.test.ts:93`, `tests/modules/billing/billing-amounts.test.ts:98`, `tests/modules/care-tasks/completion-rollback.test.ts:492`, `tests/modules/care-tasks/completion-rollback.test.ts:124`, `tests/modules/care-tasks/completion-rollback.test.ts:127`, `tests/modules/care-tasks/completion-rollback.test.ts:489`, `tests/modules/care-tasks/store.test.ts:25`, `tests/modules/care-tasks/store.test.ts:30`, `tests/modules/consultations/ai-models-onboarding.test.ts:156`, `tests/modules/consultations/ai-models-onboarding.test.ts:302`, `tests/modules/consultations/dictation-start.test.ts:22`, `tests/modules/consultations/embedding-search.test.ts:122`, `tests/modules/consultations/embedding-search.test.ts:58`, `tests/modules/consultations/embedding-search.test.ts:63`, `tests/modules/consultations/generate-soap.test.ts:82`, `tests/modules/consultations/generator-choice.test.ts:92`, `tests/modules/consultations/generator-choice.test.ts:104`, `tests/modules/consultations/local-ai.test.ts:397`, `tests/modules/consultations/microphone-warmup.test.ts:145`, `tests/modules/consultations/microphone-warmup.test.ts:156`, `tests/modules/consultations/soap-persistence.test.ts:32`, `tests/modules/consultations/treatment-model-boundary.test.ts:21`, `tests/modules/consultations/treatment-model-boundary.test.ts:27`, `tests/modules/consultations/whisper-session.test.ts:14`, `tests/modules/documents/browser-document-store.test.ts:121`, `tests/modules/hospitalizations/billing.test.ts:93`, `tests/modules/hospitalizations/billing.test.ts:85`, `tests/modules/hospitalizations/store.test.ts:28`, `tests/modules/hospitalizations/store.test.ts:33`, `tests/modules/patient-reminders/medical-migration.test.ts:21`, `tests/modules/patient-reminders/medical-migration.test.ts:24`, `tests/modules/patient-reminders/medical-migration.test.ts:186`, `tests/modules/patient-reminders/store.test.ts:38`, `tests/modules/patient-reminders/store.test.ts:43`, `tests/modules/patients/health-card-pdf.test.ts:26`, `tests/modules/patients/patient-record-service.test.ts:59`, `tests/modules/patients/patient-record-service.test.ts:65`, `tests/modules/patients/patient-references.test.ts:28`, `tests/modules/patients/patient-references.test.ts:31`, `tests/modules/prescriptions/prescription-templates.test.ts:8`, `tests/modules/rooms/rooms.test.ts:29`, `tests/modules/rooms/rooms.test.ts:32`, `tests/modules/stock/clinical-stock.test.ts:43`, `tests/modules/stock/clinical-stock.test.ts:46`, `tests/modules/stock/dispensing.test.ts:73`, `tests/modules/stock/dispensing.test.ts:84`, `tests/modules/stock/lots.test.ts:178`, `tests/modules/stock/lots.test.ts:181`, `tests/modules/stock/lots.test.ts:97`, `tests/modules/stock/lots.test.ts:100`, `tests/modules/stock/operations.test.ts:96`, `tests/modules/stock/operations.test.ts:99`, `tests/modules/stock/purchasing.test.ts:83`, `tests/modules/stock/purchasing.test.ts:86`, `tests/modules/stock/schema-upgrade.test.ts:16`, `tests/modules/stock/schema-upgrade.test.ts:19`, `tests/modules/visit-flow/visit-flow.test.ts:76`, `tests/modules/visit-flow/visit-flow.test.ts:71`, `tests/services/billing-service.test.ts:83`, `tests/services/billing-service.test.ts:20`, `tests/services/billing-service.test.ts:72`, `tests/services/consultation-billing.test.ts:35`, `tests/services/invoice-settings.test.ts:21`, `tests/services/license-runtime.test.ts:11`, `tests/services/license-runtime.test.ts:17`, `tests/services/local-data-reset.test.ts:81`, `tests/services/update-service.test.ts:9`, `tests/sqlite/migration-runner.test.ts:24`, `tests/sqlite/migration-runner.test.ts:33`, `tests/sqlite/remote-database.test.ts:36`, `tests/sqlite/remote-database.test.ts:87`, `tests/sqlite/remote-database.test.ts:118`
- noDelete : `tests/components/skeleton-pages.test.tsx:34`, `tests/modules/assistant-answers/presentation.test.ts:383`, `tests/modules/consultations/soap-questionnaire.test.ts:80`, `tests/services/browser-login-credentials.test.ts:35`, `tests/services/browser-login-credentials.test.ts:34`, `tests/tour/tour-guard.test.ts:122`
- useThrowOnlyError : `tests/guard.test.ts:128`, `tests/sqlite/remote-database.test.ts:98`
- noNamespaceImport : `tests/hooks/repository-contracts.test.ts:19`, `tests/modules/consultations/ai-models-onboarding.test.ts:9`, `tests/modules/consultations/ai-models-onboarding.test.ts:30`

</details>
