# Partie C2 : remarques du linter qui changent un comportement

Mesures faites sur le commit 8e6c9b6b, dans un worktree jetable (/tmp/claude-0/wt-c2, remis à l'identique après chaque essai). Rien n'est appliqué au dépôt. Les scripts et les traces des mesures sont dans /tmp/claude-0/c2tools. Le détail site par site est dans /tmp/claude-0/c-out/c2-sites.json (305 entrées).

### `noArrayIndexKey`, 45 sites

- **Ce qui change :** la clé React décide quel nœud du DOM et quel état local suivent quelle ligne. Remplacer l'index par un identifiant ne change rien pour une liste figée ; pour une liste qui se modifie, l'état, le focus et les animations suivent alors la donnée et non plus la position.
- **Les sites, par risque croissant :**

| Classe | Nombre | Sites |
|---|---|---|
| (a) liste figée ou position d'axe : l'index est la bonne clé | 37 | voir le détail plus bas |
| (b) liste avec un identifiant disponible, éléments sans état | 7 | `components/ui/chart.tsx:211`, `components/ui/chart.tsx:308`, `components/ui/field.tsx:202`, `modules/dashboard/v2/settle-widgets.tsx:259`, `modules/dashboard/v2/settle-widgets.tsx:342`, `modules/hospitalizations/components/vitals-chart.tsx:181`, `modules/patients/components/medical-record-summary.tsx:133` |
| (c) liste modifiable sans identifiant | 1 | `modules/clinique/components/clinique-shared.tsx:1454` |

<details><summary>Les 37 sites de la classe (a)</summary>

`components/CommandPalette.tsx:1291`, `components/CommandPalette.tsx:1285`, `components/ui/chart-card.tsx:444`, `components/ui/chart-card.tsx:490`, `components/ui/chart-card.tsx:526`, `components/ui/chart-card.tsx:591`, `components/ui/chart-card.tsx:634`, `components/ui/chart-card.tsx:709`, `components/ui/context-window-meter.tsx:119`, `components/ui/diverging-bars.tsx:397`, `components/ui/diverging-bars.tsx:448`, `components/ui/diverging-bars.tsx:463`, `components/ui/diverging-bars.tsx:540`, `components/ui/radial-dots.tsx:285`, `components/ui/radial-dots.tsx:299`, `components/ui/radial-dots.tsx:276`, `components/ui/radial-dots.tsx:199`, `components/ui/radial-dots.tsx:250`, `components/ui/streaming-message.tsx:277`, `components/ui/streaming-message.tsx:299`, `components/ui/streaming-message.tsx:307`, `components/ui/streaming-message.tsx:312`, `modules/agenda/components/agenda-month-calendar.tsx:126`, `modules/agenda/components/agenda-shared.tsx:1397`, `modules/care-tasks/plan-care-tasks.tsx:139`, `modules/clinique/components/clinique-shared.tsx:1441`, `modules/consultations/components/dictation-states.tsx:59`, `modules/consultations/components/patient-document-search.tsx:120`, `modules/consultations/components/patient-document-search.tsx:125`, `modules/dashboard/components/clinical/shared.tsx:17`, `modules/dashboard/components/focus-trend-chart.tsx:314`, `modules/dashboard/v2/kpi-mini-chart.tsx:116`, `modules/dashboard/v2/kpi-mini-chart.tsx:146`, `modules/dashboard/v2/kpi-visuals.tsx:123`, `modules/documents/components/consultation-documents-assistant.tsx:811`, `modules/documents/components/document-paper-preview.tsx:47`, `modules/hospitalizations/components/vitals-chart.tsx:117`

Ce sont des segments de texte surligné (4), des graduations, barres, points et zones de survol de graphiques indexés par la position sur l'axe (20), des paragraphes d'un message qui ne fait que s'allonger (4), des cases vides de calendrier et de squelette (3), des cases de jauge et de vumètre de taille fixe (2), et des listes remplacées en bloc (lignes d'une facture émise, extraits d'une réponse, pages d'un aperçu, suggestions d'un plan). Onze de ces sites ont déjà une clé composée avec l'index (`${label}-${i}`, `empty-${index}`…) : la règle les signale quand même.
</details>

- **Exemples travaillés (les plus sûrs) :**

`modules/dashboard/v2/kpi-mini-chart.tsx:116`, classe (a). Une barre par position de l'axe. On garde la clé et on documente :
```tsx
height={Math.max(2, (value / max) * 30)}
// biome-ignore lint/suspicious/noArrayIndexKey: une barre par position de l'axe, jamais réordonnée
key={i}
```
Rien ne change à l'exécution. Le commentaire doit précéder l'attribut `key` : placé avant la balise, il ne supprime pas la remarque (essayé).

`components/ui/field.tsx:202`, classe (b). Les erreurs sont dédoublonnées par message deux lignes plus haut, donc le message est unique :
```tsx
// avant
{uniqueErrors.map((error, index) => error?.message && <li key={index}>{error.message}</li>)}
// après
{uniqueErrors.map((error) => error?.message && <li key={error.message}>{error.message}</li>)}
```
Un `<li>` de texte n'a ni état ni focus : l'écran est le même.

`modules/hospitalizations/components/vitals-chart.tsx:181`, classe (b). `key={i}` devient `key={sorted[i].id}`. Les `<circle>` n'ont ni état ni transition : si une mesure antidatée s'insère au milieu, React recrée des cercles au lieu d'en déplacer, sans différence visible.

`modules/clinique/components/clinique-shared.tsx:1454`, classe (c). Les lignes de facture en préparation se modifient et se suppriment, sans identifiant. La clé évidente `key={line.desc}` est un piège : la clé change à chaque frappe.
```ts
// proposé : un identifiant posé à la création de la ligne
interface DraftLine { id: string; desc: string; amount: string }
{ id: crypto.randomUUID(), desc: newItemDesc.trim(), amount: String(parsedAmount) }
// puis <TableRow key={line.id}>
```
`billingDraft(lines, …)` reçoit alors un champ de plus ; son effet sur les calculs n'a pas été vérifié.

- **La mesure :**
  - Classement fait à la main sur les 45 sites, avec le code autour de chacun.
  - 6 des 7 changements (b) ont été appliqués dans le worktree (le septième, `medical-record-summary.tsx:133`, demande une petite réécriture non essayée) : `tsc -b` passe une fois retirés les 3 paramètres d'index devenus inutiles, et il reste 39 remarques `noArrayIndexKey` (45 moins 6). Le repli `?? index` des deux clés de `chart.tsx` n'est pas signalé. Avec ce correctif, `tests/modules/dashboard/settle-progress-bar.test.tsx` et `tests/modules/patients/owner-contact-edit.test.tsx` passent (31 tests). Le correctif est dans /tmp/claude-0/c2tools/keys-b.patch.
  - Rendu dans Chromium d'une reproduction du tableau de facturation (mêmes `updateItem` et `removeItem`, vrai composant `Input`), trois clés comparées :

| Clé | Saisie de « XY » dans la ligne 1 | Suppression de la ligne 1 au clavier |
|---|---|---|
| `index` (actuel) | « ConsultationXY », le focus reste | le focus passe au bouton Supprimer de la ligne suivante ; un second Entrée supprime aussi cette ligne |
| `line.desc` | « ConsultationX », le focus est perdu dès la première lettre | le focus retombe sur la page |
| `line.id` | « ConsultationXY », le focus reste | le focus retombe sur la page ; le nœud de la ligne 2 est conservé |

  - `StreamingMessage` réel rendu dans Chromium, texte qui s'allonge : avec `key={p}` (actuel), le paragraphe en cours garde son nœud ; avec `key={paragraph}`, il est recréé à chaque ajout. La clé par index est donc la bonne pour les 4 sites de ce fichier.
- **Ma recommandation :** ajouter un commentaire d'ignore justifié sur les 37 sites (a), passer les 7 sites (b) à leur identifiant, et traiter le site (c) à part avec un identifiant de ligne, en décidant où mettre le focus après une suppression.
- **Ce qui n'est pas prouvé :** l'écran réel de facturation n'a pas été rendu, seulement une reproduction fidèle de sa logique. Seuls deux fichiers de test touchent ces composants, et ils ne vérifient pas l'identité des nœuds. Pour `settle-widgets.tsx:259`, l'unicité de `label ?? tone` n'est pas garantie par le type ; le composant `SettleProgressBar` n'a aucun appelant dans `src`, seulement un test. Pour `medical-record-summary.tsx:133`, `key={part}` serait en double si l'espèce et la race portaient le même texte ; d'où la clé par nom de champ.

### `noForEach`, 46 sites, et `useIterableCallbackReturn`, 42 sites

- **Ce qui change :** `for…of` remplace l'appel de rappel. Un `return` du rappel devient `continue`, l'index passe par `.entries()`, une Map rend des paires `[clé, valeur]` (il faut `.values()`), et un tableau creux rend `undefined` au lieu de sauter les trous. `useIterableCallbackReturn` signale seulement qu'un rappel en expression rend une valeur ignorée.
- **Recouvrement des deux règles, mesuré :** 27 des 42 remarques `useIterableCallbackReturn` tombent dans l'étendue d'un site `noForEach` (même appel). Les 15 autres sont toutes des `forEach` dont le rappel utilise l'index : `noForEach` ne les signale pas. Aucune remarque ne porte sur autre chose que `forEach` (le texte visé est « forEach » pour les 42). Il y a donc 61 appels distincts.
- **Les sites, par risque croissant :**

| Classe | Nombre | Sites |
|---|---|---|
| F1 : Set (abonnés, jetons) | 11 | voir le détail |
| F2 : tableau, un paramètre, sans `return` | 30 | voir le détail |
| F3 : NodeList (statique, `querySelectorAll`) | 2 | `modules/documents/components/consultation-documents-assistant.tsx:87`, `:90` |
| F4 : Map, il faut `.values()` | 1 | `hooks/useRowSaveFlash.ts:47` |
| F5 : `return` qui devient `continue` | 2 | `hooks/useRowSaveFlash.ts:18` (NodeList), `modules/agenda/hooks/use-agenda-page-model.tsx:330` |
| F6 : index utilisé, `.entries()` (useIterableCallbackReturn seule) | 15 | voir le détail |

<details><summary>Détail des classes F1, F2, F6 et des 27 sites communs</summary>

F1 : `hooks/useRowSaveFlash.ts:46`, `hooks/useSQLite.ts:331`, `modules/clinique/clinic-services.ts:43`, `modules/consultations/lib/voice-to-soap.ts:151`, `modules/consultations/services/ai-model-installation.ts:40`, `modules/dashboard/hooks/use-dashboard-version.ts:19`, `modules/stock/hooks/create-stock-snapshot.ts:18`, `modules/stock/hooks/use-stock-inventory.ts:21`, `modules/tour/tour-store.ts:67`, `services/localTextService.ts:21`, `services/sqlite/table-snapshot-cache.ts:61`

F2 : `hooks/useSQLite.ts:217`, `hooks/useSQLite.ts:306`, `lib/invoice-pdf.ts:218`, `lib/invoice-pdf.ts:154`, `lib/invoice-pdf.ts:231`, `lib/invoice-pdf.ts:239`, `lib/invoice-pdf.ts:152`, `lib/metrics.ts:327`, `modules/agenda/hooks/use-agenda-page-model.tsx:368`, `modules/consultations/local-ai/audio-capture.ts:306`, `modules/consultations/local-ai/audio-capture.ts:134`, `modules/consultations/local-ai/audio-capture.ts:158`, `modules/consultations/local-ai/audio-capture.ts:163`, `modules/consultations/local-ai/audio-capture.ts:255`, `modules/documents/lib/managed-document-pdf.ts:107`, `modules/documents/lib/managed-document-pdf.ts:117`, `modules/documents/lib/managed-document-pdf.ts:119`, `modules/documents/lib/managed-document-pdf.ts:142`, `modules/patients/export/patient-record-pdf.ts:757`, `modules/patients/hooks/use-patients-page-model.tsx:86`, `modules/patients/hooks/use-patients-page-model.tsx:89`, `modules/patients/hooks/use-patients-page-model.tsx:101`, `services/demo-data.ts:661`, `services/demo-data.ts:658`, `services/demo-data.ts:664`, `services/demo-data.ts:646`, `services/demo-data.ts:649`, `services/demo-data.ts:652`, `services/demo-data.ts:655`, `services/demo-data.ts:665`

F6 (useIterableCallbackReturn seule) : `lib/invoice-pdf.ts:162`, `lib/invoice-pdf.ts:346`, `lib/invoice-pdf.ts:141`, `modules/agenda/model/agenda-layout.ts:313`, `modules/consultations/local-ai/embedding-index.ts:376`, `modules/dashboard/model/hex-activity.ts:297`, `modules/dashboard/model/hex-activity.ts:298`, `modules/dashboard/model/hex-activity.ts:304`, `modules/documents/lib/managed-document-pdf.ts:173`, `modules/patients/export/patient-record-pdf.ts:377`, `modules/patients/export/patient-record-pdf.ts:862`, `modules/patients/export/patient-record-pdf.ts:866`, `modules/patients/export/patient-record-pdf.ts:880`, `modules/patients/health-card/health-card-pdf.ts:164`, `modules/patients/health-card/health-card-pdf.ts:656`

useIterableCallbackReturn couverte par un site noForEach (27) : `hooks/useRowSaveFlash.ts:46`, `hooks/useRowSaveFlash.ts:47`, `hooks/useSQLite.ts:331`, `modules/clinique/clinic-services.ts:43`, `modules/consultations/local-ai/audio-capture.ts:134`, `modules/consultations/local-ai/audio-capture.ts:158`, `modules/consultations/local-ai/audio-capture.ts:163`, `modules/consultations/local-ai/audio-capture.ts:255`, `modules/consultations/services/ai-model-installation.ts:40`, `modules/dashboard/hooks/use-dashboard-version.ts:19`, `modules/documents/components/consultation-documents-assistant.tsx:89`, `modules/documents/components/consultation-documents-assistant.tsx:92`, `modules/patients/hooks/use-patients-page-model.tsx:86`, `modules/patients/hooks/use-patients-page-model.tsx:89`, `modules/stock/hooks/create-stock-snapshot.ts:18`, `modules/stock/hooks/use-stock-inventory.ts:21`, `modules/tour/tour-store.ts:67`, `services/demo-data.ts:658`, `services/demo-data.ts:661`, `services/demo-data.ts:646`, `services/demo-data.ts:649`, `services/demo-data.ts:652`, `services/demo-data.ts:655`, `services/demo-data.ts:664`, `services/demo-data.ts:665`, `services/localTextService.ts:21`, `services/sqlite/table-snapshot-cache.ts:61`
</details>

Vérifié pour les 61 appels : aucun rappel n'utilise `this` (ce sont des fonctions fléchées), aucun n'utilise `await` ni `break`, aucun ne modifie la collection qu'il parcourt. Les tableaux viennent de `map`, `filter`, `split`, `Array.from`, `getTracks()` ou `Object.keys/values` : aucun n'est creux (vérifié pour `hex-activity.ts`, dont les semaines sont faites par `Array.from({ length: 7 })`). Pour un Set, `forEach` et `for…of` ont la même sémantique quand un abonné se désinscrit ou s'inscrit pendant la notification.

- **Exemples travaillés (les plus sûrs) :**

`modules/tour/tour-store.ts:67`, F1 :
```ts
const notify = () => listeners.forEach((listener) => listener());
const notify = () => { for (const listener of listeners) { listener(); } };
```
Même ordre d'appel, même valeur rendue (`undefined`).

`hooks/useRowSaveFlash.ts:47`, F4 :
```ts
running.forEach((animation) => animation.cancel());
for (const animation of running.values()) { animation.cancel(); }
```
Sans `.values()`, `animation` serait une paire `[élément, animation]` ; `tsc` le refuserait.

`modules/agenda/hooks/use-agenda-page-model.tsx:330`, F5 :
```ts
appointments.forEach((appointment) => { const start = …; if (!start) { return; } … });
for (const appointment of appointments) { const start = …; if (!start) { continue; } … }
```
Le `return` sortait du rappel seulement ; `continue` passe de même à l'élément suivant.

`modules/dashboard/model/hex-activity.ts:298`, F6, option minimale sans changer la boucle :
```ts
(day, col) => day && cells.push(dayCell(day, offset + col, row))
(day, col) => { if (day) { cells.push(dayCell(day, offset + col, row)); } }
```
Un simple `{ day && cells.push(…); }` ferait apparaître une remarque `noUnusedExpressions` (mesuré) : il faut le `if`.

- **La mesure :**
  - Réécriture automatique des 61 appels en `for…of` (script /tmp/claude-0/c2tools/foreach.mjs, avec le vérificateur de types de TypeScript pour reconnaître Map, Set, NodeList et tableaux ; deux passes pour les `forEach` imbriqués), puis formatage des 24 fichiers touchés. Résultat : `noForEach` 46 à 0, `useIterableCallbackReturn` 42 à 0, aucune autre remarque nouvelle dans ces fichiers, `tsc -b` passe, et les 30 fichiers de test qui importent ces modules passent (350 tests). Correctif : /tmp/claude-0/c2tools/foreach.patch.
  - Option minimale (corps en bloc, boucle inchangée) sur les 42 sites `useIterableCallbackReturn` : la règle tombe à 0, `tsc -b` passe, les mêmes 350 tests passent, avec une remarque nouvelle `noUnusedExpressions` à `hex-activity.ts:298` que le `if` ci-dessus évite. Correctif : /tmp/claude-0/c2tools/braces.patch.
- **Ma recommandation :** appliquer la réécriture `for…of` aux 46 sites `noForEach` (F1 à F5) ; pour les 15 sites avec index, préférer l'option minimale en bloc, plus lisible que `.entries()` dans du code de mise en page PDF.
- **Ce qui n'est pas prouvé :** la couverture des tests sur chaque site n'a pas été mesurée ; les chemins audio (`audio-capture.ts`) et l'animation de `useRowSaveFlash` ne sont pas exercés par un test. À `invoice-pdf.ts:141`, `nameLines` est de type `any` : la réécriture perd l'annotation `line: string`, sans effet à l'exécution mais avec moins de contrôle de type.

### `noDescendingSpecificity`, 117 sites

- **Ce qui change :** la règle signale une règle CSS moins spécifique placée après une plus spécifique qui vise le même dernier sélecteur. Entre ces deux règles, la plus spécifique gagne déjà quel que soit l'ordre ; réordonner ne change donc rien entre elles, mais déplacer une règle peut changer sa place face à d'autres règles, et une liste de sélecteurs se déplace en entier.
- **Les sites, par risque croissant :**

| Classe | Nombre | Sites |
|---|---|---|
| a1 : les deux sélecteurs sont dans la même règle (même déclaration) | 9 | tous dans `index.css` (blocs `.tiptap-editor .ProseMirror …, .document-rich-content …`) |
| a2 : aucune propriété commune | 51 | voir le détail |
| a3 : propriétés communes, valeurs identiques | 4 | `design-system/clean.css:277`, `:416`, `index.css:2536`, `:2621` |
| a4 : valeurs différentes, jamais sur le même élément dans les 28 vues visitées | 40 | voir le détail |
| b : valeurs différentes et éléments visés par les deux | 13 | `design-system/clean.css:577`, `design-system/clean.css:578`, `design-system/clean.css:1705`, `modules/agenda/components/agenda-cards.css:391`, `modules/dashboard/components/premium-analytics.css:863`, `modules/dashboard/components/premium-analytics.css:889`, `modules/patients/medical-record.css:2109`, `modules/shell/premium-sidebar.css:555`, `modules/shell/premium-sidebar.css:557`, `modules/shell/shell-toolbar.css:492`, `modules/shell/shell-toolbar.css:534`, `modules/shell/shell-toolbar.css:550`, `modules/shell/shell-toolbar.css:591` |

<details><summary>Détail des classes a1, a2 et a4</summary>

a1 : `index.css:473`, `index.css:415`, `index.css:450`, `index.css:466`, `index.css:482`, `index.css:396`, `index.css:395`, `index.css:373`, `index.css:366`

a2 : `components/auth-clinic.css:140`, `components/ui/data-table.css:84`, `design-system/clean.css:593`, `design-system/clean.css:746`, `design-system/clean.css:752`, `design-system/clean.css:817`, `design-system/clean.css:1059`, `design-system/clean.css:1130`, `design-system/clean.css:1151`, `design-system/clean.css:1203`, `design-system/clean.css:1204`, `design-system/clean.css:1466`, `design-system/clean.css:1470`, `design-system/clean.css:1533`, `design-system/clean.css:1664`, `design-system/clean.css:1775`, `design-system/clean.css:1814`, `design-system/clean.css:1839`, `design-system/premium-workspace.css:634`, `design-system/premium.css:787`, `design-system/premium.css:641`, `design-system/premium.css:646`, `index.css:408`, `index.css:1385`, `index.css:1411`, `index.css:1555`, `index.css:1588`, `index.css:1593`, `index.css:2222`, `index.css:2239`, `index.css:2334`, `index.css:2449`, `index.css:2457`, `index.css:2479`, `index.css:2544`, `index.css:2564`, `index.css:2584`, `index.css:2613`, `index.css:1761`, `modules/agenda/components/agenda-cards.css:421`, `modules/dashboard/components/clinical/clinical-workspace.css:292`, `modules/flow-board/flow-board.css:242`, `modules/flow-board/flow-board.css:517`, `modules/hospitalizations/stays/hospitalisation.css:59`, `modules/patient-reminders/patient-reminders.css:52`, `modules/patients/export/patient-record-export.css:80`, `modules/patients/medical-record.css:691`, `modules/patients/medical-record.css:1571`, `modules/patients/medical-record.css:1668`, `modules/shell/shell-toolbar.css:461`, `modules/shell/shell-toolbar.css:454`

a4 : `components/auth-clinic.css:639`, `design-system/clean.css:1727`, `design-system/clean.css:569`, `design-system/clean.css:570`, `design-system/clean.css:583`, `design-system/clean.css:584`, `design-system/clean.css:586`, `design-system/clean.css:590`, `design-system/clean.css:629`, `design-system/clean.css:722`, `design-system/clean.css:985`, `design-system/clean.css:1036`, `design-system/clean.css:1306`, `design-system/clean.css:1369`, `design-system/clean.css:1441`, `design-system/clean.css:1561`, `design-system/clean.css:1639`, `design-system/clean.css:1139`, `design-system/premium-workspace.css:327`, `design-system/premium-workspace.css:674`, `design-system/premium.css:753`, `design-system/premium.css:751`, `design-system/premium.css:752`, `index.css:419`, `index.css:1337`, `index.css:1346`, `index.css:1648`, `index.css:2373`, `modules/dashboard/components/clinical/clinical-workspace.css:222`, `modules/dashboard/components/clinical/clinical-workspace.css:434`, `modules/dashboard/components/premium-analytics.css:995`, `modules/flow-board/flow-board.css:132`, `modules/hospitalizations/stays/hospitalisation.css:49`, `modules/patients/medical-record.css:1455`, `modules/patients/patient-record-blocks.css:398`, `modules/patients/patient-record-blocks.css:342`, `modules/shell/premium-sidebar.css:169`, `modules/shell/premium-sidebar.css:556`, `modules/shell/premium-sidebar.css:558`, `modules/shell/shell-toolbar.css:764`
</details>

- **Exemples travaillés (les plus sûrs) :**

`index.css:395`, a1. `.document-rich-content th` suit `.tiptap-editor .ProseMirror th` dans la même liste de sélecteurs. Les deux portent les mêmes déclarations : aucun ordre ne peut changer le rendu.

`modules/flow-board/flow-board.css:517`, a2. `.flow-card { transition }` suit `.flow-lane-list > li > .flow-card { flex; min-width }`. Aucune propriété commune : les deux s'appliquent ensemble, dans n'importe quel ordre.

`modules/dashboard/components/premium-analytics.css:863`, b. `[data-skin="clean"] table th` (0,1,2) suit `[data-skin="clean"] table thead th` (0,1,3) ; les deux déclarent `padding` et `color` en `!important`. Dans l'en-tête, la seconde gagne aujourd'hui par spécificité, et gagnerait encore si on plaçait la première avant.

- **La mesure :**
  - Analyse des 117 paires avec postcss et postcss-selector-parser (script /tmp/claude-0/c2tools/spec.mjs). La spécificité calculée concorde avec celle du message de Biome pour 117 sur 117. Les propriétés comparées tiennent compte des raccourcis (`border` et `border-color`, `margin` et `margin-bottom`, `inset` et `top`…).
  - Application lancée dans Chromium (serveur Vite du worktree, base de démonstration du navigateur, thème clair puis sombre) : 14 vues par thème, soit 28 relevés, avec pour chaque paire le nombre d'éléments visés par les deux sélecteurs (pseudo-classes d'état retirées). 13 paires de la classe a2 visent des éléments communs, sans effet puisqu'elles n'ont pas de propriété commune. Dans la classe a4, 17 paires ont leurs deux règles présentes sans jamais viser le même élément, et 23 ont une règle jamais rencontrée.
  - Essai de réordonnancement : chaque règle tardive déplacée juste avant la règle plus spécifique (ou avant son bloc `@media`), puis styles calculés de tous les éléments comparés sur 20 vues (13 978 éléments). Deux captures de référence diffèrent déjà de 25 éléments (la mascotte animée et la ligne de l'heure de l'agenda). Pour les 13 paires b (11 règles déplacées) puis pour les 108 paires hors a1 (101 règles déplacées, 568 lignes de diff dans 17 fichiers), il n'y a aucune différence en dehors de ce bruit. Mais il reste 30 remarques après le déplacement global : déplacer crée de nouvelles paires descendantes.
  - Désactiver la règle (`"style": { "noDescendingSpecificity": "off" }` dans biome.jsonc) fait passer le total de 2141 à 2024 remarques, soit exactement les 117.
- **Ma recommandation :** ne pas réordonner ; désactiver `noDescendingSpecificity` dans biome.jsonc, car 64 paires sont sans effet par construction, les 53 autres n'ont montré aucun effet mesurable, et le déplacement crée 30 nouvelles remarques pour un diff de 568 lignes dans des feuilles réglées à la main.
- **Ce qui n'est pas prouvé :** les états de survol, de focus et d'ouverture n'ont pas été rendus (seulement neutralisés dans le comptage) ; les fenêtres étroites (`max-width: 639px`, `780px`), `prefers-reduced-transparency` et `prefers-contrast` non plus ; les dialogues et les pages non visitées (Paramètres, Rappels, Équipe, Documents) ne figurent pas dans la comparaison des styles. Huit paires mêlent une règle dans `@layer utilities` et une règle hors calque : là, une déclaration `!important` du calque l'emporte sur celle hors calque, ce qui contredit l'intuition de la spécificité ; trois de ces paires visent des éléments communs (`clean.css:277`, `premium.css:641` et `:646`), mais sans propriété commune de valeur différente.

### `useFilenamingConvention`, 55 sites

- **Ce qui change :** renommer un fichier change son chemin pour tous les imports, les `vi.mock`, les tests qui lisent le source, et les documents qui le citent. Le code exécuté ne change pas.
- **La convention attendue :** `node_modules/ultracite/config/biome/core/biome.jsonc` fixe `"filenameCases": ["kebab-case"]` et `"requireAscii": true` ; biome.jsonc du projet étend ce fichier sans le modifier. Les 55 messages disent « The filename should be in kebab-case. ». Les fichiers de test sont hors champ (override Ultracite et `files.includes` limité à `src/**`).
- **Les sites, par risque croissant :**

| Classe | Nombre | Sites |
|---|---|---|
| nom composé, le nom change vraiment (`CommandPalette.tsx` en `command-palette.tsx`) | 47 | voir le tableau |
| casse seule (`App.tsx` en `app.tsx`) | 8 | `App`, `components/Auth`, `Avatar`, `Editor`, `Logo`, `Parametres`, `Tasks`, `Team` |

<details><summary>Les 55 fichiers, le nouveau nom et le nombre de références</summary>

| Fichier | Nouveau nom | Références (code / tests / autres) |
|---|---|---|
| `App.tsx` (casse seule) | `app.tsx` | 1 / 0 / 2 |
| `components/AgendaListView.tsx` | `agenda-list-view.tsx` | 1 / 1 / 4 |
| `components/Auth.tsx` (casse seule) | `auth.tsx` | 1 / 0 / 1 |
| `components/Avatar.tsx` (casse seule) | `avatar.tsx` | 5 / 0 / 1 |
| `components/CommandPalette.tsx` | `command-palette.tsx` | 1 / 2 / 2 |
| `components/Editor.tsx` (casse seule) | `editor.tsx` | 1 / 0 / 0 |
| `components/HeroPattern.tsx` | `hero-pattern.tsx` | 1 / 0 / 1 |
| `components/LicenseGate.tsx` | `license-gate.tsx` | 1 / 0 / 1 |
| `components/LicenseStatusCard.tsx` | `license-status-card.tsx` | 1 / 0 / 0 |
| `components/Logo.tsx` (casse seule) | `logo.tsx` | 12 / 0 / 1 |
| `components/MotivationalHeader.tsx` | `motivational-header.tsx` | 7 / 0 / 1 |
| `components/NotesPro.tsx` | `notes-pro.tsx` | 1 / 0 / 1 |
| `components/PageDate.tsx` | `page-date.tsx` | 1 / 0 / 0 |
| `components/Parametres.tsx` (casse seule) | `parametres.tsx` | 1 / 2 / 4 |
| `components/QuickPatientPicker.tsx` | `quick-patient-picker.tsx` | 1 / 0 / 0 |
| `components/SectionGarden.tsx` | `section-garden.tsx` | 1 / 0 / 0 |
| `components/SelectionBubbleMenu.tsx` | `selection-bubble-menu.tsx` | 1 / 0 / 0 |
| `components/SetupWizard.tsx` | `setup-wizard.tsx` | 1 / 0 / 1 |
| `components/SlashCommandMenu.tsx` | `slash-command-menu.tsx` | 1 / 0 / 0 |
| `components/SlashCommandsExtension.tsx` | `slash-commands-extension.tsx` | 1 / 1 / 1 |
| `components/Tasks.tsx` (casse seule) | `tasks.tsx` | 1 / 1 / 4 |
| `components/Team.tsx` (casse seule) | `team.tsx` | 1 / 0 / 0 |
| `contexts/AuthContext.tsx` | `auth-context.tsx` | 49 / 3 / 0 |
| `hooks/useDelayedSkeleton.ts` | `use-delayed-skeleton.ts` | 2 / 0 / 1 |
| `hooks/useListCursor.ts` | `use-list-cursor.ts` | 5 / 1 / 0 |
| `hooks/useNowTick.ts` | `use-now-tick.ts` | 3 / 0 / 1 |
| `hooks/usePatientIntentPrefetch.ts` | `use-patient-intent-prefetch.ts` | 1 / 0 / 0 |
| `hooks/useRowSaveFlash.ts` | `use-row-save-flash.ts` | 1 / 0 / 0 |
| `hooks/useSQLite.ts` | `use-sqlite.ts` | 17 / 6 / 4 |
| `hooks/useSaveIndicator.ts` | `use-save-indicator.ts` | 1 / 0 / 1 |
| `modules/dashboard/hooks/usePostOpFollowUp.ts` | `use-post-op-follow-up.ts` | 1 / 0 / 1 |
| `services/activationAdminWindowService.ts` | `activation-admin-window-service.ts` | 4 / 0 / 1 |
| `services/adminAccess.ts` | `admin-access.ts` | 6 / 3 / 1 |
| `services/aiConversationStore.ts` | `ai-conversation-store.ts` | 0 / 1 / 1 |
| `services/aiOutput.ts` | `ai-output.ts` | 0 / 1 / 0 |
| `services/aiToolProtocol.ts` | `ai-tool-protocol.ts` | 0 / 1 / 1 |
| `services/appSettingsService.ts` | `app-settings-service.ts` | 10 / 6 / 1 |
| `services/assistantWorkspace.ts` | `assistant-workspace.ts` | 0 / 1 / 0 |
| `services/auditService.ts` | `audit-service.ts` | 1 / 0 / 1 |
| `services/backupCrypto.ts` | `backup-crypto.ts` | 1 / 0 / 2 |
| `services/backupScheduler.ts` | `backup-scheduler.ts` | 1 / 0 / 2 |
| `services/backupService.ts` | `backup-service.ts` | 6 / 2 / 1 |
| `services/billingService.ts` | `billing-service.ts` | 15 / 5 / 4 |
| `services/browserCredentials.ts` | `browser-credentials.ts` | 2 / 1 / 0 |
| `services/geminiService.ts` | `gemini-service.ts` | 1 / 0 / 2 |
| `services/invoiceSettingsService.ts` | `invoice-settings-service.ts` | 14 / 8 / 0 |
| `services/licenseActivationService.ts` | `license-activation-service.ts` | 5 / 5 / 2 |
| `services/licenseLease.ts` | `license-lease.ts` | 2 / 2 / 1 |
| `services/licenseRuntime.ts` | `license-runtime.ts` | 3 / 1 / 1 |
| `services/licenseService.ts` | `license-service.ts` | 2 / 0 / 1 |
| `services/localDataReset.ts` | `local-data-reset.ts` | 1 / 3 / 1 |
| `services/localTextService.ts` | `local-text-service.ts` | 2 / 0 / 3 |
| `services/notifications/useNotificationCenter.ts` | `use-notification-center.ts` | 2 / 0 / 1 |
| `services/updateService.ts` | `update-service.ts` | 2 / 1 / 3 |
| `services/vetKnowledgeService.ts` | `vet-knowledge-service.ts` | 2 / 2 / 2 |
</details>

- **Exemples travaillés (les plus sûrs) :** `services/aiOutput.ts` en `ai-output.ts` : une seule référence, dans `tests/services/ai-output.test.ts`. `hooks/useRowSaveFlash.ts` en `use-row-save-flash.ts` : une seule référence dans `src`. `useSQLite.ts` devient `use-sqlite.ts` et non `use-sq-lite.ts` (conversion corrigée à la main).
- **La mesure :**
  - Renommage des 55 fichiers par `git mv` dans le worktree et réécriture des chemins (script /tmp/claude-0/c2tools/fn.mjs). Total : 330 références réécrites. Dans `src`, 205 lignes dans 155 fichiers (dont les 55 renommés) ; dans `tests`, 60 lignes dans 45 fichiers (imports et `vi.mock`) ; plus 2 scripts (`scripts/eval-local-ai`), `DESIGN.md`, `.impeccable/design.json`, et 56 lignes dans 27 documents de `docs/`. Les plus cités : `AuthContext` (52), `useSQLite` (27), `billingService` (24), `invoiceSettingsService` (22), `appSettingsService` (17).
  - Quatre tests lisent un chemin mot à mot : `tests/modules/agenda/agenda-ouvrir.test.ts` (`AgendaListView.tsx`), `tests/modules/clinique/clinic-services.test.ts` (`CommandPalette.tsx`), `tests/components/update-check-row.test.tsx` et `tests/display-settings-cleanup.test.ts` (`Parametres.tsx`).
  - Aucun fichier Rust ni de configuration Tauri ne nomme ces fichiers (grep dans `src-tauri`, `*.toml`, `*.json` hors docs). Aucun nom cible n'existe déjà, même à la casse près.
  - Après renommage : `tsc -b` passe, la règle tombe à 0, et les 45 fichiers de test touchés passent (394 tests).
  - Option de configuration essayée : un `override` dans biome.jsonc pour `src/App.tsx`, `src/components/*.tsx`, `src/contexts/*.tsx`, `src/hooks/use*.ts`, `src/modules/dashboard/hooks/use*.ts`, `src/services/*.ts` et `src/services/notifications/use*.ts`, avec `"filenameCases": ["kebab-case", "camelCase", "PascalCase"]` et `"strictCase": false` (sans ce dernier, `useSQLite.ts` reste signalé). Résultat : 0 remarque de nommage, et le total passe de 2141 à 2086 sans autre changement. La variante qui liste les 55 chemins un par un donne aussi 0 remarque. Le fichier est dans /tmp/claude-0/c2tools/biome-override.jsonc.
- **Ma recommandation :** configurer l'exception plutôt que renommer maintenant, en listant les 55 fichiers nommément plutôt que par dossier pour que les nouveaux fichiers restent en kebab-case ; renommer plus tard, dossier par dossier, en commençant par les 47 noms composés.
- **Ce qui n'est pas prouvé :** le comportement des 8 renommages de casse seule sur macOS et Windows n'a pas été essayé (machine Linux). Le risque connu : sur un disque insensible à la casse, un import resté en `./Logo` se résout encore, l'erreur n'apparaît qu'au build Linux ou par l'option `forceConsistentCasingInFileNames` de TypeScript (active par défaut, non vérifiée ici) ; et une branche ouverte qui modifie `Logo.tsx` peut laisser deux entrées dans l'index Git. La glob par dossier de l'override autoriserait aussi de nouveaux fichiers en PascalCase ou camelCase. Le build Vite de production n'a pas été lancé.
