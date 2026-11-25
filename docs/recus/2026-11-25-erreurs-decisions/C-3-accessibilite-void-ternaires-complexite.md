# C3. Les remarques qui changent un comportement : accessibilité, `noVoid`, ternaires, complexité, petites règles

Base mesurée : commit 8e6c9b6b (dépôt propre /tmp/claude-0/erreurs-b). Les essais ont été faits dans un worktree à part, /tmp/claude-0/wt-c3, jamais commité. Biome 2.4.15, Ultracite (préréglages `core` et `react`), TypeScript du dépôt, Tailwind 4.3, React 19.2, Base UI 1.5.

Méthode commune. Les sites viennent de /tmp/claude-0/c-out/diags.json (dossier src/). Pour `noVoid`, deux sites de plus sont dans vite.config.ts, hors de ce fichier ; je les ai trouvés en lançant Biome sur les fichiers de configuration. J'ai classé les sites avec l'arbre syntaxique de TypeScript (scripts dans /tmp/claude-0/c3w/), puis j'ai lu le code des cas douteux. La liste complète, site par site, est dans /tmp/claude-0/c-out/c3-sites.json (1 225 entrées).

Constat général sur les options. Parmi les règles de ce document, seules deux ont des options : `noLabelWithoutControl` (`inputComponents`, `labelComponents`, `labelAttributes`) et `noExcessiveCognitiveComplexity` (`maxAllowedComplexity`). Les autres, dont `noVoid` et `noNestedTernary`, n'en ont aucune : le schéma de Biome les déclare `additionalProperties: false`. Pour elles, le choix est entre corriger, ignorer site par site ou couper la règle. Une règle réglée sur `warn` ne fait pas échouer `biome lint` : je l'ai vérifié, code de sortie 0 sur un fichier qui n'a que des avertissements.

## 1. Accessibilité, 203 remarques

Résumé de la famille. Sur 203 remarques (certains éléments sont comptés par deux ou trois règles), j'ai trouvé 23 vrais défauts : 9 étiquettes orphelines, 10 `aria-label` posés sur un élément générique, 1 `aria-selected` sur un `article`, 1 graphique sans texte et 2 boutons sans `type` (risque latent, sans bogue actuel). Le reste est fait de faux positifs, sur des motifs que Biome ne lit pas : composants maison qui rendent un vrai contrôle, rôles conditionnels, graphiques focalisables qui ont déjà leur clavier, poignée de déplacement de la fenêtre Tauri.

### `noLabelWithoutControl`, 62 sites
- **Ce qui change :** Biome veut que chaque `<label>` contienne un contrôle qu'il reconnaît, ou porte `htmlFor`. Il ne reconnaît pas `Input`, `Textarea`, `NativeSelect`, `DatePicker`, `Checkbox` ni `RadioGroupItem`, qui rendent pourtant un `<input>`, un `<textarea>`, un `<select>` ou un `<button>` (des éléments étiquetables).
- **Les sites, par risque croissant :**

| Classe | Nombre | Sites |
|---|---|---|
| Faux positif : le label enveloppe un contrôle maison | 51 | voir la liste |
| Faux positif : composant d'étiquette générique (`ui/label.tsx`, `Field` de `ui/choice-controls.tsx`), le contrôle arrive par `children` ou `htmlFor` par les props | 2 | components/ui/label.tsx:9, components/ui/choice-controls.tsx:55 |
| Vrai défaut : étiquette orpheline, texte seul, contrôle à côté, sans `htmlFor` | 9 | modules/stock/components/purchasing-panel.tsx:566, :634, :644 ; stock-lots-panel.tsx:292, :321 ; stock-operations-panel.tsx:416, :678, :699, :712 |

<details><summary>Les 62 sites, par classe</summary>

- **faux positif : enveloppe un contrôle maison (Input, Textarea, NativeSelect, DatePicker, Checkbox, RadioGroupItem)** (51) : components/stock/stock-workspace.tsx:1222, components/stock/stock-workspace.tsx:1243, components/stock/stock-workspace.tsx:1254, modules/agenda/components/agenda-view.tsx:958, modules/care-tasks/care-task-form.tsx:207, modules/clinic-network/clinic-network-settings.tsx:228, modules/documents/components/document-composer.tsx:362, modules/documents/components/document-composer.tsx:288, modules/documents/components/document-composer.tsx:305, modules/documents/components/document-composer.tsx:330, modules/documents/components/document-composer.tsx:353, modules/documents/components/document-composer.tsx:249, modules/documents/components/document-composer.tsx:219, modules/documents/components/document-composer.tsx:208, modules/documents/components/document-preview-dialog.tsx:312, modules/documents/components/document-preview-dialog.tsx:460, modules/documents/components/document-preview-dialog.tsx:253, modules/documents/components/document-preview-dialog.tsx:261, modules/documents/components/document-template-manager.tsx:352, modules/documents/components/patient-document-registry.tsx:214, modules/documents/components/patient-document-registry.tsx:172, modules/documents/components/patient-document-registry.tsx:186, modules/documents/components/patient-document-registry.tsx:204, modules/hospitalizations/stays/care-plan-form.tsx:111, modules/hospitalizations/stays/care-plan-form.tsx:154, modules/hospitalizations/stays/care-plan-form.tsx:179, modules/hospitalizations/stays/stay-detail.tsx:155, modules/hospitalizations/stays/stay-follow-up.tsx:86, modules/hospitalizations/stays/stay-forms.tsx:182, modules/hospitalizations/stays/stay-forms.tsx:247, modules/hospitalizations/stays/stay-location-controls.tsx:146, modules/hospitalizations/stays/vitals-form.tsx:75, modules/hospitalizations/stays/vitals-form.tsx:120, modules/patient-reminders/patient-reminders-panel.tsx:571, modules/patient-reminders/patient-reminders-panel.tsx:582, modules/patient-reminders/patient-reminders-panel.tsx:680, modules/patient-reminders/patient-reminders-panel.tsx:689, modules/patients/patient-detail-page.tsx:976, modules/patients/patient-detail-page.tsx:989, modules/patients/patient-detail-page.tsx:1003, modules/patients/patient-detail-page.tsx:1016, modules/patients/patient-detail-page.tsx:1028, modules/patients/patient-detail-page.tsx:1048, modules/patients/patient-detail-page.tsx:1071, modules/patients/patient-detail-page.tsx:1085, modules/patients/patient-detail-page.tsx:1101, modules/patients/patient-detail-page.tsx:1115, modules/patients/patient-detail-page.tsx:1130, modules/patients/patient-detail-page.tsx:1144, modules/stock/components/stock-view.tsx:430, modules/stock/components/stock-view.tsx:537
- **faux positif : composant d'étiquette générique (enfant ou htmlFor passé par props)** (2) : components/ui/choice-controls.tsx:55, components/ui/label.tsx:9
- **vrai défaut : étiquette orpheline (texte seul, contrôle à côté, sans htmlFor)** (9) : modules/stock/components/purchasing-panel.tsx:634, modules/stock/components/purchasing-panel.tsx:644, modules/stock/components/purchasing-panel.tsx:566, modules/stock/components/stock-lots-panel.tsx:321, modules/stock/components/stock-lots-panel.tsx:292, modules/stock/components/stock-operations-panel.tsx:416, modules/stock/components/stock-operations-panel.tsx:678, modules/stock/components/stock-operations-panel.tsx:699, modules/stock/components/stock-operations-panel.tsx:712

</details>

- **Exemples travaillés (les plus sûrs) :**
  1. La configuration, qui ne touche à aucun fichier source :
     ```jsonc
     "a11y": { "noLabelWithoutControl": { "level": "error", "options": {
       "inputComponents": ["Input", "Textarea", "NativeSelect", "DatePicker", "Checkbox", "RadioGroupItem"]
     } } }
     ```
     Le rendu ne change pas, puisque rien n'est réécrit.
  2. Une étiquette orpheline du stock :
     ```tsx
     // avant
     <label className="text-sm">Péremption</label>
     <StockDatePicker label={`Péremption reçue ${index + 1}`} … />
     // après
     <span className="text-sm">Péremption</span>
     <StockDatePicker label={`Péremption reçue ${index + 1}`} … />
     ```
     Le comportement est le même. Aujourd'hui, un clic sur ce texte ne fait rien et le lecteur d'écran lit déjà le nom du contrôle par son `aria-label`. `label` et `span` sont tous deux en ligne, sans style par défaut du navigateur. Aucune feuille CSS du projet ne cible `label` dans ces écrans : les seuls sélecteurs `label` sont dans patient-record-export.css. L'autre correction, `id` sur le contrôle et `htmlFor` sur l'étiquette, changerait le comportement : le clic sur le texte ouvrirait le contrôle.
- **La mesure :** dans le worktree, avec l'option ci-dessus, `biome lint --only=a11y/noLabelWithoutControl src` donne 11 remarques au lieu de 62. Ce sont les 2 composants génériques et les 9 étiquettes orphelines.
- **Ma recommandation :** ajouter l'option `inputComponents`, poser un `biome-ignore` justifié sur les 2 composants génériques et changer les 9 étiquettes orphelines en `span`.
- **Ce qui n'est pas prouvé :** je n'ai pas vérifié dans un navigateur que le clic sur l'étiquette coche bien la case Base UI (`Checkbox` rend un `span` avec un `input` caché). La documentation de Base UI annonce que cela marche. Je n'ai pas non plus écouté le résultat avec un lecteur d'écran.

### `useSemanticElements`, 41 sites
- **Ce qui change :** Biome propose de remplacer un rôle ARIA par la balise native : `fieldset` pour `role="group"`, `button`, `input`, `meter`, `section`. Changer la balise change les styles par défaut et parfois le comportement.
- **Les sites, par risque croissant :**

| Classe | Nombre | Sites |
|---|---|---|
| `div role="region" aria-label`, remplaçable par `<section aria-label>` (même rôle, `display: block` dans les deux cas) | 1 | modules/patients/components/patient-timeline.tsx:553 |
| Déjà un `<button>` avec `role="checkbox"` ou `role="radio"` et `aria-checked` (motif APG). Un `<input>` changerait tout le rendu | 5 | components/ui/choice-controls.tsx:200, :320 ; tuff-controls.tsx:90 ; segmented-control.tsx:109 ; modules/patients/components/off-visit-note-panel.tsx:184 |
| Jauge segmentée `role="meter"`. `<meter>` ne sait pas dessiner des segments | 2 | components/ui/context-window-meter.tsx:106, progress-bar.tsx:131 |
| `div role="button"` qui a déjà `tabIndex={0}` et Entrée/Espace. Le contenu est fait de blocs (`p`, `div`) ou d'une case à cocher, interdits dans un `<button>` | 2 | components/AgendaListView.tsx:279, components/ui/tool-approval-queue.tsx:260 |
| `div role="group" aria-label` : groupes de filtres, de séries, de créneaux. `fieldset` est proposé | 31 | voir la liste |

<details><summary>Les 41 sites, par classe</summary>

- **div role="button" avec clavier et tabIndex ; contenu bloc ou contrôle imbriqué, <button> invalide** (2) : components/AgendaListView.tsx:279, components/ui/tool-approval-queue.tsx:260
- **role="group" sur div ; fieldset proposé (styles par défaut différents)** (31) : components/Tasks.tsx:1079, components/documents-library.tsx:352, components/mascot/mascot-choices.tsx:34, components/ui/chart-card.tsx:313, components/ui/chart-card.tsx:375, components/ui/diverging-bars.tsx:265, components/ui/diverging-bars.tsx:304, components/ui/field.tsx:79, components/ui/hex-density.tsx:288, components/ui/input-group.tsx:18, components/ui/input-group.tsx:61, components/ui/radial-dots.tsx:177, components/ui/slot-picker.tsx:133, components/ui/slot-picker.tsx:143, modules/agenda/components/agenda-calendar.tsx:467, modules/agenda/components/agenda-month-calendar.tsx:79, modules/agenda/components/agenda-shared.tsx:275, modules/agenda/components/agenda-shared.tsx:305, modules/care-tasks/care-page.tsx:649, modules/care-tasks/care-page.tsx:679, modules/dashboard/components/clinical/actions-module.tsx:74, modules/dashboard/components/clinical/day-module.tsx:137, modules/dashboard/components/clinical/trends-module.tsx:67, modules/dashboard/components/morning-watch.tsx:98, modules/dashboard/components/premium-analytics.tsx:765, modules/dashboard/components/premium-analytics.tsx:698, modules/dashboard/components/premium-analytics.tsx:719, modules/dashboard/components/revenue-chart-widget.tsx:85, modules/dashboard/components/view-switch.tsx:18, modules/flow-board/flow-board-page.tsx:898, modules/shell/notification-center.tsx:458
- **déjà un <button> avec rôle ARIA (motif APG) ; <input> changerait le rendu** (5) : components/ui/choice-controls.tsx:200, components/ui/choice-controls.tsx:320, components/ui/segmented-control.tsx:109, components/ui/tuff-controls.tsx:90, modules/patients/components/off-visit-note-panel.tsx:184
- **jauge segmentée ; <meter> natif ne sait pas ce rendu** (2) : components/ui/context-window-meter.tsx:106, components/ui/progress-bar.tsx:131
- **div role="region" avec aria-label** (1) : modules/patients/components/patient-timeline.tsx:553

</details>

- **Exemples travaillés (les plus sûrs) :**
  ```tsx
  // avant (patient-timeline.tsx:553)
  <div aria-label="Chronologie du patient" className="patient-timeline" role="region">
  // après
  <section aria-label="Chronologie du patient" className="patient-timeline">
  ```
  Un `section` qui a un nom accessible a le rôle `region`. Il est en `display: block` comme un `div`, et le préflight de Tailwind remet marges et bordures à zéro.
- **La mesure :** comptes par rôle sur les 41 sites : `group` 31, `radio` 3, `button` 2, `checkbox` 2, `meter` 2, `region` 1. Le préflight de Tailwind (node_modules/tailwindcss/preflight.css) remet à zéro `margin`, `padding` et `border` sur tous les éléments, mais pas `min-inline-size: min-content`, que le navigateur donne à `fieldset`. Un `fieldset` placé dans une rangée flexible avec du texte tronqué peut donc déborder.
- **Ma recommandation :** passer le seul site `region` en `section` et couper la règle. Les 40 autres sites sont des choix ARIA corrects, et la balise native y changerait le rendu.
- **Ce qui n'est pas prouvé :** je n'ai pas lancé de rendu avec `fieldset` pour mesurer un débordement réel. J'ai aussi noté deux défauts que Biome ne signale pas. Le groupe radio de off-visit-note-panel.tsx:168 n'a pas la navigation par flèches attendue d'un `radiogroup` : chaque bouton est un arrêt de tabulation. Et tool-approval-queue.tsx:260 met une case à cocher dans un `role="button"` (contrôle imbriqué, avec `tabIndex={-1}` sur la case).

### `noNoninteractiveElementInteractions`, 27 sites ; `noStaticElementInteractions`, 16 sites ; `useKeyWithClickEvents`, 9 sites
Ces trois règles visent souvent les mêmes éléments : 52 remarques, 32 éléments distincts.
- **Ce qui change :** Biome demande qu'un élément qui reçoit un gestionnaire de souris ou de clavier soit interactif et ait un équivalent clavier. Corriger voudrait dire changer la balise, ajouter un rôle et `tabIndex`, ou retirer le gestionnaire.
- **Les sites, par risque croissant :**

| Classe | Éléments | Sites |
|---|---|---|
| Arrêt de propagation autour de boutons, pour que le clic ne remonte pas à la ligne du tableau | 4 | components/stock/stock-workspace.tsx:323, ui/data-table.tsx:408, modules/finances/components/invoices-table.tsx:231, modules/patients/components/patients-table.tsx:262 |
| Poignée de déplacement de la fenêtre Tauri (`onMouseDown`), par nature à la souris | 4 | components/Auth.tsx:76, SetupWizard.tsx:134, LicenseGate.tsx:200, modules/activation-admin/activation-admin-page.tsx:1361 |
| Clic sur une zone vide pour focaliser le champ, alors que le champ est atteignable au clavier | 2 | components/NotesPro.tsx:962, ui/input-group.tsx:51 |
| Graphique focalisable (`tabIndex={0}`) qui a déjà ses flèches clavier, et zones de survol SVG dont le clavier est sur le parent | 11 | voir la liste |
| Délégation d'événements : infobulle, menu contextuel bloqué, carte SOAP (le clavier passe par `onFocus` de l'éditeur), option de liste (le clavier passe par le textarea) | 4 | ui/tooltip-hint.tsx:95, ui/searchable-select.tsx:74, consultations/components/soap-section-editor.tsx:56, ui/agent-composer.tsx:157 |
| Rôle conditionnel que Biome ne lit pas, groupes avec flèches clavier, grille à focus itinérant | 6 | dashboard/v2/settle-widgets.tsx:144, :384 ; ui/agent-question.tsx:189 ; ui/slot-picker.tsx:128 ; flow-board/flow-board-page.tsx:389, :934 |
| Clic dans la colonne d'un jour qui crée un rendez-vous à l'heure cliquée, à la souris seulement. Au clavier, le menu « + » permet d'en créer un | 1 | modules/agenda/components/agenda-calendar.tsx:353 |

<details><summary>Les 27 sites, par classe</summary>

- **faux positif : glisser la fenêtre Tauri (mousedown)** (3) : components/Auth.tsx:76, components/LicenseGate.tsx:200, components/SetupWizard.tsx:134
- **faux positif : clic sur le vide pour focaliser l'éditeur** (1) : components/NotesPro.tsx:962
- **faux positif : arrêt de propagation autour de boutons** (4) : components/stock/stock-workspace.tsx:323, components/ui/data-table.tsx:408, modules/finances/components/invoices-table.tsx:231, modules/patients/components/patients-table.tsx:262
- **faux positif : radiogroup ou group avec flèches clavier** (1) : components/ui/agent-question.tsx:189
- **faux positif : graphique focalisable, flèches clavier** (9) : components/ui/chart-card.tsx:369, components/ui/diverging-bars.tsx:298, components/ui/hex-density.tsx:282, components/ui/radial-dots.tsx:172, modules/dashboard/components/focus-trend-chart.tsx:235, modules/dashboard/v2/kpi-mini-chart.tsx:67, modules/dashboard/v2/kpi-mini-chart.tsx:199, modules/dashboard/v2/kpi-visuals.tsx:80, modules/dashboard/v2/kpi-visuals.tsx:279
- **faux positif : clic sur l'addon pour focaliser le champ** (1) : components/ui/input-group.tsx:51
- **faux positif : menu contextuel bloqué hors du champ** (1) : components/ui/searchable-select.tsx:74
- **faux positif : groupe avec flèches clavier** (1) : components/ui/slot-picker.tsx:128
- **faux positif : délégation d'événements de l'infobulle vers son déclencheur** (1) : components/ui/tooltip-hint.tsx:95
- **faux positif : clic sur la carte SOAP ; le clavier passe par onFocus de l'éditeur** (1) : modules/consultations/components/soap-section-editor.tsx:56
- **faux positif : rôle button conditionnel que Biome ne lit pas** (2) : modules/dashboard/v2/settle-widgets.tsx:384, modules/dashboard/v2/settle-widgets.tsx:144
- **faux positif : carte d'une grille à focus itinérant** (1) : modules/flow-board/flow-board-page.tsx:389
- **faux positif : clavier délégué au tableau (focus itinérant)** (1) : modules/flow-board/flow-board-page.tsx:934

</details>

<details><summary>Les 16 sites, par classe</summary>

- **faux positif : glisser la fenêtre Tauri (mousedown)** (2) : components/LicenseGate.tsx:200, modules/activation-admin/activation-admin-page.tsx:1361
- **faux positif : clic sur le vide pour focaliser l'éditeur** (1) : components/NotesPro.tsx:962
- **faux positif : arrêt de propagation autour de boutons** (3) : components/stock/stock-workspace.tsx:323, modules/finances/components/invoices-table.tsx:231, modules/patients/components/patients-table.tsx:262
- **faux positif : radiogroup ou group avec flèches clavier** (1) : components/ui/agent-question.tsx:189
- **faux positif : zone de survol SVG ; le clavier est sur le groupe parent** (2) : components/ui/chart-card.tsx:631, components/ui/diverging-bars.tsx:460
- **faux positif : menu contextuel bloqué hors du champ** (1) : components/ui/searchable-select.tsx:74
- **faux positif : délégation d'événements de l'infobulle vers son déclencheur** (1) : components/ui/tooltip-hint.tsx:95
- **faux positif : clic dans la colonne du jour crée un rendez-vous à l'heure cliquée (souris seule ; le menu « + » reste au clavier)** (1) : modules/agenda/components/agenda-calendar.tsx:353
- **faux positif : clic sur la carte SOAP ; le clavier passe par onFocus de l'éditeur** (1) : modules/consultations/components/soap-section-editor.tsx:56
- **faux positif : rôle button conditionnel que Biome ne lit pas** (2) : modules/dashboard/v2/settle-widgets.tsx:384, modules/dashboard/v2/settle-widgets.tsx:144
- **faux positif : clavier délégué au tableau (focus itinérant)** (1) : modules/flow-board/flow-board-page.tsx:934

</details>

<details><summary>Les 9 sites, par classe</summary>

- **faux positif : clic sur le vide pour focaliser l'éditeur** (1) : components/NotesPro.tsx:962
- **faux positif : arrêt de propagation autour de boutons** (4) : components/stock/stock-workspace.tsx:323, components/ui/data-table.tsx:408, modules/finances/components/invoices-table.tsx:231, modules/patients/components/patients-table.tsx:262
- **faux positif : option de liste ; le clavier passe par le textarea (aria-activedescendant)** (1) : components/ui/agent-composer.tsx:157
- **faux positif : clic sur l'addon pour focaliser le champ** (1) : components/ui/input-group.tsx:51
- **faux positif : clic sur la carte SOAP ; le clavier passe par onFocus de l'éditeur** (1) : modules/consultations/components/soap-section-editor.tsx:56
- **faux positif : carte d'une grille à focus itinérant** (1) : modules/flow-board/flow-board-page.tsx:389

</details>

- **Exemples travaillés (les plus sûrs) :** aucune réécriture ne garde le comportement, parce que ces gestionnaires sont voulus. La forme sûre est le commentaire :
  ```tsx
  // biome-ignore lint/a11y/noStaticElementInteractions: arrête le clic de la ligne ; les boutons enfants ont leur clavier.
  <div className="flex items-center justify-end gap-1" onClick={(event) => event.stopPropagation()}>
  ```
  Le rendu et le comportement ne bougent pas.
- **La mesure :** j'ai lu les 32 éléments un par un et relevé leurs attributs (`role`, `tabIndex`, gestionnaires) avec /tmp/claude-0/c3w/tag.mjs. Tous les graphiques signalés ont `tabIndex={0}` avec `onKeyDown` ou un parent focalisable.
- **Ma recommandation :** couper `noStaticElementInteractions` et `noNoninteractiveElementInteractions`, qui ne signalent que des motifs voulus, et garder `useKeyWithClickEvents` avec 9 `biome-ignore` justifiés. C'est la seule des trois qui attrapera un vrai oubli de clavier dans le code à venir.
- **Ce qui n'est pas prouvé :** je n'ai pas fait un tour complet au clavier dans l'application. Pour agenda-calendar.tsx:353, l'alternative clavier existe dans le menu « + » (tour-steps.ts la décrit), mais elle ne choisit pas l'heure du clic.

### `useAriaPropsSupportedByRole`, 15 sites
- **Ce qui change :** un attribut ARIA est posé sur un élément dont le rôle ne le prend pas en charge. La spécification ARIA interdit `aria-label` sur un `div` ou un `span` générique, et beaucoup de lecteurs d'écran l'ignorent alors. Ce nom n'est donc pas lu aujourd'hui.
- **Les sites, par risque croissant :**

| Classe | Nombre | Sites | Correction |
|---|---|---|---|
| Faux positif : rôle conditionnel (`role={menu ? "combobox" : undefined}`, etc.) | 4 | components/ui/agent-composer.tsx:186, agent-question.tsx:189, :409, progress-bar.tsx:59 | `biome-ignore` |
| Vrai défaut : `aria-selected` sur un `article` (aucun `listbox` autour) | 1 | components/Tasks.tsx:1515 | retirer l'attribut, ou `data-selected` pour le style |
| Vrai défaut : `aria-label` sur une zone `div` | 4 | modules/care-tasks/care-page.tsx:97, dashboard/components/now-board-view.tsx:28, documents/components/document-paper-preview.tsx:37, patients/patient-detail-page.tsx:887 | `<section aria-label>`, ou `role="status"` pour le chargement |
| Vrai défaut : `aria-label` sur une barre de boutons `div` | 3 | components/Editor.tsx:437, dashboard/components/dashboard-mode-toggle.tsx:32, patients/export/patient-record-export-dialog.tsx:475 | `role="toolbar"`, ou `<nav>` pour la pagination |
| Vrai défaut : `aria-label` sur un compteur `span` | 3 | patients/components/patient-record-health.tsx:71, patients/patient-detail-page.tsx:1224, shell/notification-center.tsx:345 | `role="img"` avec `aria-label`, ou texte `sr-only` et chiffre `aria-hidden` |

- **Exemples travaillés (les plus sûrs) :**
  ```tsx
  // avant (notification-center.tsx:345)
  <span aria-label={`${unreadCount} non lues`} className={…}>{unreadCount}</span>
  // après
  <span aria-label={`${unreadCount} non lues`} className={…} role="img">{unreadCount}</span>
  ```
  À l'écran, rien ne change. Le lecteur d'écran lira « 3 non lues » au lieu de « 3 » ou de rien. C'est un changement voulu.
- **La mesure :** dans le worktree, j'ai ajouté `role="toolbar"` à Editor.tsx:437 et `role="img"` à notification-center.tsx:345, puis relancé Biome sur ces deux fichiers. Les deux remarques disparaissent, sans nouvelle remarque d'accessibilité. Attention : `role="group"` ferait apparaître `useSemanticElements`, alors que `role="toolbar"` ne la déclenche pas. Les deux fichiers ont été remis en état.
- **Ma recommandation :** corriger les 11 vrais défauts, ce qui change ce que lit un lecteur d'écran sans changer l'écran, et mettre un `biome-ignore` sur les 4 rôles conditionnels.
- **Ce qui n'est pas prouvé :** le rôle `toolbar` promet des flèches clavier selon l'APG, et ces barres n'en ont pas. Je n'ai écouté aucun de ces sites avec un vrai lecteur d'écran.

### Les autres règles d'accessibilité

| Règle | Sites | Nature | Correction proposée | Ce qui change au rendu |
|---|---|---|---|---|
| `noNoninteractiveTabindex` | 11 | Faux positif. 9 graphiques focalisables avec navigation clavier ; 2 `tabpanel` focalisables (motif APG recommandé quand le panneau n'a pas de contrôle) : patients/components/patient-peek-view.tsx:189, patients/patient-detail-page.tsx:1240 | Couper la règle ou `biome-ignore` | Rien |
| `useImageSize` | 7 | Images de taille inconnue (data URL d'un logo, avatars, pages d'aperçu), dimensionnées par des classes (`size-full`, `max-h-[65vh] w-auto`) | Couper la règle | Ajouter `width`/`height` sans connaître l'image fixerait un rapport largeur/hauteur faux pour les images en `w-auto` (documents-library.tsx:628, invoice-settings-panel.tsx:235) |
| `noSvgWithoutTitle` | 7 | 5 SVG décoratifs (croix à côté d'un texte `sr-only`, légende, mascotte) ; 1 jauge (dashboard/v2/kpi-visuals.tsx:619, valeur affichée à côté, à vérifier) ; 1 vrai défaut : la courbe des constantes hospitalizations/components/vitals-chart.tsx:106 n'a aucun texte | `aria-hidden="true"` sur les décoratifs ; `role="img"` et `aria-label` sur la courbe | Rien à l'écran |
| `noRedundantRoles` | 4 | `role` égal au rôle implicite : `nav role="navigation"` (ui/pagination.tsx:16), `aside role="complementary"` (consultation-assistant-panel.tsx:149), `section role="region"` (tour-guide.tsx:287, :348). Les quatre ont un `aria-label`, ce qui garde le rôle implicite même dans une section | Retirer le `role` | Rien |
| `useButtonType` | 2 | `button` sans `type` : components/SlashCommandMenu.tsx:83, modules/stock/components/consultation-products.tsx:111. Aucun `<form>` autour dans le fichier ni dans les deux parents de `ConsultationProducts` | `type="button"` | Rien aujourd'hui. Cela évite un envoi de formulaire si le bouton passe un jour dans un `form` |
| `noNoninteractiveElementToInteractiveRole` | 2 | `ul role="listbox"` et `li role="option"` (ui/agent-composer.tsx:154, :165), un motif que l'ARIA admet | `biome-ignore` | Rien |

<details><summary>Les 7 sites, par classe</summary>

- **svg décoratif (icône ou légende)** (5) : components/mascot/line-mascots.tsx:662, components/ui/hex-density.tsx:495, modules/anesthesia/components/anesthesia-sheet.tsx:84, modules/hospitalizations/components/hospitalization-sheet.tsx:87, modules/prescriptions/components/prescription-sheet.tsx:79
- **jauge décorative (valeur affichée à côté, à vérifier)** (1) : modules/dashboard/v2/kpi-visuals.tsx:619
- **vrai défaut : graphique de données sans alternative textuelle** (1) : modules/hospitalizations/components/vitals-chart.tsx:106

</details>


## 2. `noVoid`, 346 sites

### `noVoid`, 346 sites (344 dans src/, 2 dans vite.config.ts)
- **Ce qui change :** `void expr` évalue l'expression et rend `undefined`. Pour une instruction seule, retirer `void` ne change rien à l'exécution : la promesse part de la même façon, et un rejet non traité reste non traité. Dans un rappel à corps expression, `() => void f()` rend `undefined`, alors que `() => f()` rend la promesse. Cela ne compte que si quelqu'un lit cette valeur.
- **Les sites, par risque croissant :**

| Classe | Nombre | Sans `void`, ce qui arrive |
|---|---|---|
| Instruction `void promesse;` dans une fonction ou un gestionnaire | 148 | Rien. Seul le marqueur d'intention « promesse non attendue, exprès » disparaît |
| Instruction `void promesse;` dans le corps d'un `useEffect` | 45 | Rien. L'effet rend toujours sa fonction de nettoyage ou rien |
| Instruction `void promesse;` au niveau du module (i18n, préchargements) | 6 | Rien |
| Autre : `void _vector;` (consultations/local-ai/passage-search.ts:239), `void` sur une valeur déjà `void` (agenda/components/agenda-view.tsx:1171), `cond ? void generate() : …` (local-consultation-assistant.tsx:1485) | 3 | Rien |
| Rappel JSX `onClick={() => void f()}` (et `onRetry`, `onConfirm`, `onCheckedChange`, `onOpenChange`, `onSubmit`…) | 134 | Le rappel rend la promesse. React et Base UI ignorent la valeur rendue d'un gestionnaire. TypeScript accepte |
| Rappel non JSX (`setTimeout`, `addEventListener`, `onResized`, `useCreationRequest`, variables `again`/`changed`) | 7 | La valeur rendue est ignorée. TypeScript accepte |
| **`void` porteur** : nettoyage `useEffect(() => () => void flushSave(), …)` (components/NotesPro.tsx:382) | 1 | Le nettoyage rendrait une promesse. TypeScript refuse (TS2322, `() => Promise<void>` n'est pas assignable à `void \| Destructor`) |
| **`void` porteur** : `configureServer: (server) => void server.middlewares.use(apply)` et `configurePreviewServer` (vite.config.ts:36, :37) | 2 | Vite garde ce que rend le hook et l'appelle sans argument après ses middlewares (`postHooks.forEach((fn) => fn && fn())`, node_modules/vite/dist/node/chunks/node.js:25029). Il appellerait l'application connect elle-même. TypeScript refuse (TS2322) |

<details><summary>Les 346 sites de noVoid, par classe</summary>

- **void promesse (instruction)** (199) : App.tsx:235, app/config/view-registry.tsx:69, components/AgendaListView.tsx:362, components/CommandPalette.tsx:343, components/CommandPalette.tsx:361, components/LicenseGate.tsx:116, components/LicenseGate.tsx:109, components/LicenseStatusCard.tsx:16, components/NotesPro.tsx:442, components/NotesPro.tsx:762, components/NotesPro.tsx:393, components/Parametres.tsx:362, components/Parametres.tsx:420, components/Parametres.tsx:426, components/Parametres.tsx:428, components/SetupWizard.tsx:127, components/Tasks.tsx:570, components/Tasks.tsx:676, components/Team.tsx:697, components/theme-provider.tsx:145, contexts/AuthContext.tsx:179, hooks/use-circular-transition.ts:52, hooks/use-tauri-drag.ts:48, hooks/use-tauri-drag.ts:69, hooks/use-tauri-drag.ts:96, hooks/usePatientIntentPrefetch.ts:11, hooks/useSQLite.ts:384, hooks/useSQLite.ts:691, hooks/useSQLite.ts:804, hooks/useSQLite.ts:822, i18n/config.ts:3437, modules/activation-admin/activation-admin-page.tsx:1081, modules/activation-admin/activation-admin-page.tsx:1083, modules/agenda/components/agenda-view.tsx:715, modules/agenda/components/agenda-view.tsx:1245, modules/agenda/hooks/use-agenda-page-model.tsx:152, modules/assistant-answers/clinic-answers.tsx:334, modules/assistant-answers/clinic-answers.tsx:332, modules/billing/use-appointment-billing.ts:218, modules/billing/use-appointment-billing.ts:220, modules/billing/use-appointment-billing.ts:209, modules/billing/use-appointment-billing.ts:66, modules/billing/use-appointment-billing.ts:123, modules/care-tasks/care-page.tsx:284, modules/care-tasks/care-page.tsx:319, modules/care-tasks/care-page.tsx:1086, modules/care-tasks/use-care-tasks.ts:77, modules/care-tasks/use-care-tasks.ts:79, modules/care-tasks/use-care-tasks.ts:82, modules/care-tasks/use-care-tasks.ts:86, modules/clinic-network/clinic-network-settings.tsx:117, modules/clinique/clinic-services.ts:60, modules/consultation-workspace/use-consultation-session.ts:180, modules/consultations/components/ai-model-install-prompt.tsx:38, modules/consultations/components/ai-model-install-prompt.tsx:129, modules/consultations/components/ai-model-install-prompt.tsx:56, modules/consultations/components/ai-model-install-prompt.tsx:75, modules/consultations/components/ai-model-settings.tsx:62, modules/consultations/components/ai-model-settings.tsx:166, modules/consultations/components/ai-model-settings.tsx:291, modules/consultations/components/ai-model-settings.tsx:379, modules/consultations/components/local-consultation-assistant.tsx:1400, modules/consultations/components/local-consultation-assistant.tsx:1422, modules/consultations/components/local-consultation-assistant.tsx:1424, modules/consultations/components/local-consultation-assistant.tsx:1601, modules/consultations/components/patient-document-search.tsx:688, modules/consultations/components/patient-document-search.tsx:452, modules/consultations/components/patient-document-search.tsx:174, modules/consultations/components/soap-panel.tsx:260, modules/consultations/components/soap-panel.tsx:76, modules/consultations/components/soap-panel.tsx:274, modules/consultations/hooks/use-local-consultation-ai.ts:290, modules/consultations/hooks/use-local-consultation-ai.ts:315, modules/consultations/local-ai/audio-capture.ts:92, modules/consultations/local-ai/audio-capture.ts:96, modules/consultations/local-ai/audio-capture.ts:257, modules/consultations/services/ai-model-provisioning.ts:219, modules/consultations/services/ai-model-provisioning.ts:188, modules/dashboard/components/dashboard-version-setting.tsx:16, modules/dashboard/hooks/use-dashboard-financials.ts:48, modules/dashboard/hooks/use-dashboard-financials.ts:77, modules/dashboard/hooks/use-dashboard-version.ts:30, modules/dashboard/hooks/use-dashboard-version.ts:59, modules/dashboard/pages/dashboard-page.tsx:420, modules/dashboard/pages/dashboard-page.tsx:303, modules/dashboard/pages/dashboard-page.tsx:323, modules/dashboard/pages/dashboard-page.tsx:324, modules/dashboard/pages/dashboard-page.tsx:325, modules/dashboard/pages/dashboard-page.tsx:326, modules/dashboard/pages/dashboard-page.tsx:327, modules/dashboard/pages/dashboard-page.tsx:334, modules/dashboard/pages/dashboard-page.tsx:335, modules/dashboard/pages/dashboard-page.tsx:336, modules/dashboard/pages/dashboard-page.tsx:343, modules/dashboard/pages/dashboard-page.tsx:344, modules/dashboard/pages/dashboard-page.tsx:351, modules/dashboard/pages/dashboard-page.tsx:375, modules/dashboard/pages/dashboard-page.tsx:464, modules/dashboard/pages/dashboard-page.tsx:490, modules/dashboard/pages/dashboard-page.tsx:148, modules/dashboard/pages/dashboard-page.tsx:301, modules/dashboard/pages/dashboard-page.tsx:302, modules/dashboard/use-alert-care.ts:55, modules/documents/components/consultation-documents-assistant.tsx:181, modules/documents/components/consultation-documents-assistant.tsx:198, modules/documents/components/consultation-documents-assistant.tsx:373, modules/documents/components/consultation-documents-assistant.tsx:386, modules/documents/components/consultation-documents-assistant.tsx:666, modules/documents/components/consultation-documents-assistant.tsx:688, modules/documents/components/document-composer.tsx:113, modules/documents/components/document-paper-preview.tsx:13, modules/documents/components/document-preview-dialog.tsx:87, modules/documents/components/document-preview-dialog.tsx:115, modules/documents/components/document-template-manager.tsx:560, modules/documents/components/patient-document-registry.tsx:164, modules/documents/hooks/use-managed-documents.ts:61, modules/documents/hooks/use-managed-documents.ts:59, modules/documents/lib/managed-document-pdf.ts:278, modules/documents/lib/patient-document-reading.ts:100, modules/documents/lib/read-local-document.ts:37, modules/finances/hooks/use-finances-page-model.tsx:157, modules/finances/hooks/use-finances-page-model.tsx:262, modules/finances/hooks/use-finances-page-model.tsx:300, modules/flow-board/flow-board-page.tsx:653, modules/flow-board/flow-board-page.tsx:689, modules/flow-board/flow-board-page.tsx:772, modules/flow-board/open-in-flux.ts:67, modules/flow-board/use-flow-board.ts:178, modules/flow-board/use-flow-board.ts:249, modules/flow-board/use-flow-board.ts:98, modules/flow-board/use-flow-board.ts:91, modules/flow-board/walk-in-dialog.tsx:81, modules/hospitalizations/stays/stay-billing.tsx:33, modules/hospitalizations/stays/stay-detail.tsx:63, modules/hospitalizations/stays/stay-detail.tsx:296, modules/hospitalizations/stays/stay-follow-up.tsx:36, modules/hospitalizations/stays/stay-records.tsx:61, modules/hospitalizations/stays/stay-records.tsx:65, modules/hospitalizations/stays/use-stays.ts:48, modules/hospitalizations/stays/use-stays.ts:50, modules/invoices/components/invoice-pdf-preview.tsx:43, modules/invoices/components/invoice-pdf-preview.tsx:72, modules/invoices/components/invoice-pdf-preview.tsx:86, modules/invoices/components/invoice-settings-panel.tsx:106, modules/invoices/components/invoice-settings-panel.tsx:357, modules/patient-reminders/medical-act-reminder-prompt.tsx:54, modules/patient-reminders/medical-act-reminder-prompt.tsx:64, modules/patient-reminders/medical-act-reminder-prompt.tsx:80, modules/patient-reminders/patient-reminders-panel.tsx:544, modules/patient-reminders/patient-reminders-panel.tsx:451, modules/patient-reminders/patient-reminders-panel.tsx:523, modules/patient-reminders/patient-reminders-panel.tsx:534, modules/patient-reminders/patient-reminders-panel.tsx:667, modules/patient-reminders/use-patient-reminders.ts:50, modules/patient-reminders/use-patient-reminders.ts:48, modules/patients/components/patient-header.tsx:78, modules/patients/components/patient-timeline.tsx:398, modules/patients/components/patients-shared.tsx:1758, modules/patients/components/vaccination-dialog.tsx:232, modules/patients/components/vaccination-dialog.tsx:161, modules/patients/export/patient-record-pdf-source.ts:42, modules/patients/export/patient-record-preview.tsx:29, modules/patients/export/patient-record-preview.tsx:55, modules/patients/export/patient-record-preview.tsx:82, modules/patients/health-card/health-card-dialog.tsx:137, modules/patients/pages/patient-peek.tsx:68, modules/patients/pages/patient-peek.tsx:69, modules/patients/pages/patient-peek.tsx:70, modules/patients/pages/patient-peek.tsx:71, modules/patients/pages/patient-peek.tsx:72, modules/patients/patient-detail-page.tsx:907, modules/patients/patient-detail-page.tsx:908, modules/patients/patient-detail-page.tsx:909, modules/prescriptions/components/prescription-dispensing.tsx:53, modules/prescriptions/components/prescription-templates.tsx:415, modules/prescriptions/components/prescription-templates.tsx:360, modules/rooms/rooms-settings.tsx:63, modules/rooms/rooms-settings.tsx:182, modules/rooms/rooms-settings.tsx:192, modules/rooms/use-rooms.ts:61, modules/rooms/use-rooms.ts:80, modules/shell/notification-center.tsx:317, modules/shell/notification-center.tsx:322, modules/shell/notification-center.tsx:324, modules/shell/window-controls.ts:128, modules/shell/window-controls.ts:144, modules/shell/window-controls.ts:145, modules/stock/components/consultation-products.tsx:44, modules/stock/components/stock-view.tsx:97, modules/stock/hooks/create-stock-snapshot.ts:39, modules/stock/hooks/create-stock-snapshot.ts:50, modules/stock/hooks/create-stock-snapshot.ts:81, modules/stock/hooks/use-stock-inventory.ts:48, modules/stock/hooks/use-stock-inventory.ts:60, modules/stock/hooks/use-stock-inventory.ts:100, modules/stock/hooks/use-stock-page-model.tsx:116, services/sqlite/database.ts:203, services/updateService.ts:90, services/updateService.ts:84
- **rappel JSX () => void f()** (134) : components/AgendaListView.tsx:409, components/AgendaListView.tsx:418, components/AgendaListView.tsx:427, components/LicenseGate.tsx:179, components/LicenseGate.tsx:261, components/NotesPro.tsx:799, components/NotesPro.tsx:897, components/NotesPro.tsx:1062, components/NotesPro.tsx:1063, components/NotesPro.tsx:1064, components/NotesPro.tsx:1065, components/NotesPro.tsx:1066, components/NotesPro.tsx:1068, components/NotesPro.tsx:1073, components/NotesPro.tsx:1074, components/NotesPro.tsx:1075, components/Parametres.tsx:461, components/Parametres.tsx:475, components/Parametres.tsx:501, components/Tasks.tsx:1071, components/Tasks.tsx:1296, components/Tasks.tsx:1307, modules/anesthesia/components/anesthesia-detail.tsx:227, modules/anesthesia/components/anesthesia-drug-log-entry-dialog.tsx:197, modules/anesthesia/components/anesthesia-monitoring-entry-dialog.tsx:227, modules/anesthesia/components/anesthesia-sheet-dialog.tsx:289, modules/assistant-answers/clinic-answers.tsx:266, modules/care-tasks/care-page.tsx:709, modules/care-tasks/care-page.tsx:1019, modules/care-tasks/care-page.tsx:1032, modules/care-tasks/care-page.tsx:1045, modules/care-tasks/care-page.tsx:516, modules/clinic-network/clinic-network-settings.tsx:320, modules/clinic-network/clinic-network-settings.tsx:582, modules/clinique/components/clinique-shared.tsx:1209, modules/clinique/components/clinique-shared.tsx:1218, modules/clinique/components/clinique-shared.tsx:1616, modules/clinique/components/clinique-shared.tsx:1105, modules/clinique/components/quick-consultation.tsx:57, modules/consultations/components/ai-model-settings.tsx:255, modules/consultations/components/local-consultation-assistant.tsx:1195, modules/consultations/components/local-consultation-assistant.tsx:1235, modules/consultations/components/local-consultation-assistant.tsx:1516, modules/consultations/components/local-consultation-assistant.tsx:1642, modules/consultations/components/local-consultation-assistant.tsx:1170, modules/consultations/components/patient-document-search.tsx:430, modules/consultations/components/patient-document-search.tsx:500, modules/consultations/components/patient-document-search.tsx:612, modules/consultations/components/soap-panel.tsx:456, modules/consultations/components/soap-panel.tsx:377, modules/dashboard/pages/dashboard-page.tsx:556, modules/documents/components/consultation-documents-assistant.tsx:770, modules/documents/components/consultation-documents-assistant.tsx:786, modules/documents/components/consultation-documents-assistant.tsx:933, modules/documents/components/consultation-documents-assistant.tsx:953, modules/documents/components/document-composer.tsx:393, modules/documents/components/document-composer.tsx:268, modules/documents/components/document-composer.tsx:198, modules/documents/components/document-preview-dialog.tsx:471, modules/documents/components/document-preview-dialog.tsx:274, modules/documents/components/document-preview-dialog.tsx:330, modules/documents/components/document-preview-dialog.tsx:356, modules/documents/components/document-preview-dialog.tsx:366, modules/documents/components/document-preview-dialog.tsx:380, modules/documents/components/document-preview-dialog.tsx:404, modules/documents/components/document-preview-dialog.tsx:420, modules/documents/components/document-template-manager.tsx:339, modules/documents/components/document-template-manager.tsx:430, modules/documents/components/document-template-manager.tsx:761, modules/documents/components/patient-document-registry.tsx:235, modules/documents/components/patient-document-registry.tsx:320, modules/finances/components/finances-view.tsx:1212, modules/finances/components/finances-view.tsx:358, modules/finances/components/finances-view.tsx:360, modules/finances/components/finances-view.tsx:680, modules/finances/components/finances-view.tsx:962, modules/finances/components/finances-view.tsx:969, modules/finances/components/finances-view.tsx:1195, modules/finances/components/finances-view.tsx:1316, modules/finances/components/finances-view.tsx:1496, modules/finances/components/finances-view.tsx:1525, modules/finances/components/finances-view.tsx:1567, modules/finances/components/finances-view.tsx:1596, modules/flow-board/walk-in-dialog.tsx:120, modules/hospitalizations/components/hospitalization-detail.tsx:247, modules/hospitalizations/components/hospitalization-dialog.tsx:267, modules/hospitalizations/components/vitals-entry-dialog.tsx:322, modules/hospitalizations/stays/agenda-stays.tsx:52, modules/hospitalizations/stays/patient-stays.tsx:22, modules/hospitalizations/stays/stay-detail.tsx:129, modules/hospitalizations/stays/stay-detail.tsx:147, modules/hospitalizations/stays/stay-detail.tsx:166, modules/hospitalizations/stays/stay-detail.tsx:183, modules/hospitalizations/stays/stays-page.tsx:102, modules/invoices/components/invoice-pdf-preview.tsx:236, modules/invoices/components/invoice-settings-panel.tsx:323, modules/invoices/components/invoice-settings-panel.tsx:386, modules/invoices/components/invoice-settings-panel.tsx:473, modules/invoices/components/invoice-settings-panel.tsx:158, modules/patient-reminders/patient-reminders-panel.tsx:267, modules/patients/components/off-visit-note-panel.tsx:215, modules/patients/components/patient-documents-list.tsx:221, modules/patients/components/patient-documents-list.tsx:368, modules/patients/components/patients-view.tsx:124, modules/patients/components/vaccination-list.tsx:242, modules/patients/components/weight-entry-dialog.tsx:355, modules/patients/export/patient-record-export-dialog.tsx:519, modules/patients/export/patient-record-export-dialog.tsx:535, modules/patients/export/patient-record-export-dialog.tsx:314, modules/patients/health-card/health-card-dialog.tsx:323, modules/patients/health-card/health-card-dialog.tsx:339, modules/patients/patient-detail-page.tsx:1507, modules/patients/patient-detail-page.tsx:557, modules/patients/patient-detail-page.tsx:817, modules/patients/patient-detail-page.tsx:850, modules/patients/patient-detail-page.tsx:878, modules/patients/patient-detail-page.tsx:1571, modules/patients/patient-detail-page.tsx:1266, modules/patients/patient-detail-page.tsx:1302, modules/patients/patient-detail-page.tsx:1324, modules/prescriptions/components/prescription-builder.tsx:623, modules/prescriptions/components/prescription-builder.tsx:796, modules/prescriptions/components/prescription-templates.tsx:478, modules/rooms/rooms-settings.tsx:120, modules/rooms/rooms-settings.tsx:273, modules/shell/components/account-menu.tsx:155, modules/stock/components/purchasing-panel.tsx:869, modules/stock/components/purchasing-panel.tsx:942, modules/stock/components/purchasing-panel.tsx:1031, modules/stock/components/purchasing-panel.tsx:1063, modules/stock/components/purchasing-panel.tsx:1297, modules/stock/components/stock-operations-panel.tsx:1083, modules/stock/components/stock-operations-panel.tsx:918, modules/stock/components/stock-operations-panel.tsx:993
- **rappel non JSX () => void f()** (7) : components/NotesPro.tsx:438, components/NotesPro.tsx:405, modules/dashboard/use-alert-care.ts:56, modules/flow-board/use-flow-board.ts:101, modules/rooms/use-rooms.ts:69, modules/shell/app-shell.tsx:42, modules/shell/window-controls.ts:145
- **nettoyage de useEffect : void porteur (tsc casse sans lui)** (1) : components/NotesPro.tsx:382
- **autre : void sur une valeur non promesse** (1) : modules/agenda/components/agenda-view.tsx:1171
- **void promesse dans une expression conditionnelle** (1) : modules/consultations/components/local-consultation-assistant.tsx:1485
- **autre : marqueur de variable inutilisée** (1) : modules/consultations/local-ai/passage-search.ts:239
- **hook configureServer : void porteur (sans lui Vite recevrait le serveur connect comme post-hook ; tsc casse)** (1) : vite.config.ts:36
- **hook configurePreviewServer : void porteur (idem)** (1) : vite.config.ts:37

</details>

- **Exemples travaillés (les plus sûrs) :**
  ```tsx
  // 1. instruction (useEffect) : retirer void ne change rien
  useEffect(() => { void refresh(); … }, []);   // avant
  useEffect(() => { refresh(); … }, []);        // après
  // 2. rappel JSX : un corps entre accolades rend undefined comme avant
  onClick={() => void submitPayment()}          // avant
  onClick={() => { submitPayment(); }}          // après
  // 3. void porteur : garder undefined sans void
  useEffect(() => () => void flushSave(), [selectedNoteId, flushSave]);        // avant
  useEffect(() => () => { flushSave(); }, [selectedNoteId, flushSave]);        // après
  configureServer: (server) => { server.middlewares.use(apply); },              // vite.config.ts
  ```
  Dans les trois cas, la fonction rend `undefined` comme avec `void`, et l'appel part de la même façon.
- **La mesure :** dans le worktree, je n'ai retiré que les 5 caractères `void ` à la position que donne Biome (script /tmp/claude-0/c3w/unvoid.cjs). Puis j'ai lancé `tsc -p tsconfig.app.json --noEmit` (0 erreur sur la base) :
  - les 142 rappels (corps expression) : **1 erreur**, NotesPro.tsx:382 (TS2322) ;
  - les 201 instructions et l'expression conditionnelle : **0 erreur** ;
  - vite.config.ts:36-37 avec `tsc -p tsconfig.node.json --noEmit` : **2 erreurs** (TS2322).
  
  Le worktree a été remis en état après chaque essai. Il n'y a ni rappel `ref` ni corps d'effet écrit `useEffect(() => void f())` parmi les sites : le classement les aurait isolés.
- **Ma recommandation :** couper la règle (`"complexity": { "noVoid": "off" }`), puisqu'elle n'a pas d'option. Dans ce code, `void` est l'idiome voulu pour dire « promesse lancée exprès sans l'attendre ». Le retirer en masse effacerait ce marqueur sans rien gagner, et trois sites en ont besoin. Si Zouhir tient à la règle, la réécriture sûre est le corps entre accolades : `() => { f(); }` pour les 144 rappels, simple retrait pour les 202 instructions.
- **Ce qui n'est pas prouvé :** je n'ai lancé ni l'application ni les tests après le retrait. Le « rien ne change » des 343 sites sans erreur tsc repose sur la sémantique de JavaScript et sur le fait que React ignore la valeur rendue d'un gestionnaire, pas sur une exécution. L'effet sur Vite est déduit de son code source, sans démarrage du serveur. Si une règle typée comme `noFloatingPromises` arrive un jour, elle redemandera ce marqueur.

## 3. `noNestedTernary`, 375 sites

### `noNestedTernary`, 375 sites
- **Ce qui change :** il faut réécrire de la logique d'affichage ou de calcul. Biome compte un site par ternaire imbriqué : une chaîne à 3 niveaux donne 2 sites. Les 375 sites viennent de 293 chaînes.
- **Les sites, par risque croissant :**

| Niveaux | Contexte | Chaînes | Sites |
|---|---|---|---|
| Tous | Chaîne sur un même discriminant (`x === "a" ? … : x === "b" ? … : …`), qui devient une table ou un `switch` | 49 | 57 |
| 2 | Calcul | 109 | 109 |
| 2 | JSX (enfant, attribut, valeur) | 120 | 120 |
| 3 | Calcul | 23 | 46 |
| 3 | JSX | 27 | 54 |
| 4 | Calcul | 1 | 3 |
| 4 | JSX | 9 | 27 |
| 5 | Calcul | 2 | 8 |
| 5 | JSX | 2 | 8 |

La première ligne recoupe les suivantes. Par contexte : calcul 135 chaînes (166 sites), JSX enfant 116 (157), attribut JSX (souvent `className`) 40 (50), valeur JSX hors balise 2 (2). 249 chaînes sur 293 (315 sites) sont des chaînes « en else » (`a ? x : b ? y : z`). Elles se réécrivent sans réfléchir à l'ordre. Les 44 autres imbriquent dans la branche vraie et demandent plus d'attention. Les plus profondes : components/stock/stock-workspace.tsx:1081, consultations/components/assistant-activity.tsx:32, consultations/local-ai/treatment-routing.ts:52, stock/components/product-stock-fields.tsx:79 (5 niveaux).

<details><summary>Les 293 chaînes (375 sites), par profondeur et contexte. [discriminant] : même variable comparée à des littéraux ; [then] : imbrication dans la branche vraie</summary>

- **2 niveaux, JSX attribut** (32 chaînes) : components/Tasks.tsx:866, components/Team.tsx:441, components/stock/stock-workspace.tsx:1052, components/ui/data-table.tsx:325, components/ui/data-table.tsx:350 [then], components/ui/stat-grid.tsx:255, components/ui/stat-grid.tsx:267, components/ui/stat-grid.tsx:132, design-system/patterns/save-indicator.tsx:31 [discriminant], design-system/patterns/save-indicator.tsx:38 [discriminant], design-system/patterns/status-stepper.tsx:27 [discriminant], modules/care-tasks/care-page.tsx:730 [then], modules/clinic-network/clinic-network-settings.tsx:413, modules/consultations/components/consultation-assistant-panel.tsx:135, modules/consultations/components/patient-document-search.tsx:648, modules/dashboard/components/clinical/actions-module.tsx:50, modules/dashboard/components/clinical/actions-module.tsx:106 [discriminant], modules/dashboard/components/clinical/shared.tsx:91 [discriminant], modules/dashboard/components/focus-trend-chart.tsx:327, modules/dashboard/components/focus-trend-chart.tsx:361, modules/dashboard/components/morning-watch.tsx:121 [then], modules/dashboard/components/premium-analytics.tsx:165, modules/dashboard/components/visit-flow-board.tsx:208, modules/dashboard/v2/kpi-visuals.tsx:406, modules/dashboard/v2/kpi-visuals.tsx:199, modules/documents/components/document-template-manager.tsx:548 [then], modules/finances/components/invoices-table.tsx:213 [then], modules/flow-board/flow-board-page.tsx:824, modules/patient-reminders/medical-reminders-widget.tsx:53, modules/patient-reminders/patient-reminders-panel.tsx:339, modules/stock/components/purchasing-panel.tsx:143 [discriminant], modules/stock/components/stock-lots-panel.tsx:651
- **2 niveaux, JSX enfant** (86 chaînes) : components/CommandPalette.tsx:845, components/NotesPro.tsx:736 [then], components/Parametres.tsx:516, components/Parametres.tsx:576 [discriminant], components/Parametres.tsx:608 [discriminant], components/Tasks.tsx:1166, components/Tasks.tsx:1765 [discriminant], components/Tasks.tsx:1775, components/Team.tsx:431, components/app-sidebar.tsx:273 [then], components/stock/stock-workspace.tsx:1031, components/ui/agent-question.tsx:336 [discriminant], components/ui/chart-card.tsx:720 [then], components/ui/confirmation-card.tsx:211 [discriminant], components/ui/data-table.tsx:365, components/ui/stat-grid.tsx:271, components/ui/status-pill.tsx:144, components/ui/streaming-message.tsx:155 [discriminant], components/ui/tool-call-block.tsx:138, components/ui/tool-call-block.tsx:220, components/ui/user-message.tsx:131, components/ui/user-message.tsx:256, design-system/patterns/widget-shell.tsx:56, modules/agenda/components/agenda-shared.tsx:267, modules/agenda/components/agenda-view.tsx:487, modules/agenda/components/agenda-view.tsx:494, modules/anesthesia/components/anesthesia-detail.tsx:230 [discriminant], modules/care-tasks/care-page.tsx:745 [then], modules/care-tasks/plan-care-tasks.tsx:86, modules/clinic-network/clinic-network-settings.tsx:414, modules/consultations/components/local-consultation-assistant.tsx:1431, modules/consultations/components/local-consultation-assistant.tsx:1491, modules/dashboard/components/clinical/cash-module.tsx:104, modules/dashboard/components/clinical/patients-module.tsx:118, modules/dashboard/components/dashboard-watch.tsx:108, modules/dashboard/components/now-board-view.tsx:29, modules/dashboard/components/premium-analytics.tsx:170, modules/dashboard/components/visit-flow-board.tsx:152, modules/dashboard/v2/kpi-visuals.tsx:414, modules/dashboard/v2/kpi-visuals.tsx:354 [then], modules/dashboard/v2/kpi-visuals.tsx:207, modules/dashboard/v2/settle-widgets.tsx:179, modules/documents/components/consultation-documents-assistant.tsx:642 [discriminant], modules/documents/components/consultation-documents-assistant.tsx:846, modules/documents/components/document-paper-preview.tsx:41, modules/documents/components/document-preview-dialog.tsx:231 [discriminant], modules/documents/components/document-template-manager.tsx:336, modules/finances/components/finances-view.tsx:289, modules/finances/components/finances-view.tsx:557, modules/finances/components/finances-view.tsx:1183 [then], modules/hospitalizations/stays/patient-stays.tsx:39, modules/hospitalizations/stays/stay-follow-up.tsx:41, modules/hospitalizations/stays/stay-location-controls.tsx:56, modules/hospitalizations/stays/stays-page.tsx:194 [discriminant], modules/hospitalizations/stays/stays-page.tsx:202, modules/hospitalizations/stays/vitals-summary-view.tsx:55 [then], modules/hospitalizations/stays/vitals-summary-view.tsx:114 [then], modules/invoices/components/invoice-pdf-preview.tsx:238, modules/patient-reminders/medical-reminders-widget.tsx:56, modules/patient-reminders/patient-reminders-panel.tsx:341, modules/patients/components/medical-record-summary.tsx:122 [then], modules/patients/components/medical-record-summary.tsx:121, modules/patients/components/patient-context-widgets.tsx:115, modules/patients/components/patient-context-widgets.tsx:158, modules/patients/components/patient-peek-view.tsx:301, modules/patients/components/patient-timeline.tsx:615, modules/patients/components/patient-timeline.tsx:649, modules/patients/components/patients-shared.tsx:841, modules/patients/components/patients-view.tsx:109, modules/patients/export/patient-record-export-dialog.tsx:313 [discriminant], modules/patients/patient-detail-page.tsx:1296, modules/patients/patient-detail-page.tsx:1318, modules/patients/patient-detail-page.tsx:1419 [then], modules/patients/patient-detail-page.tsx:1434 [then], modules/patients/patient-detail-page.tsx:1491, modules/patients/patient-detail-page.tsx:884, modules/prescriptions/components/prescription-templates.tsx:384 [then], modules/shell/notification-center.tsx:489, modules/shell/notification-center.tsx:501 [discriminant], modules/shell/notification-center.tsx:369, modules/stock/components/movement-allocation-details.tsx:55, modules/stock/components/purchasing-panel.tsx:987, modules/stock/components/purchasing-panel.tsx:1309, modules/stock/components/stock-lots-panel.tsx:368, modules/stock/components/stock-operations-panel.tsx:885 [discriminant], modules/stock/components/stock-operations-panel.tsx:432
- **2 niveaux, calcul** (109 chaînes) : components/NotesPro.tsx:513 [discriminant], components/NotesPro.tsx:75 [then], components/Tasks.tsx:1738 [discriminant], components/Tasks.tsx:384 [discriminant], components/Tasks.tsx:423, components/Tasks.tsx:781 [discriminant], components/Tasks.tsx:801, components/documents-library.tsx:233, components/documents-library.tsx:238, components/section-cards.tsx:98 [discriminant], components/team-reading.ts:41, components/ui/chart-card.tsx:106, components/ui/chart-card.tsx:329 [then], components/ui/data-table.tsx:66, components/ui/data-table.tsx:150 [then], components/ui/data-table.tsx:207 [then], components/ui/diverging-bars.tsx:156 [then], components/ui/diverging-bars.tsx:76, components/ui/rolling-number.tsx:35 [then], components/ui/stat-grid.tsx:172, components/ui/streaming-message.tsx:239, components/ui/user-message.tsx:60, design-system/patterns/save-indicator.tsx:18 [discriminant], domain/stock-fifo.ts:67, lib/invoice-pdf.ts:308, modules/agenda/hooks/use-agenda-page-model.tsx:1057, modules/assistant-answers/answer.ts:365, modules/assistant-answers/answer.ts:407, modules/assistant-answers/answer.ts:417, modules/assistant-answers/answer.ts:561, modules/assistant-answers/answer.ts:570, modules/assistant-answers/answer.ts:806, modules/assistant-answers/clinic-answers.tsx:487, modules/assistant-answers/period.ts:92, modules/care-tasks/feedback.ts:22, modules/clinique/pages/clinical-workspace.tsx:34, modules/consultations/components/ai-model-settings.tsx:119 [then], modules/consultations/components/assistant-activity.tsx:44 [then], modules/consultations/components/local-consultation-assistant.tsx:939, modules/consultations/local-ai/inference-client.ts:120 [discriminant], modules/consultations/local-ai/offline-policy.ts:27, modules/consultations/local-ai/passage-search.ts:222, modules/consultations/workers/soap.worker.ts:50, modules/consultations/workers/whisper.worker.ts:167, modules/dashboard/components/clinical/shared.tsx:78 [discriminant], modules/dashboard/components/premium-analytics.tsx:458, modules/dashboard/components/widget-units.tsx:177, modules/dashboard/model/clinical-dashboard.ts:174, modules/dashboard/model/dashboard-watch.ts:256 [discriminant], modules/dashboard/model/dashboard-watch.ts:117, modules/dashboard/model/dashboard-watch.ts:124, modules/dashboard/model/key-figures.ts:174, modules/dashboard/model/morning-watch.ts:119, modules/dashboard/model/morning-watch.ts:118, modules/dashboard/model/morning-watch.ts:195, modules/dashboard/model/morning-watch.ts:196, modules/dashboard/v2/financial-model.ts:92, modules/dashboard/v2/insights-model.ts:17 [discriminant], modules/dashboard/v2/kpi-mini-chart.tsx:60, modules/dashboard/v2/kpi-period.tsx:69 [discriminant], modules/dashboard/v2/kpi-period.tsx:75, modules/dashboard/v2/kpi-period.tsx:86, modules/dashboard/v2/model.ts:201 [then], modules/dashboard/v2/receipts-series.ts:64, modules/dashboard/v2/receipts-series.ts:81, modules/documents/components/document-template-manager.tsx:73 [then], modules/documents/document-store.ts:737 [discriminant], modules/finances/hooks/use-finances-page-model.tsx:436, modules/finances/hooks/use-finances-page-model.tsx:421, modules/finances/hooks/use-finances-page-model.tsx:413, modules/finances/invoice-natures.ts:77 [then], modules/flow-board/flow-board-page.tsx:575, modules/hospitalizations/stays/vitals-summary.ts:53, modules/patients/components/medical-record-summary.tsx:61 [discriminant], modules/patients/components/medical-record-summary.tsx:62 [discriminant], modules/patients/components/medical-record-summary.tsx:325 [discriminant], modules/patients/components/patient-context-widgets.tsx:71, modules/patients/components/patient-header.tsx:121 [discriminant], modules/patients/components/patient-header.tsx:131 [then], modules/patients/components/patient-header.tsx:130, modules/patients/components/patient-header.tsx:271, modules/patients/components/patient-kpi-strip.tsx:76, modules/patients/components/patient-overview.tsx:26, modules/patients/components/patient-timeline.tsx:241, modules/patients/components/vaccination-dialog.tsx:206, modules/patients/export/patient-record-data.ts:376 [discriminant], modules/patients/export/patient-record-pdf.ts:807 [discriminant], modules/patients/export/patient-record-pdf.ts:809 [discriminant], modules/patients/export/patient-record-pdf.ts:835, modules/patients/export/patient-record-pdf.ts:998 [discriminant], modules/patients/health-card/health-card-data.ts:502 [then], modules/patients/health-card/health-card-data.ts:174, modules/patients/health-card/health-card-pdf.ts:216 [then], modules/patients/health-card/health-card-pdf.ts:310, modules/patients/health-card/health-card-pdf.ts:555, modules/patients/health-card/health-card-pdf.ts:581, modules/patients/hooks/use-patients-page-model.tsx:523, modules/patients/lib/timeline-pieces.ts:107 [discriminant], modules/prescriptions/components/prescription-dispensing.tsx:81, modules/rooms/rooms-settings.tsx:24, modules/shell/components/header-sidebar-toggle.tsx:46, modules/shell/notification-center.tsx:463 [discriminant], modules/shell/window-controls.ts:50 [then], modules/stock/components/stock-operations-panel.tsx:615 [discriminant], modules/stock/services/purchasing-store.ts:172, services/billingService.ts:591, services/notifications/useNotificationCenter.ts:122, services/notifications/useNotificationCenter.ts:198, services/notifications/useNotificationCenter.ts:285
- **2 niveaux, valeur JSX** (2 chaînes) : components/Tasks.tsx:1210 [discriminant], components/ui/chart-card.tsx:260
- **3 niveaux, JSX attribut** (6 chaînes) : components/ui/hex-density.tsx:364 (2 sites), modules/care-tasks/care-page.tsx:613 (2 sites), modules/care-tasks/care-page.tsx:622 (2 sites), modules/consultations/components/assistant-activity.tsx:56 (2 sites), modules/dashboard/components/focus-trend-chart.tsx:73 (2 sites), modules/dashboard/components/visit-flow-board.tsx:92 (2 sites)
- **3 niveaux, JSX enfant** (21 chaînes) : components/NotesPro.tsx:791 (2 sites), components/stock/stock-workspace.tsx:878 (2 sites), modules/agenda/components/agenda-view.tsx:327 (2 sites) [then], modules/agenda/components/agenda-view.tsx:441 (2 sites), modules/care-tasks/care-page.tsx:708 (2 sites), modules/clinique/components/clinique-shared.tsx:1627 (2 sites), modules/clinique/components/clinique-shared.tsx:1174 (2 sites) [discriminant], modules/consultations/components/ai-model-settings.tsx:296 (2 sites), modules/dashboard/components/clinical/trends-module.tsx:81 (2 sites), modules/dashboard/components/dashboard-watch.tsx:59 (2 sites), modules/dashboard/components/visit-flow-board.tsx:282 (2 sites), modules/documents/components/patient-document-registry.tsx:231 (2 sites), modules/hospitalizations/stays/stay-billing.tsx:67 (2 sites) [then], modules/patients/components/patient-context-widgets.tsx:176 (2 sites), modules/patients/components/patient-kpi-strip.tsx:258 (2 sites) [then], modules/patients/components/patient-peek-view.tsx:215 (2 sites), modules/patients/components/patient-peek-view.tsx:227 (2 sites), modules/patients/components/patient-peek-view.tsx:265 (2 sites), modules/patients/components/patient-peek-view.tsx:139 (2 sites), modules/stock/components/stock-lots-panel.tsx:659 (2 sites), modules/tour/tour-guide.tsx:305 (2 sites)
- **3 niveaux, calcul** (23 chaînes) : components/CommandPalette.tsx:1249 (2 sites), components/MotivationalHeader.tsx:46 (2 sites), components/financial-period-filter.tsx:59 (2 sites) [then], components/theme-provider.tsx:193 (2 sites), hooks/useSaveIndicator.ts:23 (2 sites), modules/agenda/hooks/use-agenda-page-model.tsx:528 (2 sites) [then], modules/assistant-answers/answer.ts:1061 (2 sites) [discriminant], modules/consultations/components/patient-document-search.tsx:261 (2 sites) [then], modules/consultations/local-ai/treatment-routing.ts:71 (2 sites) [then], modules/consultations/local-ai/treatment-routing.ts:111 (2 sites), modules/consultations/workers/soap.worker.ts:187 (2 sites), modules/dashboard/components/morning-watch.tsx:53 (2 sites), modules/dashboard/components/visit-flow-board.tsx:55 (2 sites) [then], modules/dashboard/components/visit-flow-board.tsx:57 (2 sites), modules/dashboard/model/hex-activity.ts:136 (2 sites), modules/dashboard/model/hex-activity.ts:217 (2 sites), modules/dashboard/model/premium-analytics.ts:113 (2 sites) [discriminant], modules/flow-board/spatial-nav.ts:32 (2 sites) [discriminant], modules/hospitalizations/components/hospitalization-detail.tsx:406 (2 sites) [discriminant], modules/patients/components/patient-context-widgets.tsx:64 (2 sites), modules/stock/components/purchasing-panel.tsx:208 (2 sites), modules/stock/components/stock-operations-panel.tsx:284 (2 sites) [then], services/sqlite/table-snapshot-cache.ts:88 (2 sites)
- **4 niveaux, JSX attribut** (2 chaînes) : modules/dashboard/v2/kpi-mini-chart.tsx:118 (3 sites) [then], modules/dashboard/v2/kpi-visuals.tsx:143 (3 sites) [then]
- **4 niveaux, JSX enfant** (7 chaînes) : components/stock/stock-workspace.tsx:1038 (3 sites), modules/consultations/components/ai-model-settings.tsx:141 (3 sites), modules/dashboard/components/visit-flow-board.tsx:101 (3 sites), modules/hospitalizations/stays/stays-page.tsx:101 (3 sites), modules/patient-reminders/patient-reminders-panel.tsx:367 (3 sites), modules/patients/components/patient-peek-view.tsx:201 (3 sites), modules/patients/components/patient-timeline.tsx:665 (3 sites)
- **4 niveaux, calcul** (1 chaînes) : modules/care-tasks/domain.ts:92 (3 sites)
- **5 niveaux, JSX enfant** (2 chaînes) : components/stock/stock-workspace.tsx:1081 (4 sites) [discriminant], modules/stock/components/product-stock-fields.tsx:79 (4 sites) [then]
- **5 niveaux, calcul** (2 chaînes) : modules/consultations/components/assistant-activity.tsx:32 (4 sites), modules/consultations/local-ai/treatment-routing.ts:52 (4 sites)

</details>

- **Exemples travaillés (les plus sûrs) :**
  1. Table ordonnée, calcul (modules/care-tasks/domain.ts:92, 3 sites) :
     ```ts
     // avant
     type: /perfusion|fluidoth[eé]rapie/iu.test(label) ? "perfusion"
       : /sortie|retour [àa] domicile/iu.test(label) ? "sortie"
       : /contr[oô]le|surveill|temp[eé]rature|pes[eé]e/iu.test(label) ? "controle"
       : /m[eé]dicament|antibiotique|administr|traitement|injection/iu.test(label) ? "medicament"
       : "autre",
     // après
     const CARE_TYPE_RULES = [
       [/perfusion|fluidoth[eé]rapie/iu, "perfusion"],
       [/sortie|retour [àa] domicile/iu, "sortie"],
       [/contr[oô]le|surveill|temp[eé]rature|pes[eé]e/iu, "controle"],
       [/m[eé]dicament|antibiotique|administr|traitement|injection/iu, "medicament"],
     ] as const;
     function careTypeOf(label: string) {
       return CARE_TYPE_RULES.find(([rule]) => rule.test(label))?.[1] ?? "autre";
     }
     …
     type: careTypeOf(label),
     ```
     C'est équivalent : `find` garde l'ordre et s'arrête à la première règle vraie, comme la chaîne. Les regex n'ont pas le drapeau `g`, donc `test` ne garde pas d'état entre deux appels.
  2. `switch` sur un discriminant, JSX (components/stock/stock-workspace.tsx:1081, 5 niveaux, 4 sites) :
     ```tsx
     // avant
     {movement.sourceType === "care" ? "Soin" : movement.sourceType === "prescription" ? "Ordonnance"
       : movement.sourceType === "consultation" ? "Consultation" : movement.sourceType === "transfer" ? "Transfert"
       : movement.sourceType === "receipt" ? "Réception" : "Stock"}
     // après
     {movementSourceLabel(movement.sourceType)}
     function movementSourceLabel(source: StockMovement["sourceType"]): string {
       switch (source) {
         case "care": return "Soin";
         case "prescription": return "Ordonnance";
         case "consultation": return "Consultation";
         case "transfer": return "Transfert";
         case "receipt": return "Réception";
         default: return "Stock";
       }
     }
     ```
     J'ai préféré un `switch` à un objet : un objet rendrait une fonction pour une valeur inattendue venue de la base comme `"constructor"`, alors que le `default` du `switch` rend `"Stock"` comme l'ancien code.
  3. Préfixe de langue, calcul (components/MotivationalHeader.tsx:46, 2 sites) :
     ```ts
     const DATE_LOCALES = [["ar", "ar"], ["en", "en-US"], ["es", "es-ES"]] as const;
     const currentLocale =
       DATE_LOCALES.find(([prefix]) => i18n.language.startsWith(prefix))?.[1] ?? "fr-FR";
     ```
- **La mesure :**
  - Exemple 1 : un test d'équivalence (/tmp/claude-0/wt-c3/tests/c3-equivalence.test.ts) compare l'ancienne chaîne, recopiée, à la nouvelle fonction sur les 196 paires ordonnées de 14 mots-clés (plusieurs mots par libellé, majuscules, accents, chaîne vide). Avec le test existant tests/modules/care-tasks/domain.test.ts, `npx vitest run` donne 2 fichiers et 24 tests réussis.
  - Exemple 2 : table de vérité sur `undefined`, `"manual"`, les 5 valeurs nommées, `"constructor"` et `""`. Les 9 sorties sont identiques.
  - Exemple 3 : table de vérité sur 12 langues (`ar`, `ar-SA`, `en`, `en-GB`, `es`, `es-MX`, `fr`, `fr-CA`, `de`, `""`, `arabe`, `EN`). Les 12 sorties sont identiques.
  - Les trois réécritures : `tsc -p tsconfig.app.json` donne 0 erreur. Biome sur les 3 fichiers passe de 16 à 7 remarques `noNestedTernary` (9 sites retirés, les 7 restants sont d'autres chaînes de stock-workspace.tsx). Coût : 41 lignes ajoutées et 29 retirées, soit 12 lignes nettes pour 9 sites.
  - Effet sur la complexité : la fonction qui contient l'exemple 2 (stock-workspace.tsx:1014) passe d'un score de complexité cognitive de 66 à 41. Ces deux règles se recoupent.
- **Ma recommandation :** passer la règle en `warn`, réécrire d'abord les 49 chaînes sur un même discriminant (tables ou `switch`, faible risque, tests faciles) et les chaînes de 4 ou 5 niveaux en profitant d'une retouche. Les 229 chaînes à 2 niveaux, surtout en JSX, ne valent pas le risque d'une réécriture en masse.
- **Ce qui n'est pas prouvé :** l'équivalence n'est prouvée que pour les 3 exemples. Une réécriture JSX en sous-composant peut changer l'identité des composants, donc remonter un état local. Je n'ai mesuré cela sur aucun site. Le coût de 12 lignes pour 9 sites vient de chaînes faciles. Il sera plus élevé sur les 44 chaînes imbriquées dans la branche vraie.

## 4. `noExcessiveCognitiveComplexity`, 160 sites

### `noExcessiveCognitiveComplexity`, 160 sites
- **Ce qui change :** il faut découper des fonctions. Le seuil d'Ultracite est 20 ; les fichiers de test en sont déjà exemptés par le préréglage.
- **Les sites, par risque croissant :**

| Score | Fonctions | Restent si le seuil est ce plafond |
|---|---|---|
| 21 à 25 | 52 | seuil 25 : 108 |
| 26 à 30 | 31 | seuil 30 : 77 |
| 31 à 40 | 41 | seuil 40 : 36 |
| 41 à 60 | 22 | seuil 50 : 23 ; seuil 60 : 14 |
| 61 à 100 | 10 | |
| plus de 100 | 4 | |

Médiane : 30 ; maximum : 163. 54 sites sont des composants React (nom en majuscule) et 47 des rappels anonymes (`useMemo`, `map`, `runDbRead`, `guard`). Les cinq plus lourds : `assemblePatientRecordSnapshot` (modules/patients/export/patient-record-data.ts:302, 163, 556 lignes), le rappel de `runDbRead` dans consultations/local-ai/embedding-store.ts:919 (159, 357 lignes), le `useMemo` de services/notifications/useNotificationCenter.ts:57 (134), `PatientPeekView` (110), `AgendaView` (97, 1 133 lignes).

<details><summary>Les 160 fonctions, par score décroissant</summary>

| Score | Site | Fonction | Lignes |
|---|---|---|---|
| 163 | modules/patients/export/patient-record-data.ts:302 | assemblePatientRecordSnapshot | 556 |
| 159 | modules/consultations/local-ai/embedding-store.ts:919 | (rappel de runDbRead) | 357 |
| 134 | services/notifications/useNotificationCenter.ts:57 | (rappel de useMemo) | 257 |
| 110 | modules/patients/components/patient-peek-view.tsx:69 | PatientPeekView | 320 |
| 97 | modules/agenda/components/agenda-view.tsx:124 | AgendaView | 1133 |
| 88 | modules/patients/components/patient-timeline.tsx:559 | (rappel de month.entries.map) | 162 |
| 86 | modules/care-tasks/care-page.tsx:136 | CarePage | 958 |
| 83 | modules/consultations/components/local-consultation-assistant.tsx:159 | LocalConsultationAssistant | 1551 |
| 83 | modules/dashboard/components/visit-flow-board.tsx:25 | VisitFlowBoard | 272 |
| 75 | modules/patients/components/patients-shared.tsx:442 | PatientDetailsDialog | 1157 |
| 67 | modules/consultations/components/patient-document-search.tsx:222 | (rappel de guard) | 102 |
| 66 | components/stock/stock-workspace.tsx:1014 | (rappel de [...movements] ) | 100 |
| 66 | modules/patients/patient-detail-page.tsx:246 | PatientDetailPage | 1333 |
| 61 | modules/stock/components/purchasing-panel.tsx:691 | PurchasingPanel | 630 |
| 60 | modules/consultations/components/local-consultation-assistant.tsx:502 | generate | 178 |
| 58 | modules/patients/export/patient-record-pdf.ts:666 | appendSource | 180 |
| 54 | modules/agenda/hooks/use-agenda-page-model.tsx:504 | (rappel de useMemo) | 117 |
| 53 | components/NotesPro.tsx:232 | NotesPro | 876 |
| 53 | hooks/useListCursor.ts:122 | onKeyDown | 72 |
| 53 | modules/consultations/local-ai/veterinary-lexicon.ts:393 | expandSearchQuery | 71 |
| 53 | modules/dashboard/model/morning-watch.ts:65 | buildMorningWatch | 185 |
| 51 | modules/documents/components/consultation-documents-assistant.tsx:116 | ConsultationDocumentsAssistant | 856 |
| 51 | modules/stock/hooks/use-stock-page-model.tsx:140 | (rappel de guard) | 111 |
| 47 | components/ui/hex-density.tsx:344 | (rappel de group.map) | 71 |
| 47 | modules/consultations/lib/voice-to-soap.ts:26 | extractJsonObject | 56 |
| 46 | modules/consultations/components/patient-document-search.tsx:132 | PatientDocumentSearch | 618 |
| 46 | modules/dashboard/model/alert-bars.ts:77 | buildAlertBars | 217 |
| 46 | modules/finances/hooks/use-finances-page-model.tsx:351 | (rappel de useMemo) | 95 |
| 45 | components/ui/chart-card.tsx:152 | ChartCard | 580 |
| 45 | data/repositories/index.ts:319 | completeWithBilling | 158 |
| 45 | modules/consultations/workers/soap.worker.ts:36 | (anonyme) | 165 |
| 43 | modules/clinic-network/clinic-network-settings.tsx:64 | ClinicNetworkSettings | 527 |
| 43 | modules/patients/components/patients-shared.tsx:1600 | PatientCreateDialog | 572 |
| 41 | components/Tasks.tsx:251 | Tasks | 1100 |
| 41 | modules/finances/components/finances-view.tsx:117 | FinancesView | 1489 |
| 41 | modules/patients/export/patient-record-export-dialog.tsx:80 | PatientRecordExportDialog | 477 |
| 40 | modules/documents/components/document-template-manager.tsx:95 | DocumentTemplateManager | 724 |
| 40 | modules/documents/lib/read-local-document.ts:20 | readLocalDocument | 194 |
| 40 | modules/hospitalizations/stays/stays-page.tsx:182 | (rappel de locations.map) | 50 |
| 39 | components/Team.tsx:473 | (rappel de filteredUsers.map) | 169 |
| 39 | modules/consultations/workers/whisper.worker.ts:13 | (anonyme) | 163 |
| 39 | modules/documents/document-store.ts:470 | medicines | 75 |
| 39 | modules/hospitalizations/stays/store.ts:268 | (rappel de persistence.transaction) | 74 |
| 38 | modules/patients/components/vaccination-dialog.tsx:129 | (rappel de guard) | 73 |
| 38 | modules/stock/services/inventory-store.ts:180 | saveCatalogueProductInDatabase | 153 |
| 37 | components/stock/stock-workspace.tsx:558 | StockWorkspace | 755 |
| 37 | modules/consultations/components/ai-model-install-prompt.tsx:89 | (rappel de useEffect) | 74 |
| 37 | modules/patients/components/patient-kpi-strip.tsx:29 | PatientKpiStrip | 271 |
| 37 | modules/patients/export/patient-record-pdf.ts:916 | buildPatientRecordPdf | 118 |
| 36 | lib/clinical-alerts.ts:104 | evaluateVitals | 159 |
| 35 | components/Team.tsx:118 | Team | 794 |
| 35 | components/ui/diverging-bars.tsx:120 | DivergingBars | 449 |
| 35 | modules/flow-board/flow-board-page.tsx:661 | onKeyDown | 70 |
| 35 | services/aiOutput.ts:41 | stripControlMarkers | 57 |
| 35 | services/sqlite/migration-runner.ts:88 | runSqliteMigrations | 106 |
| 34 | components/ui/stat-grid.tsx:155 | StatCard | 148 |
| 34 | modules/clinique/components/clinique-shared.tsx:431 | ConsultationSessionDialog | 806 |
| 34 | modules/consultations/components/local-consultation-assistant.tsx:681 | save | 68 |
| 34 | modules/hospitalizations/components/hospitalization-detail.tsx:51 | HospitalizationDetail | 339 |
| 34 | modules/patient-reminders/patient-reminders-panel.tsx:323 | (rappel de rows.map) | 174 |
| 34 | modules/patients/components/patient-header.tsx:109 | PatientRecordHeader | 130 |
| 33 | modules/billing/use-appointment-billing.ts:153 | (rappel de guard) | 44 |
| 33 | modules/consultations/hooks/use-local-consultation-ai.ts:198 | (rappel de guard) | 134 |
| 33 | modules/consultations/workers/embedding.worker.ts:205 | (anonyme) | 82 |
| 33 | modules/dashboard/components/focus-trend-chart.tsx:102 | FocusTrendChart | 302 |
| 33 | modules/documents/components/document-template-manager.tsx:400 | (rappel de templates.map) | 98 |
| 33 | services/aiToolProtocol.ts:50 | extractToolCall | 63 |
| 32 | modules/assistant-answers/period.ts:61 | parsePeriod | 96 |
| 32 | modules/consultations/components/assistant-activity.tsx:16 | AssistantActivity | 45 |
| 32 | modules/finances/hooks/use-finances-page-model.tsx:515 | (rappel de [...transactions] .filte) | 51 |
| 32 | modules/patients/components/patient-context-widgets.tsx:36 | PatientContextWidgets | 184 |
| 32 | modules/shell/notification-center.tsx:250 | NotificationCenter | 281 |
| 31 | components/ui/hex-density.tsx:219 | onKeyDown | 48 |
| 31 | modules/assistant-answers/answer.ts:1005 | verifyAnswer | 82 |
| 31 | modules/consultations/local-ai/treatment-routing.ts:48 | (rappel de sentences(transcript).map) | 40 |
| 31 | modules/flow-board/model.ts:171 | buildFlowBoard | 81 |
| 31 | services/licenseRuntime.ts:180 | check | 128 |
| 30 | modules/consultations/hooks/use-local-consultation-ai.ts:360 | (rappel de guard) | 58 |
| 30 | modules/documents/document-store.ts:705 | (rappel de persistence.transaction) | 95 |
| 30 | modules/hospitalizations/stays/stays-page.tsx:31 | StaysPage | 245 |
| 30 | modules/hospitalizations/stays/store.ts:587 | (rappel de persistence.transaction) | 101 |
| 30 | modules/patients/components/medical-record-summary.tsx:43 | PatientIdentity | 141 |
| 30 | modules/prescriptions/components/prescription-dispensing.tsx:25 | PrescriptionDispensing | 278 |
| 30 | modules/shell/app-shell.tsx:120 | AppShellInner | 644 |
| 29 | components/CommandPalette.tsx:281 | CommandPalette | 1348 |
| 29 | components/documents-library.tsx:392 | (rappel de shown.map) | 145 |
| 29 | data/repositories/index.ts:200 | saveAppointment | 85 |
| 29 | modules/dashboard/components/premium-analytics.tsx:300 | PremiumAnalytics | 557 |
| 29 | modules/dashboard/model/hex-activity.ts:159 | buildHexActivity | 163 |
| 29 | modules/patients/export/patient-record-pdf-source.ts:55 | render | 128 |
| 29 | modules/stock/components/stock-operations-panel.tsx:765 | StockOperationsPanel | 375 |
| 28 | data/repositories/index.ts:520 | createWithOwner | 137 |
| 28 | modules/agenda/hooks/use-agenda-page-model.tsx:986 | (rappel de guard) | 67 |
| 28 | modules/consultations/local-ai/treatment-routing.ts:256 | restoreClauses | 46 |
| 28 | modules/consultations/local-ai/veterinary-lexicon.ts:24 | stemFrenchWord | 86 |
| 28 | modules/dashboard/model/dashboard-widgets.ts:378 | buildActivityHeatmap | 123 |
| 27 | components/ui/data-table.tsx:157 | DataTable | 342 |
| 27 | modules/consultations/local-ai/embedding-store.ts:1283 | searchAllPatientsClinical | 139 |
| 27 | modules/documents/components/document-preview-dialog.tsx:51 | DocumentPreviewDialog | 467 |
| 27 | modules/patient-reminders/store.ts:150 | (rappel de persistence.transaction) | 81 |
| 27 | modules/patients/lib/timeline-pieces.ts:45 | collectTimelinePieces | 78 |
| 27 | modules/stock/components/stock-lots-panel.tsx:630 | (rappel de rows.map) | 67 |
| 27 | modules/stock/services/inventory-store.ts:84 | summarizeInventory | 76 |
| 26 | components/ui/agent-composer.tsx:103 | onKeyDown | 35 |
| 26 | modules/agenda/hooks/use-agenda-page-model.tsx:829 | (rappel de guardSync) | 33 |
| 26 | modules/consultations/local-ai/passage-search.ts:200 | rankPassages | 74 |
| 26 | modules/prescriptions/components/prescription-builder.tsx:485 | (rappel de useCallback) | 90 |
| 26 | modules/stock/services/clinical-stock-store.ts:212 | dispensePrescriptionInDatabase | 202 |
| 25 | components/ui/agent-question.tsx:78 | AgentQuestion | 268 |
| 25 | components/ui/sidebar.tsx:358 | handlePointerMove | 41 |
| 25 | modules/consultations/components/soap-panel.tsx:100 | SoapPanel | 436 |
| 25 | modules/dashboard/v2/receipts-series.ts:29 | buildReceiptsSeries | 65 |
| 25 | modules/prescriptions/components/prescription-builder.tsx:989 | ItemRow | 262 |
| 25 | modules/stock/components/stock-view.tsx:40 | StockView | 566 |
| 24 | modules/assistant-answers/answer.ts:331 | cash | 165 |
| 24 | modules/care-tasks/store.ts:219 | (rappel de persistence.transaction) | 70 |
| 24 | modules/consultations/components/ai-model-settings.tsx:113 | (rappel de AI_MODELS_CATALOG.map) | 65 |
| 24 | modules/dashboard/components/dashboard-watch.tsx:28 | WatchCard | 94 |
| 24 | modules/flow-board/spatial-nav.ts:15 | nearestInDirection | 44 |
| 24 | modules/stock/services/lot-store.ts:571 | registerLotInDatabase | 185 |
| 24 | modules/stock/services/purchasing-store.ts:367 | receivePurchaseOrderInDatabase | 155 |
| 24 | modules/tour/tour-progress.ts:104 | evaluateStep | 94 |
| 23 | components/ui/tool-call-block.tsx:87 | ToolCallBlock | 173 |
| 23 | contexts/AuthContext.tsx:105 | (rappel de guard) | 33 |
| 23 | modules/documents/components/document-composer.tsx:32 | DocumentComposer | 395 |
| 23 | modules/patients/components/weight-entry-dialog.tsx:65 | WeightEntryDialog | 300 |
| 23 | modules/patients/export/patient-record-pdf.ts:328 | table | 131 |
| 23 | modules/patients/hooks/use-patients-page-model.tsx:254 | (rappel de useMemo) | 107 |
| 23 | modules/stock/services/care-stock-rollback.ts:27 | returnCareStockInDatabase | 178 |
| 23 | modules/stock/services/stock-operations-store.ts:323 | barcodeStockOperationInDatabase | 128 |
| 23 | services/billingService.ts:2028 | (rappel de runBillingCommand) | 120 |
| 23 | services/billingService.ts:1494 | (rappel de runBillingCommand) | 69 |
| 22 | components/ui/chart.tsx:200 | (rappel de payload .filter((ite) | 66 |
| 22 | modules/dashboard/model/dashboard-watch.ts:161 | (rappel de products.flatMap) | 47 |
| 22 | modules/documents/document-store.ts:298 | actor | 34 |
| 22 | modules/documents/document-store.ts:630 | (rappel de persistence.transaction) | 42 |
| 22 | modules/patient-reminders/patient-reminders-panel.tsx:60 | PatientRemindersContent | 662 |
| 22 | modules/prescriptions/components/prescription-builder.tsx:414 | (rappel de useCallback) | 62 |
| 22 | modules/stock/components/product-stock-fields.tsx:8 | ProductStockFields | 86 |
| 21 | components/CommandPalette.tsx:628 | (rappel de patients .filter((p) => ) | 19 |
| 21 | components/SetupWizard.tsx:39 | SetupWizard | 408 |
| 21 | components/app-sidebar.tsx:59 | AppSidebar | 227 |
| 21 | components/ui/confirmation-card.tsx:71 | ConfirmationCard | 150 |
| 21 | components/ui/data-table.tsx:344 | (rappel de columns.map) | 49 |
| 21 | lib/invoice-pdf.ts:62 | buildInvoicePdf | 312 |
| 21 | modules/agenda/components/agenda-month-calendar.tsx:120 | (rappel de cells.map) | 99 |
| 21 | modules/care-tasks/store.ts:296 | (rappel de persistence.transaction) | 60 |
| 21 | modules/consultations/components/ai-model-settings.tsx:48 | AIModelSettings | 265 |
| 21 | modules/consultations/local-ai/dictation-scaffold.ts:46 | buildDictationScaffold | 63 |
| 21 | modules/dashboard/v2/financial-model.ts:22 | buildFinancialOverview | 105 |
| 21 | modules/documents/lib/patient-document-reading.ts:47 | preparePatientAttachment | 129 |
| 21 | modules/finances/hooks/use-finances-page-model.tsx:706 | (rappel de guard) | 46 |
| 21 | modules/flow-board/open-in-flux.ts:56 | serve | 18 |
| 21 | modules/flow-board/use-flow-board.ts:207 | (rappel de useCallback) | 46 |
| 21 | modules/hospitalizations/components/vitals-entry-dialog.tsx:120 | handleSubmit | 27 |
| 21 | modules/patient-reminders/store.ts:288 | (rappel de persistence.transaction) | 77 |
| 21 | modules/patients/components/patient-timeline.tsx:249 | buildEntries | 126 |
| 21 | modules/patients/components/vaccination-dialog.tsx:45 | VaccinationDialog | 368 |
| 21 | modules/patients/hooks/use-patients-page-model.tsx:465 | (rappel de guard) | 54 |
| 21 | services/sqlite/auth.ts:73 | legacySha256 | 84 |

</details>

- **Exemples travaillés (les plus sûrs) :** je n'ai pas découpé de fonction pour cette famille. Le seul découpage mesuré est celui de la section 3 : sortir une chaîne de ternaires dans `movementSourceLabel` fait baisser le rappel de stock-workspace.tsx:1014 de 66 à 41, sans toucher à sa logique. Pour les grands composants (`AgendaView`, `LocalConsultationAssistant`, `PatientDetailPage`, plus de 1 000 lignes), descendre sous 20 demanderait de sortir des sous-composants et des hooks. Cela touche à l'état et aux effets.
- **La mesure :** le score et le seuil sont lus dans le message de Biome (« Excessive complexity of N detected (max: 20) ») pour les 160 sites. Les noms et les longueurs viennent de l'arbre syntaxique (/tmp/claude-0/c3w/cog.json).
- **Ma recommandation :** garder la règle en avertissement (`"level": "warn"`) avec le seuil 20 d'Ultracite, pour voir la dette sans bloquer. Si Zouhir préfère une erreur, le seuil réaliste est 60 : il laisse 14 fonctions à découper ou à exempter. La correction de `noNestedTernary` fera d'ailleurs baisser une partie des scores.
- **Ce qui n'est pas prouvé :** je n'ai pas mesuré combien de fonctions passeraient sous le seuil une fois les ternaires réécrits. Le recul de 25 points n'est mesuré que sur un rappel.

## 5. Les petites règles

| Règle | Sites | Nature | Correction proposée | Risque |
|---|---|---|---|---|
| `noExplicitAny` | 33 | Types Tiptap (`editor: any`, props de suggestion), `recover: (error: any)`, `(note as any).isPinned` dans NotesPro, 9 tableaux `any[]` de premium-analytics.tsx:102-109 | `Editor` de `@tiptap/react`, `unknown` dans `recover`, ajouter `isPinned` au type de note, types de `@/types/db` | Faible. Peut faire remonter des erreurs tsc cachées |
| `noParameterProperties` | 15 | `constructor(private readonly x: T)` dans 6 fichiers (inference-client.ts, patient-record-pdf.ts, packaged-ocr.ts…) | Champ déclaré et affecté dans le constructeur | Faible. `erasableSyntaxOnly` est à `false`, rien n'y oblige |
| `noNamespaceImport` | 13 | `import * as React` (10), `RechartsPrimitive`, `AuthService`, `AppSettingsService` | Imports nommés | Nul à l'exécution. Le gain sur le bundle n'est pas mesuré |
| `noBarrelFile` | 13 | Réexports. lib/hugeicons.ts est voulu : il réexporte des icônes une par une pour **éviter** le gros fichier du paquet (commentaire en tête) | `biome-ignore` sur lib/hugeicons.ts ; imports directs ailleurs | Faible |
| `noEmptyBlockStatements` | 17 | `catch {}` muets, `.catch(() => {})`, rappels par défaut `onProgress = () => {}` | Un commentaire dans le bloc, ou `() => undefined` | Nul |
| `noExportedImports` | 6 | Import puis réexport (i18n, types) | `export … from` | Nul |
| `noThenProperty` | 4 | **Piège latent** : les étapes du tour (modules/tour/tour-steps.ts:32, :39, :47, :60) ont une méthode `then`. Chaque objet de `TOUR_STEPS` est « thenable » : un `await step` ou un `Promise.resolve(step)` appellerait `then(resolve, reject)`, qui rend une chaîne, et la promesse ne se résoudrait jamais. Aucun site ne le fait aujourd'hui : `TOUR_STEPS` n'est lu que dans tour-guide.tsx et tour-target.ts, sans `await` | Renommer `then` (par exemple `next`) dans le type, les 4 étapes et tour-guide.tsx:310 | Faible, 6 lignes |
| `noAssignInExpressions` | 4 | `return (this.doc ??= …)` (patient-record-pdf.ts:237), `while ((m = re.exec()))` (services/aiToolProtocol.ts:41), 2 sites dans un SHA-256 écrit à la main (services/sqlite/auth.ts:113, :125) | Sortir l'affectation ; `matchAll` ; `biome-ignore` sur le hachage | Moyen sur auth.ts : c'est du code de hachage, je ne le réécrirais pas |
| `noNestedComponentDefinitions` | 4 | Composants `Root`, `Chevron`, `DayButton`, `WeekNumber` définis dans le rendu de `Calendar` (components/ui/calendar.tsx:138-172, motif shadcn) | Les sortir du corps de `Calendar` | Moyen. Possible vrai défaut de performance : React voit un nouveau type de composant à chaque rendu et remonte les jours du calendrier. Non mesuré |
| `useErrorMessage` | 3 | `throw new Error()` dans services/licenseLease.ts:33, :49, :71, capté par le `catch` voisin | Ajouter un message | Nul |
| `noShadowRestrictedNames` | 3 | Fonction locale `escape` qui masque la globale (lib/note-markdown.ts:3, consultations/local-ai/dictation-scaffold.ts:18, patient-reminders/export.ts:22) | Renommer (`escapeCsv`, `escapeRegExp`) | Nul |
| `noAlert` | 3 | `window.confirm` (NotesPro.tsx:518, :629 ; activation-admin-page.tsx:2004) | `AlertDialog` du projet | Moyen. Le dialogue devient asynchrone, et la logique de suppression change de forme |
| `noUselessFragments` | 3 | `<>{children}</>` (stock-workspace.tsx:554), 2 fragments à un seul enfant (document-preview-dialog.tsx:228, :250) | Retirer le fragment | Faible. Le type rendu passe de `JSX.Element` à `ReactNode` ; tsc non lancé |
| `noReactForwardRef` | 2 | components/SlashCommandMenu.tsx:19 (avec `useImperativeHandle`, monté par le `ReactRenderer` de Tiptap), lib/icons.tsx:162 | `ref` en prop (React 19) | Moyen pour SlashCommandMenu : le passage du `ref` par Tiptap est à vérifier |
| `noFocusedTests` | 2 | **Faux positif** : `this.fit(…)` est une méthode de la classe PDF de patients/health-card/health-card-pdf.ts:138, :159, pas un `fit()` de test | `biome-ignore` ou renommer `fit` en `fitText` | Nul |
| `useDefaultSwitchClause` | 2 | `switch` sans `default` sur une union (lib/clinical-alerts.ts:108, hospitalizations/lib/format.ts:124) | `default:` qui vérifie `never`, pour garder le contrôle d'exhaustivité | Faible. Un `default` simple masquerait un cas oublié |
| `noSubstr` | 2 | `substring(2)` et `substring(0, 19)` (services/sqlite/database.ts:367, :375) | `slice` avec les mêmes arguments, identique pour des arguments positifs | Nul |
| `noParameterAssign` | 2 | Paramètre réaffecté (dictation-scaffold.ts:27, dashboard/model/clinical-dashboard.ts:63) | Variable locale | Nul |
| `noDangerouslySetInnerHtml` | 2 | ui/chart.tsx:93 : feuille de style générée depuis la config du graphique (motif shadcn), sûr. **components/NotesPro.tsx:980** : l'aperçu rend le HTML de la note brut. Or tauri.conf.json a `"csp": null` et `"withGlobalTauri": true`. Un `<img onerror>` dans une note s'exécuterait avec accès à `window.__TAURI__` | chart.tsx : `biome-ignore`. NotesPro : assainir (DOMPurify, absent des dépendances) ou rendre l'aperçu avec Tiptap en lecture seule | **À examiner.** Le contenu vient normalement de l'éditeur Tiptap, qui filtre par son schéma. Je n'ai pas cherché de chemin d'import qui contourne ce filtre |
| `noAccumulatingSpread` | 2 | Cumul `[...sums, x]` dans `reduce` (premium-analytics.tsx:242, dashboard/model/key-figures.ts:97), en O(n²) sur une série courte | Boucle `for` avec `push` | Nul |
| `noEmptyCharacterClassInRegex` | 2 | **Pas un bogue** : `[^]` (patient-record-data.ts:161, :163) n'est pas une classe vide. C'est l'idiome « n'importe quel caractère, retours à la ligne compris » | `[\s\S]` | Nul. Vérifié sur 4 chaînes (commentaires et balises sur plusieurs lignes, U+2028) : sorties identiques |
| `noRedeclare` | 1 | anesthesia/components/anesthesia-sheet.tsx:27 : la fonction `AnesthesiaSheet` porte le nom du type importé ligne 15. TypeScript l'accepte (un type et une valeur), mais c'est trompeur | `import type { AnesthesiaSheet as AnesthesiaSheetRow }` | Nul |
| `noPrototypeBuiltins` | 1 | `Object.prototype.hasOwnProperty.call` (services/billingService.ts:864) | `Object.hasOwn` (ES2022, dans `lib` de tsconfig.app.json) | Nul |
| `noImplicitAnyLet` et `noEvolvingTypes` | 1 + 1 | Le même `let lease;` (services/licenseRuntime.ts:192) | `let lease: Awaited<ReturnType<typeof verifyLicenseLease>>;` | Nul |

- **La mesure :** pour cette section, lecture de chaque site et greps cités dans le tableau. J'ai vérifié deux choses par l'essai : l'équivalence `[^]` et `[\s\S]` (4 chaînes, node), et l'absence d'`await` sur les étapes du tour (grep de `TOUR_STEPS` et `TourStepCopy`).
- **Ma recommandation :** corriger les règles à risque nul en une passe. Renommer `then` dans le tour. Faire examiner l'aperçu de NotesPro par quelqu'un qui connaît les sources des notes. Mettre un `biome-ignore` sur `noFocusedTests`, lib/hugeicons.ts, chart.tsx et le SHA-256. Garder `noAlert`, `noReactForwardRef` et `noNestedComponentDefinitions` pour une passe à part, avec un essai dans l'application.
- **Ce qui n'est pas prouvé :** tsc n'a pas été lancé sur les corrections de cette section. L'exploitation du HTML de NotesPro n'est pas démontrée. La remonte du calendrier n'est pas mesurée.

## Ce qui reste dans le worktree

/tmp/claude-0/wt-c3 (détaché sur 8e6c9b6b, rien de commité) garde les trois réécritures de ternaires, l'option `inputComponents` dans biome.jsonc et le test d'équivalence. Les essais `noVoid` et d'accessibilité y ont été remis en état.
