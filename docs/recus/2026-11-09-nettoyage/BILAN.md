# Nettoyage des choses cachées et mortes : bilan (9 novembre 2026)

Suite de l'inventaire (`INVENTAIRE.md`). Douze lots exécutés dans l'ordre, un commit par lot, du commit `be31a7a` au commit `d90f0cf`. Le thème Premium n'est touché par aucun lot (deux retouches minimales dans des fichiers à nom Premium ou dans une branche non-Premium, détaillées plus bas). Les trois commandes Rust sont laissées de côté, comme décidé.

**En chiffres** (hors documentation) : 145 fichiers modifiés, **117 supprimés**, **−19 939 lignes** pour +104 ; sortie de production **275,5 → 249,1 Mo**, 435/503 → 478 fichiers ; 8 dépendances npm en moins ; JS chargé au démarrage inchangé : **997 Ko**, sans `vendor-pdf` ni `vendor-charts`.

## Les lots faits

Chaque lot a passé, avant son commit : **typecheck tsrs à zéro erreur**, **tous les tests au vert**, **démarrage de l'application en développement et parcours de 15 écrans sans erreur de page ni de console** (tableau de bord et sa salutation, Patients, Agenda, Soins, Flux, Rappels, Documents, Produits, Finances, Analyse financière, Équipe, Paramètres, dossier patient, panneau Assistant IA, retour au tableau de bord). Les lots qui changent `package.json` ont passé en plus `npm ci --dry-run`.

| Lot | Commit | Contenu | Fichiers | Lignes | Tests |
|---|---|---|---|---|---|
| 1 | `be31a7a` | Raccourcis de compatibilité et barrels (Agenda, Finances, Patients, Stock, command-palette, 3 `index.ts`) | 8 | −72 | 1654 |
| 2 | `bd86818` | Anciens menus et coquilles du shell (app-header, nav-user, nav-documents, nav-secondary, title-bar) | 5 | −822 | 1654 |
| 3 | `49eee59` | Kit d'interface jamais utilisé (18 primitives) + 4 dépendances (`embla-carousel-react`, `input-otp`, `react-resizable-panels`, `@shadcn/react`) | 18 + `package*.json` | −2 295 | 1654 |
| 4 | `058f449` | Anciens tableaux et graphiques (data-table, Notes, Kanban, evilcharts, shadcn-space, exemples), `drawer.tsx` + `@tanstack/react-table`, `vaul` | 23 | −7 781 | 1654 |
| 5 | `05f8247` | Ancien système de composants v1 (`shared/ui`, StatusBadge, data-row, undo-toast, useFormState) | 11 | −464 | 1654 |
| 6 | `e4e429f` | Ancien tableau de bord (activity-heatmap, receipts-chart, receivables-breakdown, widget-shell v2, 2 hooks, service `automations`, `fitted-amount`) + 2 CSS ; 2 entrées retirées de `tests/dashboard-charter` | 10 + 1 test | −2 616 | 1652 |
| 7 | `737be31` | Décors floraux et de bienvenue (4 composants, 2 CSS) + les 14 fichiers de `public/art` (8 PNG ≈ 13 Mo + 6 notes de prompt) | 20 | −396 (+ images) | 1652 |
| 8 | `58c12a3` | Dictée navigateur et services dormants (assistant-welcome-text + CSS, microphone-button, use-speech-to-text, reminderService, veterinaryAI, toasts, agenda-care-schedule) | 8 | −1 137 | 1652 |
| 9 | `96583a9` | Vues Aide et Assistant plein écran : `Help.tsx`, `AIAgentChat.tsx`, `ui/scroll-area.tsx`, registre, type `View`, tables indexées par `View` | 3 supprimés, 7 édités | −823 | 1652 |
| 10 | `c366c31` | CSS mort hors Premium : 2 fichiers jamais importés + **253 classes élaguées, 632 règles dans 14 fichiers** (PostCSS) ; 2 tests de charte mis à jour | 17 | −3 191 | 1652 |
| 11 | `fc2ac6b` | Assets orphelins (6 mascottes, 2 images de modale, `react.svg`, `footer-pattern.svg`) | 10 | −11 | 1652 |
| 12 | `d90f0cf` | Hygiène : `qrcode` et `@types/bcryptjs`, lien `.antigravitycli` sorti du suivi (+ `.gitignore`), événement `clinical-stock-changed`, 3 chemins morts de `.impeccable/design.json` | 6 | −331 | 1652 |

Les tests passent de 1654 à 1652 parce que deux entrées du test de charte du tableau de bord pointaient vers les fichiers du widget supprimé au lot 6.

### Vérifications propres à certains lots
- **Lot 9** : la touche **J** (sans modificateur) ouvre toujours le panneau Assistant, vérifié dans le navigateur (`setAiAssistantOpen(true)`, qui remplace l'ancien `handleNavigate("assistant")`). Le comportement de ⌘/Ctrl+J est identique avant et après le lot. L'adresse `#/assistant`, qui ne servait qu'à ouvrir ce panneau, disparaît avec la vue.
- **Lot 10** : l'élagage se fait par analyse de sélecteurs. Les 14 branches retirées de listes `:is(…)` ont été mesurées : **aucune ne baisse la spécificité**. Les classes situées dans un `:not(…)` ne sont pas touchées. Contrôle visuel : 24 captures (Clean clair et Premium sombre, 12 écrans chacun) identiques à celles d'avant hors logo animé ; l'agenda, capturé avec puis sans le lot à quelques secondes d'intervalle, ne diffère de **0 pixel** dans les deux thèmes (un premier écart de 4 300 pixels n'était que l'heure qui avance). Le build de production reste valide.
- **Lots 3, 4, 12** : `npm ci --dry-run` cohérent.

### Preuve finale sur le dernier commit (`d90f0cf`)
Dans une copie de travail, depuis une **installation propre** (`npm ci`, 161 s ; les 8 paquets retirés sont absents de `node_modules`) :
- typecheck tsrs : **0 erreur** ;
- tests : **208 fichiers, 1652 tests au vert** ;
- build de production ×3 : 17,4 / 20,4 / 20,1 s (médiane 20,1 s, VM plus chargée que lors de la mesure de 15,3 s à l'adoption de Vite 8), sortie **249,1 Mo, 478 fichiers, 166 chunks JS** ;
- **JS chargé au démarrage : 997 Ko, 27 fichiers** (30 avant), `vendor-pdf` et `vendor-charts` absents ;
- démarrage en développement et 15 écrans : **OK**, aucune erreur de page ni de console (le premier parcours après une installation propre échoue à cause du cache de dépendances de Vite, qu'on relance une fois : comportement déjà connu, sans lien avec le nettoyage) ;
- **Knip sur l'état final : 0 fichier non utilisé.** Restent signalés les seuls faux positifs déjà identifiés (polices, `tw-animate-css`, `@biomejs/biome`, `shadcn`, `sharp`, `tailwindcss`).

## Écarts par rapport à l'inventaire (à savoir)

| Sujet | Ce qui était prévu | Ce qui s'est passé |
|---|---|---|
| Ordre des lots 3, 4, 5, 6 | `ui/drawer.tsx` au lot 3, `fitted-amount.tsx` au lot 5 | Chacun avait un importeur mort dans un lot ultérieur (`data-table.tsx`, `receipts-chart.tsx`, `receivables-breakdown.tsx`) : le typecheck a échoué deux fois. `drawer.tsx` + `vaul` sont passés au lot 4, `fitted-amount.tsx` au lot 6. Cause : ma simulation retirait les 82 fichiers d'un coup. |
| Images `public/art` | 7 PNG, `cabinet-floral-lilas.png` « absent » | Le fichier **existait** : 8 PNG supprimés, soit 14 fichiers avec les notes de prompt. |
| Les 3 « outils sans documentation » (décision 2) | `capture-dictee`, `capture-mascotte`, `dictation-bench` retirés | Ce sont des **modules importés** par le banc documenté (10, 1 et 2 importeurs ; deux importeurs sont dans le typecheck). **Conservés**, sur votre décision. Mon balayage « sans référence » cherchait le nom avec extension et ratait `from "./nom"`. La section I de l'inventaire est donc inexacte pour d'autres fichiers du banc (`progressive-bench`, `reference-bench` sont aussi importés) ; aucun n'a été supprimé. |
| `.impeccable/design.json` (décision 4) | chemins des fichiers supprimés | Il ne citait aucun fichier supprimé par ces lots (`ui/badge.tsx` existe toujours). Trois chemins **déjà absents avant** (`dashboard-insights.css`, `dashboard-polish.css`, `studio-dashboard.tsx`) ont été retirés. |
| Lot 10, tests | « sans modification de test » | Deux tests de charte du thème Clean figeaient du texte de sélecteurs portant des classes mortes : mis à jour avec votre accord. |
| Lot 12, suppression | `.antigravitycli` | Retiré du **suivi** seulement : le lien existe toujours sur le disque et est désormais ignoré par git. |

### Retouches voisines de Premium (à connaître)
Aucune règle, aucun style, aucun comportement du thème Premium n'a changé.
- `src/modules/shell/components/premium-sidebar-icon.tsx` : une clé `aide` d'une table indexée par `View` et l'import `CircleHelp`, devenus sans objet (type `View` sans `aide`).
- `app-shell.tsx` : retrait de l'entrée « Aide et support » dans la **branche non-Premium jamais rendue** (`useIsPremium()` vaut toujours `true`), nécessaire pour supprimer la vue.
- Lot 6 : `receipts-chart.tsx`, fichier mort, contenait 4 branches `isPremium` : supprimé avec lui.
- Les fichiers CSS dont le nom contient `premium` n'ont pas été élagués ; les classes définies à la fois dans l'un d'eux et ailleurs non plus.

## Ce qui reste ouvert

1. **Rust (lot séparé, via le pipeline)** : 3 commandes Tauri enregistrées et jamais appelées, `greet`, `test_sqlite_write`, `test_sqlite_read` (`src-tauri/src/main.rs`), des coquilles inertes. Non touchées ; on ne peut pas compiler le Rust sur la VM.
2. **Premium (décision séparée)** :
   - `useIsPremium()` renvoie `true` en dur : **27 occurrences dans 6 fichiers** (31 dans 7 avant ce chantier) avec leurs branches jamais exécutées ;
   - **78 classes CSS mortes** liées à Premium (fichiers `premium*` ou définies à la fois dans l'un et ailleurs), exclues de l'élagage.
3. **Nouveau CSS mort apparu avec les lots** : 11 classes devenues mortes parce que leurs composants ont été supprimés (8 hors Premium : `dashboard-chart-canvas`, `dashboard-table-frame`, `dashboard-v2-widget`, `heatSide`, `shimmer`, `sidebar-user-role`, `widget-body`, `widget-heading`). Hors de la liste approuvée : un second passage les traitera, après votre accord. Reste aussi `.settings-segmented-active` dans un `:not(…)` de `clean.css`, laissé intact par prudence (spécificité). Des commentaires orphelins peuvent subsister dans les CSS élagués.
4. **Annexes informatives non traitées** : 431 exports et 102 types non utilisés (`annexe-exports-non-utilises.md`), 549 clés de traduction françaises jamais citées (`annexe-cles-i18n.md`), 4 paquets utilisés mais non déclarés (`onnxruntime-web`, `tesseract.js-core`, `@napi-rs/canvas`, `pg`).
5. **Non vérifiés ici, pour le pipeline de release** : `tauri:dev` et l'application empaquetée (pas de Rust sur la VM). C'était déjà le cas pour Vite 8 ; ce chantier ne les change pas, mais les lots 3 et 4 retirent des dépendances et le pipeline exécute `npm ci`.
6. **Sur le Mac** : `package.json` et `package-lock.json` ont changé (8 dépendances retirées). `node_modules` de l'original n'a jamais été touché depuis la VM ; un `npm ci` côté Mac met l'arbre d'aplomb (les paquets retirés y restent installés, sans effet, tant qu'il n'est pas refait).
7. **Hors périmètre, noté** : `docs/` pèse 2 636 fichiers suivis ; `scripts/eval-local-ai` est conservé en entier (banc documenté et ses modules partagés).
