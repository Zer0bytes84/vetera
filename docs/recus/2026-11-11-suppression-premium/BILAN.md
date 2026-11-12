# Suppression du thème Premium : bilan

Branche `chantier/suppression-premium-2026-11-11`, créée sur `master` (`1ddde1a`). Aucun commit sur `master`, aucun push.
Baitari n'a plus qu'une interface : **Clean, en clair et en sombre**.

## En deux minutes

- **Ce qui a changé.** Plus de `data-visual-style`, plus de peau « premium » possible, plus de choix de thème dans Paramètres > Apparence. Les préférences stockées avec `skin: "premium"` retombent sur Clean au premier lancement, sans perdre la police, le ton de barre ni le mode.
- **Ce qui n'a pas changé.** Le rendu. Sur 7 pages × clair/sombre, le diff des **styles calculés** (environ 11 000 éléments) donne **zéro écart** ; les captures de repos sont identiques au pixel près sur 26 images sur 28 (les 2 autres : Paramètres > Apparence, la ligne de thème a disparu, comme demandé).
- **Le piège a bien eu lieu, et il change la nature du chantier.** `useIsPremium()` renvoyait toujours `true` et `visualStyle` valait toujours `"premium"` : Clean est une peau posée **sur** la mise en page et la feuille de style Premium. Le « chemin Clean actuel » est donc la branche `isPremium === true`, et presque tout `premium.css` **est** la base de Clean. Je ne pouvais pas supprimer ces fichiers ; je les ai re-scopés (voir « CSS »).
- **Aucun écran Premium sans équivalent Clean.** Je n'ai donc eu aucun point d'arrêt à signaler à ce titre.
- **Ce que je n'ai pas pu faire.** Lancer la vraie application Tauri avec votre `theme-config` réel, ni faire passer la CI (pas de push). Voir « Ce qui reste à faire ».

## Vos quatre questions, et ce que j'en ai fait

### 1. Ce qu'un professionnel de premier plan ferait sans que vous le demandiez

| Idée | Retenue ? | Comment / pourquoi |
|---|---|---|
| Figer la référence avant de toucher au code, de façon automatisée | **Oui** | Captures Playwright de `master` (14 pages × clair/sombre), avec horloge figée, hasard figé et fenêtre « Nouveautés » neutralisée. Bruit de la référence mesuré : deux passes de `master` donnent 0 écart (hors un trait de ≤ 11 px, masqué et documenté). |
| Faire de la migration un test automatisé, pas un essai manuel | **Oui** | `tests/premium-removal-migration.test.ts` (30 tests) + 12 attaques dans le vrai navigateur. |
| Ne pas se fier aux pixels seuls | **Oui** | Diff des styles calculés de tous les éléments (ce que les pixels ne voient pas : états masqués, un niveau de gris). |
| Une garde qui empêche le retour du code supprimé | **Oui** | Test statique : `data-visual-style`, `useIsPremium`, `theme-skin`, une peau « premium », un sélecteur « pas Clean » échouent la CI s'ils reviennent. Je l'ai attaquée par mutation (5 réintroductions, 5 détectées). |
| Prouver qu'un fichier « premium » est vivant par l'expérience, pas par son nom | **Oui** | J'ai retiré chaque import un par un et mesuré (tableau plus bas). |
| Chasser les résidus qu'on ne cherche pas | **Oui** | Quatre scripts de capture du banc d'évaluation écrivaient encore `skin: "premium"` ; deux morts créés par le chantier (knip) ; une peau morte dans `mascot.css`. |
| Un commit par famille de changements | **Non** | Un seul commit de code : le re-scope CSS, les branches TSX et les tests se tiennent (les tests lisent le CSS). Un commit de documentation à part. |
| Renommer les fichiers et classes `premium-*` | **Non** | Hors périmètre, et le coût n'est pas nul (voir plus bas). Seul `visual-style.ts` → `quick-actions.ts` a été renommé : il ne contenait que les raccourcis et le renommage ne touchait que 4 fichiers. |

### 2. La matière brute dont je suis parti

Pas le graphe de connaissance (qui m'a servi à m'orienter) ni les commentaires : **le code de `master`**, ses imports réels et ses feuilles de style, puis le **rendu réel** dans Chromium (pixels et styles calculés). La matière que je n'ai pas eue : le `theme-config` réel d'un testeur et le vôtre (voir « Ce qui reste à faire »).

### 3. Méthodes et outils

`git worktree` (le `node_modules` du dossier partagé est celui du Mac : je n'y ai rien installé), `grep`, `postcss` (re-scope et analyse des classes mortes), Playwright + Chromium (captures de repos, d'interactions, styles calculés, attaques), Pillow (diff d'images), `knip`, `vitest`, `tsrs` et `tsc -b`, `vite build` (le compilateur CSS de production est plus strict que le serveur de dev), `eslint`. Les scripts sont dans `outils/`.

### 4. Ce qui, en dehors de vous et de moi, prouve le résultat

- **Outils indépendants de mon jugement** : diff d'images, diff de styles calculés, `knip`, compilateur TypeScript, build de production, suite de tests.
- **Ce qui manque** : la CI GitHub (pas de push), un testeur réel, et le moteur **WebKit** de votre Mac (mes captures sont Chromium). L'égalité des styles calculés réduit le risque d'écart WebKit, elle ne le supprime pas.

## L'équipage

| Métier convoqué | Ce qu'il a fait (méthode) |
|---|---|
| **Auditeur de dépendances** | Preuve par imports et greps avant toute suppression de fichier ; analyse des classes CSS sans référence ; `knip` avant/après. |
| **Ingénieur migration de données** | Une migration unique `baitari-clean-only-v1` ; `skin` retiré à chaque lecture (idempotent) ; marqueurs hérités supprimés ; mode, police et ton de barre intacts. |
| **Architecte de cascade CSS** | Re-scope mécanique `[data-visual-style="premium"]` → `[data-skin="clean"]` à **spécificité identique** (aucun sélecteur doublé créé) ; ordre des règles inchangé ; sélecteurs `:is(..., .premium-analytics-dashboard)` simplifiés seulement en tête de sélecteur (là où c'est équivalent). |
| **Ingénieur de qualité visuelle** | Captures avant/après, diff de pixels, diff de styles calculés, passe d'interactions (survol, focus, menus, barre repliée). |
| **Équipe rouge** | Voir plus bas : ses attaques et leurs issues. |
| **Rédacteur de la livraison** | Ce bilan, les preuves, le test de garde. |

## Ce qui a été fait

**Magasin de thème (`src/lib/theme-store.ts`).** `ThemeConfig` ne contient plus que `cleanFont`. `applyTheme` pose toujours `data-skin="clean"` et ne pose plus `data-visual-style`. Migration `baitari-clean-only-v1` : conserve le mode sombre d'une installation qui précède le défaut clair, retire les trois marqueurs hérités (`baitari-premium-default-v1`, `baitari-clean-default-v1`, `baitari-clean-default-v2`). Le code qui écrivait `skin: "premium"` a disparu. `theme-skin.ts` est supprimé.

**Paramètres > Apparence.** Le choix Clean/Premium disparaît. Restent : Mode (clair/auto/sombre), Barre latérale (ton), Police, Tableau de bord (vue, disposition), Navigation (repli). Vérifié dans le navigateur (`captures/apres/*-parametres-apparence-complet.png`).

**Police.** Inter Variable dans les jetons de base (`premium.css`) et dans le repli posé par `applyTheme` (avant : pile système). Inter est le défaut (`DEFAULT_CLEAN_FONT`) pour toute installation neuve ou réinitialisée ; le choix d'un testeur (par exemple Geist) est conservé ; Geist reste dans le sélecteur.

**Branches de rendu.** `useIsPremium` supprimé ; résolu sur le chemin `true` dans `app-shell`, `app-sidebar`, `MotivationalHeader`, `care-page`, `finances-view`, `financial-analytics-page` (une page entière de code mort, ~500 lignes, partie avec). `premium-sidebar-icon.tsx` supprimé : `sidebarViewIcons` est la source unique, dans `sidebar-icon.tsx`, et le DOM produit est identique. `nav-main` : les deux `<span>` de libellé (classique/premium, l'un masqué par CSS) deviennent le texte seul.

**CSS (927 sélecteurs re-scopés dans 14 fichiers).**
- 5 sélecteurs réservés à une autre peau retirés (`[data-skin="premium"]`, `:not([data-skin="clean"])`, `[data-visual-style="classic"]`).
- 210 règles dont une classe n'est plus référencée par aucun `.ts`, `.tsx` ni `.html` retirées (7 fichiers, liste dans `preuves/css-regles-supprimees.json`).
- **Les quatre fichiers nommés ne sont pas supprimables.** Preuve par l'expérience (import retiré, 6 pages en clair, comparé à `master`) :

| Fichier retiré | Pages qui changent | Pixels (min–max) | Verdict |
|---|---|---|---|
| `premium.css` (base de jetons de Clean) | 6 sur 6 | 30 628 – 88 098 | vivant |
| `premium-workspace.css` | 6 sur 6 | 3 362 – 17 919 | vivant |
| `premium-sidebar.css` | 6 sur 6 | 80 894 – 150 621 | vivant |
| `premium-analytics.css` | 2 sur 6 (dashboard : 356 951) | | vivant |
| `finances-premium.css` | 0 sur 6 | 0 | **pixels identiques, mais 13 styles calculés changent** sur `.finance-register` (`position`, `gap`, `inset`) : vivant, conservé |

**Fichiers supprimés** (preuve : aucune référence dans `src`, `tests`, `scripts`, `index.html`, `vite.config.ts`, `package.json`, `src-tauri/src` ; détail dans `preuves/fichiers-supprimes-preuves.txt`) :
`src/lib/theme-skin.ts` (importé par 4 fichiers sur `master`, tous traités), `src/modules/dashboard/v2/use-is-premium.ts` (6), `src/modules/shell/components/premium-sidebar-icon.tsx` (1), `src/components/ui/sidebar-slideout-icon.tsx` (devenu orphelin : son seul importeur, `SidebarTrigger`, ne servait que la branche supprimée). Retirés avec eux : `SidebarTrigger`, `formatCompactInteger`, la variante de bouton `vibrantPremium` (jamais utilisée) et la prop `premiumSummary` (jamais passée). Renommés : `lib/visual-style.ts` → `lib/quick-actions.ts` (`PREMIUM_SHORTCUTS` → `QUICK_ACTIONS`), `tests/visual-style.test.ts` → `tests/theme-store.test.ts`.

**Banc d'évaluation (`scripts/eval-local-ai/capture-*.ts`).** Quatre scripts écrivaient `visualStyle: "premium"` et la peau. Ils ne règlent plus que le mode (`light` / `dark`) et **refusent** une apparence `premium-*` au lieu de la faire passer pour autre chose.

## Preuves

### Greps finaux (`preuves/greps-finaux.txt`)

| Recherche dans `src` | Résultat |
|---|---|
| `data-visual-style` | **0** |
| `useIsPremium` / `use-is-premium` | **0** |
| `visualStyle`, `theme-skin` | **0** (seule `dataset.skin` subsiste, dans `theme-store.ts`, et vaut `"clean"`) |
| valeurs de `data-skin` | une seule : `"clean"` (1 050 occurrences) |
| `premium` (insensible à la casse) | **224 lignes**, justifiées ci-dessous |

### Les 224 lignes « premium » restantes (`preuves/premium-restant-par-categorie.txt`)

| Catégorie | Lignes | Pourquoi elles restent |
|---|---|---|
| Clé de stockage héritée | 2 | `baitari-premium-default-v1` : lue **une fois** par la migration pour reconnaître une installation existante, puis supprimée. Jamais réécrite. |
| Commentaires | 40 | Aucun effet. Beaucoup décrivent « Premium » au sens de la feuille de base. À réécrire dans un passage de renommage (voir « Ce qui reste à faire »). |
| Jetons `--premium-*` | 84 | Couleurs et espacements lus par Clean (`--premium-blue`, `--premium-green`…). Les renommer toucherait chaque feuille. |
| Classes `premium-*` et `data-premium-status` | 77 | 8 classes **vivantes** (`premium-overview-shell`, `premium-analytics-dashboard`, `premium-clinical-overview`, `premium-widget-metrics`, `premium-status-*`, …) servent le tableau de bord et les statuts de Clean. **6 classes sont mortes avant ce chantier** (`premium-page-icon`, `premium-shortcut*`, `premium-page-head-main`) : leurs règles sont dans `clean.css` et `premium-sidebar.css`, hors du CSS « réservé Premium » ; je ne les ai pas touchées. |
| Imports et noms de fichiers | 10 | `premium-analytics.css/.ts/.tsx`, `premium-financial-analysis.tsx`, `premium-sidebar.css`, `finances-premium.css`… servent Clean (tableau de bord, Finances Analyse). |
| Fonctions et types | 13 | `PremiumAnalytics`, `buildPremiumAnalytics`, `PremiumFinancialAnalysis`… idem. |

Huit fichiers de `src` portent encore « premium » dans leur nom (liste dans `greps-finaux.txt`). **Je n'ai pas renommé** : 7 fichiers de test lisent ces chemins ou ces fonctions, et le gain est cosmétique. Si vous le voulez, c'est un commit mécanique à part.

### Rendu : zéro écart

- **Captures de repos** (`preuves/diff-pixels-repos.txt`) : 14 pages × clair/sombre = 28 comparaisons. **26 identiques au pixel**. Les 2 autres sont Paramètres > Apparence : la ligne « Thème » est remplacée par la ligne « Mode » (vérifié à l'image, `captures/`).
- **Styles calculés** (`preuves/diff-styles-calcules.json`) : 7 pages × clair/sombre (dashboard, finances, finances-analyse, patients, dossier-patient, agenda, clinique) : **0 écart de style** sur environ 11 000 éléments. Seules différences : l'attribut `data-visual-style` sur `<html>` et les 4 `<span>` de libellé de la barre latérale, retirés volontairement. Paramètres : 65 px de hauteur en moins (la ligne de thème).
- **Interactions** (survol de la barre, du menu, d'une ligne de patient, focus clavier, menus ouverts, palette, notifications, barre repliée) : 22 comparaisons, 20 identiques. **2 écarts de 10 pixels**, d'**un niveau de gris sur 255**, aux coins de la tuile d'icône « Patients », après survol ou focus d'une ligne, en sombre. Géométrie et styles calculés de l'en-tête identiques au millième de pixel : je n'ai **pas établi la cause**. Je ne peux donc pas écrire « zéro pixel » sans cette réserve.
- **Limites des preuves de rendu** : Chromium, pas WebKit ; données de démonstration ; deux étapes d'interaction n'ont pas trouvé leur cible (survol du bouton « Nouvelle consultation » et d'un onglet de Finances) et n'ont été capturées dans aucune des deux versions.

Les captures demandées (tableau de bord, Finances, Finances Analyse, Patients, dossier patient, Paramètres > Apparence ; clair et sombre ; avant = `master`, après = la branche) sont dans `captures/avant/` et `captures/apres/`.

### Qualité

| Contrôle | `master` | Branche |
|---|---|---|
| Tests (`vitest`) | 212 fichiers, 1 721 tests | **213 fichiers, 1 749 tests, tous verts** |
| `tsrs -b` (typecheck) | propre | **propre** |
| `tsc -b` | | **propre** |
| `eslint .` | 0 erreur, 181 avertissements | **0 erreur, 181 avertissements, les mêmes : 0 nouveau, 0 disparu** |
| `knip` | 626 constats | **624, dont 0 nouveau** (le chantier en avait créé 3 : `SidebarTrigger`, `formatCompactInteger`, `sidebar-slideout-icon.tsx` ; ils sont supprimés) |
| `vite build` (production) | | **réussi**, aucune occurrence de `data-visual-style` dans le CSS produit |

**Sur `--max-warnings=0`.** Les 181 avertissements (`react-hooks/todo`, le compilateur React) existent **déjà sur `master`** dans cet environnement : `eslint . --max-warnings=0` échoue donc aussi sur `master` ici. Je ne l'ai pas « corrigé » (hors périmètre). La CI exécute cette commande : si elle passe chez vous, la différence vient de l'environnement.

Le build de production demande `VITE_LICENSE_SERVER_URL` et une clé publique P-256 ; j'ai utilisé une URL factice et une clé **jetable** générée pour l'occasion, uniquement dans l'environnement du processus (aucun `.env`, aucune licence touchée).

## L'équipe rouge : attaques et issues

### Dans le vrai navigateur (`preuves/equipe-rouge-navigateur.log`) : 12 attaques sur 12 repoussées

| # | Attaque | Issue |
|---|---|---|
| 1 | `skin: "premium"` + police Geist + ton de barre sombre + les trois marqueurs hérités | Clean, Geist, barre sombre ; `theme-config` réécrit en `{"cleanFont":"geist"}` ; marqueurs retirés ; **aucune erreur console** |
| 1c | Chercher une règle `data-visual-style` ou `data-skin="premium"` dans le CSS réellement chargé | 0 règle, 0 attribut |
| 2 | « premium » retapé à la main **après** la migration, puis rechargement | Retombe sur Clean ; police Plex gardée |
| 3 | Préférence corrompue : JSON invalide, tableau, police héritée du prototype, peau inconnue | Clean + Inter, application affichée, aucune erreur |
| 4 | 24 bascules clair/sombre au bouton | Cohérent à chaque bascule, aucune dérive, aucune erreur |
| 5 | Premier lancement sans aucune préférence | Clair, Inter, rien d'écrit hors le marqueur de migration |
| 6 | Paramètres > Apparence : chercher « Premium » ou « Clean clair/sombre » ; choisir Geist puis Inter | Absents ; choix enregistré et appliqué |

### En test unitaire (`tests/premium-removal-migration.test.ts`)

- **Une faille trouvée : la police `"constructor"`** (et `toString`, `__proto__`, `hasOwnProperty`). `value in CLEAN_FONT_SETS` acceptait un nom hérité du prototype comme police valide : `data-clean-font="constructor"` et la valeur stockée. **Bug antérieur au chantier**, corrigé (`Object.hasOwn`) et couvert par 4 tests.
- Stockage indisponible (mode privé, quota) : défauts, aucune exception.
- `saveThemeConfig` avec un `skin` dans l'objet : jamais réécrit.
- Un ancien marqueur Premium seul : ne ressuscite rien.
- 200 appels alternés clair/sombre : mêmes attributs, un seul `--primary` à la fin.
- Premier lancement deux fois de suite : stockage identique.

### Contre la garde elle-même

J'ai réintroduit 5 choses (`data-visual-style`, `useIsPremium`, `skin: "premium"`, `:not([data-skin="clean"])`, `data-skin="premium"`) : les **5 tests échouent**, puis repassent au vert à la restauration.

### Contre mes propres outils

Mon premier outil de re-scope transformait `.dark :is([data-visual-style="premium"], .premium-analytics-dashboard)` en `.dark [data-skin="clean"]`, ce qui **change le sens** (la racine ne peut pas être descendante d'elle-même). Je l'ai vu en relisant le diff, avant toute capture, et corrigé : l'aplatissement n'a lieu qu'en tête de sélecteur. Les premières captures du tableau de bord montraient une carte à moitié transparente (animation d'entrée) : bruit de mon script, pas du CSS ; refait avec une attente plus longue.

## Décisions et points qui vous reviennent

1. **L'écran de connexion et d'activation utilise « Geist Variable » en dur** (`src/components/auth-clinic.css`, 4 règles). C'est une police fixée par cet écran, pas le défaut de l'interface. Le passer en Inter changerait un écran visible : je ne l'ai pas fait. À vous de trancher.
2. **Libellés.** Retirés avec le réglage de thème : « Thème Clean seulement. » (sous « Police ») et le libellé d'accessibilité « Police du thème Clean », devenu « Police ». **Non touchés** : la description de l'onglet « Thème, police et navigation » et la phrase du ton de barre « Automatique suit le thème. Claire ou Sombre reste votre choix, quel que soit le thème. » (« thème » y garde un sens : clair/sombre). À relire.
3. **Notes de version.** Rien ajouté : un testeur sur Premium verra l'interface changer sans explication. Une ligne dans les notes de 5.0.10 serait utile.
4. **Renommage `premium-*`** (fichiers, fonctions, classes, jetons, 40 commentaires) : commit mécanique à part, si vous le voulez.
5. **`DESIGN.md`** décrit encore Classic et Premium (document ancien) ; seule une phrase sur la variante de bouton supprimée a été retirée.
6. **Règles mortes antérieures au chantier** (`clean.css`, `index.css`, `medical-record.css`…, par exemple 49 règles de `clean.css` sur des classes jamais rendues) : repérées (`preuves/`), **non touchées**, hors périmètre.

## Ce qui reste à faire (et que je n'ai pas fait)

- **Tester dans la vraie application** avec votre `theme-config` et celui d'un testeur : je ne l'ai pas lancée (mémoire de la VM ; et vos règles d'atelier demandent une sauvegarde avant et un nettoyage complet après, que je n'ai pas voulu improviser). Marche à suivre : sauvegarde de la base, puis `BAITARI_TEST_HARNESS=1 npm run tauri:dev`, injection d'un `theme-config` `{"skin":"premium","cleanFont":"geist"}` et du ton de barre sombre via le pilote, rechargement, lecture de `document.documentElement.dataset` et de `localStorage`.
- **Faire passer la CI** : rien n'a été poussé.
- **Vérifier sous WebKit** (votre Mac) : mes captures sont Chromium.
- Elucider les 10 pixels d'un niveau de gris de la tuile « Patients » après survol (ci-dessus).

## Reproduire

Les scripts sont dans `outils/` (`capture.mjs`, `states.mjs`, `computed.mjs`, `redteam.mjs`, `apparence.mjs`, `diff.py`, `rescope-css.mjs`, `elagage-css.mjs`, `setup.mjs`). Ils supposent deux serveurs Vite (`master` sur 5198, la branche sur 5199), une session activée enregistrée (`state-*.json`, procédure dans la mémoire « Faire tourner l'app dans un navigateur sous Linux ») et le Playwright du dossier `~/.dev-browser`. Le masque du diff d'images (x 300–312, y 26–50) couvre le trait de séparation de l'en-tête, dont le rendu varie de ≤ 11 pixels d'une passe à l'autre **sur `master` seul**.
