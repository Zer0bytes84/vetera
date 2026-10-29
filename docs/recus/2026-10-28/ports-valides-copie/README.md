# Ports validés dans la copie (29 octobre 2026)

Branche `feat/dictee-turbo-native`. Commit local, aucun push.

**Source :** la copie du Bureau, en lecture seule (`/Users/zohir/Desktop/Copie Baitari/BAITARI 2.1/bAItari`). Ses changements validés le 27 octobre sont des modifications **non commitées**, posées sur sa base `2d3ff49`.

**Cible :** l'original, seul dossier écrit.

## 1. Les quatre questions, et ce qui en a été retenu

### (1) Ce que ferait un professionnel de premier plan

| Ce qu'il ferait | Ce que j'en ai fait |
|---|---|
| Porter hunk par hunk depuis le diff réel, pas depuis la description du port | **Retenu.** Exemple : la pilule mesure « hauteur d'item + 6 px » dans la copie, alors que le brief dit « alignée sur les items ». J'ai porté la copie (§ 3.1). |
| Prouver que rien d'autre ne passe | **Retenu.** Le diff de la copie contient aussi Agenda Ouvrir et l'assistant (§ 4). |
| Vérifier que l'effet décrit se produit vraiment, pas seulement que le code est recopié | **Retenu.** Pour le port 4, l'effet décrit ne se produit pas en entier, ni dans la copie ni dans l'original (§ 3.4). |
| Vérifier les cas voisins : ⌘K au clavier, style Classic | **En partie.** ⌘K passe par le même `setPaletteOpen`, inchangé. Le style Classic perd aussi sa recherche d'en-tête, comme dans la copie, mais n'a pas été capturé. |

### (2) La matière la plus brute

- `git diff` de la copie contre `2d3ff49`, fichier par fichier ;
- la comparaison entre la base de la copie et l'original, pour savoir quels hunks s'appliquent tels quels.

**Retenu, avec un résultat :**
- `app-sidebar.tsx`, `app-shell.tsx`, `premium-sidebar.css`, `fields.css` et `premium-workspace.css` ont **0 ligne d'écart** avec la base de la copie, et leur diff ne contient que les ports.
- `clean.css` (24 lignes) et `premium-analytics.tsx` (210 lignes) ont divergé, à cause de la session widgets.

**Non disponible :** aucune trace écrite de la validation du 27/10 dans la copie, ni dossier `docs/recus/2026-10-27`. Ta validation au clic est la seule référence.

### (3) Méthodes et outils

- **Port :** recopie des cinq fichiers à base identique, et application à la main des deux hunks divergents.
- **Contrôle du port :** `diff` copie / original après le port (§ 3).
- **Instance de capture isolée :**
  - un HOME à part ;
  - une sauvegarde de la base réelle en lecture seule ;
  - le scénario `ports` (`scripts/eval-local-ai/capture-ports.ts`) ;
  - des captures par `screencapture -l`.
- **Mesures dans la page :**
  - styles calculés : hauteurs, rayons, cadres, ombres ;
  - **liste des règles CSS qui encadrent réellement** la carte, le bandeau et le textarea SOAP.

### (4) La preuve extérieure à nous deux

- le `diff` copie / original ;
- les valeurs calculées dans l'app (`avant/` et `apres/mesures.json`) ;
- les règles qui gagnent (`regles-soap-avant.json`) ;
- les tests, le typecheck et le lint ;
- ta comparaison des captures avec la copie.

## 2. Ce qui a été porté, fichier par fichier

| Fichier | Port | Comment |
|---|---|---|
| `src/components/app-sidebar.tsx` | 1, 2 | Recopié. Pilule de recherche sous la marque, loupe seule en mode icône, ligne Paramètres avec libellé. **Un écart** (§ 3.1). |
| `src/modules/shell/app-shell.tsx` | 1 | Recopié. `onSearch` vers la sidebar ; recherche retirée de l'en-tête Premium et de l'en-tête Classic. |
| `src/modules/shell/premium-sidebar.css` | 2 | Recopié. Ligne Paramètres à la typographie des items : 14 px, 500. |
| `src/design-system/clean.css` | 2 | Hunk appliqué à la main : Paramètres en 13 px, 500, en Clean. |
| `src/modules/dashboard/components/premium-analytics.tsx` | 3 | Hunk appliqué à la main. Les barres des consultations passent en `cleanHidden`, et une aire de cumul `MiniArea` s'ajoute. |
| `src/design-system/premium-workspace.css` | 4a, 4c, 4d | Recopié. Bandeau sans `box-shadow`, carte à 16 px avec `overflow: hidden`, bandeau `16px 16px 0 0`, focus sans halo. |
| `src/design-system/fields.css` | 4b | Recopié. Exemption des textarea SOAP. **Un écart** (§ 3.4). |
| `tests/theme-clean-charter.test.ts` | 3 | Le test codait l'ancienne décision (barres des consultations visibles en Clean). Il vérifie désormais les deux aires et l'absence de barres en Clean. |

`diff` copie / original après le port :
- `app-shell.tsx`, `premium-sidebar.css` et `premium-workspace.css` : **identiques** ;
- `app-sidebar.tsx` et `fields.css` : les deux écarts de charte ci-dessous, rien d'autre.

## 3. Port par port

### 3.1 Recherche dans la sidebar

Mesures après le port :

| Élément | Mesure |
|---|---|
| Pilule | 34 px en Clean (items 28 px), 37 px en Premium (items 31 px) |
| Contour | fin, 20 % de l'encre |
| Pastille ⌘K | sans bordure, ombre seule |
| Recherche dans l'en-tête | absente (`headerSearch: false`) |
| Mode icône | bouton loupe de 44 px, infobulle « Rechercher ⌘ K » |

- **Hauteur :** la copie a `nav-row + 6 px`, donc la pilule mesure 6 px de plus qu'un item. J'ai porté la copie, puisque c'est elle qui a été validée au clic. Si « alignée » voulait dire « même hauteur », c'est une ligne à changer.
- **Écart de charte :** la pastille ⌘K était en `text-[11px]`, sous l'échelle de 12 px de la charte. Le test `type-scale` de l'original l'a refusé, alors qu'il n'a pas tourné dans la copie. Elle passe à `t-12`, soit 1 px de plus.

Captures `sidebar`, `sidebar-icone` et `sidebar-icone-parametres`, en Clean clair, Clean sombre et Premium.

### 3.2 Libellé Paramètres

- **Barre déployée :** icône de 20 px et libellé « Paramètres », aligné comme un item. Hauteur 28 px en Clean et 31 px en Premium, celles des items.
- **Mode icône :** bouton seul de 40 px, avec infobulle.

### 3.3 Graphique Consultations

| Thème | Mesure |
|---|---|
| Clean clair et sombre | 0 barre visible, 1 aire de cumul bleue, comme la Trésorerie |
| Premium | 1 série de barres, 0 aire : inchangé |

Capture `consultations`.

### 3.4 Blocs SOAP

**Porté et effectif :**
- **4a, séparateur du bandeau :** `box-shadow` passe de `inset 0 -1px …` à `none`, dans les trois thèmes.
- **Coins du bandeau :** `16px 16px 0 0`.

**Porté, mais sans effet mesurable, ni dans la copie ni dans l'original :**
- **4b, exemption des textarea :** le textarea garde un cadre de 1 px et un rayon de 8 px. Cause : l'exemption `:root:root:root .soap-section-editor [data-slot="textarea"]` pèse (0,5,0). La règle globale des champs pèse (0,6,0) à cause de ses `:is()`/`:not()`, et gagne.
- **4c, carte à 16 px et 4d, focus par la bordure :** la carte mesure toujours `border: 0 none` et `border-radius: 0`, au repos comme au focus. Cause : la règle Premium `[data-visual-style="premium"] .bg-card { border: medium !important; border-radius: 0 !important }` gagne sur la carte, qui porte la classe `bg-card`. Le halo retiré n'apparaissait de toute façon pas.

**Ce qu'on voit, identique à la copie :**
- le bandeau titre aux coins arrondis, sans séparateur ;
- sous lui, un seul cadre : celui du textarea (blanc, 8 px) ;
- aucun halo au clic.

C'est bien un seul cadre par boîte, mais c'est **le textarea**, pas la carte comme le décrit le brief. Le focus ne fonce donc aucune bordure.

**Ce que je n'ai pas fait :** corriger la spécificité pour obtenir l'effet décrit. Cela aurait changé le rendu validé dans la copie, et le brief demandait « exactement comme validés ». Les règles en cause sont listées dans `regles-soap-avant.json`.

**Écart de charte :** dans l'exemption, le `:hover` est passé sous `@media (hover: hover) and (pointer: fine)`, comme l'exige le test `interaction-charter`. À la souris, aucun changement.

Captures `soap` (quatre boîtes) et `soap-focus` (clic dans Subjectif).

## 4. Ce qui n'a pas été porté

### Les trois variantes rejetées

| Variante | Statut |
|---|---|
| Échelle de sidebar réduite d'un cran | **Non portée.** `--premium-nav-row: 34px` est intact. Items mesurés à 28 px en Clean, avec les tailles de texte d'origine. |
| Rayon du panneau de contenu à 24 px | **Non porté.** Aucun fichier de rayon de panneau n'est touché ; `--clean-card-radius` reste à 10 px. |
| Réaménagement du haut du tableau de bord | **Non porté.** Seul le hunk du graphique Consultations entre dans `premium-analytics.tsx`. Carte d'accueil, filtres et boutons sont inchangés. |

Aucune des trois n'apparaît dans le diff de la copie : elles y avaient déjà été annulées.

### Le reste du diff de la copie, hors périmètre

- `src/app/config/view-registry.tsx`, `src/components/AgendaListView.tsx` et `src/modules/agenda/**` : Agenda Ouvrir.
- `local-consultation-assistant.tsx` : l'assistant, déjà traité par le port de la dictée.
- `soap-panel.tsx` : le préchargement de l'assistant, déjà présent dans l'original depuis le 28/10.

## 5. Captures

Les captures sont dans `avant/` et `apres/` : `<apparence>-<état>.jpg`, avec :
- **apparence :** `clean-light`, `clean-dark`, `premium-light` ;
- **état :** `sidebar`, `sidebar-icone`, `sidebar-icone-parametres`, `consultations`, `soap`, `soap-focus`.

Les mesures sont dans `mesures.json`.

Les captures sont prises sur une copie de la base réelle. Dans cette copie, le rendez-vous qui porte la note complète de Rifka passe « en cours » pour que « Note clinique » l'ouvre. La base réelle est intacte.

## 6. Vérifications

- **Vitest :** 1 277 verts. Typecheck et ESLint à zéro.
- **Commit :** local, aucun push.
