# Inventaire des choses mortes et cachées (9 novembre 2026)

Temps 1 du chantier de nettoyage : **inventaire seulement**. Aucune suppression, aucun code touché (seuls ce dossier et ses annexes sont créés). Périmètre : ce qui n'est pas monté, pas référencé ou sans chemin d'accès. Les fonctionnalités montées sont hors périmètre ; **le thème Premium est exclu** et ses éléments sont signalés à part (aucune proposition de retrait). État analysé : commit `64019a7`.

## Méthode et niveau de preuve

- **Graphe d'imports** : Knip 6.44.2 (installé dans la copie `bAItari-copie-oxlint`, jamais dans l'original) avec pour points d'entrée `src/main.tsx`, la configuration Vite, `scripts/`, `tests/` et `activation-server/`. Un fichier est « mort » s'il n'est atteignable depuis aucun d'eux, **tests compris**.
- **Références textuelles** (ce que Knip ne voit pas) : pour chaque fichier, recherche du chemin (`src/…`, `@/…`) et du nom complet dans `src`, `tests`, `scripts`, `index.html`, la configuration, la CI, la partie Rust et les JSON d'outils. Résultat : 53 fichiers sans aucune mention, 27 mentionnés seulement par d'autres fichiers morts, 2 avec une mention externe (traitées plus bas).
- **Simulation de suppression** dans la copie : les 82 fichiers retirés → **typecheck tsrs : 0 erreur** ; **build de production : identique** (174 chunks, 8,3 Mo, déjà éliminés du paquet) ; **tests : 1 échec**, celui du test qui lit `activity-heatmap.tsx`. Aucun fichier supplémentaire ne devient mort. La copie a été restaurée.
- CSS, assets, événements, clés de stockage, commandes Rust, scripts : balayages dédiés décrits dans chaque section. Les faux positifs rencontrés (polices et `tw-animate-css` importées par `@import` CSS ; classe `column-resize-handle` générée par Tiptap) sont écartés et notés.

## Résumé

| # | Catégorie | Éléments | Poids | Risque | Lot proposé |
|---|---|---|---|---|---|
| A | Fichiers source non montés | **82** fichiers | 14 495 lignes | faible à moyen | 1 à 8 |
| B | Vues sans chemin d'accès | 2 (Aide, Assistant plein écran) + 1 fichier en cascade | 707 lignes + routes | moyen | 9 |
| C | Événements et clés de stockage | 1 événement sans écouteur, 1 interrupteur de développement sans écriture | — | faible | 12 |
| D | CSS mort | 7 fichiers + **331** classes (dont 78 liées à Premium) | ≈ 1 040 lignes en fichiers morts | faible (méthode : voir D) | 10 |
| E | Dépendances npm | **8** à retirer (7 `dependencies`, 1 `devDependency`) | — | faible | 3, 4, 12 |
| F | Assets orphelins | 13 fichiers d'art (7 PNG + 6 notes de prompt) + 8 images + 2 SVG | ≈ 12,3 Mo | faible | 7, 11 |
| G | Rust | 3 commandes Tauri jamais appelées | — | **moyen** (Rust non compilable ici) | 12 |
| H | Fichier suivi parasite | 1 lien symbolique vers un chemin personnel | — | faible | 12 |
| I | Outils manuels non branchés | 20 fichiers (`scripts/eval-local-ai`) | — | **à décider** | — |
| J | Branches mortes dans des fichiers montés | `useIsPremium()` constant (31 occurrences, 7 fichiers) | — | lié à Premium | **décision séparée** |
| K | Annexes informatives (non proposées) | 430 exports, 102 types, 549 clés de traduction | — | — | — |

## A. Fichiers source non montés (82)

Pour chaque famille : la preuve est la même (inaccessible depuis les points d'entrée, aucune référence textuelle hors fichiers morts, retrait simulé sans erreur) sauf mention contraire ; le risque est celui de la famille.

### A1. Anciens menus et coquilles du shell : 5 fichiers, 822 lignes. Risque : **Faible**

app-header (en-tête d'avant la refonte), nav-user/nav-documents/nav-secondary (anciens blocs de barre latérale), title-bar (barre de titre React, remplacée par l'élément statique d'index.html et decorum). Nombreuses règles CSS portent leur nom (voir D).

| Fichier | Lignes | Dernière modif. | Référencé par (fichiers morts) |
|---|---|---|---|
| `modules/shell/app-header.tsx` | 382 | 2026-10-21 | — |
| `components/nav-user.tsx` | 174 | 2026-10-22 | — |
| `components/nav-documents.tsx` | 108 | 2026-10-21 | — |
| `components/nav-secondary.tsx` | 73 | 2026-10-21 | — |
| `components/title-bar.tsx` | 85 | 2026-10-21 | — |

### A2. Raccourcis de compatibilité et fichiers « barrel » : 8 fichiers, 72 lignes. Risque : **Faible**

Réexportations de 1 à 2 lignes vers les vrais composants, et trois index qui regroupent des exports que personne n'importe par ce chemin.

| Fichier | Lignes | Dernière modif. | Référencé par (fichiers morts) |
|---|---|---|---|
| `components/Agenda.tsx` | 2 | 2026-10-05 | — |
| `components/Finances.tsx` | 2 | 2026-10-05 | — |
| `components/Patients.tsx` | 2 | 2026-10-05 | — |
| `components/Stock.tsx` | 2 | 2026-10-05 | — |
| `components/command-palette.tsx` | 1 | 2026-10-16 | — |
| `components/ui/index.ts` | 52 | 2026-05-12 | — |
| `modules/consultations/index.ts` | 10 | 2026-10-16 | — |
| `modules/patients/index.ts` | 1 | 2026-06-02 | — |

### A3. Anciens tableaux et graphiques, ancienne vue Documents : 20 fichiers, 7597 lignes. Risque : **Faible**

Version antérieure du tableau (`data-table.tsx`, 788 lignes, distincte de `ui/data-table.tsx` qui est monté), ancienne bibliothèque de notes, ancien Kanban, kit de graphiques `evilcharts` et blocs `shadcn-space` jamais branchés, deux fichiers d'exemple.

| Fichier | Lignes | Dernière modif. | Référencé par (fichiers morts) |
|---|---|---|---|
| `components/data-table.tsx` | 788 | 2026-10-05 | — |
| `components/Notes.tsx` | 716 | 2026-10-21 | — |
| `components/KanbanBoard.tsx` | 461 | 2026-10-21 | — |
| `components/chart-area-interactive.tsx` | 179 | 2026-10-18 | — |
| `components/metric-overview-strip.tsx` | 251 | 2026-10-21 | — |
| `components/StatsTrending.tsx` | 96 | 2026-10-18 | — |
| `components/deferred-widget.tsx` | 61 | 2026-06-12 | — |
| `components/example.tsx` | 56 | 2026-05-12 | — |
| `components/evilcharts/example.tsx` | 54 | 2026-05-12 | — |
| `components/evilcharts/charts/composed-chart.tsx` | 1315 | 2026-05-12 | — |
| `components/evilcharts/charts/line-chart.tsx` | 804 | 2026-05-12 | `example.tsx` |
| `components/evilcharts/charts/radar-chart.tsx` | 533 | 2026-10-18 | — |
| `components/evilcharts/ui/background.tsx` | 303 | 2026-05-12 | `composed-chart.tsx`, `line-chart.tsx`, `radar-chart.tsx` |
| `components/evilcharts/ui/chart.tsx` | 283 | 2026-05-12 | `composed-chart.tsx`, `line-chart.tsx`, `radar-chart.tsx` |
| `components/evilcharts/ui/dot.tsx` | 170 | 2026-05-12 | `composed-chart.tsx`, `line-chart.tsx`, `radar-chart.tsx` |
| `components/evilcharts/ui/evil-brush.tsx` | 773 | 2026-10-18 | `composed-chart.tsx`, `line-chart.tsx` |
| `components/evilcharts/ui/legend.tsx` | 224 | 2026-05-12 | `composed-chart.tsx`, `line-chart.tsx`, `radar-chart.tsx` |
| `components/evilcharts/ui/tooltip.tsx` | 215 | 2026-05-12 | `composed-chart.tsx`, `line-chart.tsx`, `radar-chart.tsx` |
| `components/shadcn-space/blocks/chart-01/chart.tsx` | 152 | 2026-05-23 | — |
| `components/shadcn-space/blocks/chart-02/chart.tsx` | 163 | 2026-05-23 | — |

### A4. Kit d'interface (shadcn) jamais utilisé : 19 fichiers, 2355 lignes. Risque : **Faible**

Primitives installées par le CLI shadcn et jamais importées (hors le barrel `ui/index.ts`, lui-même mort). Leur retrait libère 5 dépendances (voir E). `ui/breadcrumb.tsx` : le fil d'Ariane actuel est un composant maison (`header-breadcrumb.tsx`).

| Fichier | Lignes | Dernière modif. | Référencé par (fichiers morts) |
|---|---|---|---|
| `components/ui/accordion.tsx` | 77 | 2026-10-05 | `index.ts` |
| `components/ui/alert.tsx` | 76 | 2026-06-12 | `index.ts` |
| `components/ui/aspect-ratio.tsx` | 22 | 2026-06-12 | `index.ts` |
| `components/ui/breadcrumb.tsx` | 121 | 2026-10-05 | — |
| `components/ui/button-group.tsx` | 86 | 2026-06-12 | — |
| `components/ui/carousel.tsx` | 247 | 2026-10-05 | `index.ts` |
| `components/ui/context-menu.tsx` | 271 | 2026-10-05 | `index.ts` |
| `components/ui/drawer.tsx` | 134 | 2026-06-12 | `data-table.tsx`, `index.ts` |
| `components/ui/hover-card.tsx` | 51 | 2026-06-12 | `index.ts` |
| `components/ui/input-otp.tsx` | 83 | 2026-10-05 | `index.ts` |
| `components/ui/item.tsx` | 200 | 2026-06-12 | — |
| `components/ui/key-hint.tsx` | 119 | 2026-11-08 | — |
| `components/ui/menubar.tsx` | 283 | 2026-10-05 | `index.ts` |
| `components/ui/mesh-gradient.tsx` | 97 | 2026-06-12 | — |
| `components/ui/message-scroller.tsx` | 129 | 2026-10-16 | — |
| `components/ui/navigation-menu.tsx` | 170 | 2026-10-05 | `index.ts` |
| `components/ui/resizable.tsx` | 50 | 2026-06-12 | `index.ts` |
| `components/ui/slider.tsx` | 52 | 2026-06-12 | `index.ts` |
| `components/ui/sparkline.tsx` | 87 | 2026-05-12 | `index.ts` |

### A5. Ancien système de composants (v1) et utilitaires : 12 fichiers, 496 lignes. Risque : **Faible**

`src/shared/ui/*` (ancienne bibliothèque, remplacée par `design-system/` et `components/ui/`). Seule mention externe : `.impeccable/design.json` (métadonnées d'un outil de design, voir le point à valider 4).

| Fichier | Lignes | Dernière modif. | Référencé par (fichiers morts) |
|---|---|---|---|
| `shared/ui/badge.tsx` | 40 | 2026-10-18 | `design.json`, `page-header.tsx`, `stat-tile.tsx` |
| `shared/ui/card.tsx` | 71 | 2026-05-12 | `section-card.tsx`, `stat-tile.tsx` |
| `shared/ui/fitted-amount.tsx` | 32 | 2026-10-01 | `receipts-chart.tsx`, `receivables-breakdown.tsx` |
| `shared/ui/input.tsx` | 16 | 2026-05-12 | — |
| `shared/ui/page-header.tsx` | 34 | 2026-10-18 | — |
| `shared/ui/section-card.tsx` | 36 | 2026-05-12 | — |
| `shared/ui/stat-tile.tsx` | 76 | 2026-10-18 | — |
| `shared/ui/tabs.tsx` | 43 | 2026-10-21 | — |
| `components/shared/StatusBadge.tsx` | 61 | 2026-05-23 | — |
| `design-system/patterns/data-row.tsx` | 30 | 2026-10-05 | — |
| `design-system/patterns/undo-toast.tsx` | 15 | 2026-10-18 | — |
| `hooks/useFormState.ts` | 42 | 2026-05-12 | — |

### A6. Ancien tableau de bord et automations : 7 fichiers, 1874 lignes. Risque : **Moyen**

Widgets d'une version antérieure. **Un test lit `activity-heatmap.tsx` et son CSS** (`tests/dashboard-charter.test.ts`) : à retirer avec eux. `automations.ts` (530 lignes) : les **tables de la base restent** dans les migrations (historique) ; on ne retire que le code.

| Fichier | Lignes | Dernière modif. | Référencé par (fichiers morts) |
|---|---|---|---|
| `modules/dashboard/components/activity-heatmap.tsx` | 208 | 2026-11-07 | `dashboard-charter.test.ts` |
| `modules/dashboard/components/receipts-chart.tsx` | 562 | 2026-10-18 | — |
| `modules/dashboard/components/receivables-breakdown.tsx` | 43 | 2026-10-16 | — |
| `modules/dashboard/v2/widget-shell.tsx` | 96 | 2026-10-18 | — |
| `modules/dashboard/hooks/useAutomations.ts` | 149 | 2026-10-16 | — |
| `modules/dashboard/hooks/useConsultationSummary.ts` | 286 | 2026-10-16 | — |
| `services/sqlite/automations.ts` | 530 | 2026-10-16 | `useAutomations.ts` |

### A7. Décors floraux et de bienvenue : 4 fichiers, 177 lignes. Risque : **Faible**

Composants décoratifs jamais montés ; leurs images (7 PNG, 11,4 Mo) et leur CSS ne servent qu'à eux (voir D, F).

| Fichier | Lignes | Dernière modif. | Référencé par (fichiers morts) |
|---|---|---|---|
| `components/FloralArtwork.tsx` | 23 | 2026-09-24 | `WelcomeArtwork.tsx` |
| `components/WelcomeArtwork.tsx` | 12 | 2026-09-24 | — |
| `components/GridPattern.tsx` | 57 | 2026-06-12 | — |
| `lib/floral-background.ts` | 85 | 2026-09-19 | `FloralArtwork.tsx`, `WelcomeArtwork.tsx` |

### A8. Dictée, consultations et services dormants : 7 fichiers, 1102 lignes. Risque : **Moyen**

Fonctionnalités écrites puis jamais branchées (dictée navigateur, service de rappels, assistant vétérinaire par API, toasts de notification, planning de soins sur l'agenda). Peuvent être de l'avance sur une fonction future : valeur potentielle plus élevée que les autres familles.

| Fichier | Lignes | Dernière modif. | Référencé par (fichiers morts) |
|---|---|---|---|
| `modules/consultations/components/assistant-welcome-text.tsx` | 90 | 2026-10-16 | — |
| `modules/consultations/components/microphone-button.tsx` | 77 | 2026-10-05 | `index.ts` |
| `modules/consultations/hooks/use-speech-to-text.ts` | 213 | 2026-06-12 | `index.ts` |
| `services/reminderService.ts` | 157 | 2026-08-12 | — |
| `services/veterinaryAI.ts` | 352 | 2026-06-12 | — |
| `services/notifications/useNotificationToasts.ts` | 105 | 2026-07-21 | — |
| `modules/care-tasks/agenda-care-schedule.tsx` | 108 | 2026-10-18 | — |

**Les trois cas déjà connus** : les anciens menus (`app-header.tsx`, `nav-user.tsx`, et leurs voisins `nav-documents`, `nav-secondary`, `title-bar`) sont en A1 ; la vue Aide en B ; le CSS `.settings-segmented` en D.

## B. Vues sans chemin d'accès

Registre : 16 vues (`view-registry.tsx`). Navigation latérale : 10. Parmi les 6 autres, 4 sont atteignables autrement (`parametres` : pied de la barre latérale et menu du compte ; `finances_analytics` : bouton « Analyse » ; `soins` : tableau de bord ; `patient_detail` : liste des patients). Deux ne le sont pas :

| Vue | Fichier | Lignes | Preuve | Risque |
|---|---|---|---|---|
| `aide` | `src/components/Help.tsx` | 617 | Seul appel `handleNavigate("aide")` : `app-shell.tsx:933`, dans le **menu de compte de l'ancienne branche non-Premium**, jamais rendue (`useIsPremium()` vaut toujours `true`). Aucune entrée de navigation, aucune commande dans la palette. Reste un chemin par l'adresse `#/aide` (liste des vues valides de `app-shell.tsx`), inutilisable dans l'application de bureau. | moyen : touche `View` (`types.ts`), le registre, `app-shell.tsx`, la navigation |
| `assistant` | `src/components/AIAgentChat.tsx` | 90 | `handleNavigate("assistant")` **n'affiche jamais la vue** : il ouvre le panneau latéral (`app-shell.tsx:292`) ; le routeur par adresse redirige vers le tableau de bord (`:399`) ; la touche J ouvre le panneau. Le `case "assistant"` du registre ne s'exécute donc jamais. | moyen (idem) |

Cascade mesurée : retirer ces deux vues ne rend mort qu'**un fichier de plus**, `src/components/ui/scroll-area.tsx`.

## C. Événements et clés de stockage

- **`clinical-stock-changed`** : émis par `src/modules/stock/services/clinical-stock-service.ts:8`, écouté nulle part (29 événements propres à l'application examinés ; les autres paires émetteur/écouteur sont complètes, y compris les noms construits dynamiquement `vetera:new-invoice`, `vetera:plan-care`). Risque faible ; la ligne voisine `emitSQLiteDataChanged` fait le travail.
- **`baitari:window-controls-preview`** (stockage local) : lu par `window-controls.ts`, écrit nulle part dans le code : interrupteur de développement posé à la main (décrit dans le bilan « barre de titre »). À garder si on veut encore prévisualiser les boutons de fenêtre.
- Autres clés de stockage : aucune clé écrite sans être lue.

## D. CSS mort

**Fichiers (7)** :

| Fichier | Lignes | Preuve |
|---|---|---|
| `src/components/page-mesh.css` | 49 | jamais importé (ni `import`, ni `@import`) |
| `src/components/section-cards.css` | 36 | jamais importé (ni `import`, ni `@import`) |
| `src/components/floral-artwork.css` | 37 | importé uniquement par `FloralArtwork.tsx` (mort) |
| `src/components/welcome-artwork.css` | 175 | importé uniquement par `WelcomeArtwork.tsx` (mort) |
| `src/modules/consultations/components/assistant-welcome-text.css` | 35 | importé uniquement par `assistant-welcome-text.tsx` (mort) |
| `src/modules/dashboard/components/activity-heatmap.css` | 289 | importé uniquement par `activity-heatmap.tsx` (mort) |
| `src/modules/dashboard/components/receipts-chart.css` | 419 | importé uniquement par `receipts-chart.tsx` (mort) |

**Classes** : 1 226 noms de classes distincts dans 56 fichiers CSS ; **331 n'apparaissent nulle part dans le code** (ni `className`, ni chaîne, ni nom partiel). 8 noms générés par des bibliothèques ou ambigus sont écartés (`column-resize-handle`, `selectedCell`, `tableWrapper` générés par Tiptap/ProseMirror…) et 15 noms à usage dynamique possible sont écartés aussi. Répartition :

| Fichier CSS | Classes mortes | Remarque |
|---|---|---|
| `modules/dashboard/v2/studio-dashboard.css` | 86 |  |
| `index.css` | 82 |  |
| `modules/dashboard/components/premium-analytics.css` | 51 | **Premium : hors périmètre** |
| `design-system/clean.css` | 36 |  |
| `modules/patients/medical-record.css` | 30 |  |
| `design-system/premium-workspace.css` | 21 | **Premium : hors périmètre** |
| `modules/patients/patients-list.css` | 17 |  |
| `design-system/premium.css` | 16 | **Premium : hors périmètre** |
| `components/section-cards.css` | 11 |  |
| `modules/shell/shell-toolbar.css` | 10 |  |
| `modules/dashboard/components/receipts-chart.css` | 10 |  |
| `components/mascot/mascot.css` | 6 |  |
| `components/welcome-artwork.css` | 6 |  |
| `components/tasks.css` | 5 |  |
| `modules/shell/premium-sidebar.css` | 5 | **Premium : hors périmètre** |
| `modules/dashboard/components/widget-units.css` | 5 |  |
| `modules/agenda/components/agenda-cards.css` | 3 |  |
| `components/page-mesh.css` | 2 |  |
| `modules/consultations/components/assistant-welcome-text.css` | 2 |  |
| `modules/dashboard/components/clinical/clinical-workspace.css` | 2 |  |
| `modules/finances/finances-premium.css` | 2 | **Premium : hors périmètre** |
| `modules/dashboard/components/dashboard-watch.css` | 1 |  |
| `design-system/page-header-line.css` | 1 |  |
| `design-system/tokens.css` | 1 |  |
| `modules/flow-board/flow-board.css` | 1 |  |

- **Hors Premium** : 253 classes dans des fichiers non Premium ; **41** uniquement dans des fichiers `premium*` et **37** définies à la fois dans l'un et l'autre : ces 78 sont **exclues des propositions** (décision séparée).
- **Méthode de retrait prévue (temps 2)** : outil de parsing CSS (PostCSS), jamais du texte brut. Une classe morte placée dans une liste `:is(…)` ou une virgule (c'est le cas de `.settings-segmented` dans `clean.css`) est retirée de la liste, la règle n'est supprimée que si plus rien ne peut la déclencher ; une classe sous `:not(…)` ne rend pas la règle morte et n'est pas touchée. Contrôle visuel des écrans après chaque lot.
- Règles désormais mortes à cause du chantier d'en-têtes d'aujourd'hui : `.dashboardWelcome` dans `shell-toolbar.css` (la rangée de bienvenue n'existe plus), `.shell-toolbar-help*` et `.shell-toolbar-search*` (anciens boutons d'en-tête).
- `@keyframes` : 31 définis, tous utilisés. Liste complète des 331 classes : `annexe-css-classes-mortes.md`.

## E. Dépendances npm

| Paquet | Preuve | Risque |
|---|---|---|
| `qrcode` | aucun `import`/`require` nulle part (src, tests, scripts, activation-server, Rust) | faible |
| `@tanstack/react-table` | seul importeur : `components/data-table.tsx` (mort, A3) | faible |
| `embla-carousel-react` | seul importeur : `ui/carousel.tsx` (mort, A4) | faible |
| `input-otp` | seul importeur : `ui/input-otp.tsx` (mort, A4) | faible |
| `react-resizable-panels` | seul importeur : `ui/resizable.tsx` (mort, A4) | faible |
| `vaul` | seul importeur : `ui/drawer.tsx` (mort, A4) | faible |
| `@shadcn/react` | seul importeur : `ui/message-scroller.tsx` (mort, A4) | faible |
| `@types/bcryptjs (dev)` | `bcryptjs` 3.0.3 livre ses propres types (`index.d.ts`) ; ces types 2.x sont redondants | faible (le typecheck le confirmera) |

**Faux positifs de Knip écartés (ne pas retirer)** : les 5 `@fontsource-variable/*` et `tw-animate-css` (importés par `@import` dans `src/index.css`, polices citées 3 à 7 fois), `@biomejs/biome` (scripts `format`/`check`/`fix` via Ultracite), `shadcn` (CLI, `components.json`), `sharp` (`src-tauri/icons/generate-icon.js`), `tailwindcss` (CSS et plugin Vite).
**À noter, hors suppression** : 4 paquets utilisés mais non déclarés (`onnxruntime-web`, `tesseract.js-core` par le plugin de l'IA locale ; `@napi-rs/canvas` par un test ; `pg` par le serveur d'activation).

## F. Assets orphelins

| Fichier(s) | Taille | Preuve | Risque |
|---|---|---|---|
| `public/art/cabinet-floral-{chats,chiens,chiots,lapins,nac,oiseaux,sauge}.png` (7) + 6 fichiers `.prompt.txt` | 11,4 Mo | seul usage : `FloralArtwork.tsx` (mort, A7) ; `floral-artwork.css` pointe de plus vers `cabinet-floral-lilas.png`, **fichier absent** | faible |
| `src/assets/mascots/*.webp` (6) | 434 Ko | aucune référence (aucune chaîne `mascots/`, pas de `import.meta.glob`) | faible |
| `src/assets/modal-airbrush.webp`, `modal-amber-light.webp` | 390 Ko | aucune référence | faible |
| `src/assets/react.svg` | 4 Ko | reste du modèle Vite, aucune référence | faible |
| `public/brand/footer-pattern.svg` | 2,7 Ko | le CSS utilise `footer-pattern-wide.svg` | faible |

**À conserver malgré l'absence de référence** : `public/licenses/{geist,space-grotesk,lucide-hospitalisation}.txt` : textes de licence des polices et icônes embarquées (obligation d'attribution, cités par des commentaires).

## G. Partie Rust

25 commandes `#[tauri::command]`, toutes enregistrées ; **22 sont appelées** par `invoke()`. Trois ne le sont jamais : `greet` (reste du modèle Tauri), `test_sqlite_write`, `test_sqlite_read` (`src-tauri/src/main.rs:158-171`). Ce sont des coquilles **sans accès aux données** (elles renvoient une chaîne ou une liste fixe). Les 27 crates de `Cargo.toml` sont tous cités ; les permissions de la capacité par défaut correspondent aux plugins utilisés. **Risque moyen** : on ne peut pas compiler le Rust ici ; le retrait passerait par le pipeline avant toute publication.

## H. Fichier suivi parasite

`.antigravitycli/fab649cb-…json` : **lien symbolique suivi par git** vers `/Users/zohir/.gemini/config/projects/…json` (commit du 2026-06-02, message sans rapport). Chemin personnel, cassé sur toute autre machine. Risque nul à le retirer du suivi (et à l'ajouter au `.gitignore`).

## I. Outils manuels non branchés (à décider, non proposés d'office)

`scripts/eval-local-ai/` : 20 fichiers (captures Playwright, bancs de dictée, cas de référence) que rien n'appelle dans `package.json`, la CI ni le code. Ils forment le **banc d'évaluation de l'assistant local**, documenté par `scripts/eval-local-ai/README.md` et cité par plusieurs notes de `docs/` (13 des 16 outils y apparaissent). Ce n'est donc pas du code oublié mais un outillage manuel. Trois n'ont aucune mention en documentation : `capture-dictee.ts`, `capture-mascotte.ts`, `dictation-bench.ts`.

## J. Branches mortes dans des fichiers montés (liées à Premium : décision séparée)

`useIsPremium()` renvoie `true` en dur (`dashboard/v2/use-is-premium.ts`, depuis la suppression du style Classic le 5 novembre). Chaque `isPremium ? … : …` a donc une branche jamais exécutée : 31 occurrences dans 7 fichiers (`app-shell.tsx` 14, `receipts-chart.tsx` 4 [mort], `finances-view.tsx` 3, `care-page.tsx` 3, `MotivationalHeader.tsx` 3, `financial-analytics-page.tsx` 2, `app-sidebar.tsx` 2). Cela inclut le menu de compte non-Premium qui porte l'unique lien vers la vue Aide (B). Comme cela touche le thème Premium, **je ne propose rien** : à trancher avec la décision sur Premium.

## K. Annexes informatives (non proposées à la suppression)

- **Exports non utilisés** : 430 exports et 102 types dans des fichiers montés (`annexe-exports-non-utilises.md`). Nettoyage fin, risque d'API interne ; non proposé.
- **Clés de traduction** : 549 clés françaises sur 821 ne sont jamais citées par leur nom complet (`annexe-cles-i18n.md`) ; usage dynamique possible et trois autres langues à garder alignées : non proposé.
- **Exports en double** (nommé + `default`) : 7 fichiers, sans effet.

## Propositions de lots pour le temps 2 (après votre validation)

Chaque lot : suppression, `npm test`, typecheck tsrs, démarrage de l'app, commit séparé. Le thème Premium n'est touché par aucun lot.

| Lot | Contenu | Fichiers | Remarque |
|---|---|---|---|
| 1 | Raccourcis et barrels (A2) | 8 | quasi vide |
| 2 | Anciens menus et coquilles du shell (A1) | 5 | |
| 3 | Kit d'interface jamais utilisé (A4) + 5 dépendances | 19 | retire embla, input-otp, resizable-panels, vaul, @shadcn/react |
| 4 | Anciens tableaux et graphiques (A3) + `@tanstack/react-table` | 20 | |
| 5 | Ancien système v1 (A5) | 12 | |
| 6 | Ancien tableau de bord (A6) + test du registre de charte | 7 + 1 test | les tables d'automations restent en base |
| 7 | Décors floraux (A7) + images d'art + CSS | 4 + 2 CSS + 13 fichiers d'art | −11,4 Mo |
| 8 | Dictée, consultations, services dormants (A8) + CSS | 7 + 1 CSS | à confirmer : fonctions possiblement en réserve |
| 9 | Vues Aide et Assistant plein écran (B) + `scroll-area.tsx` | 3 + modifications de `types.ts`, du registre, de `app-shell.tsx` | seul lot qui édite du code vivant |
| 10 | CSS mort hors Premium (D) | 7 fichiers puis classes par PostCSS | contrôle visuel |
| 11 | Assets orphelins (F) | 8 images + 2 SVG | |
| 12 | Hygiène : `qrcode`, `@types/bcryptjs`, lien `.antigravitycli`, événement `clinical-stock-changed` ; **Rust** (3 commandes) à part, via le pipeline | | |

## Points à valider

1. **A8** (dictée, `reminderService`, `veterinaryAI`, toasts, planning de soins) : à supprimer, ou à garder comme réserve pour une fonction à venir ?
2. **I** (`scripts/eval-local-ai`) : on garde tout ; ou on retire les 3 outils sans documentation ?
3. **G** (3 commandes Rust) : à traiter dans un lot séparé qui passe par le pipeline ?
4. **`.impeccable/design.json`** (outil de design, non suivi par le code) cite `src/components/ui/badge.tsx` et d'autres chemins : le mettre à jour ou l'ignorer ?
5. **J** (`useIsPremium`) : rien n'est proposé ; à rattacher à la décision Premium.
6. **B** : on retire bien les vues Aide et Assistant plein écran (au lieu de les rebrancher) ?

